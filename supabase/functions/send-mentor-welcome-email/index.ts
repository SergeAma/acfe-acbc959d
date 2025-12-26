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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentYear = new Date().getFullYear();
    const displayName = name || "there";

    // Send welcome email to the new mentor
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

    // Log the welcome email
    await supabase.from('email_logs').insert({
      subject: "Mentor Welcome Email",
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    // Get admin emails to notify them
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRoles && adminRoles.length > 0) {
      // Get admin profiles to get their emails
      const adminIds = adminRoles.map(r => r.user_id);
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('email, full_name')
        .in('id', adminIds);

      if (adminProfiles && adminProfiles.length > 0) {
        const adminEmails = adminProfiles.map(p => p.email);
        
        // Send notification email to admins
        const adminNotificationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4a7c59 0%, #2d4a35 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Mentor Joined! 🎉</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello Admin,</p>
    
    <p>Great news! A new mentor has accepted their invitation and joined <strong>A Cloud for Everyone</strong>.</p>
    
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a7c59;">
      <h3 style="margin-top: 0; color: #4a7c59;">New Mentor Details</h3>
      <p><strong>Name:</strong> ${displayName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Joined:</strong> ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://acloudforeveryone.org/admin/users" style="background: #4a7c59; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View All Users</a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      © ${currentYear} A Cloud for Everyone. All rights reserved.
    </p>
  </div>
</body>
</html>
        `;

        try {
          await resend.emails.send({
            from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
            to: adminEmails,
            subject: `New Mentor Joined: ${displayName}`,
            html: adminNotificationHtml,
          });

          console.log("Admin notification sent to:", adminEmails);

          // Log the admin notification email
          await supabase.from('email_logs').insert({
            subject: `Admin Notification: New Mentor ${displayName}`,
            status: 'sent',
            sent_at: new Date().toISOString()
          });
        } catch (adminEmailError) {
          console.error("Failed to send admin notification:", adminEmailError);
          // Don't fail the whole request if admin notification fails
        }
      }
    }

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
