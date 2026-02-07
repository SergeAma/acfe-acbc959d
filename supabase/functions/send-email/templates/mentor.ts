import { buildCanonicalTemplate } from './_base.ts';
import { getText, getGreeting, type Language } from './_translations.ts';

export interface MentorEmailData {
  userName?: string;
  invitationUrl?: string;
  mentorName?: string;
  studentName?: string;
  studentEmail?: string;
  courseName?: string;
  videoUrl?: string;
  submissionType?: string;
  feedback?: string;
}

export type MentorEmailType = 
  | 'mentor-invitation'
  | 'mentor-approved'
  | 'mentor-rejected'
  | 'mentor-request-confirmation'
  | 'mentor-assignment-submitted'
  | 'assignment-submission-confirmation'
  | 'assignment-feedback';

export function buildMentorEmail(
  type: MentorEmailType,
  data: MentorEmailData,
  language: Language
): { subject: string; html: string } {
  const greeting = data.userName || data.mentorName 
    ? getGreeting(data.userName || data.mentorName || '', language) 
    : undefined;

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

    case 'mentor-assignment-submitted': {
      const subject = language === 'en'
        ? `New Assignment Submission: ${data.courseName}`
        : `Nouvelle soumission de devoir : ${data.courseName}`;
      
      const html = buildCanonicalTemplate({
        greeting: getGreeting(data.mentorName || 'Mentor', language),
        bodyContent: `
          <p>${language === 'en'
            ? `<strong>${data.studentName}</strong> has submitted their assignment for <strong>${data.courseName}</strong>.`
            : `<strong>${data.studentName}</strong> a soumis son devoir pour <strong>${data.courseName}</strong>.`
          }</p>
          <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>${language === 'en' ? 'Student' : 'Étudiant'}:</strong> ${data.studentName}</p>
            <p style="margin: 0 0 8px 0;"><strong>${language === 'en' ? 'Email' : 'Email'}:</strong> ${data.studentEmail}</p>
            <p style="margin: 0 0 8px 0;"><strong>${language === 'en' ? 'Submission Type' : 'Type de soumission'}:</strong> ${data.submissionType}</p>
            <p style="margin: 0;"><strong>${language === 'en' ? 'Video Link' : 'Lien vidéo'}:</strong> <a href="${data.videoUrl}" style="color: #1D4ED8;">${data.videoUrl}</a></p>
          </div>
          <p>${language === 'en'
            ? 'Please review the submission and provide feedback through your mentor dashboard.'
            : 'Veuillez examiner la soumission et fournir des commentaires via votre tableau de bord mentor.'
          }</p>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: language === 'en' ? 'Review Submission' : 'Examiner la soumission',
        ctaUrl: 'https://acloudforeveryone.org/dashboard',
        language
      });
      return { subject, html };
    }

    case 'assignment-submission-confirmation': {
      const subject = language === 'en'
        ? `Assignment Submitted: ${data.courseName}`
        : `Devoir soumis : ${data.courseName}`;
      
      const html = buildCanonicalTemplate({
        greeting: getGreeting(data.studentName || 'Learner', language),
        bodyContent: `
          <p>${language === 'en'
            ? `Your assignment for <strong>${data.courseName}</strong> has been successfully submitted!`
            : `Votre devoir pour <strong>${data.courseName}</strong> a été soumis avec succès !`
          }</p>
          <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #22c55e;">
            <p style="margin: 0; color: #166534;">${language === 'en'
              ? '✓ Submission received'
              : '✓ Soumission reçue'
            }</p>
          </div>
          <p>${language === 'en'
            ? `Your mentor, ${data.mentorName}, will review your submission and provide feedback. You'll receive a notification once it's been reviewed.`
            : `Votre mentor, ${data.mentorName}, examinera votre soumission et fournira des commentaires. Vous recevrez une notification une fois l'examen terminé.`
          }</p>
          <p>${language === 'en'
            ? 'You can view your submission status anytime from your course dashboard.'
            : 'Vous pouvez voir le statut de votre soumission à tout moment depuis votre tableau de bord.'
          }</p>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: language === 'en' ? 'View My Courses' : 'Voir mes cours',
        ctaUrl: 'https://acloudforeveryone.org/dashboard',
        language
      });
      return { subject, html };
    }

    case 'assignment-feedback': {
      const subject = language === 'en'
        ? `Assignment Feedback: ${data.courseName}`
        : `Commentaires sur le devoir : ${data.courseName}`;
      
      const html = buildCanonicalTemplate({
        greeting: getGreeting(data.studentName || 'Learner', language),
        bodyContent: `
          <p>${language === 'en'
            ? `Your mentor, <strong>${data.mentorName}</strong>, has reviewed your assignment for <strong>${data.courseName}</strong> and provided feedback.`
            : `Votre mentor, <strong>${data.mentorName}</strong>, a examiné votre devoir pour <strong>${data.courseName}</strong> et a fourni des commentaires.`
          }</p>
          <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">${language === 'en' ? 'Feedback:' : 'Commentaires :'}</p>
            <p style="margin: 0; color: #1F1F1F; white-space: pre-wrap;">${data.feedback}</p>
          </div>
          <p>${language === 'en'
            ? 'Please make the suggested improvements and resubmit your assignment through your course dashboard.'
            : 'Veuillez apporter les améliorations suggérées et soumettre à nouveau votre devoir via votre tableau de bord de cours.'
          }</p>
          <p>${getText('common.regards', language).replace(/\n/g, '<br>')}</p>
        `,
        ctaText: language === 'en' ? 'Resubmit Assignment' : 'Soumettre à nouveau',
        ctaUrl: 'https://acloudforeveryone.org/dashboard',
        language
      });
      return { subject, html };
    }

    default:
      throw new Error(`Unknown mentor email type: ${type}`);
  }
}
