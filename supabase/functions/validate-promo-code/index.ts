import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-PROMO-CODE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { promoCode } = await req.json();
    if (!promoCode || typeof promoCode !== 'string') {
      return new Response(JSON.stringify({ 
        valid: false, 
        message: "Promo code is required" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const normalizedCode = promoCode.trim().toUpperCase();
    logStep("Validating promo code", { code: normalizedCode });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Search for active promotion codes matching the entered code
    const promoCodes = await stripe.promotionCodes.list({
      code: normalizedCode,
      active: true,
      limit: 1,
    });

    if (promoCodes.data.length === 0) {
      logStep("Promo code not found or inactive", { code: normalizedCode });
      return new Response(JSON.stringify({ 
        valid: false, 
        message: "Invalid or expired promo code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const promoCodeData = promoCodes.data[0];
    const coupon = promoCodeData.coupon;

    // Check if max redemptions reached
    if (promoCodeData.max_redemptions && promoCodeData.times_redeemed >= promoCodeData.max_redemptions) {
      logStep("Promo code max redemptions reached", { code: normalizedCode });
      return new Response(JSON.stringify({ 
        valid: false, 
        message: "This promo code has reached its maximum uses" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Build discount description
    let discountDescription = '';
    if (coupon.percent_off) {
      discountDescription = `${coupon.percent_off}% off`;
    } else if (coupon.amount_off) {
      const currency = (coupon.currency || 'usd').toUpperCase();
      discountDescription = `$${(coupon.amount_off / 100).toFixed(2)} ${currency} off`;
    }

    // Check for trial days in metadata
    const trialDays = promoCodeData.metadata?.trial_days || 
      coupon.metadata?.trial_days || 
      null;

    if (trialDays) {
      discountDescription += ` + ${trialDays} day free trial`;
    }

    logStep("Promo code valid", { 
      code: normalizedCode, 
      promoId: promoCodeData.id,
      discount: discountDescription 
    });

    return new Response(JSON.stringify({ 
      valid: true, 
      code: normalizedCode,
      promoId: promoCodeData.id,
      discountDescription,
      percentOff: coupon.percent_off || null,
      amountOff: coupon.amount_off || null,
      trialDays: trialDays ? parseInt(trialDays) : null,
      message: `Code "${normalizedCode}" is valid: ${discountDescription}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      valid: false, 
      message: "Failed to validate promo code" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
