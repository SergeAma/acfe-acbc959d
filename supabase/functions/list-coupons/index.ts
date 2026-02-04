import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[LIST-COUPONS] ${step}${detailsStr}`);
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
      throw new Error("Only admins can view coupons");
    }
    logStep("Admin verified");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // List all promotion codes (both active and inactive for analytics)
    const [activePromoCodes, inactivePromoCodes] = await Promise.all([
      stripe.promotionCodes.list({ limit: 50, active: true }),
      stripe.promotionCodes.list({ limit: 50, active: false }),
    ]);
    
    const allPromoCodes = [...activePromoCodes.data, ...inactivePromoCodes.data];
    logStep("Fetched promotion codes", { 
      active: activePromoCodes.data.length, 
      inactive: inactivePromoCodes.data.length 
    });

    // Calculate analytics
    let totalRedemptions = 0;
    let totalActiveCoupons = 0;
    
    const coupons = allPromoCodes.map((promo: any) => {
      const trialDays = promo.metadata?.trial_days || 
        (typeof promo.coupon === 'object' && promo.coupon.metadata?.trial_days) || 
        null;
      
      const couponType = promo.metadata?.coupon_type || 
        (typeof promo.coupon === 'object' && promo.coupon.metadata?.coupon_type) || 
        (trialDays ? 'trial' : 'discount');
      
      totalRedemptions += promo.times_redeemed || 0;
      if (promo.active) totalActiveCoupons++;

      const couponObj = typeof promo.coupon === 'object' ? promo.coupon : null;

      return {
        id: promo.id,
        code: promo.code,
        coupon_id: promo.coupon.id || promo.coupon,
        name: couponObj?.name || null,
        percent_off: couponObj?.percent_off || null,
        amount_off: couponObj?.amount_off || null,
        duration: couponObj?.duration || null,
        duration_in_months: couponObj?.duration_in_months || null,
        times_redeemed: promo.times_redeemed,
        max_redemptions: promo.max_redemptions,
        active: promo.active,
        created: promo.created,
        trial_days: trialDays ? parseInt(trialDays) : null,
        coupon_type: couponType,
      };
    });

    // Sort: active first, then by times_redeemed desc
    coupons.sort((a, b) => {
      if (a.active !== b.active) return b.active ? 1 : -1;
      return (b.times_redeemed || 0) - (a.times_redeemed || 0);
    });

    // Analytics summary
    const analytics = {
      total_coupons: coupons.length,
      active_coupons: totalActiveCoupons,
      total_redemptions: totalRedemptions,
      top_coupon: coupons.length > 0 ? coupons.reduce((max, c) => 
        (c.times_redeemed || 0) > (max.times_redeemed || 0) ? c : max, coupons[0]
      ) : null,
    };

    return new Response(JSON.stringify({ coupons, analytics }), {
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
