import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Verify payment with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Stripe session retrieved", { 
      status: session.payment_status,
      metadata: session.metadata 
    });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Verify the session belongs to this user and course
    if (session.metadata?.student_id !== user.id || session.metadata?.course_id !== courseId) {
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

    // Record purchase
    const { error: purchaseError } = await serviceClient
      .from("course_purchases")
      .upsert({
        student_id: user.id,
        course_id: courseId,
        stripe_checkout_session_id: sessionId,
        stripe_payment_intent_id: session.payment_intent as string,
        amount_cents: session.amount_total || 0,
        status: "completed",
        purchased_at: new Date().toISOString(),
      }, { onConflict: "student_id,course_id" });

    if (purchaseError) {
      logStep("Purchase record error", { error: purchaseError });
    } else {
      logStep("Purchase recorded");
    }

    return new Response(JSON.stringify({ 
      success: true,
      enrolled: true,
      message: "Payment verified and enrollment complete"
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
