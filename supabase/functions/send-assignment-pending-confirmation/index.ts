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

interface AssignmentPendingConfirmation {
  studentId: string;
  courseTitle: string;
  assignmentTitle: string;
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
  console.log("Send assignment pending confirmation called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, courseTitle, assignmentTitle }: AssignmentPendingConfirmation = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get student's profile with language preference
    const { data: studentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, preferred_language')
      .eq('id', studentId)
      .single();

    if (profileError || !studentProfile) {
      console.error("Failed to get student profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Student not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const language: EmailLanguage = studentProfile.preferred_language === 'fr' ? 'fr' : 'en';
    const studentName = encodeHtml(studentProfile.full_name || 'Learner');
    const safeCourseTitle = encodeHtml(courseTitle);
    const safeAssignmentTitle = encodeHtml(assignmentTitle);

    console.log(`Sending assignment pending confirmation to ${studentProfile.email}`);

    // Build email content based on language
    const isEnglish = language === 'en';
    
    const headline = isEnglish 
      ? 'Assignment Submitted Successfully!' 
      : 'Devoir Soumis avec Succès!';
    
    const greeting = isEnglish ? 'Hello' : 'Bonjour';
    const introText = isEnglish
      ? `Your assignment for <strong>${safeCourseTitle}</strong> has been submitted and is now under review by your mentor.`
      : `Votre devoir pour <strong>${safeCourseTitle}</strong> a été soumis et est maintenant en cours d'examen par votre mentor.`;
    
    const reviewTimeText = isEnglish
      ? 'You can expect a response within <strong>48 hours</strong>. We will notify you by email once your mentor has reviewed your submission.'
      : 'Vous pouvez vous attendre à une réponse dans <strong>48 heures</strong>. Nous vous informerons par email dès que votre mentor aura examiné votre soumission.';
    
    const trackProgressText = isEnglish
      ? 'You can track the status of your submission from your dashboard at any time.'
      : 'Vous pouvez suivre l\'état de votre soumission depuis votre tableau de bord à tout moment.';
    
    const body_primary = `<p>${greeting} ${studentName},</p><p>${introText}</p><p>${reviewTimeText}</p><p>${trackProgressText}</p>`;

    const impactTitle = isEnglish ? 'Submission Details' : 'Détails de la Soumission';
    const courseLabel = isEnglish ? 'Course' : 'Cours';
    const assignmentLabel = isEnglish ? 'Assignment' : 'Devoir';
    const statusLabel = isEnglish ? 'Status' : 'Statut';
    const statusValue = isEnglish ? 'Under Review' : 'En cours d\'examen';

    const htmlContent = buildCanonicalEmail({
      headline,
      body_primary,
      impact_block: {
        title: impactTitle,
        items: [
          `<strong>${courseLabel}:</strong> ${safeCourseTitle}`,
          `<strong>${assignmentLabel}:</strong> ${safeAssignmentTitle}`,
          `<strong>${statusLabel}:</strong> ${statusValue}`,
        ],
      },
      primary_cta: {
        label: isEnglish ? 'View Dashboard' : 'Voir le Tableau de Bord',
        url: 'https://acloudforeveryone.org/dashboard',
      },
      signoff: getEmailTranslation('email.team', language),
    }, language);

    const subject = isEnglish
      ? `Assignment Submitted: ${safeCourseTitle}`
      : `Devoir Soumis: ${safeCourseTitle}`;

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [studentProfile.email],
      subject,
      html: htmlContent,
    });

    console.log("Assignment pending confirmation sent");

    await supabase.from('email_logs').insert({
      subject: `Assignment Pending Confirmation - ${courseTitle}`,
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
