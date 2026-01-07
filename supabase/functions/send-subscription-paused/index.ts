import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PausedEmailRequest {
  email: string;
  name: string;
  language?: EmailLanguage;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, language = 'en' }: PausedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-PAUSED] Sending email to:", email);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';

    const subject = getSubTranslation('subscription.paused.subject', lang);
    const headline = getSubTranslation('subscription.paused.headline', lang);

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0;">Votre abonnement a été mis en pause. Vous pouvez le reprendre à tout moment pour continuer votre parcours d'apprentissage.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0;">Your subscription has been paused. You can resume it at any time to continue your learning journey.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: getSubTranslation('subscription.paused.impact_title', lang),
        items: [
          getSubTranslation('subscription.paused.item1', lang),
          getSubTranslation('subscription.paused.item2', lang),
          getSubTranslation('subscription.paused.item3', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('subscription.paused.cta', lang),
        url: 'https://acloudforeveryone.org/my-subscriptions'
      }
    }, lang);

    const { data, error } = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error("[SEND-SUBSCRIPTION-PAUSED] Error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-PAUSED] Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[SEND-SUBSCRIPTION-PAUSED] Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
