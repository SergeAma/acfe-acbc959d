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

    const { priceCents } = await req.json();
    if (!priceCents || typeof priceCents !== 'number' || priceCents < 100) {
      throw new Error("Invalid price. Minimum is $1.00 (100 cents)");
    }
    logStep("Price to set", { priceCents });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find the existing monthly subscription product
    const prices = await stripe.prices.list({
      type: 'recurring',
      limit: 10,
    });
    logStep("Fetched prices", { count: prices.data.length });

    // Find a monthly recurring price
    const monthlyPrice = prices.data.find(
      (p: { recurring?: { interval: string }; active: boolean }) => p.recurring?.interval === 'month' && p.active
    );

    if (!monthlyPrice) {
      // Create a new product and price if none exists
      logStep("No monthly subscription found, creating new product");
      
      const product = await stripe.products.create({
        name: "ACFE Monthly Subscription",
        description: "Access to all paid courses on the ACFE platform",
      });
      logStep("Created product", { productId: product.id });

      const newPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: priceCents,
        currency: 'usd',
        recurring: { interval: 'month' },
      });
      logStep("Created new price", { priceId: newPrice.id, amount: priceCents });

      return new Response(
        JSON.stringify({ 
          success: true, 
          priceId: newPrice.id,
          amount: priceCents,
          message: "Subscription price created successfully"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Archive the old price and create a new one with the updated amount
    const productId = typeof monthlyPrice.product === 'string' 
      ? monthlyPrice.product 
      : monthlyPrice.product.id;
    
    logStep("Found existing price", { priceId: monthlyPrice.id, productId, currentAmount: monthlyPrice.unit_amount });

    // Archive the old price
    await stripe.prices.update(monthlyPrice.id, { active: false });
    logStep("Archived old price");

    // Create a new price with the updated amount
    const newPrice = await stripe.prices.create({
      product: productId,
      unit_amount: priceCents,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    logStep("Created new price", { priceId: newPrice.id, amount: priceCents });

    return new Response(
      JSON.stringify({ 
        success: true, 
        priceId: newPrice.id,
        oldPriceId: monthlyPrice.id,
        amount: priceCents,
        message: "Subscription price updated successfully"
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
