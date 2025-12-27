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

    const emailResponse = await resend.emails.send({
      from: "Learn Project <notifications@resend.dev>",
      to: [email],
      subject: "Your Subscription Has Been Renewed",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Subscription Renewed</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Great news! Your subscription has been successfully renewed.</p>
              
              <div class="info-box">
                <p><strong>Amount Charged:</strong> <span class="amount">${currency} ${amount}</span></p>
                <p><strong>Next Billing Date:</strong> ${next_billing}</p>
              </div>
              
              <p>You'll continue to have unlimited access to all your enrolled courses and learning materials.</p>
              
              <p>Keep up the great work on your learning journey!</p>
              
              <p>Best regards,<br>The Learn Project Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Learn Project. All rights reserved.</p>
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
