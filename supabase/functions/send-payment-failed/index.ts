import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentFailedEmailRequest {
  email: string;
  name: string;
  amount: string;
  currency: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, currency }: PaymentFailedEmailRequest = await req.json();

    console.log("[SEND-PAYMENT-FAILED] Sending to:", email);

    const emailResponse = await resend.emails.send({
      from: "Learn Project <notifications@resend.dev>",
      to: [email],
      subject: "Payment Failed - Action Required",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Payment Failed</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>We were unable to process your subscription payment.</p>
              
              <div class="info-box">
                <p><strong>Amount:</strong> ${currency} ${amount}</p>
                <p>Please update your payment method to continue your subscription.</p>
              </div>
              
              <p>To update your payment information:</p>
              <ol>
                <li>Log in to your dashboard</li>
                <li>Click on "Manage Subscription"</li>
                <li>Update your payment method</li>
              </ol>
              
              <p>If you need any assistance, please don't hesitate to reach out.</p>
              
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

    console.log("[SEND-PAYMENT-FAILED] Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-PAYMENT-FAILED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
