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

    const { data, error } = await resend.emails.send({
      from: "Learn Project <noreply@learnproject.co>",
      to: [email],
      subject: "Your Subscription Has Been Paused ⏸️",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #6b7280; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Subscription Paused ⏸️</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${name},</p>
            
            <p style="font-size: 16px;">Your subscription has been paused. During this time:</p>
            
            <ul style="font-size: 16px; padding-left: 20px;">
              <li>You won't be charged</li>
              <li>Your premium access is temporarily suspended</li>
              <li>Your progress and data are safely saved</li>
            </ul>
            
            <p style="font-size: 16px;">Ready to continue your learning journey? You can resume your subscription anytime from your dashboard.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://learnproject.co/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Resume Subscription</a>
            </div>
            
            <p style="font-size: 14px; color: #666;">If you have any questions, reply to this email and we'll be happy to help!</p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Learn Project. All rights reserved.</p>
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
