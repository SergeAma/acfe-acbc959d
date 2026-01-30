import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RenewedEmailRequest {
  email: string;
  name: string;
  amount: string;
  currency: string;
  next_billing: string;
  language?: EmailLanguage;
  tier_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, currency, next_billing, language = 'en', tier_name }: RenewedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-RENEWED] Sending to:", email, "tier:", tier_name, "language:", lang);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayAmount = amount || 'N/A';
    const displayCurrency = currency || 'USD';
    const displayNextBilling = next_billing || 'N/A';
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';
    const tierDisplay = tier_name || (lang === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');
    const currencySymbol = displayCurrency === 'EUR' ? '€' : '$';

    const subject = lang === 'fr'
      ? `Votre ${tierDisplay} a été Renouvelé`
      : `Your ${tierDisplay} Has Been Renewed`;
    
    const headline = lang === 'fr'
      ? 'Abonnement Renouvelé!'
      : 'Subscription Renewed!';

    // Build billing summary table
    const billingSummary = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f0fdf4; border-radius: 6px; border: 1px solid #86efac;">
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #86efac; font-weight: 600;">${lang === 'fr' ? 'Abonnement' : 'Subscription'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #86efac; text-align: right;">${tierDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #86efac; font-weight: 600;">${lang === 'fr' ? 'Montant facturé' : 'Amount Charged'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #86efac; text-align: right; font-weight: 600;">${currencySymbol}${displayAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: 600;">${lang === 'fr' ? 'Prochaine facturation' : 'Next Billing Date'}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${displayNextBilling}</td>
        </tr>
      </table>`;

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Bonne nouvelle! Votre abonnement <strong>${tierDisplay}</strong> a été renouvelé avec succès.</p>
         ${billingSummary}
         <p style="margin: 0;">Merci pour votre soutien continu à notre mission d'autonomisation de la jeunesse africaine!</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Great news! Your <strong>${tierDisplay}</strong> subscription has been successfully renewed.</p>
         ${billingSummary}
         <p style="margin: 0;">Thank you for your continued support of our mission to empower African youth!</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Ce que cela signifie:' : 'What this means:',
        items: [
          lang === 'fr' ? 'Accès continu à tous les cours' : 'Continued access to all courses',
          lang === 'fr' ? 'Votre progression d\'apprentissage est maintenue' : 'Your learning progress is maintained',
          lang === 'fr' ? 'Soutien à l\'éducation tech africaine' : 'Supporting African tech education',
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Continuer à Apprendre' : 'Continue Learning',
        url: 'https://acloudforeveryone.org/dashboard'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject,
      html: emailHtml,
    });

    console.log("[SEND-SUBSCRIPTION-RENEWED] Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-SUBSCRIPTION-RENEWED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);