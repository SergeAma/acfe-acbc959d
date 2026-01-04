import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONFIRM-SESSION-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");

    logStep("Confirming session", { sessionId });

    // Get session record
    const { data: session, error: sessionError } = await supabaseClient
      .from('mentorship_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    if (session.status === 'confirmed') {
      logStep("Session already confirmed");
      return new Response(JSON.stringify({ success: true, alreadyConfirmed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify payment with Stripe if checkout session ID exists
    if (session.stripe_checkout_session_id) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const checkoutSession = await stripe.checkout.sessions.retrieve(session.stripe_checkout_session_id);
        
        if (checkoutSession.payment_status !== 'paid') {
          throw new Error("Payment not completed");
        }

        // Update with payment intent ID
        if (checkoutSession.payment_intent) {
          await supabaseClient
            .from('mentorship_sessions')
            .update({ stripe_payment_intent_id: checkoutSession.payment_intent as string })
            .eq('id', sessionId);
        }
      }
    }

    // Update session status to confirmed
    const { error: updateError } = await supabaseClient
      .from('mentorship_sessions')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error("Failed to confirm session");
    }

    logStep("Session confirmed", { sessionId });

    // Send notification emails
    try {
      const notificationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-session-notification`;
      await fetch(notificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          sessionId,
          notificationType: 'booking_confirmed',
        }),
      });
      logStep("Notification emails triggered");
    } catch (emailError) {
      logStep("Warning: Failed to send notification emails", { error: String(emailError) });
      // Don't fail the whole operation if emails fail
    }

    return new Response(JSON.stringify({ success: true }), {
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
