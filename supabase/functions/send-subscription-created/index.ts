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
    const { email, name, subscription_start } = await req.json();

    console.log("[SEND-SUBSCRIPTION-CREATED] Sending email to:", email);

    const { data, error } = await resend.emails.send({
      from: "Learn Project <noreply@learnproject.co>",
      to: [email],
      subject: "Welcome to Your New Subscription! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Learn Project! 🎉</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${name},</p>
            
            <p style="font-size: 16px;">Thank you for subscribing! Your subscription is now active as of <strong>${subscription_start}</strong>.</p>
            
            <p style="font-size: 16px;">You now have full access to all premium courses and features. Here's what you can do:</p>
            
            <ul style="font-size: 16px; padding-left: 20px;">
              <li>Access all premium courses</li>
              <li>Download course materials</li>
              <li>Earn certificates of completion</li>
              <li>Get priority support</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://learnproject.co/courses" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Start Learning</a>
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
      console.error("[SEND-SUBSCRIPTION-CREATED] Error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-CREATED] Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-SUBSCRIPTION-CREATED] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
