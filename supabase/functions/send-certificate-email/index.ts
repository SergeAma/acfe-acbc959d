import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";
import { escapeHtml } from "../_shared/html-escape.ts";
import { verifyUser, corsHeaders } from "../_shared/auth.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface CertificateEmailRequest {
  student_email: string;
  student_name: string;
  course_name: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
  spectrogram_token?: string;
  language?: EmailLanguage;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication using shared middleware
    const { user, supabase: userClient } = await verifyUser(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const {
      student_email,
      student_name,
      course_name,
      course_id,
      certificate_number,
      issued_at,
      spectrogram_token,
      language = 'en'
    }: CertificateEmailRequest = await req.json();

    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("Sending certificate email to:", student_email);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: courseData } = await adminClient
      .from('courses')
      .select('mentor_id')
      .eq('id', course_id)
      .single();
    
    let mentorName = lang === 'fr' ? 'Instructeur' : 'Instructor';
    if (courseData?.mentor_id) {
      const { data: mentorData } = await adminClient
        .from('profiles')
        .select('full_name')
        .eq('id', courseData.mentor_id)
        .single();
      
      if (mentorData?.full_name) {
        mentorName = mentorData.full_name;
      }
    }

    const certificateUrl = `https://acloudforeveryone.org/certificate/${certificate_number}`;
    const formattedDate = new Date(issued_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const spectrogramUrl = spectrogram_token 
      ? `https://spectrogramconsulting.com/acfe-callback?token=${spectrogram_token}&email=${encodeURIComponent(student_email)}`
      : null;

    // SECURITY: Escape all user-provided data
    const safeDisplayName = escapeHtml(student_name) || (lang === 'fr' ? 'Apprenant' : 'Learner');
    const safeCourseName = escapeHtml(course_name);
    const safeMentorName = escapeHtml(mentorName);
    const safeCertNumber = escapeHtml(certificate_number);
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';

    const subject = lang === 'fr' 
      ? `Félicitations! Vous avez obtenu votre certificat ${safeCourseName}`
      : `Congratulations! You've earned your ${safeCourseName} certificate`;

    let bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${safeDisplayName},</p>
         <p style="margin: 0 0 16px 0;">Vous avez terminé avec succès <strong>${safeCourseName}</strong> et obtenu votre certificat de fin de formation!</p>
         <p style="margin: 0;"><strong>ID Certificat:</strong> ${safeCertNumber}<br><strong>Instructeur:</strong> ${safeMentorName}<br><strong>Date:</strong> ${formattedDate}</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${safeDisplayName},</p>
         <p style="margin: 0 0 16px 0;">You've successfully completed <strong>${safeCourseName}</strong> and earned your certificate of completion!</p>
         <p style="margin: 0;"><strong>Certificate ID:</strong> ${safeCertNumber}<br><strong>Instructor:</strong> ${safeMentorName}<br><strong>Date:</strong> ${formattedDate}</p>`;

    if (spectrogramUrl) {
      bodyContent += lang === 'fr'
        ? `<p style="margin: 16px 0 0 0;">Créez votre profil talent sur Spectrogram Consulting et soyez découvert par les meilleurs recruteurs!</p>`
        : `<p style="margin: 16px 0 0 0;">Create your talent profile on Spectrogram Consulting and get discovered by top recruiters!</p>`;
    }

    const emailHtml = buildCanonicalEmail({
      headline: lang === 'fr' ? `Félicitations, ${safeDisplayName}!` : `Congratulations, ${safeDisplayName}!`,
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Prochaines étapes' : 'What\'s Next',
        items: lang === 'fr' ? [
          'Téléchargez votre certificat',
          'Partagez votre réussite sur LinkedIn',
          'Explorez plus de cours'
        ] : [
          'Download your certificate',
          'Share your achievement on LinkedIn',
          'Explore more courses'
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Voir le Certificat' : 'View Certificate',
        url: certificateUrl
      },
      secondary_cta: spectrogramUrl ? {
        label: lang === 'fr' ? 'Créer un Profil Talent' : 'Create Talent Profile',
        url: spectrogramUrl
      } : undefined
    }, lang);

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [student_email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Certificate email sent successfully");

    await adminClient.from("email_logs").insert({
      subject: `Certificate: ${safeCourseName}`,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-certificate-email:", error);
    
    // Return 401 for auth errors
    const status = error.message?.includes('authorization') || 
                   error.message?.includes('token') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
