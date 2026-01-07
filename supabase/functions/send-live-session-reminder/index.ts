import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const translations = {
  en: {
    subject: (title: string) => `Reminder: "${title}" starts in 24 hours!`,
    headline: 'Live Session Starting Soon!',
    body: (name: string) => `<p>Hi ${name},</p><p>This is a friendly reminder that your live session is starting in 24 hours. Make sure to join on time to get the most out of your learning experience!</p>`,
    impact_title: 'Session Details:',
    date: 'Date',
    time: 'Time',
    platform: 'Platform',
    instructor: 'Instructor',
    cta: 'Join Session',
    cta_secondary: 'View Course',
  },
  fr: {
    subject: (title: string) => `Rappel: "${title}" commence dans 24 heures!`,
    headline: 'Session en Direct Bientôt!',
    body: (name: string) => `<p>Bonjour ${name},</p><p>Ceci est un rappel amical que votre session en direct commence dans 24 heures. Assurez-vous de rejoindre à temps pour profiter au maximum de votre expérience d'apprentissage!</p>`,
    impact_title: 'Détails de la Session:',
    date: 'Date',
    time: 'Heure',
    platform: 'Plateforme',
    instructor: 'Instructeur',
    cta: 'Rejoindre la Session',
    cta_secondary: 'Voir le Cours',
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

    console.log("Checking for upcoming live sessions...");

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: upcomingCourses, error: coursesError } = await supabase
      .from("courses")
      .select(`id, title, live_date, live_platform, live_url, mentor_id`)
      .eq("is_live", true)
      .eq("is_published", true)
      .gte("live_date", in24Hours.toISOString())
      .lt("live_date", in25Hours.toISOString());

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
      throw coursesError;
    }

    if (!upcomingCourses || upcomingCourses.length === 0) {
      console.log("No upcoming live sessions in the next 24-25 hours");
      return new Response(
        JSON.stringify({ message: "No upcoming sessions to remind about" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${upcomingCourses.length} upcoming live sessions`);

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const course of upcomingCourses) {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`student_id, profiles!enrollments_student_id_fkey (email, full_name, preferred_language)`)
        .eq("course_id", course.id);

      if (enrollmentsError) {
        console.error(`Error fetching enrollments for course ${course.id}:`, enrollmentsError);
        continue;
      }

      if (!enrollments || enrollments.length === 0) {
        console.log(`No enrollments found for course: ${course.title}`);
        continue;
      }

      console.log(`Sending reminders to ${enrollments.length} students for: ${course.title}`);

      const { data: mentor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", course.mentor_id)
        .single();

      const liveDate = new Date(course.live_date);

      for (const enrollment of enrollments) {
        const profile = enrollment.profiles as any;
        if (!profile?.email) continue;

        const language: EmailLanguage = (profile.preferred_language === 'fr' ? 'fr' : 'en');
        const t = translations[language];
        const firstName = profile.full_name?.split(" ")[0] || (language === 'fr' ? 'Apprenant' : 'Learner');

        const formattedDate = liveDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = liveDate.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        });

        const items = [
          `<strong>${t.date}:</strong> ${formattedDate}`,
          `<strong>${t.time}:</strong> ${formattedTime}`,
          `<strong>${t.platform}:</strong> ${course.live_platform || "Online"}`,
        ];
        if (mentor?.full_name) {
          items.push(`<strong>${t.instructor}:</strong> ${mentor.full_name}`);
        }

        const htmlContent = buildCanonicalEmail({
          headline: t.headline,
          body_primary: t.body(firstName),
          impact_block: {
            title: t.impact_title,
            items,
          },
          primary_cta: course.live_url ? {
            label: t.cta,
            url: course.live_url,
          } : {
            label: t.cta_secondary,
            url: `https://acloudforeveryone.org/courses/${course.id}`,
          },
        }, language);

        try {
          const { error: emailError } = await resend.emails.send({
            from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
            to: [profile.email],
            subject: t.subject(course.title),
            html: htmlContent,
          });

          if (emailError) {
            console.error(`Failed to send reminder to ${profile.email}:`, emailError);
            emailsFailed++;
          } else {
            console.log(`Reminder sent to ${profile.email} for course: ${course.title}`);
            emailsSent++;

            await supabase.from("email_logs").insert({
              subject: t.subject(course.title),
              status: "sent",
              sent_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Error sending email to ${profile.email}:`, error);
          emailsFailed++;
        }
      }
    }

    console.log(`Reminder emails sent: ${emailsSent}, failed: ${emailsFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        emailsFailed,
        coursesProcessed: upcomingCourses.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-live-session-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
