import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-SESSION-NOTIFICATION] ${step}${detailsStr}`);
};

interface SessionNotificationRequest {
  sessionId: string;
  notificationType: 'booking_confirmed' | 'session_reminder' | 'session_cancelled';
}

const generateGoogleCalendarUrl = (
  title: string,
  description: string,
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
): string => {
  const startDateTime = `${date.replace(/-/g, '')}T${startTime.replace(/:/g, '')}00`;
  const endDateTime = `${date.replace(/-/g, '')}T${endTime.replace(/:/g, '')}00`;
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDateTime}/${endDateTime}`,
    details: description,
    ctz: timezone,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const translations = {
  en: {
    student: {
      subject: (mentor: string) => `Your 1:1 Session with ${mentor} is Confirmed!`,
      headline: 'Session Confirmed!',
      body: (name: string, mentor: string) => `<p>Hi ${name},</p><p>Great news! Your 1:1 mentorship session with <strong>${mentor}</strong> has been confirmed.</p><p>Your mentor will reach out with meeting details shortly. In the meantime, you might want to prepare any questions or topics you'd like to discuss.</p>`,
      impact_title: 'Session Details:',
      cta: 'Add to Google Calendar',
    },
    mentor: {
      subject: (student: string) => `New 1:1 Session Booked with ${student}`,
      headline: 'New Session Booked!',
      body: (name: string, student: string, email: string) => `<p>Hi ${name},</p><p>You have a new 1:1 mentorship session booked with <strong>${student}</strong>.</p><p>Please reach out to ${student.split(' ')[0]} to share your meeting link and consider sending a brief agenda or preparation tips.</p>`,
      impact_title: 'Session Details:',
      cta: 'Add to Google Calendar',
    },
  },
  fr: {
    student: {
      subject: (mentor: string) => `Votre session 1:1 avec ${mentor} est confirmée!`,
      headline: 'Session Confirmée!',
      body: (name: string, mentor: string) => `<p>Bonjour ${name},</p><p>Bonne nouvelle! Votre session de mentorat 1:1 avec <strong>${mentor}</strong> a été confirmée.</p><p>Votre mentor vous contactera bientôt avec les détails de la réunion. En attendant, vous voudrez peut-être préparer des questions ou des sujets à discuter.</p>`,
      impact_title: 'Détails de la Session:',
      cta: 'Ajouter à Google Calendar',
    },
    mentor: {
      subject: (student: string) => `Nouvelle session 1:1 réservée avec ${student}`,
      headline: 'Nouvelle Session Réservée!',
      body: (name: string, student: string, email: string) => `<p>Bonjour ${name},</p><p>Vous avez une nouvelle session de mentorat 1:1 réservée avec <strong>${student}</strong>.</p><p>Veuillez contacter ${student.split(' ')[0]} pour partager votre lien de réunion et envisagez d'envoyer un bref agenda ou des conseils de préparation.</p>`,
      impact_title: 'Détails de la Session:',
      cta: 'Ajouter à Google Calendar',
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sessionId, notificationType }: SessionNotificationRequest = await req.json();
    logStep("Request parsed", { sessionId, notificationType });

    const { data: session, error: sessionError } = await supabaseClient
      .from('mentorship_sessions')
      .select(`
        *,
        mentor:profiles!mentorship_sessions_mentor_id_fkey(id, full_name, email, preferred_language),
        student:profiles!mentorship_sessions_student_id_fkey(id, full_name, email, preferred_language)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${sessionError?.message}`);
    }

    logStep("Session fetched", { mentorEmail: session.mentor?.email, studentEmail: session.student?.email });

    const mentorName = session.mentor?.full_name || 'Mentor';
    const studentName = session.student?.full_name || 'Learner';
    const mentorEmail = session.mentor?.email;
    const studentEmail = session.student?.email;

    const sessionDate = new Date(session.scheduled_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const startTime = session.start_time.substring(0, 5);
    const endTime = session.end_time.substring(0, 5);

    const emailPromises = [];

    if (notificationType === 'booking_confirmed') {
      // Email to Student
      if (studentEmail) {
        const studentLang: EmailLanguage = session.student?.preferred_language === 'fr' ? 'fr' : 'en';
        const st = translations[studentLang].student;
        const studentCalendarUrl = generateGoogleCalendarUrl(
          `1:1 Mentorship Session with ${mentorName}`,
          `Your mentorship session with ${mentorName}.`,
          session.scheduled_date,
          startTime,
          endTime,
          session.timezone
        );

        const studentHtml = buildCanonicalEmail({
          headline: st.headline,
          body_primary: st.body(studentName.split(' ')[0], mentorName),
          impact_block: {
            title: st.impact_title,
            items: [
              `<strong>${studentLang === 'fr' ? 'Date' : 'Date'}:</strong> ${sessionDate}`,
              `<strong>${studentLang === 'fr' ? 'Heure' : 'Time'}:</strong> ${startTime} - ${endTime} (${session.timezone})`,
              `<strong>${studentLang === 'fr' ? 'Mentor' : 'Mentor'}:</strong> ${mentorName}`,
            ],
          },
          primary_cta: { label: st.cta, url: studentCalendarUrl },
        }, studentLang);

        emailPromises.push(
          resend.emails.send({
            from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
            to: [studentEmail],
            subject: st.subject(mentorName),
            html: studentHtml,
          })
        );
        logStep("Student email queued");
      }

      // Email to Mentor
      if (mentorEmail) {
        const mentorLang: EmailLanguage = session.mentor?.preferred_language === 'fr' ? 'fr' : 'en';
        const mt = translations[mentorLang].mentor;
        const mentorCalendarUrl = generateGoogleCalendarUrl(
          `1:1 Mentorship Session with ${studentName}`,
          `Your mentorship session with ${studentName}. Contact: ${studentEmail}`,
          session.scheduled_date,
          startTime,
          endTime,
          session.timezone
        );

        const mentorHtml = buildCanonicalEmail({
          headline: mt.headline,
          body_primary: mt.body(mentorName.split(' ')[0], studentName, studentEmail || ''),
          impact_block: {
            title: mt.impact_title,
            items: [
              `<strong>${mentorLang === 'fr' ? 'Date' : 'Date'}:</strong> ${sessionDate}`,
              `<strong>${mentorLang === 'fr' ? 'Heure' : 'Time'}:</strong> ${startTime} - ${endTime} (${session.timezone})`,
              `<strong>${mentorLang === 'fr' ? 'Apprenant' : 'Learner'}:</strong> ${studentName}`,
              `<strong>Email:</strong> ${studentEmail}`,
            ],
          },
          primary_cta: { label: mt.cta, url: mentorCalendarUrl },
        }, mentorLang);

        emailPromises.push(
          resend.emails.send({
            from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
            to: [mentorEmail],
            subject: mt.subject(studentName),
            html: mentorHtml,
          })
        );
        logStep("Mentor email queued");
      }
    }

    const results = await Promise.all(emailPromises);
    logStep("Emails sent", { count: results.length });

    return new Response(JSON.stringify({ success: true, emailsSent: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
