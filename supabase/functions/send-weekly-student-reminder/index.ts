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
    subject: 'Your Weekly Learning Update',
    headline: 'Your Weekly Update',
    body: (name: string) => `<p>Hi ${name}!</p><p>Here's your weekly update from A Cloud for Everyone. Your journey to becoming part of Africa's tech ecosystem starts with small steps every day!</p>`,
    impact_title: 'This Week:',
    inProgress: (count: number, courses: string) => `Continue your learning journey! You have ${count} course(s) in progress${courses ? `: ${courses}` : ''}.`,
    drip: (count: number, day: string) => `You have ${count} course(s) in progress. New content unlocks every <strong>${day}</strong> - check back regularly!`,
    discover: 'Discover new courses from industry mentors and start your learning journey today!',
    mentors: 'Connect with mentors who can guide your career. Explore mentorship opportunities!',
    institution: (name: string) => `Engage with your ${name} community. Collaborate on ideas and maybe start something amazing together!`,
    community: 'Join the community forum to network, share ideas, and collaborate with fellow learners!',
    idea: 'Have a startup idea? Submit it and get feedback from our network of mentors and experts!',
    cta_courses: 'Explore Courses',
    cta_mentors: 'Find a Mentor',
  },
  fr: {
    subject: 'Votre Mise à Jour Hebdomadaire d\'Apprentissage',
    headline: 'Votre Mise à Jour Hebdomadaire',
    body: (name: string) => `<p>Bonjour ${name}!</p><p>Voici votre mise à jour hebdomadaire de A Cloud for Everyone. Votre parcours pour faire partie de l'écosystème tech africain commence par de petits pas chaque jour!</p>`,
    impact_title: 'Cette Semaine:',
    inProgress: (count: number, courses: string) => `Continuez votre parcours d'apprentissage! Vous avez ${count} cours en cours${courses ? `: ${courses}` : ''}.`,
    drip: (count: number, day: string) => `Vous avez ${count} cours en cours. Du nouveau contenu se débloque chaque <strong>${day}</strong> - revenez régulièrement!`,
    discover: 'Découvrez de nouveaux cours de mentors de l\'industrie et commencez votre parcours d\'apprentissage aujourd\'hui!',
    mentors: 'Connectez-vous avec des mentors qui peuvent guider votre carrière. Explorez les opportunités de mentorat!',
    institution: (name: string) => `Engagez-vous avec votre communauté ${name}. Collaborez sur des idées et peut-être démarrez quelque chose d'incroyable ensemble!`,
    community: 'Rejoignez le forum communautaire pour réseauter, partager des idées et collaborer avec d\'autres apprenants!',
    idea: 'Avez-vous une idée de startup? Soumettez-la et obtenez des commentaires de notre réseau de mentors et d\'experts!',
    cta_courses: 'Explorer les Cours',
    cta_mentors: 'Trouver un Mentor',
  },
};

const getDayName = (day: number, lang: EmailLanguage): string => {
  const days = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  };
  return days[lang][day] || (lang === 'fr' ? 'Mercredi' : 'Wednesday');
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, email, full_name, preferred_language')
      .eq('role', 'student')
      .eq('account_status', 'active');

    if (studentsError) throw studentsError;

    let sentCount = 0;
    let failedCount = 0;

    for (const student of students || []) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id, progress, courses(title, drip_enabled, drip_schedule_type, drip_release_day)')
        .eq('student_id', student.id);

      const { data: institutionMembership } = await supabase
        .from('institution_students')
        .select('id, institutions(name)')
        .eq('user_id', student.id)
        .eq('status', 'active');

      const hasEnrollments = (enrollments?.length || 0) > 0;
      const inProgressCourses = enrollments?.filter(e => (e.progress || 0) < 100) || [];
      const hasInstitution = (institutionMembership?.length || 0) > 0;

      const language: EmailLanguage = student.preferred_language === 'fr' ? 'fr' : 'en';
      const t = translations[language];

      const reminders: string[] = [];
      
      if (inProgressCourses.length > 0) {
        const courseNames = inProgressCourses.slice(0, 2).map(e => (e.courses as any)?.title).filter(Boolean);
        
        const dripCourse = inProgressCourses.find(e => {
          const course = e.courses as any;
          return course?.drip_enabled && course?.drip_schedule_type === 'week';
        });
        
        if (dripCourse) {
          const course = dripCourse.courses as any;
          const dayName = getDayName(course.drip_release_day ?? 3, language);
          reminders.push(t.drip(inProgressCourses.length, dayName));
        } else {
          reminders.push(t.inProgress(inProgressCourses.length, courseNames.join(', ')));
        }
      } else if (!hasEnrollments) {
        reminders.push(t.discover);
      }
      
      reminders.push(t.mentors);
      
      if (hasInstitution) {
        const institutionName = (institutionMembership?.[0]?.institutions as any)?.name;
        reminders.push(t.institution(institutionName || 'institution'));
      } else {
        reminders.push(t.community);
      }

      reminders.push(t.idea);

      const firstName = student.full_name?.split(' ')[0] || (language === 'fr' ? 'Apprenant' : 'Learner');

      try {
        const htmlContent = buildCanonicalEmail({
          headline: t.headline,
          body_primary: t.body(firstName),
          impact_block: {
            title: t.impact_title,
            items: reminders,
          },
          primary_cta: {
            label: t.cta_courses,
            url: 'https://acloudforeveryone.org/courses',
          },
          secondary_cta: {
            label: t.cta_mentors,
            url: 'https://acloudforeveryone.org/mentors',
          },
        }, language);

        await resend.emails.send({
          from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
          to: [student.email],
          subject: t.subject,
          html: htmlContent,
        });
        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send to ${student.email}:`, emailError);
        failedCount++;
      }
    }

    console.log(`Weekly student reminders sent: ${sentCount}, failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-weekly-student-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
