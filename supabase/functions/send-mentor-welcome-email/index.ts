import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorWelcomeRequest {
  email: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mentor welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: MentorWelcomeRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending mentor welcome email to ${email}`);

    const currentYear = new Date().getFullYear();
    const displayName = name || "there";

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4a7c59 0%, #2d4a35 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to the Team! 🎉</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px;">Hello ${displayName},</p>
    
    <p>Congratulations on becoming a mentor at <strong>A Cloud for Everyone</strong>! We're thrilled to have you join our mission to make tech education accessible across Africa.</p>
    
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a7c59;">
      <h3 style="margin-top: 0; color: #4a7c59;">Getting Started</h3>
      <p>Here's what you can do now:</p>
      <ul style="padding-left: 20px;">
        <li><strong>Complete Your Profile</strong> - Add your bio, skills, and social links so students can learn about you</li>
        <li><strong>Create Your First Course</strong> - Share your expertise by building a course</li>
        <li><strong>Explore the Platform</strong> - Check out what other mentors are teaching</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://acloudforeveryone.org/profile" style="background: #4a7c59; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 5px;">Complete Your Profile</a>
      <a href="https://acloudforeveryone.org/mentor/courses/new" style="background: #2d4a35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin: 5px;">Create a Course</a>
    </div>
    
    <p>If you have any questions or need assistance, don't hesitate to reach out to our team.</p>
    
    <p>Welcome aboard!<br><strong>The A Cloud for Everyone Team</strong></p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      © ${currentYear} A Cloud for Everyone. All rights reserved.<br>
      <a href="mailto:contact@acloudforeveryone.org" style="color: #4a7c59;">contact@acloudforeveryone.org</a>
    </p>
  </div>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: "Welcome to A Cloud for Everyone - You're Now a Mentor! 🎉",
      html: htmlContent,
    });

    console.log("Mentor welcome email sent:", emailResponse);

    // Log the email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('email_logs').insert({
      subject: "Mentor Welcome Email",
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-mentor-welcome-email function:", error);
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
