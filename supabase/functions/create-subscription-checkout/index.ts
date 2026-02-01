import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION-CHECKOUT] ${step}${detailsStr}`);
};

// ACFE-specific product IDs - isolated from Spectrogram products
// Price IDs are fetched dynamically from platform_settings to stay in sync with admin changes
const ACFE_PRODUCTS = {
  membership: {
    productId: "prod_TkCdNAxRmKONyc",
    name: "ACFE Membership",
    settingKey: "subscription_price",
    defaultPriceId: "price_1So8qzJv3w1nJBLYyJRKAP7P", // Updated to current $20/month price
  },
  mentorship_plus: {
    productId: "prod_TkDR4mktfjQo8r",
    name: "ACFE Mentorship Plus",
    settingKey: "mentorship_plus_price",
    defaultPriceId: "price_1Smj0WJv3w1nJBLYn4uAQZ8g",
  },
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

    // Parse request body to get the tier and promo code
    let tier = "membership"; // Default tier
    let promoCode: string | undefined;
    try {
      const body = await req.json();
      if (body.tier && ACFE_PRODUCTS[body.tier as keyof typeof ACFE_PRODUCTS]) {
        tier = body.tier;
      }
      if (body.promoCode && typeof body.promoCode === 'string') {
        promoCode = body.promoCode.trim().toUpperCase();
      }
    } catch {
      // No body or invalid JSON, use default tier
    }
    logStep("Parsed request", { tier, promoCode: promoCode || "none" });

    const tierConfig = ACFE_PRODUCTS[tier as keyof typeof ACFE_PRODUCTS];
    
    // Fetch the current price ID from platform_settings (synced with Stripe by admin)
    const { data: settingData } = await supabaseClient
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', tierConfig.settingKey)
      .single();
    
    const priceId = settingData?.setting_value?.price_id || tierConfig.defaultPriceId;
    logStep("Selected tier", { tier, priceId, settingKey: tierConfig.settingKey });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Look for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
      
      // Check if they already have an active subscription for this product
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
      });
      
      // Check if they already have the same tier subscription (by product, not price ID)
      const hasSameTier = existingSubs.data.some((sub: Stripe.Subscription) => 
        sub.items.data.some((item: Stripe.SubscriptionItem) => 
          item.price.product === tierConfig.productId
        )
      );
      
      if (hasSameTier) {
        logStep("User already has this subscription tier");
        return new Response(JSON.stringify({ 
          error: `You already have an active ${tierConfig.name} subscription`,
          alreadySubscribed: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      // If they have a different active subscription, they can upgrade/downgrade via portal
      if (existingSubs.data.length > 0) {
        logStep("User has different subscription, can upgrade via portal");
        return new Response(JSON.stringify({ 
          error: "You already have an active subscription. Please use 'Manage Billing' to upgrade or change your plan.",
          alreadySubscribed: true,
          hasOtherSubscription: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    const origin = req.headers.get("origin") || "https://acloudforeveryone.org";

    // Look up promotion code if provided
    let promotionCodeId: string | undefined;
    if (promoCode) {
      try {
        const promoCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
          limit: 1,
        });
        if (promoCodes.data.length > 0) {
          promotionCodeId = promoCodes.data[0].id;
          logStep("Found valid promotion code", { promoCode, promotionCodeId });
        } else {
          logStep("Promotion code not found or inactive", { promoCode });
        }
      } catch (promoError) {
        logStep("Error looking up promotion code", { promoCode, error: String(promoError) });
      }
    }

    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/courses?subscription=success`,
      cancel_url: `${origin}/pricing?cancelled=true`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        tier: tier,
        promo_code: promoCode || '',
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          user_email: user.email,
          tier: tier,
        },
      },
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      ...(promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
      // Allow promo code input at checkout if none was pre-applied
      ...(!promotionCodeId && { allow_promotion_codes: true }),
    };

    const session = await stripe.checkout.sessions.create(sessionOptions);
    logStep("Checkout session created", { sessionId: session.id, url: session.url, tier });

    return new Response(JSON.stringify({ url: session.url }), {
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
