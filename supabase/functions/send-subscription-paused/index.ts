import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name } = await req.json();

    console.log("[SEND-SUBSCRIPTION-PAUSED] Sending email to:", email);

    const currentYear = new Date().getFullYear();

    const { data, error } = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: "Your Subscription Has Been Paused",
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
              <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b; text-align: center;">Subscription Paused</h1>
              
              <p style="color: #3f3f46;">Hi ${name},</p>
              
              <p style="color: #3f3f46; line-height: 1.6;">Your subscription has been paused. During this time:</p>
              
              <ul style="color: #3f3f46; line-height: 1.8; padding-left: 20px;">
                <li>You won't be charged</li>
                <li>Your premium access is temporarily suspended</li>
                <li>Your progress and data are safely saved</li>
              </ul>
              
              <p style="color: #3f3f46; line-height: 1.6;">Ready to continue your learning journey? You can resume your subscription anytime from your dashboard.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://acloudforeveryone.org/my-subscriptions" style="background: #4a5d4a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Resume Subscription</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">If you have any questions, reply to this email and we'll be happy to help!</p>
              
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

    if (error) {
      console.error("[SEND-SUBSCRIPTION-PAUSED] Error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-PAUSED] Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-SUBSCRIPTION-PAUSED] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
