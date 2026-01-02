import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentGradedNotification {
  studentId: string;
  mentorName: string;
  courseTitle: string;
  assignmentTitle: string;
  status: 'approved' | 'revision_requested';
  feedback: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send assignment graded notification called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, mentorName, courseTitle, assignmentTitle, status, feedback }: AssignmentGradedNotification = await req.json();

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

    console.log(`Sending assignment graded notification to ${studentProfile.email}`);

    const currentYear = new Date().getFullYear();
    const isApproved = status === 'approved';

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
      <h1 style="margin: 0 0 20px 0; font-size: 24px; color: #18181b;">${isApproved ? 'Assignment Approved! ✅' : 'Revision Requested 📝'}</h1>
      
      <p style="color: #3f3f46;">Hello ${studentProfile.full_name || 'Student'},</p>
      
      <p style="color: #3f3f46; line-height: 1.6;">Your assignment has been reviewed by <strong>${mentorName}</strong>.</p>
      
      <div style="background: ${isApproved ? '#f0fdf4' : '#fef3c7'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isApproved ? '#4a5d4a' : '#d97706'};">
        <p style="color: #3f3f46; margin: 8px 0;"><strong>Course:</strong> ${courseTitle}</p>
        <p style="color: #3f3f46; margin: 8px 0;"><strong>Assignment:</strong> ${assignmentTitle}</p>
        <p style="color: #3f3f46; margin: 8px 0;"><strong>Status:</strong> ${isApproved ? 'Approved' : 'Revision Requested'}</p>
      </div>
      
      ${feedback ? `
      <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #3f3f46; margin: 0 0 8px 0;"><strong>Mentor Feedback:</strong></p>
        <p style="color: #3f3f46; margin: 0; white-space: pre-wrap;">${feedback}</p>
      </div>
      ` : ''}
      
      <p style="color: #3f3f46; line-height: 1.6;">
        ${isApproved 
          ? 'Great work! You\'ve completed this assignment. Continue your learning journey!' 
          : 'Please review the feedback above and resubmit your assignment with the requested changes.'}
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://acloudforeveryone.org/dashboard" style="background: #4a5d4a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${isApproved ? 'Continue Learning' : 'Revise Assignment'}</a>
      </div>
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
      subject: isApproved 
        ? `Assignment Approved: ${assignmentTitle}` 
        : `Revision Requested: ${assignmentTitle}`,
      html: htmlContent,
    });

    console.log("Assignment graded notification sent");

    await supabase.from('email_logs').insert({
      subject: `Assignment ${isApproved ? 'Approved' : 'Revision Requested'} - ${courseTitle}`,
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
