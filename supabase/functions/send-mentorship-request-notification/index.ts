import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorshipRequestNotification {
  mentorId: string;
  studentName: string;
  studentBio: string;
  careerAmbitions: string;
  reason: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mentorship request notification called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentorId, studentName, studentBio, careerAmbitions, reason }: MentorshipRequestNotification = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get mentor's email
    const { data: mentorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', mentorId)
      .single();

    if (profileError || !mentorProfile) {
      console.error("Failed to get mentor profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Mentor not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending mentorship request notification to ${mentorProfile.email}`);

    const currentYear = new Date().getFullYear();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #4a7c59 0%, #2d4a35 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">New Mentorship Request! 🎯</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p>Hello ${mentorProfile.full_name || 'Mentor'},</p>
    
    <p>Great news! <strong>${studentName}</strong> has requested to join your mentorship cohort.</p>
    
    <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a7c59;">
      <h3 style="margin-top: 0; color: #4a7c59;">About the Student</h3>
      <p><strong>Bio:</strong> ${studentBio}</p>
      <p><strong>Career Ambitions:</strong> ${careerAmbitions}</p>
      <p><strong>Why They Chose You:</strong> ${reason}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://acloudforeveryone.org/mentor/cohort" style="background: #4a7c59; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Request</a>
    </div>
    
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
      to: [mentorProfile.email],
      subject: `New Mentorship Request from ${studentName}`,
      html: htmlContent,
    });

    console.log("Mentorship request notification sent");

    await supabase.from('email_logs').insert({
      subject: `Mentorship Request Notification`,
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
