/**
 * ACFE Email Translations - Bilingual EN/FR support
 * All email text must go through this system
 */

export type Language = 'en' | 'fr';

export const translations = {
  greeting: {
    formal: { 
      en: 'Hello {{name}},', 
      fr: 'Bonjour {{name}},' 
    },
    informal: {
      en: 'Hi {{name}},',
      fr: 'Salut {{name}},'
    }
  },
  
  welcome: {
    subject: { 
      en: 'Welcome to A Cloud For Everyone!', 
      fr: 'Bienvenue à A Cloud For Everyone !' 
    },
    body: { 
      en: 'We\'re thrilled to have you join our community of learners and mentors dedicated to empowering African youth through technology.', 
      fr: 'Nous sommes ravis de vous accueillir dans notre communauté d\'apprenants et de mentors dédiés à l\'autonomisation de la jeunesse africaine par la technologie.' 
    },
    cta: { 
      en: 'Get Started', 
      fr: 'Commencer' 
    }
  },
  
  payment: {
    subject: { 
      en: 'Payment Confirmed', 
      fr: 'Paiement Confirmé' 
    },
    success: { 
      en: 'Your payment has been processed successfully. Thank you for your support!', 
      fr: 'Votre paiement a été traité avec succès. Merci pour votre soutien !' 
    },
    cta: { 
      en: 'View Receipt', 
      fr: 'Voir le Reçu' 
    }
  },
  
  subscription: {
    created: {
      subject: { 
        en: 'Your Subscription is Active!', 
        fr: 'Votre Abonnement est Actif !' 
      },
      body: { 
        en: 'Your subscription is now active. You have full access to all premium features and courses.', 
        fr: 'Votre abonnement est maintenant actif. Vous avez accès à toutes les fonctionnalités et cours premium.' 
      },
      cta: { 
        en: 'Access Premium Content', 
        fr: 'Accéder au Contenu Premium' 
      }
    },
    renewed: {
      subject: { 
        en: 'Subscription Renewed Successfully', 
        fr: 'Abonnement Renouvelé avec Succès' 
      },
      body: { 
        en: 'Your subscription has been renewed. Thank you for your continued support of our mission!', 
        fr: 'Votre abonnement a été renouvelé. Merci pour votre soutien continu à notre mission !' 
      },
      cta: { 
        en: 'Continue Learning', 
        fr: 'Continuer à Apprendre' 
      }
    },
    ending: {
      subject: { 
        en: 'Your Subscription Ends Soon', 
        fr: 'Votre Abonnement se Termine Bientôt' 
      },
      body: { 
        en: 'Your subscription ends in {{days}} days. Renew now to maintain uninterrupted access.', 
        fr: 'Votre abonnement se termine dans {{days}} jours. Renouvelez maintenant pour un accès ininterrompu.' 
      },
      cta: { 
        en: 'Renew Now', 
        fr: 'Renouveler Maintenant' 
      }
    },
    cancelled: {
      subject: { 
        en: 'Subscription Cancelled', 
        fr: 'Abonnement Annulé' 
      },
      body: { 
        en: 'Your subscription has been cancelled. You will continue to have access until {{endDate}}.', 
        fr: 'Votre abonnement a été annulé. Vous continuerez à avoir accès jusqu\'au {{endDate}}.' 
      },
      cta: { 
        en: 'Resubscribe', 
        fr: 'Se Réabonner' 
      }
    },
    paused: {
      subject: { 
        en: 'Subscription Paused', 
        fr: 'Abonnement en Pause' 
      },
      body: { 
        en: 'Your subscription has been paused. You can resume it at any time to continue your learning journey.', 
        fr: 'Votre abonnement a été mis en pause. Vous pouvez le reprendre à tout moment pour continuer votre parcours.' 
      },
      cta: { 
        en: 'Resume Subscription', 
        fr: 'Reprendre l\'Abonnement' 
      }
    },
    resumed: {
      subject: { 
        en: 'Welcome Back! Subscription Resumed', 
        fr: 'Bon Retour ! Abonnement Repris' 
      },
      body: { 
        en: 'Your subscription has been resumed. You now have full access again to all premium features.', 
        fr: 'Votre abonnement a été repris. Vous avez de nouveau accès à toutes les fonctionnalités premium.' 
      },
      cta: { 
        en: 'Continue Learning', 
        fr: 'Continuer à Apprendre' 
      }
    }
  },
  
  magicLink: {
    subject: { 
      en: 'Your Sign-In Link', 
      fr: 'Votre Lien de Connexion' 
    },
    body: { 
      en: 'Click the button below to sign in to your account. This link expires in 1 hour.', 
      fr: 'Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien expire dans 1 heure.' 
    },
    cta: { 
      en: 'Sign In to ACFE', 
      fr: 'Se Connecter à ACFE' 
    },
    footer: { 
      en: 'If you didn\'t request this link, you can safely ignore this email.', 
      fr: 'Si vous n\'avez pas demandé ce lien, vous pouvez ignorer cet email.' 
    }
  },
  
  passwordReset: {
    subject: { 
      en: 'Reset Your Password', 
      fr: 'Réinitialiser Votre Mot de Passe' 
    },
    body: { 
      en: 'You requested to reset your password. Click below to set a new password. This link expires in 1 hour.', 
      fr: 'Vous avez demandé à réinitialiser votre mot de passe. Cliquez ci-dessous pour définir un nouveau mot de passe. Ce lien expire dans 1 heure.' 
    },
    cta: { 
      en: 'Reset Password', 
      fr: 'Réinitialiser le Mot de Passe' 
    },
    footer: { 
      en: 'If you didn\'t request this, please ignore this email or contact support.', 
      fr: 'Si vous n\'avez pas fait cette demande, ignorez cet email ou contactez le support.' 
    }
  },
  
  emailConfirmation: {
    subject: { 
      en: 'Confirm Your Email Address', 
      fr: 'Confirmez Votre Adresse Email' 
    },
    body: { 
      en: 'Please confirm your email address by clicking the button below to complete your registration.', 
      fr: 'Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous pour terminer votre inscription.' 
    },
    cta: { 
      en: 'Confirm Email', 
      fr: 'Confirmer l\'Email' 
    }
  },
  
  institution: {
    invitation: {
      subject: { 
        en: 'You\'ve Been Invited to Join {{institutionName}}', 
        fr: 'Vous Êtes Invité à Rejoindre {{institutionName}}' 
      },
      body: { 
        en: 'You have been invited to join {{institutionName}} as a {{role}}. Click below to accept the invitation.', 
        fr: 'Vous avez été invité à rejoindre {{institutionName}} en tant que {{role}}. Cliquez ci-dessous pour accepter.' 
      },
      cta: { 
        en: 'Accept Invitation', 
        fr: 'Accepter l\'Invitation' 
      }
    },
    request: {
      subject: { 
        en: 'New Institution Request', 
        fr: 'Nouvelle Demande d\'Institution' 
      },
      body: { 
        en: '{{requesterName}} has requested to join {{institutionName}}.', 
        fr: '{{requesterName}} a demandé à rejoindre {{institutionName}}.' 
      },
      cta: { 
        en: 'Review Request', 
        fr: 'Examiner la Demande' 
      }
    }
  },
  
  event: {
    confirmation: {
      subject: { 
        en: 'Registration Confirmed: {{eventName}}', 
        fr: 'Inscription Confirmée : {{eventName}}' 
      },
      body: { 
        en: 'You\'re registered for {{eventName}} on {{eventDate}} at {{eventTime}}.', 
        fr: 'Vous êtes inscrit pour {{eventName}} le {{eventDate}} à {{eventTime}}.' 
      },
      cta: { 
        en: 'View Event Details', 
        fr: 'Voir les Détails' 
      }
    },
    reminder: {
      subject: { 
        en: 'Reminder: {{eventName}} Starts {{timeUntil}}', 
        fr: 'Rappel : {{eventName}} Commence {{timeUntil}}' 
      },
      body: { 
        en: 'Don\'t forget! {{eventName}} starts {{timeUntil}}. We look forward to seeing you there.', 
        fr: 'N\'oubliez pas ! {{eventName}} commence {{timeUntil}}. Nous avons hâte de vous voir.' 
      },
      cta: { 
        en: 'Join Event', 
        fr: 'Rejoindre l\'Événement' 
      }
    }
  },
  
  mentor: {
    invitation: {
      subject: { 
        en: 'Invitation to Become an ACFE Mentor', 
        fr: 'Invitation à Devenir Mentor ACFE' 
      },
      body: { 
        en: 'We\'d love for you to share your expertise as a mentor on our platform. Help shape the next generation of African tech talent.', 
        fr: 'Nous serions ravis que vous partagiez votre expertise en tant que mentor. Aidez à former la prochaine génération de talents tech africains.' 
      },
      cta: { 
        en: 'Accept Invitation', 
        fr: 'Accepter l\'Invitation' 
      }
    },
    approved: {
      subject: { 
        en: 'Congratulations! Your Mentor Application is Approved', 
        fr: 'Félicitations ! Votre Candidature de Mentor est Approuvée' 
      },
      body: { 
        en: 'Great news! Your mentor application has been approved. You can now create courses and guide students on their learning journey.', 
        fr: 'Bonne nouvelle ! Votre candidature de mentor a été approuvée. Vous pouvez maintenant créer des cours et guider les étudiants.' 
      },
      cta: { 
        en: 'Start Mentoring', 
        fr: 'Commencer le Mentorat' 
      }
    },
    rejected: {
      subject: { 
        en: 'Update on Your Mentor Application', 
        fr: 'Mise à Jour sur Votre Candidature de Mentor' 
      },
      body: { 
        en: 'Thank you for your interest in becoming a mentor. Unfortunately, we\'re unable to approve your application at this time.', 
        fr: 'Merci pour votre intérêt à devenir mentor. Malheureusement, nous ne pouvons pas approuver votre candidature pour le moment.' 
      },
      cta: { 
        en: 'Learn More', 
        fr: 'En Savoir Plus' 
      }
    },
    requestConfirmation: {
      subject: { 
        en: 'Mentor Application Received', 
        fr: 'Candidature de Mentor Reçue' 
      },
      body: { 
        en: 'We\'ve received your mentor application. Our team will review it and get back to you within 5-7 business days.', 
        fr: 'Nous avons reçu votre candidature de mentor. Notre équipe l\'examinera et vous répondra sous 5 à 7 jours ouvrables.' 
      }
    }
  },
  
  course: {
    enrolled: {
      subject: { 
        en: 'Welcome to {{courseName}}!', 
        fr: 'Bienvenue dans {{courseName}} !' 
      },
      body: { 
        en: 'You\'re now enrolled in {{courseName}}. Start learning today!', 
        fr: 'Vous êtes maintenant inscrit à {{courseName}}. Commencez à apprendre aujourd\'hui !' 
      },
      cta: { 
        en: 'Start Course', 
        fr: 'Commencer le Cours' 
      }
    },
    completed: {
      subject: { 
        en: 'Congratulations! You Completed {{courseName}}', 
        fr: 'Félicitations ! Vous Avez Terminé {{courseName}}' 
      },
      body: { 
        en: 'You\'ve successfully completed {{courseName}}. Your certificate is ready!', 
        fr: 'Vous avez terminé {{courseName}} avec succès. Votre certificat est prêt !' 
      },
      cta: { 
        en: 'View Certificate', 
        fr: 'Voir le Certificat' 
      }
    }
  },
  
  certificate: {
    issued: {
      subject: { 
        en: 'Your ACFE Certificate is Ready!', 
        fr: 'Votre Certificat ACFE est Prêt !' 
      },
      body: { 
        en: 'Congratulations on completing {{courseName}}! Your certificate has been issued and is ready to download.', 
        fr: 'Félicitations pour avoir terminé {{courseName}} ! Votre certificat a été émis et est prêt à télécharger.' 
      },
      cta: { 
        en: 'Download Certificate', 
        fr: 'Télécharger le Certificat' 
      }
    }
  },
  
  donation: {
    thankYou: {
      subject: { 
        en: 'Thank You for Your Generous Support!', 
        fr: 'Merci pour Votre Généreux Soutien !' 
      },
      body: { 
        en: 'Your donation of {{amount}} means the world to us and the young learners across Africa we support.', 
        fr: 'Votre don de {{amount}} signifie beaucoup pour nous et les jeunes apprenants à travers l\'Afrique que nous soutenons.' 
      },
      cta: { 
        en: 'Visit Our Platform', 
        fr: 'Visiter Notre Plateforme' 
      }
    }
  },
  
  newsletter: {
    welcome: {
      subject: { 
        en: 'Welcome to the ACFE Newsletter!', 
        fr: 'Bienvenue dans la Newsletter ACFE !' 
      },
      body: { 
        en: 'Thank you for subscribing! You\'ll receive updates on courses, events, and opportunities.', 
        fr: 'Merci de vous être abonné ! Vous recevrez des mises à jour sur les cours, événements et opportunités.' 
      }
    }
  },
  
  common: {
    regards: { 
      en: 'Best regards,\nThe ACFE Team', 
      fr: 'Cordialement,\nL\'Équipe ACFE' 
    },
    team: { 
      en: 'The ACFE Team', 
      fr: 'L\'Équipe ACFE' 
    },
    footerTagline: { 
      en: 'Empowering African youth through digital skills and mentorship.', 
      fr: 'Autonomiser la jeunesse africaine grâce aux compétences numériques et au mentorat.' 
    }
  }
} as const;

/**
 * Get translated text with variable substitution
 * @param path - Dot-notation path (e.g., 'welcome.subject')
 * @param language - 'en' or 'fr' (defaults to 'en')
 * @param variables - Key-value pairs for {{variable}} substitution
 */
export function getText(
  path: string, 
  language: Language = 'en', 
  variables?: Record<string, string>
): string {
  const keys = path.split('.');
  let value: any = translations;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }
  
  // Get text for language, fallback to English
  let text = value?.[language] || value?.en || '';
  
  // Substitute variables
  if (variables && typeof text === 'string') {
    Object.entries(variables).forEach(([key, val]) => {
      text = text.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });
  }
  
  return text;
}

/**
 * Get greeting with user name
 */
export function getGreeting(
  userName: string, 
  language: Language = 'en', 
  formal: boolean = true
): string {
  const key = formal ? 'greeting.formal' : 'greeting.informal';
  return getText(key, language, { name: userName });
}

/**
 * Get subject line for email type
 */
export function getSubject(
  emailType: string,
  language: Language = 'en',
  variables?: Record<string, string>
): string {
  return getText(`${emailType}.subject`, language, variables);
}

/**
 * Get body text for email type
 */
export function getBody(
  emailType: string,
  language: Language = 'en',
  variables?: Record<string, string>
): string {
  return getText(`${emailType}.body`, language, variables);
}

/**
 * Get CTA button text for email type
 */
export function getCta(
  emailType: string,
  language: Language = 'en'
): string {
  return getText(`${emailType}.cta`, language);
}
