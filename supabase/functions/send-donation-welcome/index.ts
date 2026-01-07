import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, getSubTranslation, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DonationWelcomeRequest {
  email: string;
  firstName: string;
  lastName: string;
  amountCents: number;
  language?: EmailLanguage;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, amountCents, language = 'en' }: DonationWelcomeRequest = await req.json();
    const amount = (amountCents / 100).toFixed(2);
    const displayName = firstName || "Generous Donor";
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';
    
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';
    const team = lang === 'fr' ? "L'Équipe ACFE" : 'The ACFE Team';
    const amountText = lang === 'fr'
      ? `Votre don mensuel de $${amount} signifie beaucoup pour nous.`
      : `Your monthly donation of $${amount} means the world to us.`;

    const emailHtml = buildCanonicalEmail({
      headline: getSubTranslation('donation.headline', lang),
      body_primary: `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p><p style="margin: 0;">${amountText}</p>`,
      impact_block: {
        title: getSubTranslation('donation.impact_title', lang),
        items: [
          getSubTranslation('donation.item1', lang),
          getSubTranslation('donation.item2', lang),
          getSubTranslation('donation.item3', lang),
          getSubTranslation('donation.item4', lang),
        ]
      },
      primary_cta: {
        label: getSubTranslation('donation.cta', lang),
        url: 'https://acloudforeveryone.org/home'
      },
      signoff: team
    }, lang);

    const { data, error } = await resend.emails.send({
      from: "A Cloud For Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: getSubTranslation('donation.subject', lang),
      html: emailHtml,
    });

    if (error) {
      console.error("Error sending donation welcome email:", error);
      throw error;
    }

    console.log("Donation welcome email sent:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending donation welcome email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
