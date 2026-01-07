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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, next_billing, language = 'en' }: ResumedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-RESUMED] Sending email to:", email);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayNextBilling = next_billing || 'N/A';
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';

    const subject = getSubTranslation('subscription.resumed.subject', lang);
    const headline = getSubTranslation('subscription.resumed.headline', lang);

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Bonne nouvelle! Votre abonnement a été repris et vous êtes de retour en action.</p>
         <p style="margin: 0;"><strong>Prochaine facturation:</strong> ${displayNextBilling}</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Great news! Your subscription has been resumed and you're back in action.</p>
         <p style="margin: 0;"><strong>Next Billing Date:</strong> ${displayNextBilling}</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: getSubTranslation('subscription.resumed.impact_title', lang),
        items: [
          getSubTranslation('subscription.resumed.item1', lang),
          getSubTranslation('subscription.resumed.item2', lang),
          getSubTranslation('subscription.resumed.item3', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('subscription.resumed.cta', lang),
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
