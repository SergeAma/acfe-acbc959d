import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";
import { getEmailTranslation } from "../_shared/email-translations.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentSubmissionNotification {
  mentorId: string;
  studentName: string;
  courseTitle: string;
  assignmentTitle: string;
  submissionId?: string; // Optional for backward compatibility
}

// HTML entity encoding for XSS protection
function encodeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send assignment submission notification called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentorId, studentName, courseTitle, assignmentTitle, submissionId }: AssignmentSubmissionNotification = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get mentor's profile with language preference
    const { data: mentorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, preferred_language')
      .eq('id', mentorId)
      .single();

    if (profileError || !mentorProfile) {
      console.error("Failed to get mentor profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Mentor not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const language: EmailLanguage = mentorProfile.preferred_language === 'fr' ? 'fr' : 'en';
    const mentorName = encodeHtml(mentorProfile.full_name || 'Mentor');
    const safeStudentName = encodeHtml(studentName);
    const safeCourseTitle = encodeHtml(courseTitle);
    const safeAssignmentTitle = encodeHtml(assignmentTitle);

    console.log(`Sending assignment submission notification to ${mentorProfile.email}`);

    // Build email content
    const isEnglish = language === 'en';
    
    const headline = isEnglish 
      ? 'New Assignment Submission' 
      : 'Nouvelle Soumission de Devoir';
    
    const greeting = isEnglish ? 'Hello' : 'Bonjour';
    const introText = isEnglish
      ? `<strong>${safeStudentName}</strong> has submitted an assignment that requires your review.`
      : `<strong>${safeStudentName}</strong> a soumis un devoir qui nécessite votre évaluation.`;
    
    const reviewText = isEnglish
      ? 'Please review the submission and provide feedback to help the student progress in their learning journey.'
      : 'Veuillez examiner la soumission et fournir des commentaires pour aider l\'étudiant à progresser dans son parcours d\'apprentissage.';
    
    const body_primary = `<p>${greeting} ${mentorName},</p><p>${introText}</p><p>${reviewText}</p>`;

    const impactTitle = isEnglish ? 'Submission Details' : 'Détails de la Soumission';
    const courseLabel = isEnglish ? 'Course' : 'Cours';
    const assignmentLabel = isEnglish ? 'Assignment' : 'Devoir';

    const htmlContent = buildCanonicalEmail({
      headline,
      body_primary,
      impact_block: {
        title: impactTitle,
        items: [
          `<strong>${courseLabel}:</strong> ${safeCourseTitle}`,
          `<strong>${assignmentLabel}:</strong> ${safeAssignmentTitle}`,
        ],
      },
      primary_cta: {
        label: isEnglish ? 'Review Submission' : 'Examiner la Soumission',
        url: 'https://acloudforeveryone.org/dashboard',
      },
      signoff: getEmailTranslation('email.team', language),
    }, language);

    const subject = isEnglish
      ? `New Assignment Submission: ${safeCourseTitle}`
      : `Nouvelle Soumission de Devoir: ${safeCourseTitle}`;

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [mentorProfile.email],
      subject,
      html: htmlContent,
    });

    console.log("Assignment submission notification sent");

    // Create in-app notification for mentor to review submission
    if (submissionId) {
      await supabase.from('notifications').insert({
        user_id: mentorId,
        message: isEnglish 
          ? `${safeStudentName} submitted an assignment for "${safeCourseTitle}" - review required`
          : `${safeStudentName} a soumis un devoir pour "${safeCourseTitle}" - examen requis`,
        link: '/dashboard',
        action_type: 'review_submission',
        action_reference_id: submissionId
      });
      console.log("In-app notification created for mentor");
    }

    await supabase.from('email_logs').insert({
      subject: `Assignment Submission Notification - ${courseTitle}`,
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
