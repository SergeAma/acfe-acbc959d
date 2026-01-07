import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  record.count++;
  return false;
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    console.log("Turnstile verification result:", data.success);
    return data.success === true;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DONATION-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { firstName, lastName, email, amountCents, captchaToken } = await req.json();
    
    // Input validation with length limits
    if (!firstName || typeof firstName !== 'string' || firstName.length > 100) {
      throw new Error("Invalid first name");
    }
    if (!lastName || typeof lastName !== 'string' || lastName.length > 100) {
      throw new Error("Invalid last name");
    }
    if (!email || typeof email !== 'string' || email.length > 255) {
      throw new Error("Invalid email");
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error("Invalid email format");
    }
    
    if (!amountCents || typeof amountCents !== 'number') {
      throw new Error("Invalid amount");
    }
    
    if (amountCents < 1000 || amountCents > 1000000) {
      throw new Error("Donation amount must be between $10 and $10,000");
    }

    // Rate limiting by email
    const rateLimitKey = `donation:${email.toLowerCase().trim()}`;
    if (isRateLimited(rateLimitKey)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Verify CAPTCHA token
    if (!captchaToken || typeof captchaToken !== 'string') {
      return new Response(JSON.stringify({ error: "Please complete the security verification" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const isCaptchaValid = await verifyTurnstile(captchaToken);
    if (!isCaptchaValid) {
      return new Response(JSON.stringify({ error: "Security verification failed. Please try again." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    logStep("CAPTCHA verified successfully");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Payment configuration error");

    const sanitizedFirstName = firstName.trim().substring(0, 100);
    const sanitizedLastName = lastName.trim().substring(0, 100);
    const sanitizedEmail = email.trim().toLowerCase().substring(0, 255);

    logStep("Request validated", { email: sanitizedEmail, amountCents });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: sanitizedEmail, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer");
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: sanitizedEmail,
        name: `${sanitizedFirstName} ${sanitizedLastName}`,
        metadata: {
          source: 'donation',
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
        }
      });
      customerId = customer.id;
      logStep("Created new customer");
    }

    // Create a recurring price for this donation amount
    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'usd',
      recurring: { interval: 'month' },
      product_data: {
        name: `ACFE Monthly Donation - $${(amountCents / 100).toFixed(0)}`,
      },
    });
    logStep("Created price");

    const origin = req.headers.get("origin") || "https://acloudforeveryone.org";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/home`,
      metadata: {
        donation: 'true',
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
      },
      subscription_data: {
        metadata: {
          donation: 'true',
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
        }
      }
    });
    logStep("Created checkout session");

    // Store donation record
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseClient.from('donations').insert({
      first_name: sanitizedFirstName,
      last_name: sanitizedLastName,
      email: sanitizedEmail,
      amount_cents: amountCents,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
      status: 'pending',
    });
    logStep("Stored donation record");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred";
    logStep("ERROR", { message: errorMessage });
    
    // Return generic error to client (don't expose internal details)
    return new Response(JSON.stringify({ error: "Failed to process donation. Please try again." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
