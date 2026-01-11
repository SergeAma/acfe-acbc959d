import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SUBSCRIPTION-PRICE] ${step}${detailsStr}`);
};

// ACFE-specific product IDs - isolated from Spectrogram products
const ACFE_PRODUCTS = {
  membership: {
    productId: "prod_TkCdNAxRmKONyc",
    name: "ACFE Membership",
    settingKey: "subscription_price",
  },
  mentorship_plus: {
    productId: "prod_TkDR4mktfjQo8r",
    name: "ACFE Mentorship Plus",
    settingKey: "mentorship_plus_price",
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();
    
    if (!roleData) {
      throw new Error("Admin access required");
    }
    logStep("Admin role verified");

    const { priceCents, tier = "membership" } = await req.json();
    if (!priceCents || typeof priceCents !== 'number' || priceCents < 100) {
      throw new Error("Invalid price. Minimum is $1.00 (100 cents)");
    }

    const tierConfig = ACFE_PRODUCTS[tier as keyof typeof ACFE_PRODUCTS];
    if (!tierConfig) {
      throw new Error(`Invalid tier: ${tier}. Must be 'membership' or 'mentorship_plus'`);
    }
    logStep("Price update request", { priceCents, tier, productId: tierConfig.productId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find existing active price for this specific ACFE product
    const prices = await stripe.prices.list({
      product: tierConfig.productId,
      active: true,
      type: 'recurring',
      limit: 10,
    });
    logStep("Fetched existing prices", { count: prices.data.length, productId: tierConfig.productId });

    const currentPrice = prices.data.find(
      (p: { recurring?: { interval: string } }) => p.recurring?.interval === 'month'
    );

    // If price already matches, no action needed
    if (currentPrice && currentPrice.unit_amount === priceCents) {
      logStep("Price already matches, no update needed");
      return new Response(
        JSON.stringify({ 
          success: true, 
          priceId: currentPrice.id,
          amount: priceCents,
          message: "Price already up to date"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Archive old price if exists
    if (currentPrice) {
      await stripe.prices.update(currentPrice.id, { active: false });
      logStep("Archived old price", { oldPriceId: currentPrice.id, oldAmount: currentPrice.unit_amount });
    }

    // Create new price for this ACFE product
    const newPrice = await stripe.prices.create({
      product: tierConfig.productId,
      unit_amount: priceCents,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    logStep("Created new price", { priceId: newPrice.id, amount: priceCents });

    // Update platform_settings with new price info
    const { error: updateError } = await supabase
      .from('platform_settings')
      .update({ 
        setting_value: { price_cents: priceCents, price_id: newPrice.id },
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', tierConfig.settingKey);

    if (updateError) {
      logStep("Warning: Failed to update platform_settings", { error: updateError.message });
    } else {
      logStep("Updated platform_settings", { settingKey: tierConfig.settingKey });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        priceId: newPrice.id,
        oldPriceId: currentPrice?.id || null,
        amount: priceCents,
        tier,
        message: `${tierConfig.name} price updated to $${(priceCents / 100).toFixed(2)}/month`
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
