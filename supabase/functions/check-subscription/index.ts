import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    // Handle invalid/expired sessions gracefully - return unsubscribed state instead of error
    if (userError || !userData?.user?.email) {
      logStep("Session invalid or expired, returning unsubscribed state", { 
        error: userError?.message || 'No user email' 
      });
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscriptions: [],
        sessionExpired: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscriptions: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get all active and paused subscriptions
    // Note: Using only 3 levels of expansion to avoid Stripe API limits
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
    });

    const pausedSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "paused",
    });

    // Combine active and paused subscriptions
    const allSubscriptions = [...activeSubscriptions.data, ...pausedSubscriptions.data];

    // Fetch product details separately for each subscription to avoid expansion limits
    const subscriptionDetails = await Promise.all(
      allSubscriptions.map(async (sub: Stripe.Subscription) => {
        const item = sub.items.data[0];
        const priceId = item.price.id;
        
        // Fetch the price with product expansion (only 1 level deep)
        const price = await stripe.prices.retrieve(priceId, {
          expand: ['product'],
        });
        
        const product = price.product as Stripe.Product;
        
        return {
          id: sub.id,
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          product_id: product.id,
          product_name: product.name,
          price_id: priceId,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval,
          pause_collection: sub.pause_collection,
        };
      })
    );

    logStep("Subscription check complete", { 
      hasSubscriptions: subscriptionDetails.length > 0,
      count: subscriptionDetails.length
    });

    return new Response(JSON.stringify({
      subscribed: subscriptionDetails.some(s => s.status === 'active'),
      subscriptions: subscriptionDetails,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
