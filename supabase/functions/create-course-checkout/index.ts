import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-COURSE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const { courseId, promoCode } = await req.json();
    if (!courseId) throw new Error("Course ID is required");
    logStep("Course ID received", { courseId, promoCode: promoCode || "none" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get course details
    const { data: course, error: courseError } = await supabaseClient
      .from("courses")
      .select("id, title, is_paid, price_cents, mentor_id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }
    logStep("Course found", { title: course.title, isPaid: course.is_paid, priceCents: course.price_cents });

    // Check platform override settings
    const { data: pricingOverride } = await supabaseClient
      .from("platform_settings")
      .select("setting_value")
      .eq("setting_key", "pricing_override")
      .single();

    const override = pricingOverride?.setting_value as {
      enabled: boolean;
      force_free: boolean;
      sponsor_name?: string;
    } | null;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Helper function for free enrollment
    const enrollFree = async (message: string) => {
      // Check if already enrolled
      const { data: existingEnrollment } = await serviceClient
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .single();

      if (existingEnrollment) {
        return new Response(JSON.stringify({ 
          success: true, 
          free: true, 
          message: "Already enrolled" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Create enrollment
      await serviceClient
        .from("enrollments")
        .insert({ student_id: user.id, course_id: courseId });

      // Record purchase
      await serviceClient
        .from("course_purchases")
        .upsert({
          student_id: user.id,
          course_id: courseId,
          amount_cents: 0,
          status: "completed",
          purchased_at: new Date().toISOString(),
        }, { onConflict: "student_id,course_id" });

      return new Response(JSON.stringify({ 
        success: true, 
        free: true, 
        message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    };

    // If platform forces free, enroll directly
    if (override?.enabled && override?.force_free) {
      logStep("Platform override: course is free");
      return await enrollFree(`Course sponsored by ${override.sponsor_name || 'our partners'}`);
    }

    // If course is free, enroll directly
    if (!course.is_paid) {
      logStep("Course is free, enrolling directly");
      return await enrollFree("Enrolled successfully");
    }

    // Paid course - create Stripe subscription checkout session
    logStep("Creating Stripe subscription checkout session");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new customer" });

    const origin = req.headers.get("origin") || "https://lovable.dev";
    const coursePriceCents = course.price_cents || 1000;
    
    // Build checkout session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              description: "Monthly subscription for course access",
              metadata: {
                course_id: courseId,
              },
            },
            unit_amount: coursePriceCents,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/payment-success?course_id=${courseId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${courseId}`,
      metadata: {
        course_id: courseId,
        student_id: user.id,
      },
      subscription_data: {
        metadata: {
          course_id: courseId,
          student_id: user.id,
        },
      },
      allow_promotion_codes: true, // Allow Stripe's built-in promo code input
    };

    // If promo code provided, look it up and handle accordingly
    if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode.toUpperCase(),
          active: true,
          limit: 1,
        });
        
        if (promoCodes.data.length > 0) {
          const promo = promoCodes.data[0];
          const coupon = typeof promo.coupon === 'object' ? promo.coupon : null;
          
          logStep("Found promo code", { 
            code: promo.code, 
            percentOff: coupon?.percent_off,
            amountOff: coupon?.amount_off,
            metadata: promo.metadata 
          });
          
          // Get trial days from promo or coupon metadata
          const trialDays = parseInt(
            promo.metadata?.trial_days || 
            coupon?.metadata?.trial_days || 
            '0'
          );
          
          // For 100% off coupons with trial days, apply trial period
          if (coupon?.percent_off === 100 && trialDays > 0) {
            sessionOptions.subscription_data!.trial_period_days = trialDays;
            // Don't apply discount since we're using trial
            logStep("Applied trial period from promo code", { code: promoCode, trialDays });
          } else {
            // Apply the promo code as a discount
            sessionOptions.discounts = [{ promotion_code: promo.id }];
            logStep("Applied discount from promo code", { code: promoCode });
          }
          
          // Disable allow_promotion_codes since we're pre-applying
          sessionOptions.allow_promotion_codes = false;
        } else {
          logStep("Promo code not found or inactive", { code: promoCode });
          // Keep allow_promotion_codes true so user can try again in Stripe
        }
      } catch (promoError) {
        logStep("Error looking up promo code", { error: String(promoError) });
        // Continue without the promo code
      }
    }

    // Create subscription checkout session
    const session = await stripe.checkout.sessions.create(sessionOptions);

    logStep("Subscription checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
