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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, subscription_end, language = 'en' }: ReminderEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-ENDING-REMINDER] Sending to:", email);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const displayEndDate = subscription_end || (lang === 'fr' ? 'bientôt' : 'soon');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';

    const subject = getSubTranslation('subscription.ending.subject', lang);
    const headline = getSubTranslation('subscription.ending.headline', lang);

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Ceci est un rappel amical que votre abonnement se termine bientôt.</p>
         <p style="margin: 0;"><strong>Accès se termine le:</strong> ${displayEndDate}</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">This is a friendly reminder that your subscription is set to end soon.</p>
         <p style="margin: 0;"><strong>Access Ends On:</strong> ${displayEndDate}</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: getSubTranslation('subscription.ending.impact_title', lang),
        items: [
          getSubTranslation('subscription.ending.item1', lang),
          getSubTranslation('subscription.ending.item2', lang),
          getSubTranslation('subscription.ending.item3', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('subscription.ending.cta', lang),
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
