import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyUser, corsHeaders } from "../_shared/auth.ts";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SESSION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify user authentication using shared middleware
    const { user, supabase } = await verifyUser(req);
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { mentorId, mentorName, scheduledDate, startTime, endTime, timezone } = await req.json();
    if (!mentorId) throw new Error("Mentor ID is required");
    if (!scheduledDate || !startTime || !endTime) throw new Error("Session time slot is required");
    logStep("Request parsed", { mentorId, mentorName, scheduledDate, startTime, endTime, timezone });

    // Get the session price from platform settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'mentorship_session_price')
      .single();

    if (settingsError || !settingsData) {
      throw new Error("Session pricing not configured");
    }

    const settings = settingsData.setting_value as { price_cents: number; enabled: boolean };
    if (!settings.enabled) {
      throw new Error("1:1 sessions are currently not available");
    }

    const priceCents = settings.price_cents;
    logStep("Session price retrieved", { priceCents });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }
    logStep("Customer lookup", { customerId: customerId || "new customer" });

    const origin = req.headers.get("origin") || "https://acfe-app.lovable.app";

    // Create pending session record
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('mentorship_sessions')
      .insert({
        mentor_id: mentorId,
        student_id: user.id,
        scheduled_date: scheduledDate,
        start_time: startTime,
        end_time: endTime,
        timezone: timezone || 'UTC',
        status: 'pending',
        amount_cents: priceCents,
      })
      .select()
      .single();

    if (sessionError) {
      logStep("Error creating session record", { error: sessionError });
      throw new Error("Failed to create session record");
    }

    logStep("Session record created", { sessionId: sessionRecord.id });

    // Create checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `1:1 Session with ${mentorName || 'Mentor'} - ${scheduledDate} at ${startTime}`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/mentors/${mentorId}?session_purchased=true&session_id=${sessionRecord.id}`,
      cancel_url: `${origin}/mentors/${mentorId}`,
      metadata: {
        mentor_id: mentorId,
        student_id: user.id,
        session_id: sessionRecord.id,
        type: 'mentorship_session',
      },
    });

    // Update session with Stripe checkout session ID
    await supabase
      .from('mentorship_sessions')
      .update({ stripe_checkout_session_id: checkoutSession.id })
      .eq('id', sessionRecord.id);

    logStep("Checkout session created", { checkoutSessionId: checkoutSession.id });

    return new Response(JSON.stringify({ 
      url: checkoutSession.url,
      sessionId: sessionRecord.id 
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
