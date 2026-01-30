import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderEmailRequest {
  email: string;
  name: string;
  subscription_end: string;
  language?: EmailLanguage;
  tier_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, subscription_end, language = 'en', tier_name }: ReminderEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-ENDING-REMINDER] Sending to:", email, "tier:", tier_name, "language:", lang);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayEndDate = subscription_end || (lang === 'fr' ? 'bientôt' : 'soon');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';
    const tierDisplay = tier_name || (lang === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');

    const subject = lang === 'fr'
      ? `Votre ${tierDisplay} se Termine Bientôt`
      : `Your ${tierDisplay} Ends Soon`;
    
    const headline = lang === 'fr'
      ? 'Abonnement se Terminant Bientôt'
      : 'Subscription Ending Soon';

    // Build status summary table
    const statusSummary = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #fef3c7; border-radius: 6px; border: 1px solid #fcd34d;">
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #fcd34d; font-weight: 600;">${lang === 'fr' ? 'Abonnement' : 'Subscription'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #fcd34d; text-align: right;">${tierDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #fcd34d; font-weight: 600;">${lang === 'fr' ? 'Statut' : 'Status'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #fcd34d; text-align: right; color: #d97706; font-weight: 600;">${lang === 'fr' ? 'Se termine' : 'Ending'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: 600;">${lang === 'fr' ? 'Accès se termine le' : 'Access Ends On'}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: #d97706;">${displayEndDate}</td>
        </tr>
      </table>`;

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Ceci est un rappel amical que votre abonnement <strong>${tierDisplay}</strong> se termine bientôt.</p>
         ${statusSummary}
         <p style="margin: 0;">Renouvelez maintenant pour maintenir un accès ininterrompu à tous les cours et fonctionnalités.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">This is a friendly reminder that your <strong>${tierDisplay}</strong> subscription is set to end soon.</p>
         ${statusSummary}
         <p style="margin: 0;">Renew now to maintain uninterrupted access to all courses and features.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Ne manquez pas:' : 'Don\'t miss out on:',
        items: [
          lang === 'fr' ? 'Accès à tous les cours premium' : 'Access to all premium courses',
          lang === 'fr' ? 'Support et guidance des mentors' : 'Mentor support and guidance',
          lang === 'fr' ? 'Fonctionnalités communautaires' : 'Community features',
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Renouveler Maintenant' : 'Renew Now',
        url: 'https://acloudforeveryone.org/my-subscriptions'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject,
      html: emailHtml,
    });

    console.log("[SEND-SUBSCRIPTION-ENDING-REMINDER] Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-SUBSCRIPTION-ENDING-REMINDER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);