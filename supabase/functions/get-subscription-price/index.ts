import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-SUBSCRIPTION-PRICE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find the active monthly subscription price
    const prices = await stripe.prices.list({
      type: 'recurring',
      active: true,
      limit: 10,
    });
    logStep("Fetched prices", { count: prices.data.length });

    // Find a monthly recurring price
    const monthlyPrice = prices.data.find(
      (p: { recurring?: { interval: string } }) => p.recurring?.interval === 'month'
    );

    if (!monthlyPrice) {
      logStep("No monthly subscription found");
      return new Response(
        JSON.stringify({ 
          found: false,
          priceCents: 1000, // Default to $10
          priceId: null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Found monthly price", { priceId: monthlyPrice.id, amount: monthlyPrice.unit_amount });

    return new Response(
      JSON.stringify({ 
        found: true,
        priceCents: monthlyPrice.unit_amount || 1000,
        priceId: monthlyPrice.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
