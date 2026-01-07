import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancelledEmailRequest {
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
    const { email, name, subscription_end, language = 'en' }: CancelledEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-CANCELLED] Sending to:", email);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';

    const subject = getSubTranslation('subscription.cancelled.subject', lang);
    const headline = getSubTranslation('subscription.cancelled.headline', lang);

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Nous sommes désolés de vous voir partir. Votre abonnement a été annulé.</p>
         <p style="margin: 0;"><strong>Accès jusqu'au:</strong> ${subscription_end}</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">We're sorry to see you go. Your subscription has been cancelled.</p>
         <p style="margin: 0;"><strong>Access Until:</strong> ${subscription_end}</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: getSubTranslation('subscription.cancelled.impact_title', lang),
        items: [
          `${getSubTranslation('subscription.cancelled.item1', lang)} ${subscription_end}`,
          getSubTranslation('subscription.cancelled.item2', lang),
          getSubTranslation('subscription.cancelled.item3', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('subscription.cancelled.cta', lang),
        url: 'https://acloudforeveryone.org/pricing'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject,
      html: emailHtml,
    });

    console.log("[SEND-SUBSCRIPTION-CANCELLED] Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-SUBSCRIPTION-CANCELLED] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
