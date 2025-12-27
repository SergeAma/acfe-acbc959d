import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-COUPON] ${step}${detailsStr}`);
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

    // Authenticate admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .rpc('get_user_role', { _user_id: user.id });
    
    if (roleError || roleData !== 'admin') {
      throw new Error("Only admins can create coupons");
    }
    logStep("Admin verified");

    const { code, name } = await req.json();
    if (!code) throw new Error("Coupon code is required");
    logStep("Coupon details", { code, name });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create coupon for 1 week free (100% off, duration 7 days)
    const coupon = await stripe.coupons.create({
      percent_off: 100,
      duration: "once",
      name: name || "1 Week Free Trial",
      max_redemptions: 100,
      redeem_by: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // Valid for 90 days
    });
    logStep("Stripe coupon created", { couponId: coupon.id });

    // Create promotion code with the custom code
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code.toUpperCase(),
      max_redemptions: 100,
    });
    logStep("Promotion code created", { code: promotionCode.code });

    return new Response(JSON.stringify({ 
      success: true,
      coupon_id: coupon.id,
      promo_code: promotionCode.code,
      message: `Coupon "${promotionCode.code}" created successfully! Users can apply this at checkout for 1 week free.`
    }), {
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
