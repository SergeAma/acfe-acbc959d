import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResumedEmailRequest {
  email: string;
  name: string;
  next_billing: string;
  language?: EmailLanguage;
  tier_name?: string;
  amount?: string;
  currency?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, next_billing, language = 'en', tier_name, amount, currency = 'USD' }: ResumedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-RESUMED] Sending email to:", email, "tier:", tier_name, "language:", lang);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayNextBilling = next_billing || 'N/A';
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';
    const tierDisplay = tier_name || (lang === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');
    const currencySymbol = currency === 'EUR' ? '€' : '$';

    const subject = lang === 'fr'
      ? `Votre ${tierDisplay} a été Repris!`
      : `Your ${tierDisplay} Has Been Resumed!`;
    
    const headline = lang === 'fr'
      ? 'Bon Retour!'
      : 'Welcome Back!';

    // Build billing summary table
    let billingSummary = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${lang === 'fr' ? 'Abonnement' : 'Subscription'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${tierDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${lang === 'fr' ? 'Statut' : 'Status'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #22c55e; font-weight: 600;">${lang === 'fr' ? 'Actif' : 'Active'}</td>
        </tr>`;
    
    if (amount) {
      billingSummary += `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${lang === 'fr' ? 'Montant' : 'Amount'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${currencySymbol}${amount}/${lang === 'fr' ? 'mois' : 'month'}</td>
        </tr>`;
    }
    
    billingSummary += `
        <tr>
          <td style="padding: 8px 12px; font-weight: 600;">${lang === 'fr' ? 'Prochaine facturation' : 'Next Billing Date'}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${displayNextBilling}</td>
        </tr>
      </table>`;

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Bonne nouvelle! Votre abonnement <strong>${tierDisplay}</strong> a été repris et vous êtes de retour en action.</p>
         ${billingSummary}`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Great news! Your <strong>${tierDisplay}</strong> subscription has been resumed and you're back in action.</p>
         ${billingSummary}`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Votre accès restauré:' : 'Your access restored:',
        items: [
          lang === 'fr' ? 'Tous les cours disponibles' : 'All courses available',
          lang === 'fr' ? 'Votre progression est intacte' : 'Your progress is intact',
          lang === 'fr' ? `Prochaine facturation: ${displayNextBilling}` : `Next billing: ${displayNextBilling}`,
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Continuer à Apprendre' : 'Continue Learning',
        url: 'https://acloudforeveryone.org/courses'
      }
    }, lang);

    const { data, error } = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error("[SEND-SUBSCRIPTION-RESUMED] Error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-RESUMED] Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-SUBSCRIPTION-RESUMED] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});