import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorshipResponseNotification {
  studentId: string;
  mentorName: string;
  status: 'accepted' | 'course_required';
  message?: string;
  courseId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mentorship response notification called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, mentorName, status, message, courseId }: MentorshipResponseNotification = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get student's email
    const { data: studentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', studentId)
      .single();

    if (profileError || !studentProfile) {
      console.error("Failed to get student profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Student not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get course title if needed
    let courseTitle = '';
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();
      courseTitle = course?.title || 'the recommended course';
    }

    console.log(`Sending mentorship response notification to ${studentProfile.email}`);

    const currentYear = new Date().getFullYear();
    const studentName = studentProfile.full_name?.split(' ')[0] || 'there';

    const isAccepted = status === 'accepted';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4a7c59 0%, #2d4a35 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${isAccepted ? 'Welcome to the Cohort! 🎉' : 'Update on Your Mentorship Request'}</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello ${studentName},</p>
    
    ${isAccepted ? `
    <p>Great news! <strong>${mentorName}</strong> has accepted your mentorship request. You are now part of their cohort!</p>
    
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a7c59;">
      <h3 style="margin-top: 0; color: #4a7c59;">What's Next?</h3>
      <ul style="padding-left: 20px;">
        <li>Access the cohort community board to connect with your mentor and fellow mentees</li>
        <li>Introduce yourself to the community</li>
        <li>Start your learning journey!</li>
      </ul>
      ${message ? `<p style="margin-top: 15px;"><strong>Message from ${mentorName}:</strong> "${message}"</p>` : ''}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://acloudforeveryone.org/cohort/community" style="background: #4a7c59; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Join the Community</a>
    </div>
    ` : `
    <p><strong>${mentorName}</strong> has reviewed your mentorship request and recommends that you complete a course first to prepare for the mentorship program.</p>
    
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a7c59;">
      <h3 style="margin-top: 0; color: #4a7c59;">Recommended Course</h3>
      <p>Please complete: <strong>${courseTitle}</strong></p>
      ${message ? `<p style="margin-top: 15px;"><strong>Message from ${mentorName}:</strong> "${message}"</p>` : ''}
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://acloudforeveryone.org/courses/${courseId}" style="background: #4a7c59; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Course</a>
    </div>
    
    <p>Once you complete the course, ${mentorName} will add you to their cohort!</p>
    `}
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
      © ${currentYear} A Cloud for Everyone. All rights reserved.<br>
      <a href="mailto:contact@acloudforeveryone.org" style="color: #4a7c59;">contact@acloudforeveryone.org</a>
    </p>
  </div>
</body>
</html>
    `;

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [studentProfile.email],
      subject: isAccepted 
        ? `You've been accepted into ${mentorName}'s cohort!` 
        : `Update on your mentorship request from ${mentorName}`,
      html: htmlContent,
    });

    console.log("Mentorship response notification sent");

    await supabase.from('email_logs').insert({
      subject: `Mentorship Response: ${status}`,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
