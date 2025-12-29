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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- ACFE Text Header -->
    <div style="text-align: center; margin-bottom: 0; background-color: #3f3f3f; padding: 24px; border-radius: 12px 12px 0 0;">
      <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
      <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
    </div>
    
    <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
      <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b;">${isAccepted ? 'Welcome to the Cohort! 🎉' : 'Update on Your Mentorship Request'}</h1>
      
      <p style="color: #3f3f46;">Hello ${studentName},</p>
      
      ${isAccepted ? `
      <p style="color: #3f3f46; line-height: 1.6;">Great news! <strong>${mentorName}</strong> has accepted your mentorship request. You are now part of their cohort!</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a5d4a;">
        <h3 style="margin-top: 0; color: #166534;">What's Next?</h3>
        <ul style="padding-left: 20px; color: #3f3f46; line-height: 1.8;">
          <li>Access the cohort community board to connect with your mentor and fellow mentees</li>
          <li>Introduce yourself to the community</li>
          <li>Start your learning journey!</li>
        </ul>
        ${message ? `<p style="margin-top: 15px; color: #3f3f46;"><strong>Message from ${mentorName}:</strong> "${message}"</p>` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://acloudforeveryone.org/cohort/community" style="background: #4a5d4a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join the Community</a>
      </div>
      ` : `
      <p style="color: #3f3f46; line-height: 1.6;"><strong>${mentorName}</strong> has reviewed your mentorship request and recommends that you complete a course first to prepare for the mentorship program.</p>
      
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <h3 style="margin-top: 0; color: #92400e;">Recommended Course</h3>
        <p style="color: #3f3f46;">Please complete: <strong>${courseTitle}</strong></p>
        ${message ? `<p style="margin-top: 15px; color: #3f3f46;"><strong>Message from ${mentorName}:</strong> "${message}"</p>` : ''}
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://acloudforeveryone.org/courses/${courseId}" style="background: #4a5d4a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Course</a>
      </div>
      
      <p style="color: #3f3f46; line-height: 1.6;">Once you complete the course, ${mentorName} will add you to their cohort!</p>
      `}
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 24px;">
      <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
      <p style="font-size: 12px; color: #71717a; margin: 0 0 8px 0;">
        © ${currentYear} A Cloud for Everyone. All rights reserved.
      </p>
      <a href="mailto:contact@acloudforeveryone.org" style="color: #4a5d4a; font-size: 12px;">contact@acloudforeveryone.org</a>
    </div>
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
