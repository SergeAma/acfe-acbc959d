import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CourseCompletionRequest {
  studentId: string;
  courseId: string;
  courseTitle: string;
}

const translations = {
  en: {
    subject: (student: string, course: string) => `${student} completed "${course}" - Review their mentorship request`,
    headline: 'Course Completed!',
    body: (student: string, course: string) => `<p>Hi there,</p><p><strong>${student}</strong> has successfully completed the course you recommended:</p><p style="font-size: 18px; font-weight: bold; color: #4B5C4B;">${course}</p><p>They previously applied to join your mentorship cohort. You can now reconsider their request and accept them into your cohort.</p>`,
    impact_title: 'About the Student:',
    cta: 'Review Request',
  },
  fr: {
    subject: (student: string, course: string) => `${student} a terminé "${course}" - Examinez sa demande de mentorat`,
    headline: 'Cours Terminé!',
    body: (student: string, course: string) => `<p>Bonjour,</p><p><strong>${student}</strong> a terminé avec succès le cours que vous avez recommandé:</p><p style="font-size: 18px; font-weight: bold; color: #4B5C4B;">${course}</p><p>Il/Elle avait précédemment postulé pour rejoindre votre cohorte de mentorat. Vous pouvez maintenant reconsidérer sa demande et l'accepter dans votre cohorte.</p>`,
    impact_title: 'À propos de l\'étudiant:',
    cta: 'Examiner la Demande',
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, courseId, courseTitle }: CourseCompletionRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", studentId)
      .single();

    const studentName = studentProfile?.full_name || "A student";

    let emailsSent = 0;
    
    for (const request of requests) {
      const { data: mentorData } = await supabase
        .from("profiles")
        .select("email, full_name, preferred_language")
        .eq("id", request.mentor_id)
        .single();

      if (!mentorData?.email) {
        console.log("No email found for mentor:", request.mentor_id);
        continue;
      }

      const language: EmailLanguage = (mentorData.preferred_language === 'fr' ? 'fr' : 'en');
      const t = translations[language];

      const items = [];
      if (request.student_bio) {
        items.push(`<strong>Bio:</strong> ${request.student_bio}`);
      }
      if (request.career_ambitions) {
        items.push(`<strong>${language === 'fr' ? 'Ambitions de carrière' : 'Career Ambitions'}:</strong> ${request.career_ambitions}`);
      }

      const htmlContent = buildCanonicalEmail({
        headline: t.headline,
        body_primary: t.body(studentName, courseTitle),
        impact_block: items.length > 0 ? {
          title: t.impact_title,
          items,
        } : undefined,
        primary_cta: {
          label: t.cta,
          url: 'https://acloudforeveryone.org/mentor/cohort',
        },
      }, language);

      const { error: emailError } = await resend.emails.send({
        from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
        to: [mentorData.email],
        subject: t.subject(studentName, courseTitle),
        html: htmlContent,
      });

      if (!emailError) {
        emailsSent++;
        console.log(`Email sent to mentor: ${mentorData.email}`);
      } else {
        console.error(`Failed to send email to ${mentorData.email}:`, emailError);
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
