import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DonationWelcomeRequest {
  email: string;
  firstName: string;
  lastName: string;
  amountCents: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, amountCents }: DonationWelcomeRequest = await req.json();
    const amount = (amountCents / 100).toFixed(2);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://mefwbcbnctqjxrwldmjm.supabase.co/storage/v1/object/public/email-assets/acfe-logo-email.png" alt="ACFE Logo" style="height: 80px;">
        </div>
        
        <h1 style="color: #4a7c59; text-align: center;">Thank You, ${firstName}! 🙏</h1>
        
        <p>Your monthly donation of <strong>$${amount}</strong> means the world to us and the young learners across Africa we support.</p>
        
        <div style="background: linear-gradient(135deg, #f0f7e6 0%, #e8f5e9 100%); padding: 20px; border-radius: 12px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #4a7c59;">Your Impact:</h3>
          <ul style="padding-left: 20px;">
            <li>Sponsoring internships through Spectrogram Consulting</li>
            <li>Providing access to learning resources</li>
            <li>Supporting mentorship programs</li>
            <li>Helping young Africans build tech careers</li>
          </ul>
        </div>
        
        <p>As a valued donor, you'll receive regular updates on how your contribution is making a difference.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://acloudforeveryone.org/home" style="background-color: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">Visit Our Platform</a>
        </div>
        
        <p>With gratitude,<br><strong>The ACFE Team</strong></p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666; text-align: center;">
          You can manage your donation at any time through the Stripe customer portal.<br>
          A Cloud For Everyone • Empowering Africa's Tech Career
        </p>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "A Cloud For Everyone <noreply@acloudforeveryone.org>",
        to: [email],
        subject: "Thank You for Your Generous Support! 💚",
        html: emailHtml,
      }),
    });

    const result = await emailResponse.json();
    console.log("Donation welcome email sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending donation welcome email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
