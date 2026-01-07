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

    // Get all students with their profile info
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'student')
      .eq('account_status', 'active');

    if (studentsError) throw studentsError;

    let sentCount = 0;
    let failedCount = 0;

    for (const student of students || []) {
      // Check for enrolled courses with progress and drip info
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, progress, courses(title, drip_enabled, drip_schedule_type, drip_release_day)')
        .eq('student_id', student.id);

      // Check if student is part of an institution
      const { data: institutionMembership } = await supabase
        .from('institution_students')
        .select('id, institutions(name)')
        .eq('user_id', student.id)
        .eq('status', 'active');

      const hasEnrollments = (enrollments?.length || 0) > 0;
      const inProgressCourses = enrollments?.filter(e => (e.progress || 0) < 100) || [];
      const hasInstitution = (institutionMembership?.length || 0) > 0;

      // Get day name for drip schedule
      const getDayName = (day: number): string => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day] || 'Wednesday';
      };

      // Build personalized reminder content
      const reminders: string[] = [];
      
      if (inProgressCourses.length > 0) {
        const courseNames = inProgressCourses.slice(0, 2).map(e => (e.courses as any)?.title).filter(Boolean);
        
        // Check if any course has drip content enabled
        const dripCourse = inProgressCourses.find(e => {
          const course = e.courses as any;
          return course?.drip_enabled && course?.drip_schedule_type === 'week';
        });
        
        if (dripCourse) {
          const course = dripCourse.courses as any;
          const dayName = getDayName(course.drip_release_day ?? 3);
          reminders.push(`📚 You have ${inProgressCourses.length} course(s) in progress. New content unlocks every <strong>${dayName}</strong> - check back regularly!`);
        } else {
          reminders.push(`📚 Continue your learning journey! You have ${inProgressCourses.length} course(s) in progress${courseNames.length > 0 ? `: ${courseNames.join(', ')}` : ''}.`);
        }
      } else if (!hasEnrollments) {
        reminders.push(`🎓 Discover new courses from industry mentors and start your learning journey today!`);
      }
      
      reminders.push(`👩‍🏫 Connect with mentors who can guide your career. Explore mentorship opportunities!`);
      
      if (hasInstitution) {
        const institutionName = (institutionMembership?.[0]?.institutions as any)?.name;
        reminders.push(`💬 Engage with your ${institutionName || 'institution'} community. Collaborate on ideas and maybe start something amazing together!`);
      } else {
        reminders.push(`🌐 Join the community forum to network, share ideas, and collaborate with fellow learners!`);
      }

      reminders.push(`💡 Have a startup idea? Submit it and get feedback from our network of mentors and experts!`);

      const firstName = student.full_name?.split(' ')[0] || 'Learner';

      try {
        await resend.emails.send({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [student.email],
          subject: "Your Weekly Learning Update",
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
  
  <p style="margin-bottom: 20px;">Your journey to becoming part of Africa's tech career starts with small steps every day!</p>
  
  <table role="presentation" style="width: 100%; margin: 30px 0;">
    <tr>
      <td style="text-align: center; padding-bottom: 10px;">
        <a href="https://acloudforeveryone.org/courses" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Explore Courses</a>
      </td>
    </tr>
    <tr>
      <td style="text-align: center;">
        <a href="https://acloudforeveryone.org/mentors" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Find a Mentor</a>
      </td>
    </tr>
  </table>
  
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
        console.error(`Failed to send to ${student.email}:`, emailError);
        failedCount++;
      }
    }

    console.log(`Weekly student reminders sent: ${sentCount}, failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-student-reminder:", error);
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
