import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DONATION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { firstName, lastName, email, amountCents } = await req.json();
    logStep("Request data received", { firstName, lastName, email, amountCents });

    if (!firstName || !lastName || !email || !amountCents) {
      throw new Error("Missing required fields");
    }

    if (amountCents < 1000) {
      throw new Error("Minimum donation is $10");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        metadata: {
          source: 'donation',
          first_name: firstName,
          last_name: lastName,
        }
      });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    }

    // Create a recurring price for this donation amount
    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name: 'ACFE Monthly Donation',
        description: `Monthly donation of $${(amountCents / 100).toFixed(2)} to support A Cloud For Everyone`,
      },
    });
    logStep("Created price", { priceId: price.id });

    const origin = req.headers.get("origin") || "https://acloudforeveryone.org";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/home`,
      metadata: {
        donation: 'true',
        first_name: firstName,
        last_name: lastName,
      },
      subscription_data: {
        metadata: {
          donation: 'true',
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    logStep("Created checkout session", { sessionId: session.id });

    // Store donation record
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseClient.from('donations').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      amount_cents: amountCents,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
      status: 'pending',
    });
    logStep("Stored donation record");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
