import { buildCanonicalTemplate } from './_base.ts';
import { getText, getGreeting, type Language } from './_translations.ts';

export interface MentorEmailData {
  userName?: string;
  invitationUrl?: string;
}

export type MentorEmailType = 
  | 'mentor-invitation'
  | 'mentor-approved'
  | 'mentor-rejected'
  | 'mentor-request-confirmation';

export function buildMentorEmail(
  type: MentorEmailType,
  data: MentorEmailData,
  language: Language
): { subject: string; html: string } {
  const greeting = data.userName ? getGreeting(data.userName, language) : undefined;

  switch (type) {
    case 'mentor-invitation': {
      const subject = getText('mentor.invitation.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('mentor.invitation.body', language)}</p>
          <p style="margin-top: 16px;">${language === 'en' 
            ? 'As a mentor, you\'ll be able to:'
            : 'En tant que mentor, vous pourrez :'
          }</p>
          <ul style="margin: 12px 0; padding-left: 20px; color: #1F1F1F;">
            <li style="margin-bottom: 8px;">${language === 'en' ? 'Create and publish courses' : 'Créer et publier des cours'}</li>
            <li style="margin-bottom: 8px;">${language === 'en' ? 'Guide students through their learning journey' : 'Guider les étudiants dans leur parcours'}</li>
            <li style="margin-bottom: 8px;">${language === 'en' ? 'Host live sessions and events' : 'Animer des sessions et événements'}</li>
          </ul>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('mentor.invitation.cta', language),
        ctaUrl: data.invitationUrl || 'https://acloudforeveryone.org/accept-mentor-invite',
        language
      });
      return { subject, html };
    }

    case 'mentor-approved': {
      const subject = getText('mentor.approved.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('mentor.approved.body', language)}</p>
          <p style="margin-top: 16px;">${language === 'en'
            ? 'Your next steps:'
            : 'Vos prochaines étapes :'
          }</p>
          <ul style="margin: 12px 0; padding-left: 20px; color: #1F1F1F;">
            <li style="margin-bottom: 8px;">${language === 'en' ? 'Complete your mentor profile' : 'Complétez votre profil mentor'}</li>
            <li style="margin-bottom: 8px;">${language === 'en' ? 'Sign the mentor agreement' : 'Signez l\'accord de mentorat'}</li>
            <li style="margin-bottom: 8px;">${language === 'en' ? 'Create your first course' : 'Créez votre premier cours'}</li>
          </ul>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('mentor.approved.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/dashboard',
        language
      });
      return { subject, html };
    }

    case 'mentor-rejected': {
      const subject = getText('mentor.rejected.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('mentor.rejected.body', language)}</p>
          <p style="margin-top: 16px;">${language === 'en'
            ? 'You may reapply in the future after gaining more experience in your field.'
            : 'Vous pourrez postuler à nouveau après avoir acquis plus d\'expérience.'
          }</p>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: getText('mentor.rejected.cta', language),
        ctaUrl: 'https://acloudforeveryone.org/mentors',
        language
      });
      return { subject, html };
    }

    case 'mentor-request-confirmation': {
      const subject = getText('mentor.requestConfirmation.subject', language);
      const html = buildCanonicalTemplate({
        greeting,
        bodyContent: `
          <p>${getText('mentor.requestConfirmation.body', language)}</p>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        language
      });
      return { subject, html };
    }

    default:
      throw new Error(`Unknown mentor email type: ${type}`);
  }
}
