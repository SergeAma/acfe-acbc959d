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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referrer, referred, captchaToken }: ReferralRequest = await req.json();

    // Validate required fields
    if (!referrer.firstName || !referrer.lastName || !referrer.email) {
      throw new Error("Referrer first name, last name, and email are required");
    }
    if (!referred.firstName || !referred.lastName || !referred.company || !referred.email) {
      throw new Error("All referred contact fields are required");
    }
    if (!captchaToken) {
      throw new Error("CAPTCHA verification is required");
    }

    // Verify CAPTCHA
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret) {
      throw new Error("CAPTCHA configuration error");
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert referral into database
    const { error: insertError } = await supabase.from("referrals").insert({
      referrer_first_name: referrer.firstName,
      referrer_last_name: referrer.lastName,
      referrer_email: referrer.email,
      referrer_company: referrer.company || null,
      referred_first_name: referred.firstName,
      referred_last_name: referred.lastName,
      referred_company: referred.company,
      referred_email: referred.email,
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error("Failed to save referral");
    }

    // Send notification email to admin
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
            subject: `New Partner Referral from ${referrer.firstName} ${referrer.lastName}`,
            html: `
              <h2>New Partner Referral Received</h2>
              
              <h3>Referrer Information</h3>
              <p><strong>Name:</strong> ${referrer.firstName} ${referrer.lastName}</p>
              <p><strong>Email:</strong> ${referrer.email}</p>
              ${referrer.company ? `<p><strong>Company:</strong> ${referrer.company}</p>` : ''}
              
              <hr/>
              
              <h3>Recommended Contact</h3>
              <p><strong>Name:</strong> ${referred.firstName} ${referred.lastName}</p>
              <p><strong>Institution/Company:</strong> ${referred.company}</p>
              <p><strong>Email:</strong> ${referred.email}</p>
              
              <p style="margin-top: 20px; color: #666;">
                Please follow up with this referral promptly.
              </p>
            `,
          }),
        });
      } catch (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the request if email fails
      }
    }

    console.log("Referral submitted successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Referral submission error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
