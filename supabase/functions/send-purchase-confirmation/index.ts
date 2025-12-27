import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseEmailRequest {
  email: string;
  firstName: string;
  courseTitle: string;
  amount: number;
  isSubscription: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, courseTitle, amount, isSubscription }: PurchaseEmailRequest = await req.json();

    console.log(`[SEND-PURCHASE-CONFIRMATION] Sending to ${email} for course: ${courseTitle}`);

    const subscriptionNote = isSubscription 
      ? `<p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
           This is a monthly subscription at $${amount.toFixed(2)}/month. You can cancel anytime from your dashboard.
         </p>`
      : '';

    const emailResponse = await resend.emails.send({
      from: "ACFE <noreply@resend.dev>",
      to: [email],
      subject: `Welcome to ${courseTitle}! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <div style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Payment Confirmed! ✅</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #111827; margin-bottom: 24px;">
                Hi ${firstName},
              </p>
              
              <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
                Thank you for subscribing to <strong>${courseTitle}</strong>! Your payment of <strong>$${amount.toFixed(2)}</strong> has been processed successfully.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 16px;">What's next?</h3>
                <ul style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Access your course from the Dashboard</li>
                  <li>Complete lessons at your own pace</li>
                  <li>Earn your certificate upon completion</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="https://acfe.lovable.app/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Start Learning Now →
                </a>
              </div>
              
              ${subscriptionNote}
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
                If you have any questions, feel free to reach out to our support team.
              </p>
              
              <p style="font-size: 16px; color: #374151; margin-top: 24px;">
                Happy learning!<br>
                <strong>The ACFE Team</strong>
              </p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                © ${new Date().getFullYear()} Africa Centre for Future Entrepreneurs. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[SEND-PURCHASE-CONFIRMATION] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-PURCHASE-CONFIRMATION] Error:", error);
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
