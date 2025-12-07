import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  first_name: string;
  role: 'student' | 'mentor';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, role }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to ${email} (${role})`);

    const currentYear = new Date().getFullYear();
    const firstName = first_name || 'there';

    let subject: string;
    let htmlContent: string;

    if (role === 'mentor') {
      subject = `Welcome to A Cloud for Everyone, ${firstName}!`;
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #4a5d4a; color: #ffffff;">
    <!-- Header with image placeholder -->
    <div style="padding: 40px 40px 20px 40px;">
      <h1 style="margin: 0; font-size: 28px; font-weight: normal;">Hello and welcome <strong>${firstName}</strong>,</h1>
    </div>
    
    <!-- Main content -->
    <div style="padding: 20px 40px;">
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        Thank you for stepping forward to mentor the next generation of tech talent. At A Cloud for Everyone (ACFE), we believe that real change happens when knowledge is shared—and your support plays a vital role in making this possible.
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        By joining our mentor community, you're helping learners across Africa not only build digital skills in cloud, cybersecurity, data, AI, and more—but also gain the confidence and career readiness they need to thrive.
      </p>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 20px;">🌍 What to Expect:</h2>
      <ul style="margin: 0 0 20px 0; padding-left: 0; list-style: none;">
        <li style="margin-bottom: 8px;">✔️ Flexible, scalable mentorship opportunities</li>
        <li style="margin-bottom: 8px;">✔️ Support materials to guide your sessions</li>
        <li style="margin-bottom: 8px;">✔️ Regular updates on training cohorts & learner progress</li>
        <li style="margin-bottom: 8px;">✔️ A growing network of like-minded professionals</li>
        <li style="margin-bottom: 8px;">✔️ The chance to shape real futures through real guidance</li>
      </ul>
      
      <p style="margin: 20px 0; line-height: 1.6;">
        🚀 The digital future is here—and your mentorship makes it more accessible and inclusive. We'll be in touch soon with next steps, available cohorts, and resources to help you get started.
      </p>
      
      <p style="margin: 20px 0; line-height: 1.6;">
        In the meantime, connect with us at <a href="https://www.acloudforeveryone.org" style="color: #ffffff; text-decoration: underline;">www.acloudforeveryone.org</a> and keep an eye on your inbox!
      </p>
      
      <p style="margin: 30px 0 10px 0; font-weight: bold; font-size: 18px;">There's a cloud for everyone!</p>
      
      <p style="margin: 20px 0;">
        With gratitude,<br>
        <strong>The ACFE Team</strong><br>
        📧 contact@acloudforeveryone.org
      </p>
    </div>
    
    <!-- Footer -->
    <div style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
      <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7);">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      // Student welcome email
      subject = `Welcome to A Cloud for Everyone, ${firstName}! 🎓`;
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #4a5d4a; color: #ffffff;">
    <!-- Header -->
    <div style="padding: 40px 40px 20px 40px;">
      <h1 style="margin: 0; font-size: 28px; font-weight: normal;">Hello and welcome <strong>${firstName}</strong>,</h1>
    </div>
    
    <!-- Main content -->
    <div style="padding: 20px 40px;">
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        Welcome to A Cloud for Everyone (ACFE)! We're thrilled to have you join our community of learners building the digital skills needed to thrive in today's tech-driven world.
      </p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        Your journey to becoming job-ready in cloud, data, AI, cybersecurity and more starts now. Our platform connects you with experienced mentors and practical courses designed specifically for African youth.
      </p>
      
      <h2 style="margin: 30px 0 15px 0; font-size: 20px;">🎯 Getting Started:</h2>
      <ul style="margin: 0 0 20px 0; padding-left: 0; list-style: none;">
        <li style="margin-bottom: 8px;">✔️ Browse our course catalog and enroll in courses that match your goals</li>
        <li style="margin-bottom: 8px;">✔️ Connect with mentors who can guide your learning journey</li>
        <li style="margin-bottom: 8px;">✔️ Complete your profile to help mentors understand your background</li>
        <li style="margin-bottom: 8px;">✔️ Have a startup idea? Submit it through our Innovator Incubator for mentorship and up to $500 funding!</li>
      </ul>
      
      <p style="margin: 20px 0; line-height: 1.6;">
        🚀 The digital future is here—and you're now part of the movement making it more accessible across Africa.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.acloudforeveryone.org/courses" style="display: inline-block; background-color: #ffffff; color: #4a5d4a; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px;">Explore Courses</a>
      </div>
      
      <p style="margin: 30px 0 10px 0; font-weight: bold; font-size: 18px;">There's a cloud for everyone!</p>
      
      <p style="margin: 20px 0;">
        With gratitude,<br>
        <strong>The ACFE Team</strong><br>
        📧 contact@acloudforeveryone.org
      </p>
    </div>
    
    <!-- Footer -->
    <div style="padding: 20px 40px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
      <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7);">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Welcome email sent:", emailResponse);

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
    console.error("Error in send-welcome-email function:", error);
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
