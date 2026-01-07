import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionCreatedRequest {
  email: string;
  name: string;
  subscription_start: string;
  language?: EmailLanguage;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, subscription_start, language = 'en' }: SubscriptionCreatedRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-CREATED] Sending email to:", email);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';

    const subject = getSubTranslation('subscription.created.subject', lang);
    const headline = getSubTranslation('subscription.created.headline', lang);
    
    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0;">Merci de vous être abonné! Votre abonnement est maintenant actif depuis le <strong>${subscription_start}</strong>.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0;">Thank you for subscribing! Your subscription is now active as of <strong>${subscription_start}</strong>.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: getSubTranslation('subscription.created.impact_title', lang),
        items: [
          getSubTranslation('subscription.created.item1', lang),
          getSubTranslation('subscription.created.item2', lang),
          getSubTranslation('subscription.created.item3', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('subscription.created.cta', lang),
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
      console.error("[SEND-SUBSCRIPTION-CREATED] Error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-CREATED] Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-SUBSCRIPTION-CREATED] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
