import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-SUBSCRIPTION] ${step}${detailsStr}`);
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
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { action, subscriptionId } = await req.json();
    logStep("Request body parsed", { action, subscriptionId });

    if (!action || !subscriptionId) {
      throw new Error("Missing required parameters: action and subscriptionId");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify the subscription belongs to this user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    
    if (customer.deleted || customer.email !== user.email) {
      throw new Error("Subscription not found or does not belong to this user");
    }

    logStep("Subscription ownership verified", { subscriptionId, customerId: customer.id });

    let updatedSubscription;

    switch (action) {
      case 'pause':
        logStep("Pausing subscription");
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: {
            behavior: 'void',
          },
        });
        logStep("Subscription paused successfully");
        break;

      case 'resume':
        logStep("Resuming subscription");
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          pause_collection: '',
        });
        logStep("Subscription resumed successfully");
        break;

      case 'cancel':
        logStep("Canceling subscription at period end");
        updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        logStep("Subscription set to cancel at period end");
        break;

      default:
        throw new Error(`Invalid action: ${action}. Supported actions: pause, resume, cancel`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        pause_collection: updatedSubscription.pause_collection,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in manage-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
