import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildCanonicalEmail, EmailLanguage } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionCreatedRequest {
  email: string;
  name: string;
  language?: EmailLanguage;
  // Tier information
  tier_name?: string;
  tier_benefits?: string[];
  // Billing information
  subscription_start?: string;
  next_billing_date?: string;
  billing_interval?: string;
  // Pricing
  amount_paid?: number;
  original_price?: number;
  currency?: string;
  // Discount
  discount_applied?: boolean;
  discount_code?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: SubscriptionCreatedRequest = await req.json();
    const lang: EmailLanguage = data.language === 'fr' ? 'fr' : 'en';

    console.log("[SEND-SUBSCRIPTION-CREATED] Sending email to:", data.email, "tier:", data.tier_name);

    const displayName = data.name || (lang === 'fr' ? 'Abonné' : 'Subscriber');
    const greeting = lang === 'fr' ? 'Bonjour' : 'Hi';
    
    // Use provided tier name or default
    const tierName = data.tier_name || (lang === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');
    
    // Format currency
    const currencySymbol = data.currency === 'EUR' ? '€' : '$';
    const amountPaid = data.amount_paid?.toFixed(2) || '0.00';
    const originalPrice = data.original_price?.toFixed(2) || amountPaid;
    
    // Build billing interval text
    const intervalText = data.billing_interval === 'year' 
      ? (lang === 'fr' ? 'par an' : 'per year')
      : (lang === 'fr' ? 'par mois' : 'per month');
    
    // Subject line includes tier name
    const subject = lang === 'fr' 
      ? `Bienvenue dans ${tierName}!`
      : `Welcome to ${tierName}!`;
    
    const headline = lang === 'fr' 
      ? `${tierName} Activé!`
      : `${tierName} Activated!`;
    
    // Build body with tier, pricing, and discount information
    let bodyParts: string[] = [];
    
    // Greeting
    bodyParts.push(`<p style="margin: 0 0 16px 0;">${greeting} ${displayName},</p>`);
    
    // Thank you and confirmation
    if (lang === 'fr') {
      bodyParts.push(`<p style="margin: 0 0 16px 0;">Merci d'avoir souscrit à <strong>${tierName}</strong>! Votre abonnement est maintenant actif.</p>`);
    } else {
      bodyParts.push(`<p style="margin: 0 0 16px 0;">Thank you for subscribing to <strong>${tierName}</strong>! Your subscription is now active.</p>`);
    }
    
    // Build billing summary table
    let billingSummary = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">`;
    
    // Subscription start
    if (data.subscription_start) {
      const startLabel = lang === 'fr' ? 'Date de début' : 'Start Date';
      billingSummary += `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${startLabel}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${data.subscription_start}</td></tr>`;
    }
    
    // Discount information - ALWAYS show (explicit "None" when no discount)
    const discountLabel = lang === 'fr' ? 'Réduction appliquée' : 'Discount Applied';
    
    if (data.discount_applied && data.discount_code) {
      const originalLabel = lang === 'fr' ? 'Prix original' : 'Original Price';
      const paidLabel = lang === 'fr' ? 'Montant payé aujourd\'hui' : 'Amount Paid Today';
      
      // Show discount code with savings info
      let discountDisplay = data.discount_code;
      if (data.discount_percent) {
        discountDisplay += ` (${data.discount_percent}% off)`;
      } else if (data.discount_amount) {
        discountDisplay += ` (${currencySymbol}${data.discount_amount} off)`;
      }
      billingSummary += `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${discountLabel}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #22c55e; font-weight: 600;">${discountDisplay}</td></tr>`;
      
      // Show original price (struck through)
      billingSummary += `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${originalLabel}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; text-decoration: line-through; color: #888;">${currencySymbol}${originalPrice} ${intervalText}</td></tr>`;
      
      // Show discounted amount
      billingSummary += `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${paidLabel}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: #22c55e;">${currencySymbol}${amountPaid}</td></tr>`;
    } else {
      // Explicitly show "None" when no discount applied
      const noneText = lang === 'fr' ? 'Aucune' : 'None';
      billingSummary += `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${discountLabel}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right; color: #888;">${noneText}</td></tr>`;
      
      const paidLabel = lang === 'fr' ? 'Montant' : 'Amount';
      billingSummary += `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${paidLabel}</td><td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${currencySymbol}${amountPaid} ${intervalText}</td></tr>`;
    }
    
    // Next billing date - CRITICAL for discounted subscriptions
    if (data.next_billing_date) {
      let nextBillingLabel: string;
      let nextBillingValue: string;
      
      if (data.discount_applied) {
        // Emphasize when full price kicks in
        nextBillingLabel = lang === 'fr' 
          ? 'Prochaine facturation (prix régulier)' 
          : 'Next Billing (Full Price)';
        nextBillingValue = `<strong>${data.next_billing_date}</strong> — ${currencySymbol}${originalPrice}`;
      } else {
        nextBillingLabel = lang === 'fr' ? 'Prochaine facturation' : 'Next Billing Date';
        nextBillingValue = data.next_billing_date;
      }
      
      billingSummary += `<tr><td style="padding: 8px 12px; font-weight: 600;">${nextBillingLabel}</td><td style="padding: 8px 12px; text-align: right;">${nextBillingValue}</td></tr>`;
    }
    
    billingSummary += `</table>`;
    bodyParts.push(billingSummary);
    
    const bodyContent = bodyParts.join('');
    
    // Use provided benefits or defaults
    const benefits = data.tier_benefits && data.tier_benefits.length > 0
      ? data.tier_benefits
      : lang === 'fr'
        ? ['Accès illimité à tous les cours', 'Support mentor prioritaire', 'Fonctionnalités communautaires exclusives']
        : ['Unlimited access to all courses', 'Priority mentor support', 'Exclusive community features'];
    
    const impactTitle = lang === 'fr' 
      ? `Ce que ${tierName} inclut:`
      : `What ${tierName} includes:`;

    const emailHtml = buildCanonicalEmail({
      headline,
      body_primary: bodyContent,
      impact_block: {
        title: impactTitle,
        items: benefits,
      },
      primary_cta: {
        label: lang === 'fr' ? 'Explorer les Cours' : 'Explore Courses',
        url: 'https://acloudforeveryone.org/courses'
      }
    }, lang);

    const { data: emailData, error } = await resend.emails.send({
      from: "A Cloud for Everyone <noreply@acloudforeveryone.org>",
      to: [data.email],
      subject,
      html: emailHtml,
    });

    if (error) {
      console.error("[SEND-SUBSCRIPTION-CREATED] Error:", error);
      throw error;
    }

    console.log("[SEND-SUBSCRIPTION-CREATED] Email sent successfully:", emailData);

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
