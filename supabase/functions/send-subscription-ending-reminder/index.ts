import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderEmailRequest {
  email: string;
  name: string;
  subscription_end: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, subscription_end }: ReminderEmailRequest = await req.json();

    console.log("[SEND-SUBSCRIPTION-ENDING-REMINDER] Sending to:", email);

    const emailResponse = await resend.emails.send({
      from: "Learn Project <notifications@resend.dev>",
      to: [email],
      subject: "Your Subscription is Ending Soon",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Subscription Ending Soon</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>This is a friendly reminder that your subscription is set to end soon.</p>
              
              <div class="info-box">
                <p><strong>Access Ends On:</strong> ${subscription_end}</p>
                <p>After this date, you'll lose access to premium course content.</p>
              </div>
              
              <p>If you'd like to continue learning with us, you can reactivate your subscription at any time from your dashboard.</p>
              
              <p>We'd love to keep you in our learning community!</p>
              
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

    console.log("[SEND-SUBSCRIPTION-ENDING-REMINDER] Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-SUBSCRIPTION-ENDING-REMINDER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
