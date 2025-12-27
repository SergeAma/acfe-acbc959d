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
    const { email, name, next_billing } = await req.json();

    console.log("[SEND-SUBSCRIPTION-RESUMED] Sending email to:", email);

    const { data, error } = await resend.emails.send({
      from: "Learn Project <noreply@learnproject.co>",
      to: [email],
      subject: "Welcome Back! Your Subscription is Active ▶️",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome Back! ▶️</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${name},</p>
            
            <p style="font-size: 16px;">Great news! Your subscription has been resumed and you're back in action.</p>
            
            <p style="font-size: 16px;">Your premium access is now fully restored. You can:</p>
            
            <ul style="font-size: 16px; padding-left: 20px;">
              <li>Continue all your courses</li>
              <li>Access premium content</li>
              <li>Download course materials</li>
              <li>Earn certificates</li>
            </ul>
            
            <p style="font-size: 16px;">Your next billing date is <strong>${next_billing}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://learnproject.co/courses" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Continue Learning</a>
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
      console.error("[SEND-SUBSCRIPTION-RESUMED] Error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-RESUMED] Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-SUBSCRIPTION-RESUMED] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
