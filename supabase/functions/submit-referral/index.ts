import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReferralRequest {
  referrer: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
  };
  referred: {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
  };
  captchaToken: string;
}

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3;

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

// HTML escape function to prevent XSS in emails
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referrer, referred, captchaToken }: ReferralRequest = await req.json();

    // Validate required fields with length limits
    if (!referrer?.firstName || typeof referrer.firstName !== 'string' || referrer.firstName.length > 100) {
      throw new Error("Invalid referrer first name");
    }
    if (!referrer?.lastName || typeof referrer.lastName !== 'string' || referrer.lastName.length > 100) {
      throw new Error("Invalid referrer last name");
    }
    if (!referrer?.email || typeof referrer.email !== 'string' || referrer.email.length > 255) {
      throw new Error("Invalid referrer email");
    }
    if (!referrer?.company || typeof referrer.company !== 'string' || referrer.company.length > 200) {
      throw new Error("Invalid referrer company");
    }
    if (!referred?.firstName || typeof referred.firstName !== 'string' || referred.firstName.length > 100) {
      throw new Error("Invalid referred first name");
    }
    if (!referred?.lastName || typeof referred.lastName !== 'string' || referred.lastName.length > 100) {
      throw new Error("Invalid referred last name");
    }
    if (!referred?.company || typeof referred.company !== 'string' || referred.company.length > 200) {
      throw new Error("Invalid referred company");
    }
    if (!referred?.email || typeof referred.email !== 'string' || referred.email.length > 255) {
      throw new Error("Invalid referred email");
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(referrer.email.trim()) || !emailRegex.test(referred.email.trim())) {
      throw new Error("Invalid email format");
    }

    if (!captchaToken || typeof captchaToken !== 'string') {
      throw new Error("CAPTCHA verification is required");
    }

    // Rate limiting by referrer email
    const rateLimitKey = `referral:${referrer.email.toLowerCase().trim()}`;
    if (isRateLimited(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify CAPTCHA
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret) {
      throw new Error("Security configuration error");
    }

    const captchaResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: captchaToken,
      }),
    });

    const captchaResult = await captchaResponse.json();
    if (!captchaResult.success) {
      throw new Error("CAPTCHA verification failed");
    }

    // Sanitize all inputs
    const sanitizedReferrer = {
      firstName: referrer.firstName.trim().substring(0, 100),
      lastName: referrer.lastName.trim().substring(0, 100),
      email: referrer.email.trim().toLowerCase().substring(0, 255),
      company: referrer.company.trim().substring(0, 200),
    };

    const sanitizedReferred = {
      firstName: referred.firstName.trim().substring(0, 100),
      lastName: referred.lastName.trim().substring(0, 100),
      company: referred.company.trim().substring(0, 200),
      email: referred.email.trim().toLowerCase().substring(0, 255),
    };

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert referral into database
    const { error: insertError } = await supabase.from("referrals").insert({
      referrer_first_name: sanitizedReferrer.firstName,
      referrer_last_name: sanitizedReferrer.lastName,
      referrer_email: sanitizedReferrer.email,
      referrer_company: sanitizedReferrer.company,
      referred_first_name: sanitizedReferred.firstName,
      referred_last_name: sanitizedReferred.lastName,
      referred_company: sanitizedReferred.company,
      referred_email: sanitizedReferred.email,
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Failed to save referral");
    }

    // Send notification email to admin with escaped HTML
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "ACFE <noreply@acloudforeveryone.org>",
            to: ["team@acloudforeveryone.org"],
            subject: `New Partner Referral from ${escapeHtml(sanitizedReferrer.firstName)} ${escapeHtml(sanitizedReferrer.lastName)}`,
            html: `
              <h2>New Partner Referral Received</h2>
              
              <h3>Referrer Information</h3>
              <p><strong>Name:</strong> ${escapeHtml(sanitizedReferrer.firstName)} ${escapeHtml(sanitizedReferrer.lastName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(sanitizedReferrer.email)}</p>
              ${sanitizedReferrer.company ? `<p><strong>Company:</strong> ${escapeHtml(sanitizedReferrer.company)}</p>` : ''}
              
              <hr/>
              
              <h3>Recommended Contact</h3>
              <p><strong>Name:</strong> ${escapeHtml(sanitizedReferred.firstName)} ${escapeHtml(sanitizedReferred.lastName)}</p>
              <p><strong>Institution/Company:</strong> ${escapeHtml(sanitizedReferred.company)}</p>
              <p><strong>Email:</strong> ${escapeHtml(sanitizedReferred.email)}</p>
              
              <p style="margin-top: 20px; color: #666;">
                Please follow up with this referral promptly.
              </p>
            `,
          }),
        });
      } catch (emailError) {
        console.error("Email notification error");
        // Don't fail the request if email fails
      }
    }

    console.log("Referral submitted successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Referral submission error");
    const message = error instanceof Error ? error.message : "Failed to submit referral";
    
    // Return user-friendly error without exposing internals
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
