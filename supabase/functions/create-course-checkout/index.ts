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

    const { courseId } = await req.json();
    if (!courseId) throw new Error("Course ID is required");
    logStep("Course ID received", { courseId });

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
    logStep("Course found", { title: course.title, isPaid: course.is_paid });

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

    // If platform forces free, don't charge
    if (override?.enabled && override?.force_free) {
      logStep("Platform override: course is free");
      
      // Create a free "purchase" record and enroll
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

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

      // Create enrollment directly
      await serviceClient
        .from("enrollments")
        .insert({ student_id: user.id, course_id: courseId });

      // Record as sponsored purchase
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
        message: `Course sponsored by ${override.sponsor_name || 'our partners'}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If course is free, enroll directly
    if (!course.is_paid) {
      logStep("Course is free, enrolling directly");
      
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

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

      await serviceClient
        .from("enrollments")
        .insert({ student_id: user.id, course_id: courseId });

      return new Response(JSON.stringify({ 
        success: true, 
        free: true, 
        message: "Enrolled successfully" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Paid course - create Stripe checkout session
    logStep("Creating Stripe checkout session");

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
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
              description: "One-time course access",
            },
            unit_amount: course.price_cents || 1000,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?course_id=${courseId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${courseId}`,
      metadata: {
        course_id: courseId,
        student_id: user.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

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
