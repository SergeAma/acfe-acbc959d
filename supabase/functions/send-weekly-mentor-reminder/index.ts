import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all mentors with their profile info
    const { data: mentors, error: mentorsError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'mentor')
      .eq('account_status', 'active');

    if (mentorsError) throw mentorsError;

    let sentCount = 0;
    let failedCount = 0;

    for (const mentor of mentors || []) {
      // Check if mentor has incomplete courses (unpublished)
      const { data: unpublishedCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('mentor_id', mentor.id)
        .eq('is_published', false);

      // Check for pending mentorship requests
      const { data: pendingRequests } = await supabase
        .from('mentorship_requests')
        .select('id')
        .eq('mentor_id', mentor.id)
        .eq('status', 'pending');

      // Check if mentor has a cohort with recent activity
      const { data: cohortStudents } = await supabase
        .from('enrollments')
        .select('id, courses!inner(mentor_id)')
        .eq('courses.mentor_id', mentor.id);

      const hasUnfinishedCourses = (unpublishedCourses?.length || 0) > 0;
      const hasPendingRequests = (pendingRequests?.length || 0) > 0;
      const hasCohort = (cohortStudents?.length || 0) > 0;

      // Build personalized reminder content
      const reminders: string[] = [];
      
      if (hasUnfinishedCourses) {
        reminders.push(`📚 You have ${unpublishedCourses?.length} unpublished course(s) waiting to be completed.`);
      }
      
      if (hasPendingRequests) {
        reminders.push(`📩 You have ${pendingRequests?.length} pending mentorship request(s) awaiting your response.`);
      }
      
      if (hasCohort) {
        reminders.push(`👥 Your cohort of ${cohortStudents?.length} student(s) is waiting for your engagement. Share insights, post updates, or schedule a live session!`);
      }

      // If no specific reminders, send general engagement reminder
      if (reminders.length === 0) {
        reminders.push(`🌟 Check in with your students and keep building your impact as a mentor!`);
      }

      const firstName = mentor.full_name?.split(' ')[0] || 'Mentor';

      try {
        await resend.emails.send({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [mentor.email],
          subject: "Your Weekly Mentor Update",
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://mefwbcbnctqjxrwldmjm.supabase.co/storage/v1/object/public/email-assets/acfe-logo-email.png" alt="A Cloud for Everyone" style="max-width: 200px; height: auto;" />
  </div>
  
  <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Hi ${firstName}! 👋</h1>
  
  <p style="margin-bottom: 20px;">Here's your weekly update from A Cloud for Everyone:</p>
  
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    ${reminders.map(r => `<p style="margin: 10px 0;">${r}</p>`).join('')}
  </div>
  
  <p style="margin-bottom: 20px;">Your mentorship makes a real difference in shaping the next generation of African tech talent.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://acloudforeveryone.org/dashboard" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    Best regards,<br>
    The ACFE Team
  </p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px; text-align: center;">
    A Cloud for Everyone<br>
    <a href="mailto:contact@acloudforeveryone.org" style="color: #999;">contact@acloudforeveryone.org</a>
  </p>
</body>
</html>
          `,
        });
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send to ${mentor.email}:`, emailError);
        failedCount++;
      }
    }

    console.log(`Weekly mentor reminders sent: ${sentCount}, failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-mentor-reminder:", error);
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
