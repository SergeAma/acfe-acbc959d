import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const translations = {
  en: {
    subject: 'Your Weekly Mentor Update',
    headline: 'Your Weekly Update',
    body: (name: string) => `<p>Hi ${name}!</p><p>Here's your weekly update from A Cloud for Everyone. Your mentorship makes a real difference in shaping the next generation of African tech talent.</p>`,
    impact_title: 'This Week:',
    unpublished: (count: number) => `You have ${count} unpublished course(s) waiting to be completed.`,
    pending: (count: number) => `You have ${count} pending mentorship request(s) awaiting your response.`,
    cohort: (count: number) => `Your cohort of ${count} student(s) is waiting for your engagement. Share insights, post updates, or schedule a live session!`,
    default: 'Check in with your students and keep building your impact as a mentor!',
    cta: 'Go to Dashboard',
  },
  fr: {
    subject: 'Votre Mise à Jour Hebdomadaire de Mentor',
    headline: 'Votre Mise à Jour Hebdomadaire',
    body: (name: string) => `<p>Bonjour ${name}!</p><p>Voici votre mise à jour hebdomadaire de A Cloud for Everyone. Votre mentorat fait une réelle différence dans la formation de la prochaine génération de talents tech africains.</p>`,
    impact_title: 'Cette Semaine:',
    unpublished: (count: number) => `Vous avez ${count} cours non publiés en attente d'être complétés.`,
    pending: (count: number) => `Vous avez ${count} demande(s) de mentorat en attente de votre réponse.`,
    cohort: (count: number) => `Votre cohorte de ${count} étudiant(s) attend votre engagement. Partagez des idées, publiez des mises à jour, ou planifiez une session en direct!`,
    default: 'Restez en contact avec vos étudiants et continuez à développer votre impact en tant que mentor!',
    cta: 'Aller au Tableau de Bord',
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: mentors, error: mentorsError } = await supabase
      .from('profiles')
      .select('id, email, full_name, preferred_language')
      .eq('role', 'mentor')
      .eq('account_status', 'active');

    if (mentorsError) throw mentorsError;

    let sentCount = 0;
    let failedCount = 0;

    for (const mentor of mentors || []) {
      const { data: unpublishedCourses } = await supabase
        .from('courses')
        .select('id')
        .eq('mentor_id', mentor.id)
        .eq('is_published', false);

      const { data: pendingRequests } = await supabase
        .from('mentorship_requests')
        .select('id')
        .eq('mentor_id', mentor.id)
        .eq('status', 'pending');

      const { data: cohortStudents } = await supabase
        .from('enrollments')
        .select('id, courses!inner(mentor_id)')
        .eq('courses.mentor_id', mentor.id);

      const hasUnfinishedCourses = (unpublishedCourses?.length || 0) > 0;
      const hasPendingRequests = (pendingRequests?.length || 0) > 0;
      const hasCohort = (cohortStudents?.length || 0) > 0;

      const language: EmailLanguage = mentor.preferred_language === 'fr' ? 'fr' : 'en';
      const t = translations[language];

      const reminders: string[] = [];
      
      if (hasUnfinishedCourses) {
        reminders.push(t.unpublished(unpublishedCourses?.length || 0));
      }
      
      if (hasPendingRequests) {
        reminders.push(t.pending(pendingRequests?.length || 0));
      }
      
      if (hasCohort) {
        reminders.push(t.cohort(cohortStudents?.length || 0));
      }

      if (reminders.length === 0) {
        reminders.push(t.default);
      }

      const firstName = mentor.full_name?.split(' ')[0] || 'Mentor';

      try {
        const htmlContent = buildCanonicalEmail({
          headline: t.headline,
          body_primary: t.body(firstName),
          impact_block: {
            title: t.impact_title,
            items: reminders,
          },
          primary_cta: {
            label: t.cta,
            url: 'https://acloudforeveryone.org/dashboard',
          },
        }, language);

        await resend.emails.send({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [mentor.email],
          subject: t.subject,
          html: htmlContent,
        });
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send to ${mentor.email}:`, emailError);
        failedCount++;
      }
    }

    console.log(`Weekly mentor reminders sent: ${sentCount}, failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-mentor-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
