import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentorWelcomeRequest {
  email: string;
  name?: string;
  language?: EmailLanguage;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send mentor welcome email function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, language = 'en' }: MentorWelcomeRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending mentor welcome email to ${email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const displayName = name || (lang === 'fr' ? 'Mentor' : 'Mentor');
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';

    const subject = lang === 'fr' 
      ? 'Bienvenue dans l\'équipe ACFE!'
      : 'Welcome to the ACFE Team!';

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0;">Félicitations pour être devenu mentor chez A Cloud for Everyone! Nous sommes ravis de vous avoir dans notre mission de rendre l'éducation tech accessible à travers l'Afrique.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0;">Congratulations on becoming a mentor at A Cloud for Everyone! We're thrilled to have you join our mission to make tech education accessible across Africa.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline: lang === 'fr' ? 'Bienvenue dans l\'équipe!' : 'Welcome to the Team!',
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Pour commencer' : 'Getting Started',
        items: lang === 'fr' ? [
          'Complétez votre profil de mentor',
          'Créez votre premier cours',
          'Explorez les cohortes existantes'
        ] : [
          'Complete your mentor profile',
          'Create your first course',
          'Explore existing cohorts'
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Compléter le Profil' : 'Complete Profile',
        url: 'https://acloudforeveryone.org/profile'
      },
      secondary_cta: {
        label: lang === 'fr' ? 'Créer un Cours' : 'Create a Course',
        url: 'https://acloudforeveryone.org/mentor/courses/new'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log("Mentor welcome email sent:", emailResponse);

    await supabase.from('email_logs').insert({
      subject: "Mentor Welcome Email",
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    // Notify admins
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminRoles && adminRoles.length > 0) {
      const adminIds = adminRoles.map(r => r.user_id);
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('email, full_name')
        .in('id', adminIds);

      if (adminProfiles && adminProfiles.length > 0) {
        const adminEmails = adminProfiles.map(p => p.email);
        
        const adminHtml = buildCanonicalEmail({
          headline: 'New Mentor Joined!',
          body_primary: `<p style="margin: 0 0 16px 0;">Hello Admin,</p>
            <p style="margin: 0 0 16px 0;">A new mentor has accepted their invitation and joined A Cloud for Everyone.</p>
            <p style="margin: 0;"><strong>Name:</strong> ${displayName}<br><strong>Email:</strong> ${email}<br><strong>Joined:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>`,
          primary_cta: {
            label: 'View All Users',
            url: 'https://acloudforeveryone.org/admin/users'
          }
        }, 'en');

        try {
          await resend.emails.send({
            from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
            to: adminEmails,
            subject: `New Mentor Joined: ${displayName}`,
            html: adminHtml,
          });
          console.log("Admin notification sent to:", adminEmails);
        } catch (adminEmailError) {
          console.error("Failed to send admin notification:", adminEmailError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-mentor-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
