import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorRequestConfirmationRequest {
  email: string;
  first_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Mentor request confirmation email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name }: MentorRequestConfirmationRequest = await req.json();
    
    console.log(`Sending mentor request confirmation email to ${email}`);

    const currentYear = new Date().getFullYear();
    const firstName = first_name || 'there';

    const subject = `We've Received Your Mentor Application`;
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
      <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
    </div>
    
    <!-- Main content -->
    <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px;">
      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 22px;">Hello ${firstName},</h2>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6; color: #333333;">
        Thank you for applying to become a mentor at A Cloud for Everyone! We're excited that you want to help shape the next generation of African tech talent.
      </p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #4a5d4a; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #333333; font-weight: 500;">
          📋 <strong>Application Status:</strong> Under Review
        </p>
        <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px;">
          Our team is carefully reviewing your application to ensure the best fit for our mentorship community.
        </p>
      </div>
      
      <h3 style="margin: 30px 0 15px 0; color: #1a1a1a; font-size: 16px;">What happens next?</h3>
      <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #333333; line-height: 1.8;">
        <li>Our team will review your application within <strong>3-5 business days</strong></li>
        <li>You'll receive an email notification with our decision</li>
        <li>If approved, you'll get access to create courses and mentor students</li>
      </ul>
      
      <p style="margin: 20px 0; line-height: 1.6; color: #333333;">
        In the meantime, feel free to explore our platform and browse existing courses to get a sense of what our mentors offer.
      </p>
      
      <p style="margin: 30px 0 0 0; color: #333333;">
        Thank you for your patience,<br><br>
        <strong>The ACFE Team</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 0; padding: 24px; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
        There's a cloud for everyone!
      </p>
      <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
      <p style="margin: 0; font-size: 12px; color: #71717a;">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
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

    console.log("Mentor request confirmation email sent:", emailResponse);

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
    console.error("Error in send-mentor-request-confirmation function:", error);
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
