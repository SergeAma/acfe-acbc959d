import { buildCanonicalTemplate } from './_base.ts';
import { getText, getGreeting, type Language } from './_translations.ts';

export interface EventEmailData {
  userName?: string;
  eventName: string;
  eventDate?: string;
  eventTime?: string;
  timeUntil?: string;
  eventUrl?: string;
  eventLocation?: string;
}

export type EventEmailType = 'event-confirmation' | 'event-reminder';

export function buildEventEmail(
  type: EventEmailType,
  data: EventEmailData,
  language: Language
): { subject: string; html: string } {
  const greeting = data.userName ? getGreeting(data.userName, language) : undefined;
  
  // Build event details table
  const eventDetailsTable = `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${language === 'fr' ? 'Événement' : 'Event'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${data.eventName}</td>
      </tr>
      ${data.eventDate ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${language === 'fr' ? 'Date' : 'Date'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${data.eventDate}</td>
      </tr>` : ''}
      ${data.eventTime ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; font-weight: 600;">${language === 'fr' ? 'Heure' : 'Time'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${data.eventTime}</td>
      </tr>` : ''}
      ${data.eventLocation ? `
      <tr>
        <td style="padding: 12px; font-weight: 600;">${language === 'fr' ? 'Lieu' : 'Location'}</td>
        <td style="padding: 12px; text-align: right;">${data.eventLocation}</td>
      </tr>` : ''}
    </table>`;

  switch (type) {
    case 'event-confirmation': {
      const subject = getText('event.confirmation.subject', language, { eventName: data.eventName });
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('event.confirmation.body', language, { 
            eventName: data.eventName, 
            eventDate: data.eventDate || '',
            eventTime: data.eventTime || ''
          })}</p>
          ${eventDetailsTable}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('event.confirmation.cta', language),
        ctaUrl: data.eventUrl || 'https://acloudforeveryone.org/events',
        language
      });
      return { subject, html };
    }

    case 'event-reminder': {
      const subject = getText('event.reminder.subject', language, { 
        eventName: data.eventName,
        timeUntil: data.timeUntil || (language === 'fr' ? 'bientôt' : 'soon')
      });
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('event.reminder.body', language, { 
            eventName: data.eventName, 
            timeUntil: data.timeUntil || (language === 'fr' ? 'bientôt' : 'soon')
          })}</p>
          ${eventDetailsTable}
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('event.reminder.cta', language),
        ctaUrl: data.eventUrl || 'https://acloudforeveryone.org/events',
        language
      });
      return { subject, html };
    }

    default:
      throw new Error(`Unknown event email type: ${type}`);
  }
}
