import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewsletterWelcomeRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Newsletter welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: NewsletterWelcomeRequest = await req.json();
    
    console.log(`Sending newsletter welcome email to ${email}`);

    const currentYear = new Date().getFullYear();

    const subject = `Welcome to Africa's Weekly Tech Digest! 🌍`;
    const htmlContent = `
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
      <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">Weekly Africa Tech Digest</div>
    </div>
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px;">
      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px;">Welcome to Our Community! 🎉</h2>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        Thank you for subscribing to our newsletter! You've just joined a growing community of tech enthusiasts, innovators, and change-makers across Africa.
      </p>
      
      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #4a5d4a;">
        <h3 style="margin: 0 0 15px 0; color: #166534; font-size: 18px;">📬 What to Expect:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #333333; line-height: 1.8;">
          <li>Curated insights on African startups and tech trends</li>
          <li>Updates on digital skills programs and opportunities</li>
          <li>VC deals and funding news across the continent</li>
          <li>Educational resources and course recommendations</li>
        </ul>
      </div>
      
      <h3 style="margin: 30px 0 15px 0; color: #1a1a1a; font-size: 18px;">Want to Do More?</h3>
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        Join A Cloud for Everyone to access our full platform of courses, connect with mentors, and accelerate your digital skills journey.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.acloudforeveryone.org/auth" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px;">Create Your Account</a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #333333;">
        Stay curious,<br><br>
        <strong>The ACFE Team</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 0; padding: 24px; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
        There's a cloud for everyone!
      </p>
      <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a;">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
      </p>
      <p style="margin: 0; font-size: 11px; color: #999999;">
        You're receiving this because you subscribed to our newsletter.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Newsletter welcome email sent:", emailResponse);

    // Log the email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('email_logs').insert({
      subject: subject,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-newsletter-welcome function:", error);
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
