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

interface MentorshipRequestNotification {
  mentorId: string;
  studentName: string;
  studentBio: string;
  careerAmbitions: string;
  reason: string;
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
  console.log("Send mentorship request notification called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mentorId, studentName, studentBio, careerAmbitions, reason }: MentorshipRequestNotification = await req.json();

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
    const safeStudentBio = encodeHtml(studentBio);
    const safeCareerAmbitions = encodeHtml(careerAmbitions);
    const safeReason = encodeHtml(reason);

    console.log(`Sending mentorship request notification to ${mentorProfile.email}`);

    // Build email content
    const isEnglish = language === 'en';
    
    const headline = isEnglish 
      ? 'New Mentorship Request' 
      : 'Nouvelle Demande de Mentorat';
    
    const greeting = isEnglish ? 'Hello' : 'Bonjour';
    const introText = isEnglish
      ? `<strong>${safeStudentName}</strong> has requested to join your mentorship cohort.`
      : `<strong>${safeStudentName}</strong> a demandé à rejoindre votre cohorte de mentorat.`;
    
    const body_primary = `<p>${greeting} ${mentorName},</p><p>${introText}</p>`;

    const impactTitle = isEnglish ? 'About the Student' : 'À Propos de l\'Étudiant';
    const bioLabel = isEnglish ? 'Bio' : 'Bio';
    const ambitionsLabel = isEnglish ? 'Career Ambitions' : 'Ambitions de Carrière';
    const reasonLabel = isEnglish ? 'Why They Chose You' : 'Pourquoi Ils Vous Ont Choisi';

    const htmlContent = buildCanonicalEmail({
      headline,
      body_primary,
      impact_block: {
        title: impactTitle,
        items: [
          `<strong>${bioLabel}:</strong> ${safeStudentBio}`,
          `<strong>${ambitionsLabel}:</strong> ${safeCareerAmbitions}`,
          `<strong>${reasonLabel}:</strong> ${safeReason}`,
        ],
      },
      primary_cta: {
        label: isEnglish ? 'View Request' : 'Voir la Demande',
        url: 'https://acloudforeveryone.org/mentor/cohort',
      },
      signoff: getEmailTranslation('email.team', language),
    }, language);

    const subject = isEnglish
      ? `New Mentorship Request from ${safeStudentName}`
      : `Nouvelle Demande de Mentorat de ${safeStudentName}`;

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [mentorProfile.email],
      subject,
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
