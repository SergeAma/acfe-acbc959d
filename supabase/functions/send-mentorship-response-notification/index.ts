import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorshipResponseNotification {
  studentId: string;
  mentorName: string;
  status: 'accepted' | 'course_required';
  message?: string;
  courseId?: string;
}

const translations = {
  en: {
    accepted: {
      subject: (mentor: string) => `You've been accepted into ${mentor}'s cohort!`,
      headline: 'Welcome to the Cohort!',
      body: (name: string, mentor: string, message?: string) => {
        let text = `<p>Hello ${name},</p><p>Great news! <strong>${mentor}</strong> has accepted your mentorship request. You are now part of their cohort!</p>`;
        if (message) text += `<p><strong>Message from ${mentor}:</strong> "${message}"</p>`;
        return text;
      },
      impact_title: 'What\'s Next?',
      items: [
        'Access the cohort community board to connect with your mentor and fellow mentees',
        'Introduce yourself to the community',
        'Start your learning journey!',
      ],
      cta: 'Join the Community',
    },
    course_required: {
      subject: (mentor: string) => `Update on your mentorship request from ${mentor}`,
      headline: 'Course Completion Required',
      body: (name: string, mentor: string, course: string, message?: string) => {
        let text = `<p>Hello ${name},</p><p><strong>${mentor}</strong> has reviewed your mentorship request and recommends that you complete a course first to prepare for the mentorship program.</p><p><strong>Recommended Course:</strong> ${course}</p>`;
        if (message) text += `<p><strong>Message from ${mentor}:</strong> "${message}"</p>`;
        text += `<p>Once you complete the course, ${mentor} will add you to their cohort!</p>`;
        return text;
      },
      cta: 'View Course',
    },
  },
  fr: {
    accepted: {
      subject: (mentor: string) => `Vous avez été accepté dans la cohorte de ${mentor}!`,
      headline: 'Bienvenue dans la Cohorte!',
      body: (name: string, mentor: string, message?: string) => {
        let text = `<p>Bonjour ${name},</p><p>Bonne nouvelle! <strong>${mentor}</strong> a accepté votre demande de mentorat. Vous faites maintenant partie de sa cohorte!</p>`;
        if (message) text += `<p><strong>Message de ${mentor}:</strong> "${message}"</p>`;
        return text;
      },
      impact_title: 'Prochaines Étapes:',
      items: [
        'Accédez au forum de la cohorte pour vous connecter avec votre mentor et vos collègues mentorés',
        'Présentez-vous à la communauté',
        'Commencez votre parcours d\'apprentissage!',
      ],
      cta: 'Rejoindre la Communauté',
    },
    course_required: {
      subject: (mentor: string) => `Mise à jour sur votre demande de mentorat de ${mentor}`,
      headline: 'Complétion de Cours Requise',
      body: (name: string, mentor: string, course: string, message?: string) => {
        let text = `<p>Bonjour ${name},</p><p><strong>${mentor}</strong> a examiné votre demande de mentorat et recommande que vous complétiez d'abord un cours pour vous préparer au programme de mentorat.</p><p><strong>Cours Recommandé:</strong> ${course}</p>`;
        if (message) text += `<p><strong>Message de ${mentor}:</strong> "${message}"</p>`;
        text += `<p>Une fois le cours terminé, ${mentor} vous ajoutera à sa cohorte!</p>`;
        return text;
      },
      cta: 'Voir le Cours',
    },
  },
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mentorship response notification called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId, mentorName, status, message, courseId }: MentorshipResponseNotification = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    let courseTitle = '';
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();
      courseTitle = course?.title || (studentProfile.preferred_language === 'fr' ? 'le cours recommandé' : 'the recommended course');
    }

    console.log(`Sending mentorship response notification to ${studentProfile.email}`);

    const language: EmailLanguage = studentProfile.preferred_language === 'fr' ? 'fr' : 'en';
    const studentName = studentProfile.full_name?.split(' ')[0] || (language === 'fr' ? 'là' : 'there');
    const isAccepted = status === 'accepted';

    let htmlContent: string;
    let subject: string;

    if (isAccepted) {
      const t = translations[language].accepted;
      htmlContent = buildCanonicalEmail({
        headline: t.headline,
        body_primary: t.body(studentName, mentorName, message),
        impact_block: {
          title: t.impact_title,
          items: t.items,
        },
        primary_cta: {
          label: t.cta,
          url: 'https://acloudforeveryone.org/cohort/community',
        },
      }, language);
      subject = t.subject(mentorName);
    } else {
      const t = translations[language].course_required;
      htmlContent = buildCanonicalEmail({
        headline: t.headline,
        body_primary: t.body(studentName, mentorName, courseTitle, message),
        primary_cta: {
          label: t.cta,
          url: `https://acloudforeveryone.org/courses/${courseId}`,
        },
      }, language);
      subject = t.subject(mentorName);
    }

    await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [studentProfile.email],
      subject,
      html: htmlContent,
    });

    console.log("Mentorship response notification sent");

    await supabase.from('email_logs').insert({
      subject: `Mentorship Response: ${status}`,
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
