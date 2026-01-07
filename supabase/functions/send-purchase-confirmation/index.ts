import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseEmailRequest {
  email: string;
  firstName: string;
  courseTitle: string;
  amount: number;
  isSubscription: boolean;
  isTrial?: boolean;
  dripEnabled?: boolean;
  dripReleaseDay?: number;
  language?: EmailLanguage;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, courseTitle, amount, isSubscription, isTrial, dripEnabled, dripReleaseDay, language = 'en' }: PurchaseEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log(`[SEND-PURCHASE-CONFIRMATION] Sending to ${email} for course: ${courseTitle}`);

    const getDayName = (day: number, lang: EmailLanguage): string => {
      const days = lang === 'fr' 
        ? ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[day] || days[3];
    };

    const displayName = firstName || (lang === 'fr' ? 'Apprenant' : 'Learner');
    const greeting = lang === 'fr' ? 'Cher' : 'Dear';

    let bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Merci de vous être inscrit à <strong>${courseTitle}</strong>! Votre paiement de <strong>$${amount.toFixed(2)}</strong> a été traité avec succès.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Thank you for enrolling in <strong>${courseTitle}</strong>! Your payment of <strong>$${amount.toFixed(2)}</strong> has been processed successfully.</p>`;

    if (dripEnabled) {
      const dayName = getDayName(dripReleaseDay ?? 3, lang);
      bodyContent += lang === 'fr'
        ? `<p style="margin: 0;">Votre première leçon est disponible maintenant! Ensuite, de nouvelles leçons se débloquent chaque <strong>${dayName}</strong>.</p>`
        : `<p style="margin: 0;">Your first lesson is available now! After that, new lessons unlock every <strong>${dayName}</strong>.</p>`;
    }

    if (isSubscription) {
      bodyContent += lang === 'fr'
        ? `<p style="margin: 16px 0 0 0; font-size: 13px; color: #666;">${isTrial ? 'Votre essai gratuit a commencé!' : `Ceci est un abonnement mensuel à $${amount.toFixed(2)}/mois.`} Vous pouvez gérer votre abonnement à tout moment depuis votre tableau de bord.</p>`
        : `<p style="margin: 16px 0 0 0; font-size: 13px; color: #666;">${isTrial ? 'Your free trial has started!' : `This is a monthly subscription at $${amount.toFixed(2)}/month.`} You can manage your subscription anytime from your dashboard.</p>`;
    }

    const subject = lang === 'fr' 
      ? `Bienvenue dans ${courseTitle}!`
      : `Welcome to ${courseTitle}!`;

    const emailHtml = buildCanonicalEmail({
      headline: lang === 'fr' ? 'Paiement Confirmé!' : 'Payment Confirmed!',
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Prochaines étapes' : "What's next?",
        items: lang === 'fr' ? [
          'Accédez à votre première leçon depuis le Tableau de Bord',
          dripEnabled ? 'De nouvelles leçons se débloquent chaque semaine' : 'Complétez les leçons à votre rythme',
          'Obtenez votre certificat à la fin'
        ] : [
          'Access your first lesson from the Dashboard',
          dripEnabled ? 'New lessons unlock weekly - check back regularly!' : 'Complete lessons at your own pace',
          'Earn your certificate upon completion'
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Commencer à Apprendre' : 'Start Learning Now',
        url: 'https://acloudforeveryone.org/dashboard'
      }
    }, lang);

    const emailResponse = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [email],
      subject: subject,
      html: emailHtml,
    });

    console.log("[SEND-PURCHASE-CONFIRMATION] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SEND-PURCHASE-CONFIRMATION] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
