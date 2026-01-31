import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OtpEmailRequest {
  email: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token }: OtpEmailRequest = await req.json();

    if (!email || !token) {
      throw new Error("Missing required fields: email and token");
    }

    console.log("[OTP-EMAIL] Sending OTP to:", email);

    const emailResponse = await resend.emails.send({
      from: "ACFE <noreply@acloudforeveryone.org>",
      to: [email],
      subject: "Your ACFE login code",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://acloudforeveryone.org/acfe-logo.png" alt="ACFE Logo" style="height: 60px; width: auto;">
  </div>
  
  <h1 style="font-size: 24px; font-weight: 600; text-align: center; margin-bottom: 20px;">
    Your Login Code
  </h1>
  
  <p style="font-size: 16px; text-align: center; margin-bottom: 30px;">
    Use this code to sign in to A Cloud for Everyone:
  </p>
  
  <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 30px;">
    <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #18181b;">
      ${token}
    </span>
  </div>
  
  <p style="font-size: 14px; color: #71717a; text-align: center; margin-bottom: 20px;">
    This code expires in <strong>10 minutes</strong>.
  </p>
  
  <p style="font-size: 14px; color: #71717a; text-align: center;">
    If you didn't request this code, you can safely ignore this email.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;">
  
  <p style="font-size: 12px; color: #a1a1aa; text-align: center;">
    A Cloud for Everyone — Empowering the next generation of cloud professionals in Africa
  </p>
</body>
</html>
      `,
    });

    console.log("[OTP-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[OTP-EMAIL] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
