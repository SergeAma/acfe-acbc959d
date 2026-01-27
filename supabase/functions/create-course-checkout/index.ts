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

    // Check if user has an active ACFE subscription (Membership or Mentorship Plus)
    // or is a member of an institution/career centre
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let hasActiveSubscription = false;
    
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });
      hasActiveSubscription = subscriptions.data.length > 0;
      logStep("Subscription check", { customerId, hasActiveSubscription, subscriptionCount: subscriptions.data.length });
    }

    // Check if user is part of an institution (career development centre)
    const { data: institutionMembership } = await serviceClient
      .from("institution_students")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    
    const isInstitutionMember = !!institutionMembership;
    logStep("Institution membership check", { isInstitutionMember });

    // If user has active subscription or is institution member, enroll for free
    if (hasActiveSubscription || isInstitutionMember) {
      const reason = hasActiveSubscription 
        ? "Enrolled as an ACFE subscriber" 
        : "Enrolled as institution member";
      logStep("User qualifies for free enrollment", { hasActiveSubscription, isInstitutionMember });
      return await enrollFree(reason);
    }

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

    // User is "free access" with no subscription - redirect to pricing page
    logStep("User has no subscription, redirecting to pricing page");
    const origin = req.headers.get("origin") || "https://lovable.dev";
    
    return new Response(JSON.stringify({ 
      requiresSubscription: true,
      redirectUrl: `${origin}/pricing`,
      message: "Please subscribe to access paid courses"
    }), {
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
