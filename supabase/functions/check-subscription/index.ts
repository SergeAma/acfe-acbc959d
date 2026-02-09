import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyUser, corsHeaders } from "../_shared/auth.ts";

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

    // Verify user authentication using shared middleware
    let user;
    let supabase;
    try {
      const result = await verifyUser(req);
      user = result.user;
      supabase = result.supabase;
    } catch (authError) {
      // Handle invalid/expired sessions gracefully - return unsubscribed state instead of error
      logStep("Session invalid or expired, returning unsubscribed state", { 
        error: authError instanceof Error ? authError.message : 'Auth failed' 
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
    
    if (!user?.email) {
      logStep("No user email, returning unsubscribed state");
      return new Response(JSON.stringify({ 
        subscribed: false,
        subscriptions: [],
        sessionExpired: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
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

    // Get all active, trialing, and paused subscriptions
    const [activeSubscriptions, trialingSubscriptions, pausedSubscriptions] = await Promise.all([
      stripe.subscriptions.list({ customer: customerId, status: "active" }),
      stripe.subscriptions.list({ customer: customerId, status: "trialing" }),
      stripe.subscriptions.list({ customer: customerId, status: "paused" }),
    ]);

    // Combine all subscriptions
    const allSubscriptions = [
      ...activeSubscriptions.data, 
      ...trialingSubscriptions.data, 
      ...pausedSubscriptions.data,
    ];

    // Fetch product details separately for each subscription to avoid expansion limits
    const subscriptionDetails = await Promise.all(
      allSubscriptions.map(async (sub: Stripe.Subscription) => {
        try {
          const item = sub.items.data[0];
          if (!item || !item.price) {
            logStep("Skipping subscription with missing item/price", { subId: sub.id });
            return null;
          }
          
          const priceId = item.price.id;
          
          // Fetch the price with product expansion (only 1 level deep)
          const price = await stripe.prices.retrieve(priceId, {
            expand: ['product'],
          });
          
          const product = price.product as Stripe.Product;
          
          // Safely handle period_end - log raw values for debugging
          logStep("Raw period data", { 
            subId: sub.id, 
            current_period_end: sub.current_period_end, 
            current_period_end_type: typeof sub.current_period_end,
            trial_end: sub.trial_end,
            status: sub.status
          });
          
          let periodEnd: string | null = null;
          // Handle current_period_end - could be number or string depending on API version
          if (sub.current_period_end) {
            const ts = typeof sub.current_period_end === 'number' 
              ? sub.current_period_end 
              : Number(sub.current_period_end);
            if (!isNaN(ts) && ts > 0) {
              periodEnd = new Date(ts < 10000000000 ? ts * 1000 : ts).toISOString();
            }
          }
          // Fallback to trial_end for trialing subscriptions
          if (!periodEnd && sub.trial_end) {
            const ts = typeof sub.trial_end === 'number' 
              ? sub.trial_end 
              : Number(sub.trial_end);
            if (!isNaN(ts) && ts > 0) {
              periodEnd = new Date(ts < 10000000000 ? ts * 1000 : ts).toISOString();
            }
          }
          logStep("Computed periodEnd", { subId: sub.id, periodEnd });
          
          return {
            id: sub.id,
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            current_period_end: periodEnd,
            product_id: product.id,
            product_name: product.name,
            price_id: priceId,
            amount: price.unit_amount,
            currency: price.currency,
            interval: price.recurring?.interval ?? null,
            pause_collection: sub.pause_collection ?? null,
          };
        } catch (subError) {
          logStep("Error processing subscription", { subId: sub.id, error: String(subError) });
          return null;
        }
      })
    );
    
    // Filter out any null results from failed processing
    const validSubscriptions = subscriptionDetails.filter(s => s !== null);

    logStep("Subscription check complete", { 
      hasSubscriptions: validSubscriptions.length > 0,
      count: validSubscriptions.length
    });

    return new Response(JSON.stringify({
      subscribed: validSubscriptions.some(s => s.status === 'active' || s.status === 'trialing'),
      subscriptions: validSubscriptions,
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
