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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, amount, currency, next_billing, language = 'en' }: RenewedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-RENEWED] Sending to:", email);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayAmount = amount || 'N/A';
    const displayCurrency = currency || 'USD';
    const displayNextBilling = next_billing || 'N/A';
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';

    const subject = getSubTranslation('subscription.renewed.subject', lang);
    const headline = getSubTranslation('subscription.renewed.headline', lang);

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Bonne nouvelle! Votre abonnement a été renouvelé avec succès.</p>
         <p style="margin: 0;"><strong>Montant facturé:</strong> ${displayCurrency} ${displayAmount}<br><strong>Prochaine facturation:</strong> ${displayNextBilling}</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Great news! Your subscription has been successfully renewed.</p>
         <p style="margin: 0;"><strong>Amount Charged:</strong> ${displayCurrency} ${displayAmount}<br><strong>Next Billing Date:</strong> ${displayNextBilling}</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: getSubTranslation('subscription.renewed.impact_title', lang),
        items: [
          getSubTranslation('subscription.renewed.item1', lang),
          getSubTranslation('subscription.renewed.item2', lang),
          getSubTranslation('subscription.renewed.item3', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('subscription.renewed.cta', lang),
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
