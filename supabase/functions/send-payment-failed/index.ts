import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentFailedEmailRequest {
  email: string;
  name: string;
  amount: string;
  currency: string;
  language?: EmailLanguage;
  tier_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, currency, language = 'en', tier_name }: PaymentFailedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-PAYMENT-FAILED] Sending to:", email, "tier:", tier_name, "language:", lang);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayAmount = amount || 'N/A';
    const displayCurrency = currency || 'USD';
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';
    const tierDisplay = tier_name || (lang === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');
    const currencySymbol = displayCurrency === 'EUR' ? '€' : '$';

    const subject = lang === 'fr'
      ? `Échec du paiement pour ${tierDisplay}`
      : `Payment Failed for ${tierDisplay}`;
    
    const headline = lang === 'fr'
      ? 'Échec du Paiement'
      : 'Payment Failed';

    // Build payment details table
    const paymentDetails = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #fecaca; font-weight: 600;">${lang === 'fr' ? 'Abonnement' : 'Subscription'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #fecaca; text-align: right;">${tierDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: 600;">${lang === 'fr' ? 'Montant' : 'Amount'}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${currencySymbol}${displayAmount}</td>
        </tr>
      </table>`;

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Nous n'avons pas pu traiter votre paiement d'abonnement.</p>
         ${paymentDetails}
         <p style="margin: 0;">Veuillez mettre à jour vos informations de paiement pour éviter l'interruption de votre accès.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">We were unable to process your subscription payment.</p>
         ${paymentDetails}
         <p style="margin: 0;">Please update your payment information to avoid interruption of your access.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Ce que cela signifie:' : 'What this means:',
        items: [
          lang === 'fr' ? 'Votre accès peut être suspendu' : 'Your access may be suspended',
          lang === 'fr' ? 'Nous réessaierons automatiquement' : 'We will automatically retry',
          lang === 'fr' ? 'Mettez à jour votre mode de paiement' : 'Update your payment method',
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Mettre à jour le paiement' : 'Update Payment',
        url: 'https://acloudforeveryone.org/my-subscriptions'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject,
      html: emailHtml,
    });

    console.log("[SEND-PAYMENT-FAILED] Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-PAYMENT-FAILED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
