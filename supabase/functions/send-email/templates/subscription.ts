import { buildCanonicalTemplate } from './_base.ts';
import { getText, getGreeting, type Language } from './_translations.ts';

export interface SubscriptionEmailData {
  userName?: string;
  tierName?: string;
  endDate?: string;
  days?: number;
}

export type SubscriptionEmailType = 
  | 'subscription-created'
  | 'subscription-renewed'
  | 'subscription-ending'
  | 'subscription-cancelled'
  | 'subscription-paused'
  | 'subscription-resumed';

export function buildSubscriptionEmail(
  type: SubscriptionEmailType,
  data: SubscriptionEmailData,
  language: Language
): { subject: string; html: string } {
  const tierDisplay = data.tierName || (language === 'fr' ? 'Abonnement ACFE' : 'ACFE Subscription');
  const greeting = data.userName ? getGreeting(data.userName, language) : undefined;
  
  // Build status summary table
  const statusTable = (status: string, statusColor: string) => `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${language === 'fr' ? 'Abonnement' : 'Subscription'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${tierDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 12px; font-weight: 600;">${language === 'fr' ? 'Statut' : 'Status'}</td>
        <td style="padding: 12px; text-align: right; color: ${statusColor}; font-weight: 600;">${status}</td>
      </tr>
    </table>`;

  switch (type) {
    case 'subscription-created': {
      const subject = getText('subscription.created.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('subscription.created.body', language)}</p>
          ${statusTable(language === 'fr' ? 'Actif' : 'Active', '#22c55e')}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('subscription.created.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/dashboard',
        language
      });
      return { subject, html };
    }

    case 'subscription-renewed': {
      const subject = getText('subscription.renewed.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('subscription.renewed.body', language)}</p>
          ${statusTable(language === 'fr' ? 'Renouvelé' : 'Renewed', '#22c55e')}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('subscription.renewed.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/dashboard',
        language
      });
      return { subject, html };
    }

    case 'subscription-ending': {
      const daysLeft = String(data.days || 7);
      const subject = getText('subscription.ending.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('subscription.ending.body', language, { days: daysLeft })}</p>
          ${statusTable(language === 'fr' ? `Expire dans ${daysLeft} jours` : `Expires in ${daysLeft} days`, '#f59e0b')}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('subscription.ending.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/pricing',
        language
      });
      return { subject, html };
    }

    case 'subscription-cancelled': {
      const subject = getText('subscription.cancelled.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('subscription.cancelled.body', language, { endDate: data.endDate || '' })}</p>
          ${statusTable(language === 'fr' ? 'Annulé' : 'Cancelled', '#ef4444')}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('subscription.cancelled.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/pricing',
        language
      });
      return { subject, html };
    }

    case 'subscription-paused': {
      const subject = getText('subscription.paused.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('subscription.paused.body', language)}</p>
          ${statusTable(language === 'fr' ? 'En pause' : 'Paused', '#f59e0b')}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('subscription.paused.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/my-subscriptions',
        language
      });
      return { subject, html };
    }

    case 'subscription-resumed': {
      const subject = getText('subscription.resumed.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('subscription.resumed.body', language)}</p>
          ${statusTable(language === 'fr' ? 'Actif' : 'Active', '#22c55e')}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('subscription.resumed.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/dashboard',
        language
      });
      return { subject, html };
    }

    default:
      throw new Error(`Unknown subscription email type: ${type}`);
  }
}
