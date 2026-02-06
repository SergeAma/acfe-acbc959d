import { buildCanonicalTemplate } from './_base.ts';
import { getText, getGreeting, type Language } from './_translations.ts';

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData, language: Language): { subject: string; html: string } {
  const subject = getText('welcome.subject', language);
  const html = buildCanonicalTemplate({
    greeting: getGreeting(data.userName, language),
    bodyContent: `<p>${getText('welcome.body', language)}</p><br><p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>`,
    ctaText: getText('welcome.cta', language),
    ctaUrl: 'https://acloudforeveryone.org/dashboard',
    language
  });
  return { subject, html };
}
