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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, currency, language = 'en' }: PaymentFailedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-PAYMENT-FAILED] Sending to:", email);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayAmount = amount || 'N/A';
    const displayCurrency = currency || 'USD';
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';

    const subject = getSubTranslation('payment.failed.subject', lang);
    const headline = getSubTranslation('payment.failed.headline', lang);

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Nous n'avons pas pu traiter votre paiement d'abonnement.</p>
         <p style="margin: 0;"><strong>Montant:</strong> ${displayCurrency} ${displayAmount}</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">We were unable to process your subscription payment.</p>
         <p style="margin: 0;"><strong>Amount:</strong> ${displayCurrency} ${displayAmount}</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: getSubTranslation('payment.failed.impact_title', lang),
        items: [
          getSubTranslation('payment.failed.item1', lang),
          getSubTranslation('payment.failed.item2', lang),
          getSubTranslation('payment.failed.item3', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('payment.failed.cta', lang),
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
