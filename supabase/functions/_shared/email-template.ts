// Canonical Email Template System
// IMMUTABLE INFRASTRUCTURE - DO NOT MODIFY LAYOUT
// All ACFE emails must use this template

import { EmailLanguage, getEmailTranslation } from './email-translations.ts';

export type { EmailLanguage } from './email-translations.ts';

// ============================================================================
// DESIGN TOKENS (FROZEN - DO NOT CHANGE)
// ============================================================================
export const EMAIL_DESIGN_TOKENS = {
  // Colors (hex only, no interpretation)
  PRIMARY_COLOR: '#4B5C4B',        // Muted olive-green
  SECONDARY_COLOR: '#C9D6C9',      // Light sage
  BACKGROUND_DARK: '#2F2F2F',      // Dark gray header/footer
  BACKGROUND_LIGHT: '#F4F7F4',     // Light gray-green for blocks
  BACKGROUND_WHITE: '#FFFFFF',     // Base white
  TEXT_LIGHT: '#FFFFFF',           // White text
  TEXT_DARK: '#1F1F1F',            // Dark text
  TEXT_MUTED: '#666666',           // Muted text for footer
  BORDER_COLOR: '#E0E0E0',         // Subtle borders
  
  // Layout (fixed values)
  MAX_WIDTH: '600px',
  BORDER_RADIUS: '6px',
  
  // Assets (absolute CDN URLs only)
  LOGO_URL: 'https://acloudforeveryone.org/acfe-logo-email.png',
  LOGO_WIDTH: '140',
  LOGO_HEIGHT: '50',
  
  // Typography (system-safe only)
  FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

// ============================================================================
// CONTENT SLOT INTERFACE (STRICT - NO ADDITIONS)
// ============================================================================
export interface EmailContentSlots {
  headline: string;
  body_primary: string;
  impact_block?: {
    title: string;
    items: string[];
  };
  primary_cta?: {
    label: string;
    url: string;
  };
  secondary_cta?: {
    label: string;
    url: string;
  };
  signoff?: string;
}

// ============================================================================
// CANONICAL EMAIL TEMPLATE (LOCKED - SINGLE SOURCE OF TRUTH)
// ============================================================================
export function buildCanonicalEmail(slots: EmailContentSlots, language: EmailLanguage = 'en'): string {
  const t = EMAIL_DESIGN_TOKENS;
  const team = getEmailTranslation('email.team', language);
  const tagline = getEmailTranslation('email.footerTagline', language);
  const year = new Date().getFullYear();
  
  // Build impact block if provided
  let impactBlockHtml = '';
  if (slots.impact_block && slots.impact_block.items.length > 0) {
    const itemsHtml = slots.impact_block.items
      .map(item => `<li style="margin: 0 0 8px 0; padding-left: 8px;">${item}</li>`)
      .join('');
    
    impactBlockHtml = `
      <tr>
        <td style="padding: 20px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${t.BACKGROUND_LIGHT}; border-radius: ${t.BORDER_RADIUS};">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0 0 12px 0; font-weight: 600; color: ${t.PRIMARY_COLOR};">${slots.impact_block.title}</p>
                <ul style="margin: 0; padding-left: 20px; color: ${t.TEXT_DARK};">
                  ${itemsHtml}
                </ul>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }
  
  // Build CTA zone if CTAs provided
  let ctaZoneHtml = '';
  if (slots.primary_cta || slots.secondary_cta) {
    let ctaContent = '';
    
    if (slots.primary_cta) {
      ctaContent += `
        <td style="padding: 0 8px 0 0;">
          <a href="${slots.primary_cta.url}" style="display: inline-block; background-color: ${t.PRIMARY_COLOR}; color: ${t.TEXT_LIGHT}; text-decoration: none; padding: 14px 28px; border-radius: ${t.BORDER_RADIUS}; font-weight: 600; font-size: 14px;">${slots.primary_cta.label}</a>
        </td>`;
    }
    
    if (slots.secondary_cta) {
      ctaContent += `
        <td style="padding: 0 0 0 8px;">
          <a href="${slots.secondary_cta.url}" style="display: inline-block; background-color: transparent; color: ${t.PRIMARY_COLOR}; text-decoration: none; padding: 14px 28px; border-radius: ${t.BORDER_RADIUS}; font-weight: 600; font-size: 14px; border: 2px solid ${t.PRIMARY_COLOR};">${slots.secondary_cta.label}</a>
        </td>`;
    }
    
    ctaZoneHtml = `
      <tr>
        <td style="padding: 24px 0;">
          <table cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              ${ctaContent}
            </tr>
          </table>
        </td>
      </tr>`;
  }
  
  const signoff = slots.signoff || team;
  
  // CANONICAL TEMPLATE - DO NOT MODIFY STRUCTURE
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>A Cloud For Everyone</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: ${t.FONT_FAMILY}; line-height: 1.6; color: ${t.TEXT_DARK}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: ${t.MAX_WIDTH}; background-color: ${t.BACKGROUND_WHITE}; border-radius: ${t.BORDER_RADIUS}; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- HEADER (LOCKED) -->
          <tr>
            <td style="background-color: ${t.BACKGROUND_DARK}; padding: 24px; text-align: center;">
              <img src="${t.LOGO_URL}" alt="ACFE" width="${t.LOGO_WIDTH}" height="${t.LOGO_HEIGHT}" style="display: block; margin: 0 auto; border: 0; max-width: 100%; height: auto;">
              <p style="margin: 12px 0 0 0; color: ${t.TEXT_LIGHT}; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">A CLOUD FOR EVERYONE</p>
            </td>
          </tr>
          
          <!-- CONTENT ZONE -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                
                <!-- HEADLINE -->
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${t.PRIMARY_COLOR}; line-height: 1.3;">${slots.headline}</h1>
                  </td>
                </tr>
                
                <!-- BODY PRIMARY -->
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <div style="font-size: 15px; color: ${t.TEXT_DARK}; line-height: 1.6;">${slots.body_primary}</div>
                  </td>
                </tr>
                
                <!-- IMPACT BLOCK (CONDITIONAL) -->
                ${impactBlockHtml}
                
                <!-- CTA ZONE (CONDITIONAL) -->
                ${ctaZoneHtml}
                
                <!-- SIGNOFF -->
                <tr>
                  <td style="padding: 16px 0 0 0;">
                    <p style="margin: 0; font-size: 15px; color: ${t.TEXT_DARK};">${signoff}</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- FOOTER (LOCKED) -->
          <tr>
            <td style="background-color: ${t.BACKGROUND_DARK}; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: ${t.TEXT_LIGHT};">contact@acloudforeveryone.org</p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: ${t.TEXT_MUTED};">${tagline}</p>
              <p style="margin: 0; font-size: 11px; color: ${t.TEXT_MUTED};">&copy; ${year} A Cloud for Everyone</p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// EXTENDED TRANSLATIONS FOR SUBSCRIPTION EMAILS
// ============================================================================
export const subscriptionTranslations: Record<EmailLanguage, Record<string, string>> = {
  en: {
    // Subscription Created
    'subscription.created.subject': 'Welcome to ACFE Premium!',
    'subscription.created.headline': 'Subscription Activated!',
    'subscription.created.body': 'Thank you for subscribing! Your subscription is now active and you have full access to all premium features.',
    'subscription.created.impact_title': 'Your subscription includes:',
    'subscription.created.item1': 'Unlimited access to all courses',
    'subscription.created.item2': 'Priority mentor support',
    'subscription.created.item3': 'Exclusive community features',
    'subscription.created.cta': 'Explore Courses',
    
    // Subscription Cancelled
    'subscription.cancelled.subject': 'Your Subscription Has Been Cancelled',
    'subscription.cancelled.headline': 'Subscription Cancelled',
    'subscription.cancelled.body': 'Your subscription has been cancelled. You will continue to have access until the end of your billing period.',
    'subscription.cancelled.impact_title': 'Before you go:',
    'subscription.cancelled.item1': 'Your access continues until',
    'subscription.cancelled.item2': 'You can resubscribe anytime',
    'subscription.cancelled.item3': 'Your progress is saved',
    'subscription.cancelled.cta': 'Resubscribe',
    
    // Subscription Renewed
    'subscription.renewed.subject': 'Your Subscription Has Been Renewed',
    'subscription.renewed.headline': 'Subscription Renewed!',
    'subscription.renewed.body': 'Your subscription has been successfully renewed. Thank you for your continued support of our mission!',
    'subscription.renewed.impact_title': 'What this means:',
    'subscription.renewed.item1': 'Continued access to all courses',
    'subscription.renewed.item2': 'Your learning progress is maintained',
    'subscription.renewed.item3': 'Supporting African tech education',
    'subscription.renewed.cta': 'Continue Learning',
    
    // Subscription Paused
    'subscription.paused.subject': 'Your Subscription Has Been Paused',
    'subscription.paused.headline': 'Subscription Paused',
    'subscription.paused.body': 'Your subscription has been paused. You can resume it at any time to continue your learning journey.',
    'subscription.paused.impact_title': 'While paused:',
    'subscription.paused.item1': 'Billing is suspended',
    'subscription.paused.item2': 'Your progress is saved',
    'subscription.paused.item3': 'Resume anytime to continue',
    'subscription.paused.cta': 'Resume Subscription',
    
    // Subscription Resumed
    'subscription.resumed.subject': 'Your Subscription Has Been Resumed',
    'subscription.resumed.headline': 'Welcome Back!',
    'subscription.resumed.body': 'Your subscription has been resumed. You now have full access again to all premium features.',
    'subscription.resumed.impact_title': 'Your access restored:',
    'subscription.resumed.item1': 'All courses available',
    'subscription.resumed.item2': 'Your progress is intact',
    'subscription.resumed.item3': 'Billing resumes next cycle',
    'subscription.resumed.cta': 'Continue Learning',
    
    // Subscription Ending Reminder
    'subscription.ending.subject': 'Your Subscription Ends Soon',
    'subscription.ending.headline': 'Subscription Ending Soon',
    'subscription.ending.body': 'Your subscription will end soon. Renew now to maintain uninterrupted access to all courses and features.',
    'subscription.ending.impact_title': 'Don\'t miss out on:',
    'subscription.ending.item1': 'Access to all premium courses',
    'subscription.ending.item2': 'Mentor support and guidance',
    'subscription.ending.item3': 'Community features',
    'subscription.ending.cta': 'Renew Now',
    
    // Payment Failed
    'payment.failed.subject': 'Payment Failed - Action Required',
    'payment.failed.headline': 'Payment Issue',
    'payment.failed.body': 'We were unable to process your payment. Please update your payment method to continue your subscription.',
    'payment.failed.impact_title': 'What to do:',
    'payment.failed.item1': 'Update your payment method',
    'payment.failed.item2': 'Check your card details',
    'payment.failed.item3': 'Contact support if issues persist',
    'payment.failed.cta': 'Update Payment',
    
    // Donation Welcome
    'donation.subject': 'Thank You for Your Generous Support!',
    'donation.headline': 'Thank You!',
    'donation.body': 'Your generous donation means the world to us and the young learners across Africa we support.',
    'donation.impact_title': 'Your impact:',
    'donation.item1': 'Sponsoring internships through Spectrogram Consulting',
    'donation.item2': 'Providing access to learning resources',
    'donation.item3': 'Supporting mentorship programs',
    'donation.item4': 'Helping young Africans build tech careers',
    'donation.cta': 'Visit Our Platform',
    
    // Donor Report
    'donor.report.signoff': 'With gratitude,',
  },
  fr: {
    // Subscription Created
    'subscription.created.subject': 'Bienvenue sur ACFE Premium!',
    'subscription.created.headline': 'Abonnement Activé!',
    'subscription.created.body': 'Merci de vous être abonné! Votre abonnement est maintenant actif et vous avez un accès complet à toutes les fonctionnalités premium.',
    'subscription.created.impact_title': 'Votre abonnement comprend:',
    'subscription.created.item1': 'Accès illimité à tous les cours',
    'subscription.created.item2': 'Support mentor prioritaire',
    'subscription.created.item3': 'Fonctionnalités communautaires exclusives',
    'subscription.created.cta': 'Explorer les Cours',
    
    // Subscription Cancelled
    'subscription.cancelled.subject': 'Votre Abonnement a été Annulé',
    'subscription.cancelled.headline': 'Abonnement Annulé',
    'subscription.cancelled.body': 'Votre abonnement a été annulé. Vous continuerez à avoir accès jusqu\'à la fin de votre période de facturation.',
    'subscription.cancelled.impact_title': 'Avant de partir:',
    'subscription.cancelled.item1': 'Votre accès continue jusqu\'au',
    'subscription.cancelled.item2': 'Vous pouvez vous réabonner à tout moment',
    'subscription.cancelled.item3': 'Votre progression est sauvegardée',
    'subscription.cancelled.cta': 'Se Réabonner',
    
    // Subscription Renewed
    'subscription.renewed.subject': 'Votre Abonnement a été Renouvelé',
    'subscription.renewed.headline': 'Abonnement Renouvelé!',
    'subscription.renewed.body': 'Votre abonnement a été renouvelé avec succès. Merci pour votre soutien continu à notre mission!',
    'subscription.renewed.impact_title': 'Ce que cela signifie:',
    'subscription.renewed.item1': 'Accès continu à tous les cours',
    'subscription.renewed.item2': 'Votre progression d\'apprentissage est maintenue',
    'subscription.renewed.item3': 'Soutien à l\'éducation tech africaine',
    'subscription.renewed.cta': 'Continuer à Apprendre',
    
    // Subscription Paused
    'subscription.paused.subject': 'Votre Abonnement a été Mis en Pause',
    'subscription.paused.headline': 'Abonnement en Pause',
    'subscription.paused.body': 'Votre abonnement a été mis en pause. Vous pouvez le reprendre à tout moment pour continuer votre parcours d\'apprentissage.',
    'subscription.paused.impact_title': 'Pendant la pause:',
    'subscription.paused.item1': 'La facturation est suspendue',
    'subscription.paused.item2': 'Votre progression est sauvegardée',
    'subscription.paused.item3': 'Reprenez à tout moment pour continuer',
    'subscription.paused.cta': 'Reprendre l\'Abonnement',
    
    // Subscription Resumed
    'subscription.resumed.subject': 'Votre Abonnement a été Repris',
    'subscription.resumed.headline': 'Bon Retour!',
    'subscription.resumed.body': 'Votre abonnement a été repris. Vous avez de nouveau un accès complet à toutes les fonctionnalités premium.',
    'subscription.resumed.impact_title': 'Votre accès restauré:',
    'subscription.resumed.item1': 'Tous les cours disponibles',
    'subscription.resumed.item2': 'Votre progression est intacte',
    'subscription.resumed.item3': 'La facturation reprend au prochain cycle',
    'subscription.resumed.cta': 'Continuer à Apprendre',
    
    // Subscription Ending Reminder
    'subscription.ending.subject': 'Votre Abonnement se Termine Bientôt',
    'subscription.ending.headline': 'Abonnement se Terminant Bientôt',
    'subscription.ending.body': 'Votre abonnement se terminera bientôt. Renouvelez maintenant pour maintenir un accès ininterrompu à tous les cours et fonctionnalités.',
    'subscription.ending.impact_title': 'Ne manquez pas:',
    'subscription.ending.item1': 'Accès à tous les cours premium',
    'subscription.ending.item2': 'Support et guidance des mentors',
    'subscription.ending.item3': 'Fonctionnalités communautaires',
    'subscription.ending.cta': 'Renouveler Maintenant',
    
    // Payment Failed
    'payment.failed.subject': 'Échec du Paiement - Action Requise',
    'payment.failed.headline': 'Problème de Paiement',
    'payment.failed.body': 'Nous n\'avons pas pu traiter votre paiement. Veuillez mettre à jour votre méthode de paiement pour continuer votre abonnement.',
    'payment.failed.impact_title': 'Que faire:',
    'payment.failed.item1': 'Mettez à jour votre méthode de paiement',
    'payment.failed.item2': 'Vérifiez les détails de votre carte',
    'payment.failed.item3': 'Contactez le support si le problème persiste',
    'payment.failed.cta': 'Mettre à Jour le Paiement',
    
    // Donation Welcome
    'donation.subject': 'Merci pour Votre Généreux Soutien!',
    'donation.headline': 'Merci!',
    'donation.body': 'Votre don généreux signifie beaucoup pour nous et les jeunes apprenants à travers l\'Afrique que nous soutenons.',
    'donation.impact_title': 'Votre impact:',
    'donation.item1': 'Parrainer des stages via Spectrogram Consulting',
    'donation.item2': 'Fournir l\'accès aux ressources d\'apprentissage',
    'donation.item3': 'Soutenir les programmes de mentorat',
    'donation.item4': 'Aider les jeunes Africains à construire des carrières tech',
    'donation.cta': 'Visiter Notre Plateforme',
    
    // Donor Report
    'donor.report.signoff': 'Avec gratitude,',
  }
};

// Helper to get subscription translation
export function getSubTranslation(key: string, language: EmailLanguage = 'en'): string {
  return subscriptionTranslations[language][key] || subscriptionTranslations['en'][key] || key;
}
