import { buildCanonicalTemplate } from './_base.ts';
import { getText, getGreeting, type Language } from './_translations.ts';

export interface InstitutionEmailData {
  userName?: string;
  institutionName: string;
  role?: string;
  invitationUrl?: string;
  requesterName?: string;
}

export type InstitutionEmailType = 
  | 'institution-invitation'
  | 'institution-approved'
  | 'institution-request';

export function buildInstitutionEmail(
  type: InstitutionEmailType,
  data: InstitutionEmailData,
  language: Language
): { subject: string; html: string } {
  const greeting = data.userName ? getGreeting(data.userName, language) : undefined;
  
  switch (type) {
    case 'institution-invitation': {
      const subject = getText('institution.invitation.subject', language, { 
        institutionName: data.institutionName 
      });
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('institution.invitation.body', language, { 
            institutionName: data.institutionName, 
            role: data.role || (language === 'fr' ? 'membre' : 'member')
          })}</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #f8f9fa; border-radius: 6px;">
            <tr>
              <td style="padding: 12px; font-weight: 600;">${language === 'fr' ? 'Institution' : 'Institution'}</td>
              <td style="padding: 12px; text-align: right;">${data.institutionName}</td>
            </tr>
          </table>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('institution.invitation.cta', language),
        ctaUrl: data.invitationUrl || 'https://acloudforeveryone.org/institutions',
        language
      });
      return { subject, html };
    }

    case 'institution-approved': {
      const subject = language === 'en' 
        ? `Welcome to ${data.institutionName}!` 
        : `Bienvenue à ${data.institutionName} !`;
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${language === 'en' 
            ? `Great news! Your request to join <strong>${data.institutionName}</strong> has been approved.`
            : `Bonne nouvelle ! Votre demande pour rejoindre <strong>${data.institutionName}</strong> a été approuvée.`
          }</p>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: language === 'en' ? 'View Institution' : 'Voir l\'Institution',
        ctaUrl: 'https://acloudforeveryone.org/institutions',
        language
      });
      return { subject, html };
    }

    case 'institution-request': {
      const subject = getText('institution.request.subject', language);
      const html = buildCanonicalTemplate({
        bodyContent: `
          <p>${getText('institution.request.body', language, { 
            requesterName: data.requesterName || (language === 'fr' ? 'Un utilisateur' : 'A user'),
            institutionName: data.institutionName 
          })}</p>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('institution.request.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/admin/institutions',
        language
      });
      return { subject, html };
    }

    default:
      throw new Error(`Unknown institution email type: ${type}`);
  }
}
