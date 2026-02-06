import { buildCanonicalTemplate } from './_base.ts';
import { getText, type Language } from './_translations.ts';

export interface MagicLinkEmailData {
  userEmail: string;
  magicLink: string;
}

export function buildMagicLinkEmail(data: MagicLinkEmailData, language: Language): { subject: string; html: string } {
  const subject = getText('magicLink.subject', language);
  const html = buildCanonicalTemplate({
    bodyContent: `<p>${getText('magicLink.body', language)}</p>`,
    ctaText: getText('magicLink.cta', language),
    ctaUrl: data.magicLink,
    footerNote: getText('magicLink.footer', language),
    language
  });
  return { subject, html };
}

export function buildPasswordResetEmail(data: MagicLinkEmailData, language: Language): { subject: string; html: string } {
  const subject = getText('passwordReset.subject', language);
  const html = buildCanonicalTemplate({
    bodyContent: `<p>${getText('passwordReset.body', language)}</p>`,
    ctaText: getText('passwordReset.cta', language),
    ctaUrl: data.magicLink,
    footerNote: getText('passwordReset.footer', language),
    language
  });
  return { subject, html };
}

export function buildEmailConfirmationEmail(data: MagicLinkEmailData, language: Language): { subject: string; html: string } {
  const subject = getText('emailConfirmation.subject', language);
  const html = buildCanonicalTemplate({
    bodyContent: `<p>${getText('emailConfirmation.body', language)}</p>`,
    ctaText: getText('emailConfirmation.cta', language),
    ctaUrl: data.magicLink,
    language
  });
  return { subject, html };
}
