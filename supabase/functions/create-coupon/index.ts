import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyAdmin, corsHeaders } from "../_shared/auth.ts";

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

    // Verify admin access using shared middleware
    const { user, supabase } = await verifyAdmin(req);
    logStep("Admin verified", { userId: user.id });

    const body = await req.json();
    const { 
      code, 
      name, 
      // Coupon type: 'trial' (100% off for X days) or 'discount' (X% off for duration)
      couponType = 'trial',
      // For trial coupons
      trialDays,
      // For discount coupons
      percentOff,
      amountOffCents,
      duration = 'once', // 'once', 'repeating', 'forever'
      durationInMonths,
    } = body;

    if (!code) throw new Error("Coupon code is required");
    
    logStep("Request body", { code, name, couponType, trialDays, percentOff, amountOffCents, duration, durationInMonths });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    let couponParams: Stripe.CouponCreateParams;
    let couponName: string;
    let responseMessage: string;

    if (couponType === 'trial') {
      // TRIAL COUPON: 100% off for trial period (legacy behavior)
      if (trialDays === undefined || trialDays === null) {
        throw new Error("Trial days must be specified for trial coupons");
      }
      
      const parsedTrialDays = parseInt(trialDays);
      if (isNaN(parsedTrialDays) || parsedTrialDays < 1) {
        throw new Error("Trial days must be a positive number");
      }
      
      const validTrialDays = Math.min(Math.max(parsedTrialDays, 1), 90);
      
      const formatTrialDuration = (days: number) => {
        if (days === 1) return "1 Day";
        if (days < 7) return `${days} Days`;
        if (days === 7) return "1 Week";
        if (days === 14) return "2 Weeks";
        if (days === 30) return "1 Month";
        return `${days} Days`;
      };

      const trialLabel = formatTrialDuration(validTrialDays);
      const rawName = name || `${trialLabel} Free Trial`;
      couponName = rawName.length > 40 ? rawName.substring(0, 37) + '...' : rawName;

      couponParams = {
        percent_off: 100,
        duration: "once",
        name: couponName,
        max_redemptions: 100,
        redeem_by: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
        metadata: {
          trial_days: validTrialDays.toString(),
          coupon_type: 'trial',
        },
      };

      responseMessage = `Coupon "${code.toUpperCase()}" created! Users get ${trialLabel} free, then normal billing.`;
      logStep("Creating trial coupon", { trialDays: validTrialDays });

    } else if (couponType === 'discount') {
      // DISCOUNT COUPON: Configurable percentage/amount off for specified duration
      
      // Validate discount amount
      if (!percentOff && !amountOffCents) {
        throw new Error("Either percentOff or amountOffCents must be specified for discount coupons");
      }
      
      if (percentOff && amountOffCents) {
        throw new Error("Cannot specify both percentOff and amountOffCents");
      }

      if (percentOff) {
        const parsedPercent = parseFloat(percentOff);
        if (isNaN(parsedPercent) || parsedPercent <= 0 || parsedPercent > 100) {
          throw new Error("percentOff must be between 1 and 100");
        }
      }

      if (amountOffCents) {
        const parsedAmount = parseInt(amountOffCents);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error("amountOffCents must be a positive number");
        }
      }

      // Validate duration
      const validDurations = ['once', 'repeating', 'forever'];
      if (!validDurations.includes(duration)) {
        throw new Error("Duration must be 'once', 'repeating', or 'forever'");
      }

      if (duration === 'repeating') {
        if (!durationInMonths) {
          throw new Error("durationInMonths is required when duration is 'repeating'");
        }
        const parsedMonths = parseInt(durationInMonths);
        if (isNaN(parsedMonths) || parsedMonths < 1 || parsedMonths > 36) {
          throw new Error("durationInMonths must be between 1 and 36");
        }
      }

      // Build coupon name
      const discountLabel = percentOff ? `${percentOff}% Off` : `$${(amountOffCents / 100).toFixed(0)} Off`;
      let durationLabel = '';
      if (duration === 'once') durationLabel = '(One-time)';
      else if (duration === 'forever') durationLabel = '(Forever)';
      else if (duration === 'repeating') durationLabel = `(${durationInMonths} month${parseInt(durationInMonths) > 1 ? 's' : ''})`;
      
      const rawName = name || `${discountLabel} ${durationLabel}`;
      couponName = rawName.length > 40 ? rawName.substring(0, 37) + '...' : rawName;

      couponParams = {
        duration: duration as Stripe.CouponCreateParams.Duration,
        name: couponName,
        max_redemptions: 100,
        redeem_by: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // Valid for 1 year
        metadata: {
          coupon_type: 'discount',
        },
      };

      // Add discount amount
      if (percentOff) {
        couponParams.percent_off = parseFloat(percentOff);
      } else {
        couponParams.amount_off = parseInt(amountOffCents);
        couponParams.currency = 'usd';
      }

      // Add duration in months for repeating coupons
      if (duration === 'repeating') {
        couponParams.duration_in_months = parseInt(durationInMonths);
      }

      responseMessage = `Coupon "${code.toUpperCase()}" created! ${discountLabel} ${durationLabel}`;
      logStep("Creating discount coupon", { percentOff, amountOffCents, duration, durationInMonths });

    } else {
      throw new Error("Invalid coupon type. Must be 'trial' or 'discount'");
    }

    logStep("Stripe coupon params", couponParams);

    // Create coupon in Stripe
    const coupon = await stripe.coupons.create(couponParams);
    logStep("Stripe coupon created", { couponId: coupon.id });

    // Create promotion code with the custom code
    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code.toUpperCase(),
      max_redemptions: 100,
      metadata: couponParams.metadata,
    });
    logStep("Promotion code created", { code: promotionCode.code });

    return new Response(JSON.stringify({ 
      success: true,
      coupon_id: coupon.id,
      promo_code: promotionCode.code,
      coupon_type: body.couponType || 'trial',
      message: responseMessage,
    }), {
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
