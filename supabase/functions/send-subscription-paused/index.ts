import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PausedEmailRequest {
  email: string;
  name: string;
  language?: EmailLanguage;
  tier_name?: string;
  user_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, language = 'en', tier_name, user_id }: PausedEmailRequest = await req.json();
    const lang: EmailLanguage = language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-PAUSED] Sending email to:", email, "tier:", tier_name, "language:", lang);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ========================================
    // NEW: Try centralized send-email function first
    // ========================================
    try {
      const emailResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'subscription-paused',
            to: email,
            data: {
              userName: name,
              tierName: tier_name
            },
            userId: user_id,
            language: lang
          })
        }
      );

      if (emailResponse.ok) {
        const result = await emailResponse.json();
        console.log("[SEND-SUBSCRIPTION-PAUSED] Centralized email sent:", result);
        
        return new Response(JSON.stringify({ success: true, method: 'centralized' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        const errorText = await emailResponse.text();
        console.error("[SEND-SUBSCRIPTION-PAUSED] Centralized email failed:", errorText);
        // Fall through to direct Resend
      }
    } catch (centralizedError) {
      console.error("[SEND-SUBSCRIPTION-PAUSED] Centralized email error:", centralizedError);
      // Fall through to direct Resend
    }

    // ========================================
    // FALLBACK: Direct Resend send
    // ========================================
    const displayName = name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';
    const tierDisplay = tier_name || (lang === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');

    const subject = lang === 'fr'
      ? `Votre ${tierDisplay} a été Mis en Pause`
      : `Your ${tierDisplay} Has Been Paused`;
    
    const headline = lang === 'fr'
      ? `${tierDisplay} en Pause`
      : `${tierDisplay} Paused`;

    // Build status summary table
    const statusSummary = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${lang === 'fr' ? 'Abonnement' : 'Subscription'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${tierDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: 600;">${lang === 'fr' ? 'Statut' : 'Status'}</td>
          <td style="padding: 8px 12px; text-align: right; color: #f59e0b; font-weight: 600;">${lang === 'fr' ? 'En pause' : 'Paused'}</td>
        </tr>
      </table>`;

    const bodyContent = lang === 'fr'
      ? `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Votre abonnement <strong>${tierDisplay}</strong> a été mis en pause.</p>
         ${statusSummary}
         <p style="margin: 0;">Vous pouvez le reprendre à tout moment pour continuer votre parcours d'apprentissage.</p>`
      : `<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>
         <p style="margin: 0 0 16px 0;">Your <strong>${tierDisplay}</strong> subscription has been paused.</p>
         ${statusSummary}
         <p style="margin: 0;">You can resume it at any time to continue your learning journey.</p>`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: lang === 'fr' ? 'Pendant la pause:' : 'While paused:',
        items: [
          lang === 'fr' ? 'La facturation est suspendue' : 'Billing is suspended',
          lang === 'fr' ? 'Votre progression est sauvegardée' : 'Your progress is saved',
          lang === 'fr' ? 'Reprenez à tout moment pour continuer' : 'Resume anytime to continue',
        ]
      },
      primary_cta: {
        label: lang === 'fr' ? 'Reprendre l\'Abonnement' : 'Resume Subscription',
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
      console.error("[SEND-SUBSCRIPTION-PAUSED] Resend error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-PAUSED] Email sent successfully (fallback):", data);

    return new Response(JSON.stringify({ success: true, method: 'fallback' }), {
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
