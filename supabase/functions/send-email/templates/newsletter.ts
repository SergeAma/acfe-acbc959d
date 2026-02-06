import { buildCanonicalTemplate } from './_base.ts';
import { getText, type Language } from './_translations.ts';

export interface NewsletterEmailData {
  userEmail: string;
}

export function buildNewsletterWelcomeEmail(data: NewsletterEmailData, language: Language): { subject: string; html: string } {
  const subject = getText('newsletter.welcome.subject', language);
  const html = buildCanonicalTemplate({
    bodyContent: `
      <p>${getText('newsletter.welcome.body', language)}</p>
      <p style="margin-top: 16px;">${language === 'en'
        ? 'What to expect:'
        : 'Ce qui vous attend :'
      }</p>
      <ul style="margin: 12px 0; padding-left: 20px; color: #1F1F1F;">
        <li style="margin-bottom: 8px;">${language === 'en' ? 'Weekly tech news and insights' : 'Actualités tech hebdomadaires'}</li>
        <li style="margin-bottom: 8px;">${language === 'en' ? 'New course announcements' : 'Annonces de nouveaux cours'}</li>
        <li style="margin-bottom: 8px;">${language === 'en' ? 'Upcoming events and workshops' : 'Événements et ateliers à venir'}</li>
        <li style="margin-bottom: 8px;">${language === 'en' ? 'Career opportunities' : 'Opportunités de carrière'}</li>
      </ul>
      <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
    `,
    ctaText: language === 'en' ? 'Explore Courses' : 'Explorer les Cours',
    ctaUrl: 'https://acloudforeveryone.org/courses',
    language
  });
  return { subject, html };
}
