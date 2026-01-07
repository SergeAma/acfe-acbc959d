import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// ============================================================================
// EMAIL TEMPLATE RENDERER (MIRROR OF EDGE FUNCTION)
// ============================================================================
const EMAIL_DESIGN_TOKENS = {
  PRIMARY_COLOR: '#4B5C4B',
  SECONDARY_COLOR: '#C9D6C9',
  BACKGROUND_DARK: '#2F2F2F',
  BACKGROUND_LIGHT: '#F4F7F4',
  BACKGROUND_WHITE: '#FFFFFF',
  TEXT_LIGHT: '#FFFFFF',
  TEXT_DARK: '#1F1F1F',
  TEXT_MUTED: '#666666',
  BORDER_COLOR: '#E0E0E0',
  MAX_WIDTH: '600px',
  BORDER_RADIUS: '6px',
  LOGO_URL: 'https://mefwbcbnctqjxrwldmjm.supabase.co/storage/v1/object/public/email-assets/acfe-logo-email.png',
  LOGO_WIDTH: '140',
  LOGO_HEIGHT: '50',
  FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

interface EmailContentSlots {
  headline: string;
  body_primary: string;
  impact_block?: { title: string; items: string[] };
  primary_cta?: { label: string; url: string };
  secondary_cta?: { label: string; url: string };
  signoff?: string;
}

type EmailLanguage = 'en' | 'fr';

const translations: Record<EmailLanguage, Record<string, string>> = {
  en: {
    'email.team': 'The ACFE Team',
    'email.footerTagline': 'Empowering African youth through digital skills and mentorship.',
  },
  fr: {
    'email.team': "L'Équipe ACFE",
    'email.footerTagline': 'Autonomiser la jeunesse africaine grâce aux compétences numériques et au mentorat.',
  },
};

function buildCanonicalEmail(slots: EmailContentSlots, language: EmailLanguage = 'en'): string {
  const t = EMAIL_DESIGN_TOKENS;
  const team = translations[language]['email.team'];
  const tagline = translations[language]['email.footerTagline'];
  const year = new Date().getFullYear();
  
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
  
  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A Cloud For Everyone</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F5F5; font-family: ${t.FONT_FAMILY}; line-height: 1.6; color: ${t.TEXT_DARK};">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F5F5F5;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: ${t.MAX_WIDTH}; background-color: ${t.BACKGROUND_WHITE}; border-radius: ${t.BORDER_RADIUS}; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: ${t.BACKGROUND_DARK}; padding: 24px; text-align: center;">
              <img src="${t.LOGO_URL}" alt="ACFE" width="${t.LOGO_WIDTH}" height="${t.LOGO_HEIGHT}" style="display: block; margin: 0 auto; border: 0;">
              <p style="margin: 12px 0 0 0; color: ${t.TEXT_LIGHT}; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">A CLOUD FOR EVERYONE</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${t.PRIMARY_COLOR}; line-height: 1.3;">${slots.headline}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <div style="font-size: 15px; color: ${t.TEXT_DARK}; line-height: 1.6;">${slots.body_primary}</div>
                  </td>
                </tr>
                ${impactBlockHtml}
                ${ctaZoneHtml}
                <tr>
                  <td style="padding: 16px 0 0 0;">
                    <p style="margin: 0; font-size: 15px; color: ${t.TEXT_DARK};">${signoff}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
// EMAIL PERMUTATIONS DATA
// ============================================================================
interface EmailPermutation {
  id: string;
  type: string;
  role: string;
  scenario: string;
  language: EmailLanguage;
  subject: string;
  slots: EmailContentSlots;
}

const generatePermutations = (): EmailPermutation[] => {
  const permutations: EmailPermutation[] = [];
  
  const emailTypes: Array<{
    type: string;
    role: string;
    scenario: string;
    en: { subject: string; slots: EmailContentSlots };
    fr: { subject: string; slots: EmailContentSlots };
  }> = [
    // 1. Welcome Email
    {
      type: 'send-welcome-email',
      role: 'Learner',
      scenario: 'New Registration',
      en: {
        subject: 'Welcome to A Cloud for Everyone!',
        slots: {
          headline: 'Welcome to ACFE!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">We\'re thrilled to have you join our community of learners and mentors dedicated to advancing digital skills across Africa.</p>',
          impact_block: {
            title: 'What you can do next:',
            items: ['Browse our courses and start learning', 'Connect with experienced mentors', 'Join our community discussions']
          },
          primary_cta: { label: 'Start Learning Now', url: 'https://acloudforeveryone.org/courses' }
        }
      },
      fr: {
        subject: 'Bienvenue sur A Cloud for Everyone!',
        slots: {
          headline: 'Bienvenue sur ACFE!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Nous sommes ravis de vous accueillir dans notre communauté d\'apprenants et de mentors dédiée à l\'avancement des compétences numériques en Afrique.</p>',
          impact_block: {
            title: 'Ce que vous pouvez faire ensuite:',
            items: ['Parcourez nos cours et commencez à apprendre', 'Connectez-vous avec des mentors expérimentés', 'Rejoignez les discussions de la communauté']
          },
          primary_cta: { label: 'Commencer à Apprendre', url: 'https://acloudforeveryone.org/courses' }
        }
      }
    },
    // 2. Newsletter Welcome
    {
      type: 'send-newsletter-welcome',
      role: 'Subscriber',
      scenario: 'Newsletter Signup',
      en: {
        subject: 'Welcome to the ACFE Newsletter!',
        slots: {
          headline: "You're subscribed!",
          body_primary: '<p style="margin: 0;">Thank you for subscribing to our newsletter. You will receive weekly updates on African tech news, digital skills tips, and community highlights.</p>',
          impact_block: {
            title: 'What to expect:',
            items: ['Weekly Africa tech news digest', 'Digital skills tips and resources', 'Community success stories', 'Exclusive opportunities']
          }
        }
      },
      fr: {
        subject: 'Bienvenue à la Newsletter ACFE!',
        slots: {
          headline: 'Vous êtes inscrit!',
          body_primary: '<p style="margin: 0;">Merci de vous être abonné à notre newsletter. Vous recevrez des mises à jour hebdomadaires sur les actualités tech africaines.</p>',
          impact_block: {
            title: 'À quoi vous attendre:',
            items: ['Digest hebdomadaire des actualités tech africaines', 'Conseils et ressources en compétences numériques', 'Histoires de réussite de la communauté', 'Opportunités exclusives']
          }
        }
      }
    },
    // 3. Mentor Request Confirmation
    {
      type: 'send-mentor-request-confirmation',
      role: 'Mentor Applicant',
      scenario: 'Application Submitted',
      en: {
        subject: 'Mentor Application Received',
        slots: {
          headline: 'Application Received!',
          body_primary: '<p style="margin: 0 0 16px 0;">Dear Sarah,</p><p style="margin: 0;">Thank you for applying to become a mentor at A Cloud for Everyone. We have received your application and our team will review it shortly.</p>',
          impact_block: {
            title: 'What happens next:',
            items: ['Our team will review your application', 'You will receive an email with our decision', 'If approved, you can start creating courses']
          }
        }
      },
      fr: {
        subject: 'Candidature de Mentor Reçue',
        slots: {
          headline: 'Candidature Reçue!',
          body_primary: '<p style="margin: 0 0 16px 0;">Chère Sarah,</p><p style="margin: 0;">Merci de votre candidature pour devenir mentor chez A Cloud for Everyone. Nous avons reçu votre candidature et notre équipe l\'examinera prochainement.</p>',
          impact_block: {
            title: 'Prochaines étapes:',
            items: ['Notre équipe examinera votre candidature', 'Vous recevrez un email avec notre décision', 'Si approuvé, vous pourrez créer des cours']
          }
        }
      }
    },
    // 4. Mentor Approval
    {
      type: 'send-mentor-approval-email',
      role: 'Mentor',
      scenario: 'Application Approved',
      en: {
        subject: 'Congratulations! Your Mentor Application is Approved',
        slots: {
          headline: 'Welcome, Mentor!',
          body_primary: '<p style="margin: 0 0 16px 0;">Dear Sarah,</p><p style="margin: 0;">Great news! Your application to become a mentor at A Cloud for Everyone has been approved. You\'re now part of our community of educators empowering African youth.</p>',
          impact_block: {
            title: 'Get started:',
            items: ['Complete your mentor profile', 'Sign the mentor contract', 'Create your first course']
          },
          primary_cta: { label: 'Go to Dashboard', url: 'https://acloudforeveryone.org/dashboard' }
        }
      },
      fr: {
        subject: 'Félicitations! Votre Candidature de Mentor est Approuvée',
        slots: {
          headline: 'Bienvenue, Mentor!',
          body_primary: '<p style="margin: 0 0 16px 0;">Chère Sarah,</p><p style="margin: 0;">Bonne nouvelle! Votre candidature pour devenir mentor chez A Cloud for Everyone a été approuvée. Vous faites maintenant partie de notre communauté d\'éducateurs.</p>',
          impact_block: {
            title: 'Pour commencer:',
            items: ['Complétez votre profil de mentor', 'Signez le contrat de mentor', 'Créez votre premier cours']
          },
          primary_cta: { label: 'Aller au Tableau de Bord', url: 'https://acloudforeveryone.org/dashboard' }
        }
      }
    },
    // 5. Mentor Rejection
    {
      type: 'send-mentor-rejection-email',
      role: 'Mentor Applicant',
      scenario: 'Application Rejected',
      en: {
        subject: 'Update on Your Mentor Application',
        slots: {
          headline: 'Application Update',
          body_primary: '<p style="margin: 0 0 16px 0;">Dear Sarah,</p><p style="margin: 0;">Thank you for your interest in becoming a mentor at A Cloud for Everyone. After careful review, we are unable to approve your application at this time.</p><p style="margin: 16px 0 0 0;">You are welcome to reapply after 30 days.</p>',
          primary_cta: { label: 'Continue Learning', url: 'https://acloudforeveryone.org/courses' }
        }
      },
      fr: {
        subject: 'Mise à Jour de Votre Candidature de Mentor',
        slots: {
          headline: 'Mise à Jour de Candidature',
          body_primary: '<p style="margin: 0 0 16px 0;">Chère Sarah,</p><p style="margin: 0;">Merci de votre intérêt pour devenir mentor chez A Cloud for Everyone. Après examen attentif, nous ne pouvons pas approuver votre candidature pour le moment.</p><p style="margin: 16px 0 0 0;">Vous êtes invité à postuler à nouveau après 30 jours.</p>',
          primary_cta: { label: 'Continuer à Apprendre', url: 'https://acloudforeveryone.org/courses' }
        }
      }
    },
    // 6. Mentor Welcome
    {
      type: 'send-mentor-welcome-email',
      role: 'Mentor',
      scenario: 'Onboarding Complete',
      en: {
        subject: 'Welcome to the ACFE Mentor Community!',
        slots: {
          headline: 'Welcome to the Team!',
          body_primary: '<p style="margin: 0 0 16px 0;">Dear Sarah,</p><p style="margin: 0;">Welcome to our community of mentors! We\'re excited to have you on board to help shape the next generation of African tech talent.</p>',
          impact_block: {
            title: 'Your next steps:',
            items: ['Create your first course', 'Set up your availability for mentoring sessions', 'Join our monthly mentor meetings']
          },
          primary_cta: { label: 'Create Your First Course', url: 'https://acloudforeveryone.org/mentor/courses/new' }
        }
      },
      fr: {
        subject: 'Bienvenue dans la Communauté des Mentors ACFE!',
        slots: {
          headline: 'Bienvenue dans l\'Équipe!',
          body_primary: '<p style="margin: 0 0 16px 0;">Chère Sarah,</p><p style="margin: 0;">Bienvenue dans notre communauté de mentors! Nous sommes ravis de vous avoir à bord pour aider à former la prochaine génération de talents tech africains.</p>',
          impact_block: {
            title: 'Vos prochaines étapes:',
            items: ['Créez votre premier cours', 'Configurez votre disponibilité pour les sessions de mentorat', 'Rejoignez nos réunions mensuelles de mentors']
          },
          primary_cta: { label: 'Créer Votre Premier Cours', url: 'https://acloudforeveryone.org/mentor/courses/new' }
        }
      }
    },
    // 7. Mentor Invitation
    {
      type: 'send-mentor-invitation',
      role: 'Invited Mentor',
      scenario: 'Admin Invitation',
      en: {
        subject: "You're Invited to Join ACFE as a Mentor",
        slots: {
          headline: 'Invitation to Mentor',
          body_primary: '<p style="margin: 0 0 16px 0;">Hello,</p><p style="margin: 0;">You have been invited to join A Cloud for Everyone as a mentor. Your expertise can help shape the next generation of African tech talent.</p>',
          impact_block: {
            title: 'As a mentor, you can:',
            items: ['Create and publish courses', 'Offer paid mentoring sessions', 'Build your professional brand']
          },
          primary_cta: { label: 'Accept Invitation', url: 'https://acloudforeveryone.org/accept-mentor-invite?token=xxx' }
        }
      },
      fr: {
        subject: 'Vous Êtes Invité à Rejoindre ACFE en tant que Mentor',
        slots: {
          headline: 'Invitation à Devenir Mentor',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour,</p><p style="margin: 0;">Vous avez été invité à rejoindre A Cloud for Everyone en tant que mentor. Votre expertise peut aider à former la prochaine génération de talents tech africains.</p>',
          impact_block: {
            title: 'En tant que mentor, vous pouvez:',
            items: ['Créer et publier des cours', 'Offrir des sessions de mentorat payantes', 'Construire votre marque professionnelle']
          },
          primary_cta: { label: 'Accepter l\'Invitation', url: 'https://acloudforeveryone.org/accept-mentor-invite?token=xxx' }
        }
      }
    },
    // 8. Weekly Mentor Reminder
    {
      type: 'send-weekly-mentor-reminder',
      role: 'Mentor',
      scenario: 'Weekly Check-in',
      en: {
        subject: 'Your Weekly Mentor Reminder',
        slots: {
          headline: 'Mentor Check-in',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi Sarah,</p><p style="margin: 0;">This is your weekly reminder to engage with your students and community.</p>',
          impact_block: {
            title: 'This week, consider:',
            items: ['Reviewing pending student submissions', 'Responding to mentorship requests', 'Engaging with your cohort community']
          },
          primary_cta: { label: 'Go to Dashboard', url: 'https://acloudforeveryone.org/dashboard' }
        }
      },
      fr: {
        subject: 'Votre Rappel Hebdomadaire de Mentor',
        slots: {
          headline: 'Point Mentor',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Sarah,</p><p style="margin: 0;">Ceci est votre rappel hebdomadaire pour vous engager avec vos étudiants et la communauté.</p>',
          impact_block: {
            title: 'Cette semaine, considérez:',
            items: ['Examiner les soumissions des étudiants en attente', 'Répondre aux demandes de mentorat', 'Vous engager avec votre communauté de cohorte']
          },
          primary_cta: { label: 'Aller au Tableau de Bord', url: 'https://acloudforeveryone.org/dashboard' }
        }
      }
    },
    // 9. Weekly Student Reminder
    {
      type: 'send-weekly-student-reminder',
      role: 'Learner',
      scenario: 'Weekly Check-in',
      en: {
        subject: 'Your Weekly Learning Reminder',
        slots: {
          headline: 'Time to Learn!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">This is your weekly reminder to continue your learning journey on ACFE.</p>',
          impact_block: {
            title: 'This week, you could:',
            items: ['Continue your enrolled courses', 'Explore new courses in your area of interest', 'Connect with a mentor for guidance']
          },
          primary_cta: { label: 'Go to Dashboard', url: 'https://acloudforeveryone.org/dashboard' }
        }
      },
      fr: {
        subject: 'Votre Rappel Hebdomadaire d\'Apprentissage',
        slots: {
          headline: 'C\'est l\'Heure d\'Apprendre!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Ceci est votre rappel hebdomadaire pour continuer votre parcours d\'apprentissage sur ACFE.</p>',
          impact_block: {
            title: 'Cette semaine, vous pourriez:',
            items: ['Continuer vos cours inscrits', 'Explorer de nouveaux cours dans votre domaine d\'intérêt', 'Contacter un mentor pour des conseils']
          },
          primary_cta: { label: 'Aller au Tableau de Bord', url: 'https://acloudforeveryone.org/dashboard' }
        }
      }
    },
    // 10. Purchase Confirmation
    {
      type: 'send-purchase-confirmation',
      role: 'Learner',
      scenario: 'Course Purchased',
      en: {
        subject: 'Welcome to your new course!',
        slots: {
          headline: 'Payment Confirmed!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Thank you for enrolling in <strong>Introduction to Cloud Computing</strong>. Your payment of $49.99 has been processed successfully.</p>',
          impact_block: {
            title: "What's next?",
            items: ['Access your first lesson from the Dashboard', 'New lessons unlock weekly - check back regularly!', 'Earn your certificate upon completion']
          },
          primary_cta: { label: 'Start Learning Now', url: 'https://acloudforeveryone.org/courses/xxx/learn' }
        }
      },
      fr: {
        subject: 'Bienvenue dans votre nouveau cours!',
        slots: {
          headline: 'Paiement Confirmé!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Merci de vous être inscrit à <strong>Introduction au Cloud Computing</strong>. Votre paiement de 49,99 $ a été traité avec succès.</p>',
          impact_block: {
            title: 'Prochaines étapes?',
            items: ['Accédez à votre première leçon depuis le Tableau de Bord', 'De nouvelles leçons se débloquent chaque semaine!', 'Obtenez votre certificat à la fin']
          },
          primary_cta: { label: 'Commencer à Apprendre', url: 'https://acloudforeveryone.org/courses/xxx/learn' }
        }
      }
    },
    // 11. Certificate Email
    {
      type: 'send-certificate-email',
      role: 'Learner',
      scenario: 'Course Completed',
      en: {
        subject: 'Congratulations on Completing Your Course!',
        slots: {
          headline: 'Course Completed!',
          body_primary: '<p style="margin: 0 0 16px 0;">Congratulations John!</p><p style="margin: 0;">You have successfully completed <strong>Introduction to Cloud Computing</strong>. Your dedication to learning is truly inspiring.</p>',
          impact_block: {
            title: 'What to do next:',
            items: ['Download your certificate', 'Share your achievement on LinkedIn', 'Explore more courses']
          },
          primary_cta: { label: 'View Certificate', url: 'https://acloudforeveryone.org/certificates/xxx' }
        }
      },
      fr: {
        subject: 'Félicitations pour avoir Terminé Votre Cours!',
        slots: {
          headline: 'Cours Terminé!',
          body_primary: '<p style="margin: 0 0 16px 0;">Félicitations Jean!</p><p style="margin: 0;">Vous avez terminé avec succès <strong>Introduction au Cloud Computing</strong>. Votre dévouement à l\'apprentissage est vraiment inspirant.</p>',
          impact_block: {
            title: 'Que faire ensuite:',
            items: ['Téléchargez votre certificat', 'Partagez votre réussite sur LinkedIn', 'Explorez plus de cours']
          },
          primary_cta: { label: 'Voir le Certificat', url: 'https://acloudforeveryone.org/certificates/xxx' }
        }
      }
    },
    // 12. Assignment Graded
    {
      type: 'send-assignment-graded-notification',
      role: 'Learner',
      scenario: 'Assignment Reviewed',
      en: {
        subject: 'Your Assignment Has Been Graded',
        slots: {
          headline: 'Assignment Graded!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your mentor has reviewed and graded your assignment for <strong>Cloud Architecture Fundamentals</strong>.</p>',
          primary_cta: { label: 'View Feedback', url: 'https://acloudforeveryone.org/dashboard' }
        }
      },
      fr: {
        subject: 'Votre Devoir a été Noté',
        slots: {
          headline: 'Devoir Noté!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre mentor a examiné et noté votre devoir pour <strong>Fondamentaux de l\'Architecture Cloud</strong>.</p>',
          primary_cta: { label: 'Voir les Commentaires', url: 'https://acloudforeveryone.org/dashboard' }
        }
      }
    },
    // 13. Assignment Submission Notification
    {
      type: 'send-assignment-submission-notification',
      role: 'Mentor',
      scenario: 'Student Submitted',
      en: {
        subject: 'New Assignment Submission',
        slots: {
          headline: 'New Submission Received',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi Sarah,</p><p style="margin: 0;">A student has submitted an assignment for your course.</p><p style="margin: 16px 0 0 0;"><strong>Student:</strong> John Doe<br><strong>Course:</strong> Cloud Architecture Fundamentals<br><strong>Assignment:</strong> Final Project</p>',
          primary_cta: { label: 'Review Submission', url: 'https://acloudforeveryone.org/mentor/submissions' }
        }
      },
      fr: {
        subject: 'Nouvelle Soumission de Devoir',
        slots: {
          headline: 'Nouvelle Soumission Reçue',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Sarah,</p><p style="margin: 0;">Un étudiant a soumis un devoir pour votre cours.</p><p style="margin: 16px 0 0 0;"><strong>Étudiant:</strong> Jean Dupont<br><strong>Cours:</strong> Fondamentaux de l\'Architecture Cloud<br><strong>Devoir:</strong> Projet Final</p>',
          primary_cta: { label: 'Examiner la Soumission', url: 'https://acloudforeveryone.org/mentor/submissions' }
        }
      }
    },
    // 14. Course Completion Notification (to mentor)
    {
      type: 'send-course-completion-notification',
      role: 'Mentor',
      scenario: 'Student Completed Course',
      en: {
        subject: 'Your Student Completed a Course!',
        slots: {
          headline: 'Student Achievement!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi Sarah,</p><p style="margin: 0;"><strong>John Doe</strong> has completed your course <strong>Introduction to Cloud Computing</strong>. Congratulations on another successful learner!</p>',
          primary_cta: { label: 'View Dashboard', url: 'https://acloudforeveryone.org/dashboard' }
        }
      },
      fr: {
        subject: 'Votre Étudiant a Terminé un Cours!',
        slots: {
          headline: 'Réussite de l\'Étudiant!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Sarah,</p><p style="margin: 0;"><strong>Jean Dupont</strong> a terminé votre cours <strong>Introduction au Cloud Computing</strong>. Félicitations pour un autre apprenant réussi!</p>',
          primary_cta: { label: 'Voir le Tableau de Bord', url: 'https://acloudforeveryone.org/dashboard' }
        }
      }
    },
    // 15. Session Notification
    {
      type: 'send-session-notification',
      role: 'Learner',
      scenario: 'Session Booked',
      en: {
        subject: 'Mentorship Session Confirmed',
        slots: {
          headline: 'Session Booked!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your mentorship session has been confirmed.</p><p style="margin: 16px 0 0 0;"><strong>Mentor:</strong> Sarah Johnson<br><strong>Date:</strong> January 15, 2026<br><strong>Time:</strong> 2:00 PM WAT</p>',
          primary_cta: { label: 'Add to Calendar', url: 'https://calendar.google.com' }
        }
      },
      fr: {
        subject: 'Session de Mentorat Confirmée',
        slots: {
          headline: 'Session Réservée!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre session de mentorat a été confirmée.</p><p style="margin: 16px 0 0 0;"><strong>Mentor:</strong> Sarah Johnson<br><strong>Date:</strong> 15 janvier 2026<br><strong>Heure:</strong> 14h00 WAT</p>',
          primary_cta: { label: 'Ajouter au Calendrier', url: 'https://calendar.google.com' }
        }
      }
    },
    // 16. Live Session Reminder
    {
      type: 'send-live-session-reminder',
      role: 'Learner',
      scenario: 'Upcoming Session',
      en: {
        subject: 'Your Live Session Starts Soon!',
        slots: {
          headline: 'Session Starting Soon!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your live session with <strong>Sarah Johnson</strong> starts in 1 hour. Make sure you\'re ready!</p>',
          primary_cta: { label: 'Join Session', url: 'https://meet.google.com/xxx' }
        }
      },
      fr: {
        subject: 'Votre Session en Direct Commence Bientôt!',
        slots: {
          headline: 'Session Imminente!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre session en direct avec <strong>Sarah Johnson</strong> commence dans 1 heure. Assurez-vous d\'être prêt!</p>',
          primary_cta: { label: 'Rejoindre la Session', url: 'https://meet.google.com/xxx' }
        }
      }
    },
    // 17. Mentorship Request Notification
    {
      type: 'send-mentorship-request-notification',
      role: 'Mentor',
      scenario: 'New Request',
      en: {
        subject: 'New Mentorship Request',
        slots: {
          headline: 'New Mentorship Request!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi Sarah,</p><p style="margin: 0;">You have received a new mentorship request.</p><p style="margin: 16px 0 0 0;"><strong>From:</strong> John Doe<br><strong>Bio:</strong> Aspiring cloud engineer with 2 years of experience...<br><strong>Why:</strong> I want to learn cloud architecture best practices.</p>',
          primary_cta: { label: 'View Request', url: 'https://acloudforeveryone.org/mentor/requests' }
        }
      },
      fr: {
        subject: 'Nouvelle Demande de Mentorat',
        slots: {
          headline: 'Nouvelle Demande de Mentorat!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Sarah,</p><p style="margin: 0;">Vous avez reçu une nouvelle demande de mentorat.</p><p style="margin: 16px 0 0 0;"><strong>De:</strong> Jean Dupont<br><strong>Bio:</strong> Aspirant ingénieur cloud avec 2 ans d\'expérience...<br><strong>Pourquoi:</strong> Je veux apprendre les meilleures pratiques d\'architecture cloud.</p>',
          primary_cta: { label: 'Voir la Demande', url: 'https://acloudforeveryone.org/mentor/requests' }
        }
      }
    },
    // 18. Mentorship Response Notification
    {
      type: 'send-mentorship-response-notification',
      role: 'Learner',
      scenario: 'Request Accepted',
      en: {
        subject: 'Your Mentorship Request Has Been Accepted!',
        slots: {
          headline: 'Request Accepted!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;"><strong>Sarah Johnson</strong> has accepted your mentorship request! You can now book sessions with your new mentor.</p>',
          primary_cta: { label: 'Book a Session', url: 'https://acloudforeveryone.org/mentors/sarah' }
        }
      },
      fr: {
        subject: 'Votre Demande de Mentorat a été Acceptée!',
        slots: {
          headline: 'Demande Acceptée!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;"><strong>Sarah Johnson</strong> a accepté votre demande de mentorat! Vous pouvez maintenant réserver des sessions avec votre nouveau mentor.</p>',
          primary_cta: { label: 'Réserver une Session', url: 'https://acloudforeveryone.org/mentors/sarah' }
        }
      }
    },
    // 19. Subscription Created
    {
      type: 'send-subscription-created',
      role: 'Subscriber',
      scenario: 'New Subscription',
      en: {
        subject: 'Welcome to ACFE Premium!',
        slots: {
          headline: 'Subscription Activated!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Thank you for subscribing! Your subscription is now active as of <strong>January 7, 2026</strong>.</p>',
          impact_block: {
            title: 'Your subscription includes:',
            items: ['Unlimited access to all courses', 'Priority mentor support', 'Exclusive community features']
          },
          primary_cta: { label: 'Explore Courses', url: 'https://acloudforeveryone.org/courses' }
        }
      },
      fr: {
        subject: 'Bienvenue sur ACFE Premium!',
        slots: {
          headline: 'Abonnement Activé!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Merci de vous être abonné! Votre abonnement est maintenant actif depuis le <strong>7 janvier 2026</strong>.</p>',
          impact_block: {
            title: 'Votre abonnement comprend:',
            items: ['Accès illimité à tous les cours', 'Support mentor prioritaire', 'Fonctionnalités communautaires exclusives']
          },
          primary_cta: { label: 'Explorer les Cours', url: 'https://acloudforeveryone.org/courses' }
        }
      }
    },
    // 20. Subscription Cancelled
    {
      type: 'send-subscription-cancelled',
      role: 'Subscriber',
      scenario: 'Subscription Ended',
      en: {
        subject: 'Your Subscription Has Been Cancelled',
        slots: {
          headline: 'Subscription Cancelled',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your subscription has been cancelled. You will continue to have access until <strong>February 7, 2026</strong>.</p>',
          impact_block: {
            title: 'Before you go:',
            items: ['Your access continues until end date', 'You can resubscribe anytime', 'Your progress is saved']
          },
          primary_cta: { label: 'Resubscribe', url: 'https://acloudforeveryone.org/pricing' }
        }
      },
      fr: {
        subject: 'Votre Abonnement a été Annulé',
        slots: {
          headline: 'Abonnement Annulé',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre abonnement a été annulé. Vous continuerez à avoir accès jusqu\'au <strong>7 février 2026</strong>.</p>',
          impact_block: {
            title: 'Avant de partir:',
            items: ['Votre accès continue jusqu\'à la date de fin', 'Vous pouvez vous réabonner à tout moment', 'Votre progression est sauvegardée']
          },
          primary_cta: { label: 'Se Réabonner', url: 'https://acloudforeveryone.org/pricing' }
        }
      }
    },
    // 21. Subscription Renewed
    {
      type: 'send-subscription-renewed',
      role: 'Subscriber',
      scenario: 'Auto-Renewed',
      en: {
        subject: 'Your Subscription Has Been Renewed',
        slots: {
          headline: 'Subscription Renewed!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your subscription has been successfully renewed. Thank you for your continued support of our mission!</p>',
          impact_block: {
            title: 'What this means:',
            items: ['Continued access to all courses', 'Your learning progress is maintained', 'Supporting African tech education']
          },
          primary_cta: { label: 'Continue Learning', url: 'https://acloudforeveryone.org/dashboard' }
        }
      },
      fr: {
        subject: 'Votre Abonnement a été Renouvelé',
        slots: {
          headline: 'Abonnement Renouvelé!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre abonnement a été renouvelé avec succès. Merci pour votre soutien continu à notre mission!</p>',
          impact_block: {
            title: 'Ce que cela signifie:',
            items: ['Accès continu à tous les cours', 'Votre progression d\'apprentissage est maintenue', 'Soutien à l\'éducation tech africaine']
          },
          primary_cta: { label: 'Continuer à Apprendre', url: 'https://acloudforeveryone.org/dashboard' }
        }
      }
    },
    // 22. Subscription Paused
    {
      type: 'send-subscription-paused',
      role: 'Subscriber',
      scenario: 'Subscription Paused',
      en: {
        subject: 'Your Subscription Has Been Paused',
        slots: {
          headline: 'Subscription Paused',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your subscription has been paused. You can resume it at any time to continue your learning journey.</p>',
          impact_block: {
            title: 'While paused:',
            items: ['Billing is suspended', 'Your progress is saved', 'Resume anytime to continue']
          },
          primary_cta: { label: 'Resume Subscription', url: 'https://acloudforeveryone.org/my-subscriptions' }
        }
      },
      fr: {
        subject: 'Votre Abonnement a été Mis en Pause',
        slots: {
          headline: 'Abonnement en Pause',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre abonnement a été mis en pause. Vous pouvez le reprendre à tout moment pour continuer votre parcours d\'apprentissage.</p>',
          impact_block: {
            title: 'Pendant la pause:',
            items: ['La facturation est suspendue', 'Votre progression est sauvegardée', 'Reprenez à tout moment pour continuer']
          },
          primary_cta: { label: 'Reprendre l\'Abonnement', url: 'https://acloudforeveryone.org/my-subscriptions' }
        }
      }
    },
    // 23. Subscription Resumed
    {
      type: 'send-subscription-resumed',
      role: 'Subscriber',
      scenario: 'Subscription Resumed',
      en: {
        subject: 'Your Subscription Has Been Resumed',
        slots: {
          headline: 'Welcome Back!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your subscription has been resumed. You now have full access again to all premium features.</p>',
          impact_block: {
            title: 'Your access restored:',
            items: ['All courses available', 'Your progress is intact', 'Billing resumes next cycle']
          },
          primary_cta: { label: 'Continue Learning', url: 'https://acloudforeveryone.org/dashboard' }
        }
      },
      fr: {
        subject: 'Votre Abonnement a été Repris',
        slots: {
          headline: 'Bon Retour!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre abonnement a été repris. Vous avez de nouveau un accès complet à toutes les fonctionnalités premium.</p>',
          impact_block: {
            title: 'Votre accès restauré:',
            items: ['Tous les cours disponibles', 'Votre progression est intacte', 'La facturation reprend au prochain cycle']
          },
          primary_cta: { label: 'Continuer à Apprendre', url: 'https://acloudforeveryone.org/dashboard' }
        }
      }
    },
    // 24. Subscription Ending Reminder
    {
      type: 'send-subscription-ending-reminder',
      role: 'Subscriber',
      scenario: 'Expiring Soon',
      en: {
        subject: 'Your Subscription Ends Soon',
        slots: {
          headline: 'Subscription Ending Soon',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Your subscription will end on <strong>January 15, 2026</strong>. Renew now to maintain uninterrupted access to all courses and features.</p>',
          impact_block: {
            title: "Don't miss out on:",
            items: ['Access to all premium courses', 'Mentor support and guidance', 'Community features']
          },
          primary_cta: { label: 'Renew Now', url: 'https://acloudforeveryone.org/my-subscriptions' }
        }
      },
      fr: {
        subject: 'Votre Abonnement se Termine Bientôt',
        slots: {
          headline: 'Abonnement se Terminant Bientôt',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Votre abonnement se terminera le <strong>15 janvier 2026</strong>. Renouvelez maintenant pour maintenir un accès ininterrompu à tous les cours et fonctionnalités.</p>',
          impact_block: {
            title: 'Ne manquez pas:',
            items: ['Accès à tous les cours premium', 'Support et guidance des mentors', 'Fonctionnalités communautaires']
          },
          primary_cta: { label: 'Renouveler Maintenant', url: 'https://acloudforeveryone.org/my-subscriptions' }
        }
      }
    },
    // 25. Payment Failed
    {
      type: 'send-payment-failed',
      role: 'Subscriber',
      scenario: 'Payment Issue',
      en: {
        subject: 'Payment Failed - Action Required',
        slots: {
          headline: 'Payment Issue',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">We were unable to process your payment. Please update your payment method to continue your subscription.</p>',
          impact_block: {
            title: 'What to do:',
            items: ['Update your payment method', 'Check your card details', 'Contact support if issues persist']
          },
          primary_cta: { label: 'Update Payment', url: 'https://acloudforeveryone.org/my-subscriptions' }
        }
      },
      fr: {
        subject: 'Échec du Paiement - Action Requise',
        slots: {
          headline: 'Problème de Paiement',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Nous n\'avons pas pu traiter votre paiement. Veuillez mettre à jour votre méthode de paiement pour continuer votre abonnement.</p>',
          impact_block: {
            title: 'Que faire:',
            items: ['Mettez à jour votre méthode de paiement', 'Vérifiez les détails de votre carte', 'Contactez le support si le problème persiste']
          },
          primary_cta: { label: 'Mettre à Jour le Paiement', url: 'https://acloudforeveryone.org/my-subscriptions' }
        }
      }
    },
    // 26. Donation Welcome
    {
      type: 'send-donation-welcome',
      role: 'Donor',
      scenario: 'New Donation',
      en: {
        subject: 'Thank You for Your Generous Support!',
        slots: {
          headline: 'Thank You!',
          body_primary: '<p style="margin: 0 0 16px 0;">Dear John,</p><p style="margin: 0;">Your monthly donation of $25.00 means the world to us.</p>',
          impact_block: {
            title: 'Your impact:',
            items: ['Sponsoring internships through Spectrogram Consulting', 'Providing access to learning resources', 'Supporting mentorship programs', 'Helping young Africans build tech careers']
          },
          primary_cta: { label: 'Visit Our Platform', url: 'https://acloudforeveryone.org' }
        }
      },
      fr: {
        subject: 'Merci pour Votre Généreux Soutien!',
        slots: {
          headline: 'Merci!',
          body_primary: '<p style="margin: 0 0 16px 0;">Cher Jean,</p><p style="margin: 0;">Votre don mensuel de 25,00 $ signifie beaucoup pour nous.</p>',
          impact_block: {
            title: 'Votre impact:',
            items: ['Parrainage de stages via Spectrogram Consulting', 'Accès aux ressources d\'apprentissage', 'Soutien aux programmes de mentorat', 'Aider les jeunes Africains à construire des carrières tech']
          },
          primary_cta: { label: 'Visiter Notre Plateforme', url: 'https://acloudforeveryone.org' }
        }
      }
    },
    // 27. Donor Report
    {
      type: 'send-donor-report',
      role: 'Donor',
      scenario: 'Quarterly Report',
      en: {
        subject: 'Your Impact Report - Q4 2025',
        slots: {
          headline: 'Your Impact Report',
          body_primary: '<p style="margin: 0 0 16px 0;">Dear John,</p><p style="margin: 0;">We wanted to share how your generous support has made a difference this quarter.</p><div style="margin-top: 16px; white-space: pre-wrap;">This quarter, your donations helped:\n\n• 150 students complete courses\n• 25 interns placed at tech companies\n• 10 new mentors onboarded</div>',
          signoff: 'With gratitude,<br><strong>The ACFE Team</strong>'
        }
      },
      fr: {
        subject: 'Votre Rapport d\'Impact - T4 2025',
        slots: {
          headline: 'Votre Rapport d\'Impact',
          body_primary: '<p style="margin: 0 0 16px 0;">Cher Jean,</p><p style="margin: 0;">Nous voulions partager comment votre soutien généreux a fait une différence ce trimestre.</p><div style="margin-top: 16px; white-space: pre-wrap;">Ce trimestre, vos dons ont aidé:\n\n• 150 étudiants à terminer des cours\n• 25 stagiaires placés dans des entreprises tech\n• 10 nouveaux mentors intégrés</div>',
          signoff: 'Avec gratitude,<br><strong>L\'Équipe ACFE</strong>'
        }
      }
    },
    // 28. Idea Confirmation
    {
      type: 'send-idea-confirmation',
      role: 'Innovator',
      scenario: 'Idea Submitted',
      en: {
        subject: 'Idea Submission Received',
        slots: {
          headline: 'Idea Received!',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">Thank you for submitting your startup idea <strong>"EcoTrack"</strong> to our Innovators Incubator.</p>',
          impact_block: {
            title: 'What happens next:',
            items: ['Our team will review your submission', 'You may be contacted for additional information', 'Selected ideas will receive mentorship and support']
          }
        }
      },
      fr: {
        subject: 'Soumission d\'Idée Reçue',
        slots: {
          headline: 'Idée Reçue!',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Merci d\'avoir soumis votre idée de startup <strong>"EcoTrack"</strong> à notre Incubateur d\'Innovateurs.</p>',
          impact_block: {
            title: 'Prochaines étapes:',
            items: ['Notre équipe examinera votre soumission', 'Vous pourriez être contacté pour des informations supplémentaires', 'Les idées sélectionnées recevront du mentorat et du soutien']
          }
        }
      }
    },
    // 29. Idea Status Email
    {
      type: 'send-idea-status-email',
      role: 'Innovator',
      scenario: 'Status Update',
      en: {
        subject: 'Update on Your Idea Submission',
        slots: {
          headline: 'Status Update',
          body_primary: '<p style="margin: 0 0 16px 0;">Hi John,</p><p style="margin: 0;">We have an update on your idea submission <strong>"EcoTrack"</strong>.</p><p style="margin: 16px 0 0 0;"><strong>New Status:</strong> Under Review</p>',
          primary_cta: { label: 'View Submission', url: 'https://acloudforeveryone.org/submit-idea' }
        }
      },
      fr: {
        subject: 'Mise à Jour de Votre Soumission d\'Idée',
        slots: {
          headline: 'Mise à Jour du Statut',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour Jean,</p><p style="margin: 0;">Nous avons une mise à jour concernant votre soumission d\'idée <strong>"EcoTrack"</strong>.</p><p style="margin: 16px 0 0 0;"><strong>Nouveau Statut:</strong> En cours d\'examen</p>',
          primary_cta: { label: 'Voir la Soumission', url: 'https://acloudforeveryone.org/submit-idea' }
        }
      }
    },
    // 30. Institution Invitation
    {
      type: 'send-institution-invitation',
      role: 'Institution Contact',
      scenario: 'Student Invited',
      en: {
        subject: "You're Invited to Join University of Lagos on ACFE",
        slots: {
          headline: 'Institution Invitation',
          body_primary: '<p style="margin: 0 0 16px 0;">Hello,</p><p style="margin: 0;">You have been invited to join <strong>University of Lagos</strong> on A Cloud for Everyone. As a member, you\'ll have access to exclusive courses and resources.</p>',
          impact_block: {
            title: 'Benefits include:',
            items: ['Access to institution-specific courses', 'Connect with fellow students', 'Career center resources']
          },
          primary_cta: { label: 'Accept Invitation', url: 'https://acloudforeveryone.org/auth?redirect=/dashboard' }
        }
      },
      fr: {
        subject: 'Vous Êtes Invité à Rejoindre Université de Lagos sur ACFE',
        slots: {
          headline: 'Invitation Institutionnelle',
          body_primary: '<p style="margin: 0 0 16px 0;">Bonjour,</p><p style="margin: 0;">Vous avez été invité à rejoindre <strong>Université de Lagos</strong> sur A Cloud for Everyone. En tant que membre, vous aurez accès à des cours et ressources exclusifs.</p>',
          impact_block: {
            title: 'Les avantages incluent:',
            items: ['Accès aux cours spécifiques à l\'institution', 'Connexion avec d\'autres étudiants', 'Ressources du centre de carrière']
          },
          primary_cta: { label: 'Accepter l\'Invitation', url: 'https://acloudforeveryone.org/auth?redirect=/dashboard' }
        }
      }
    },
    // 31. Institution Inquiry
    {
      type: 'send-institution-inquiry',
      role: 'Admin',
      scenario: 'New Inquiry',
      en: {
        subject: 'New Institution Partnership Inquiry',
        slots: {
          headline: 'New Partnership Inquiry',
          body_primary: '<p style="margin: 0 0 16px 0;">A new institution has expressed interest in partnering with ACFE.</p><p style="margin: 16px 0 0 0;"><strong>Institution:</strong> University of Nairobi<br><strong>Contact:</strong> Dr. Jane Smith<br><strong>Email:</strong> jane.smith@uon.ac.ke<br><strong>Message:</strong> We are interested in providing ACFE courses to our 5,000 computer science students.</p>',
          primary_cta: { label: 'View in Admin', url: 'https://acloudforeveryone.org/admin/institutions' }
        }
      },
      fr: {
        subject: 'Nouvelle Demande de Partenariat Institutionnel',
        slots: {
          headline: 'Nouvelle Demande de Partenariat',
          body_primary: '<p style="margin: 0 0 16px 0;">Une nouvelle institution a exprimé son intérêt à s\'associer avec ACFE.</p><p style="margin: 16px 0 0 0;"><strong>Institution:</strong> Université de Nairobi<br><strong>Contact:</strong> Dr. Jane Smith<br><strong>Email:</strong> jane.smith@uon.ac.ke<br><strong>Message:</strong> Nous souhaitons offrir les cours ACFE à nos 5 000 étudiants en informatique.</p>',
          primary_cta: { label: 'Voir dans Admin', url: 'https://acloudforeveryone.org/admin/institutions' }
        }
      }
    }
  ];

  // Generate permutations for each email type in both languages
  emailTypes.forEach((email, index) => {
    (['en', 'fr'] as EmailLanguage[]).forEach(lang => {
      const data = email[lang];
      permutations.push({
        id: `${index + 1}-${lang}`,
        type: email.type,
        role: email.role,
        scenario: email.scenario,
        language: lang,
        subject: data.subject,
        slots: data.slots
      });
    });
  });

  return permutations;
};

const AdminEmailPreview = () => {
  const navigate = useNavigate();
  const permutations = generatePermutations();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  const filteredPermutations = permutations.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (filterLanguage !== 'all' && p.language !== filterLanguage) return false;
    return true;
  });

  const currentEmail = filteredPermutations[currentIndex];
  const emailHtml = currentEmail ? buildCanonicalEmail(currentEmail.slots, currentEmail.language) : '';

  const uniqueTypes = [...new Set(permutations.map(p => p.type))];

  const goNext = () => {
    if (currentIndex < filteredPermutations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Admin
          </Button>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Email Template Preview</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter by Type:</span>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentIndex(0); }}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types ({permutations.length})</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Language:</span>
            <Select value={filterLanguage} onValueChange={(v) => { setFilterLanguage(v); setCurrentIndex(0); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            Showing {filteredPermutations.length} permutations
          </div>
        </div>

        {currentEmail && (
          <>
            {/* Email Info Header */}
            <div className="mb-4 p-4 bg-card border rounded-lg">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Badge variant="default" className="text-xs">{currentIndex + 1} of {filteredPermutations.length}</Badge>
                <Badge variant="outline">{currentEmail.language === 'en' ? '🇬🇧 English' : '🇫🇷 French'}</Badge>
                <Badge variant="secondary">{currentEmail.role}</Badge>
                <Badge variant="secondary">{currentEmail.scenario}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm"><strong>Email Type:</strong> <code className="bg-muted px-1 rounded">{currentEmail.type}</code></p>
                <p className="text-sm"><strong>Subject:</strong> {currentEmail.subject}</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                onClick={goPrev} 
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Use arrow keys to navigate
              </span>
              <Button 
                variant="outline" 
                onClick={goNext}
                disabled={currentIndex >= filteredPermutations.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Email Preview */}
            <div className="border rounded-lg overflow-hidden shadow-lg">
              <iframe
                srcDoc={emailHtml}
                title={`Email Preview: ${currentEmail.type}`}
                className="w-full h-[800px] bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </>
        )}

        {filteredPermutations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No emails match the current filters.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminEmailPreview;
