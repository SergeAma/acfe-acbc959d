import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IdeaStatusEmailRequest {
  email: string;
  first_name: string;
  idea_title: string;
  new_status: string;
  language?: EmailLanguage;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, idea_title, new_status, language = 'en' }: IdeaStatusEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const validStatuses = ['pending', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(new_status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const firstName = first_name || (lang === 'fr' ? 'Innovateur' : 'Innovator');
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';

    type StatusContent = { subject: string; headline: string; body: string; items: string[] };
    const statusContent: Record<EmailLanguage, Record<string, StatusContent>> = {
      en: {
        under_review: {
          subject: `Your idea "${idea_title}" is now under review`,
          headline: 'Your Idea is Under Review!',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">Great news! Our team has started reviewing your idea "<strong>${idea_title}</strong>".</p>`,
          items: ['Our team is evaluating your pitch', 'This process typically takes 5-7 business days', 'You will be notified of our decision']
        },
        approved: {
          subject: `Congratulations! Your idea "${idea_title}" has been approved`,
          headline: 'Congratulations! Your Idea is Approved!',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">We're thrilled to inform you that your idea "<strong>${idea_title}</strong>" has been approved!</p>`,
          items: ['A member of our team will contact you within 48 hours', 'You may be eligible for up to $500 in seed funding', 'Mentorship support will be provided']
        },
        rejected: {
          subject: `Update on your idea submission "${idea_title}"`,
          headline: 'Update on Your Submission',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">Thank you for submitting your idea "<strong>${idea_title}</strong>". After careful consideration, we've decided not to move forward at this time.</p>`,
          items: ['Continue refining your concept', 'You can resubmit in the future', 'Explore our courses to build your skills']
        },
        pending: {
          subject: `Your idea "${idea_title}" status has been updated`,
          headline: 'Status Update',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">The status of your idea "<strong>${idea_title}</strong>" has been updated to pending.</p>`,
          items: ['Your submission is in the queue', 'Our team will review it shortly']
        }
      },
      fr: {
        under_review: {
          subject: `Votre idée "${idea_title}" est en cours d'examen`,
          headline: 'Votre Idée est en Cours d\'Examen!',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">Bonne nouvelle! Notre équipe a commencé à examiner votre idée "<strong>${idea_title}</strong>".</p>`,
          items: ['Notre équipe évalue votre pitch', 'Ce processus prend généralement 5-7 jours ouvrables', 'Vous serez notifié de notre décision']
        },
        approved: {
          subject: `Félicitations! Votre idée "${idea_title}" a été approuvée`,
          headline: 'Félicitations! Votre Idée est Approuvée!',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">Nous sommes ravis de vous informer que votre idée "<strong>${idea_title}</strong>" a été approuvée!</p>`,
          items: ['Un membre de notre équipe vous contactera sous 48 heures', 'Vous pourriez être éligible à jusqu\'à 500$ de financement initial', 'Un accompagnement par des mentors sera fourni']
        },
        rejected: {
          subject: `Mise à jour sur votre soumission d'idée "${idea_title}"`,
          headline: 'Mise à Jour sur Votre Soumission',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">Merci d'avoir soumis votre idée "<strong>${idea_title}</strong>". Après mûre réflexion, nous avons décidé de ne pas poursuivre pour le moment.</p>`,
          items: ['Continuez à affiner votre concept', 'Vous pouvez resoumettre à l\'avenir', 'Explorez nos cours pour développer vos compétences']
        },
        pending: {
          subject: `Votre idée "${idea_title}" a été mise à jour`,
          headline: 'Mise à Jour du Statut',
          body: `<p style="margin: 0 0 16px 0;">${greeting} ${firstName},</p><p style="margin: 0;">Le statut de votre idée "<strong>${idea_title}</strong>" a été mis à jour en attente.</p>`,
          items: ['Votre soumission est dans la file', 'Notre équipe l\'examinera prochainement']
        }
      }
    };

    const content = statusContent[lang][new_status] || statusContent[lang]['pending'];

    const emailHtml = buildCanonicalEmail({
      headline: content.headline,
      body_primary: content.body,
      impact_block: {
        title: lang === 'fr' ? 'Prochaines étapes' : 'Next Steps',
        items: content.items
      },
      primary_cta: {
        label: lang === 'fr' ? 'Explorer les Cours' : 'Explore Courses',
        url: 'https://acloudforeveryone.org/courses'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: content.subject,
      html: emailHtml,
    });

    console.log("Idea status email sent:", emailResponse);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("email_logs").insert({
      subject: content.subject,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-idea-status-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
