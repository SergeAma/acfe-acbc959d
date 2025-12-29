import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CourseCompletionRequest {
  studentId: string;
  courseId: string;
  courseTitle: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, courseId, courseTitle }: CourseCompletionRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find mentorship requests with course_required status for this course
    const { data: requests, error: requestsError } = await supabase
      .from("mentorship_requests")
      .select("id, mentor_id, student_bio, career_ambitions")
      .eq("student_id", studentId)
      .eq("course_to_complete_id", courseId)
      .eq("status", "course_required");

    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      throw requestsError;
    }

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending course requirements found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get student info
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", studentId)
      .single();

    const studentName = studentProfile?.full_name || "A student";
    const currentYear = new Date().getFullYear();

    // Send notification to each mentor
    let emailsSent = 0;
    
    for (const request of requests) {
      // Get mentor's email from profiles table using service role
      const { data: mentorData } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", request.mentor_id)
        .single();

      if (!mentorData?.email) {
        console.log("No email found for mentor:", request.mentor_id);
        continue;
      }

      const mentorName = mentorData.full_name || "Mentor";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- ACFE Text Header -->
            <div style="text-align: center; margin-bottom: 0; background-color: #3f3f3f; padding: 24px; border-radius: 12px 12px 0 0;">
              <div style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 4px; margin-bottom: 4px;">ACFE</div>
              <div style="font-size: 12px; color: #d4d4d4; letter-spacing: 2px; text-transform: uppercase;">A Cloud for Everyone</div>
            </div>
            
            <div style="background-color: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b;">🎓 Course Completed!</h1>
              
              <p style="color: #3f3f46;">Hi ${mentorName},</p>
              <p style="color: #3f3f46; line-height: 1.6;"><strong>${studentName}</strong> has successfully completed the course you recommended:</p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a5d4a;">
                <h3 style="margin: 0; color: #166534;">${courseTitle}</h3>
              </div>

              <p style="color: #3f3f46; line-height: 1.6;">They previously applied to join your mentorship cohort. You can now reconsider their request and accept them into your cohort.</p>

              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #18181b;">About the Student:</h4>
                <p style="margin: 5px 0; color: #3f3f46;"><strong>Bio:</strong> ${request.student_bio}</p>
                <p style="margin: 5px 0; color: #3f3f46;"><strong>Career Ambitions:</strong> ${request.career_ambitions}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://acloudforeveryone.org/mentor/cohort" style="background: #4a5d4a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Review Request
                </a>
              </div>

              <p style="color: #666; font-size: 14px; text-align: center; margin-top: 24px;">Keep inspiring the next generation of tech leaders!</p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 24px;">
              <div style="font-size: 18px; font-weight: 700; color: #3f3f3f; letter-spacing: 2px; margin-bottom: 8px;">ACFE</div>
              <p style="font-size: 12px; color: #71717a; margin: 0;">
                © ${currentYear} A Cloud for Everyone. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [mentorData.email],
          subject: `${studentName} completed "${courseTitle}" - Review their mentorship request`,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        emailsSent++;
        console.log(`Email sent to mentor: ${mentorData.email}`);
      } else {
        const error = await res.text();
        console.error(`Failed to send email to ${mentorData.email}:`, error);
      }
    }

    console.log(`Sent ${emailsSent} notification emails`);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-course-completion-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
