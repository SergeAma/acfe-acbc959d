import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RenewedEmailRequest {
  email: string;
  name: string;
  amount: string;
  currency: string;
  next_billing: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, currency, next_billing }: RenewedEmailRequest = await req.json();

    console.log("[SEND-SUBSCRIPTION-RENEWED] Sending to:", email);

    const currentYear = new Date().getFullYear();
    const displayAmount = amount || 'N/A';
    const displayCurrency = currency || 'USD';
    const displayNextBilling = next_billing || 'N/A';

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: "Your Subscription Has Been Renewed",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- ACFE Text Header -->
            <div style="text-align: center; margin-bottom: 0; background-color: #3f3f3f; padding: 24px; border-radius: 12px 12px 0 0;">
              <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
              <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
            </div>
            
            <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b; text-align: center;">Subscription Renewed</h1>
              
              <p style="color: #3f3f46;">Hi ${name},</p>
              <p style="color: #3f3f46; line-height: 1.6;">Great news! Your subscription has been successfully renewed.</p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a5d4a;">
                <p style="margin: 0 0 10px 0; color: #166534;"><strong>Amount Charged:</strong> ${displayCurrency} ${displayAmount}</p>
                <p style="margin: 0; color: #166534;"><strong>Next Billing Date:</strong> ${displayNextBilling}</p>
              </div>
              
              <p style="color: #3f3f46; line-height: 1.6;">You'll continue to have unlimited access to all your enrolled courses and learning materials.</p>
              
              <p style="color: #3f3f46; line-height: 1.6;">Keep up the great work on your learning journey!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://acloudforeveryone.org/dashboard" style="background: #4a5d4a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
              </div>
              
              <p style="color: #3f3f46; margin-top: 24px;">Best regards,<br><strong>The ACFE Team</strong></p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 24px;">
              <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
              <p style="font-size: 12px; color: #71717a; margin: 0;">
                © ${currentYear} A Cloud for Everyone. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[SEND-SUBSCRIPTION-RENEWED] Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-SUBSCRIPTION-RENEWED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
