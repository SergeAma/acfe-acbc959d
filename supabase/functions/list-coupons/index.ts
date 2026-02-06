import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyAdmin, corsHeaders } from "../_shared/auth.ts";

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

    // Verify admin access using shared middleware
    const { user, supabase } = await verifyAdmin(req);
    logStep("Admin verified", { userId: user.id });

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
    
    // Return 401 for auth errors, 500 for other errors
    const status = errorMessage.includes('authorization') || 
                   errorMessage.includes('token') || 
                   errorMessage.includes('Admin') ? 401 : 500;
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
