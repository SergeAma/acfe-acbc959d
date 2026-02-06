import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyUser, corsHeaders } from "../_shared/auth.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-COURSE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { sessionId, courseId } = await req.json();
    if (!sessionId || !courseId) {
      throw new Error("Session ID and Course ID are required");
    }
    logStep("Parameters received", { sessionId, courseId });

    // Verify user authentication using shared middleware
    const { user, supabase: userClient } = await verifyUser(req);
    logStep("User authenticated", { userId: user.id });

    // Verify payment with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });
    logStep("Stripe session retrieved", { 
      status: session.payment_status,
      mode: session.mode,
      metadata: session.metadata 
    });

    // For subscriptions, check if subscription is active OR trialing
    if (session.mode === 'subscription') {
      const subscription = session.subscription as Stripe.Subscription;
      if (!subscription) {
        throw new Error("Subscription not found");
      }
      
      // Accept both 'active' and 'trialing' as valid states
      const validStatuses = ['active', 'trialing'];
      if (!validStatuses.includes(subscription.status)) {
        logStep("Subscription not in valid state", { status: subscription.status });
        throw new Error(`Subscription status is ${subscription.status}, expected active or trialing`);
      }
      logStep("Subscription verified", { subscriptionId: subscription.id, status: subscription.status });
    } else if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Verify the session belongs to this user and course
    if (session.metadata?.student_id !== user.id || session.metadata?.course_id !== courseId) {
      logStep("Metadata mismatch", { 
        sessionStudentId: session.metadata?.student_id, 
        userId: user.id,
        sessionCourseId: session.metadata?.course_id,
        courseId 
      });
      throw new Error("Payment verification failed - metadata mismatch");
    }

    // Use service role to create enrollment and purchase record
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

    if (!existingEnrollment) {
      // Create enrollment
      const { error: enrollError } = await serviceClient
        .from("enrollments")
        .insert({ student_id: user.id, course_id: courseId });

      if (enrollError) {
        logStep("Enrollment error", { error: enrollError });
        throw new Error("Failed to create enrollment");
      }
      logStep("Enrollment created");
    } else {
      logStep("Already enrolled");
    }

    // Get subscription ID if available
    const subscriptionId = session.mode === 'subscription' 
      ? (session.subscription as Stripe.Subscription)?.id 
      : null;

    // Determine status based on subscription state
    const subscription = session.subscription as Stripe.Subscription | null;
    const purchaseStatus = subscription?.status === 'trialing' ? 'trialing' : 'active';

    // Record purchase
    const { error: purchaseError } = await serviceClient
      .from("course_purchases")
      .upsert({
        student_id: user.id,
        course_id: courseId,
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent as string || null,
        stripe_subscription_id: subscriptionId,
        amount_cents: session.amount_total || 0,
        status: purchaseStatus,
        purchased_at: new Date().toISOString(),
      }, { onConflict: "student_id,course_id" });

    if (purchaseError) {
      logStep("Purchase record error", { error: purchaseError });
    } else {
      logStep("Purchase recorded", { status: purchaseStatus });
    }

    // Get course and user details for email
    const { data: course } = await serviceClient
      .from("courses")
      .select("title, drip_enabled, drip_schedule_type, drip_release_day")
      .eq("id", courseId)
      .single();

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Check if drip is active (enabled and weekly schedule)
    const isDripActive = course?.drip_enabled && course?.drip_schedule_type === 'week';

    // Send purchase confirmation email
    if (profile?.email && course?.title) {
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-purchase-confirmation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            email: profile.email,
            firstName: profile.full_name?.split(' ')[0] || 'Student',
            courseTitle: course.title,
            amount: (session.amount_total || 0) / 100,
            isSubscription: session.mode === 'subscription',
            isTrial: subscription?.status === 'trialing',
            dripEnabled: isDripActive,
            dripReleaseDay: course.drip_release_day ?? 3,
          }),
        });
        logStep("Purchase confirmation email triggered", { dripEnabled: isDripActive });
      } catch (emailError) {
        logStep("Email trigger failed", { error: emailError });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      enrolled: true,
      isTrial: subscription?.status === 'trialing',
      message: subscription?.status === 'trialing' 
        ? "Trial started! You're now enrolled." 
        : "Payment verified and enrollment complete"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Return 401 for auth errors
    const status = errorMessage.includes('authorization') || 
                   errorMessage.includes('token') ? 401 : 500;
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
