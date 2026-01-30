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
  tier_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, subscription_end, language = 'en', tier_name }: CancelledEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-CANCELLED] Sending to:", email, "tier:", tier_name, "language:", lang);

    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';
    const tierDisplay = tier_name || (lang === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');

    const subject = lang === 'fr'
      ? `Votre ${tierDisplay} a été Annulé`
      : `Your ${tierDisplay} Has Been Cancelled`;
    
    const headline = lang === 'fr'
      ? `${tierDisplay} Annulé`
      : `${tierDisplay} Cancelled`;

    // Build billing summary table with access end date
    const accessLabel = lang === 'fr' ? 'Accès jusqu\'au' : 'Access Until';
    const statusLabel = lang === 'fr' ? 'Statut' : 'Status';
    const statusValue = lang === 'fr' ? 'Annulé' : 'Cancelled';
    
    const billingSummary = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${lang === 'fr' ? 'Abonnement' : 'Subscription'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${tierDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${statusLabel}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #ef4444; font-weight: 600;">${statusValue}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: 600;">${accessLabel}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${subscription_end}</td>
        </tr>
      </table>`;

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Nous sommes désolés de vous voir partir. Votre abonnement <strong>${tierDisplay}</strong> a été annulé.</p>
         ${billingSummary}
         <p style="margin: 0;">Vous continuerez à avoir accès à tous les contenus premium jusqu'à la date indiquée ci-dessus.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">We're sorry to see you go. Your <strong>${tierDisplay}</strong> subscription has been cancelled.</p>
         ${billingSummary}
         <p style="margin: 0;">You will continue to have access to all premium content until the date shown above.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Avant de partir:' : 'Before you go:',
        items: [
          lang === 'fr' 
            ? `Votre accès continue jusqu'au ${subscription_end}` 
            : `Your access continues until ${subscription_end}`,
          lang === 'fr' 
            ? 'Vous pouvez vous réabonner à tout moment' 
            : 'You can resubscribe anytime',
          lang === 'fr' 
            ? 'Votre progression est sauvegardée' 
            : 'Your progress is saved',
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Se Réabonner' : 'Resubscribe',
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