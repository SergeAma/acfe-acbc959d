// Email translations for edge functions
// This file provides translations for all email content

export type EmailLanguage = 'en' | 'fr';

// Francophone African countries for auto-detection
export const FRANCOPHONE_COUNTRIES = [
  'SN', 'CI', 'CM', 'CD', 'CG', 'BJ', 'TG', 'BF', 'ML', 'NE', 'TD', 'GA', 'GN', 'CF', 'MG', 'DJ', 'KM', 'RW', 'BI', 'SC', 'MU', 'MA', 'DZ', 'TN',
];

export const emailTranslations: Record<EmailLanguage, Record<string, string>> = {
  en: {
    // Common
    'email.greeting': 'Hello',
    'email.thanks': 'Thank you',
    'email.bestRegards': 'Best regards',
    'email.team': 'The ACFE Team',
    'email.unsubscribe': 'Unsubscribe',
    'email.viewInBrowser': 'View in browser',
    'email.questions': 'Questions? Contact us at',
    'email.footerTagline': 'Empowering African youth through digital skills and mentorship.',
    'email.allRights': 'All rights reserved.',

    // Welcome Email
    'welcome.subject': 'Welcome to A Cloud for Everyone!',
    'welcome.title': 'Welcome to ACFE!',
    'welcome.intro': "We're thrilled to have you join our community of learners and mentors dedicated to advancing digital skills across Africa.",
    'welcome.nextSteps': 'What you can do next:',
    'welcome.step1': 'Browse our courses and start learning',
    'welcome.step2': 'Connect with experienced mentors',
    'welcome.step3': 'Join our community discussions',
    'welcome.cta': 'Start Learning Now',
    'welcome.support': "If you have any questions, don't hesitate to reach out.",

    // Newsletter Welcome
    'newsletter.welcome.subject': 'Welcome to the ACFE Newsletter!',
    'newsletter.welcome.title': "You're subscribed!",
    'newsletter.welcome.intro': 'Thank you for subscribing to our newsletter. You will receive weekly updates on African tech news, digital skills tips, and community highlights.',
    'newsletter.welcome.expect': 'What to expect:',
    'newsletter.welcome.item1': 'Weekly Africa tech news digest',
    'newsletter.welcome.item2': 'Digital skills tips and resources',
    'newsletter.welcome.item3': 'Community success stories',
    'newsletter.welcome.item4': 'Exclusive opportunities',

    // Mentor Application
    'mentor.request.subject': 'Mentor Application Received',
    'mentor.request.title': 'Application Received!',
    'mentor.request.intro': 'Thank you for applying to become a mentor at A Cloud for Everyone. We have received your application and our team will review it shortly.',
    'mentor.request.next': 'What happens next:',
    'mentor.request.step1': 'Our team will review your application',
    'mentor.request.step2': 'You will receive an email with our decision',
    'mentor.request.step3': 'If approved, you can start creating courses',
    'mentor.request.timeline': 'This process typically takes 3-5 business days.',

    // Mentor Approved
    'mentor.approved.subject': 'Congratulations! Your Mentor Application is Approved',
    'mentor.approved.title': 'Welcome, Mentor!',
    'mentor.approved.intro': "Great news! Your application to become a mentor at A Cloud for Everyone has been approved. You're now part of our community of educators empowering African youth.",
    'mentor.approved.next': 'Get started:',
    'mentor.approved.step1': 'Complete your mentor profile',
    'mentor.approved.step2': 'Sign the mentor contract',
    'mentor.approved.step3': 'Create your first course',
    'mentor.approved.cta': 'Go to Dashboard',

    // Mentor Rejected
    'mentor.rejected.subject': 'Update on Your Mentor Application',
    'mentor.rejected.title': 'Application Update',
    'mentor.rejected.intro': 'Thank you for your interest in becoming a mentor at A Cloud for Everyone. After careful review, we are unable to approve your application at this time.',
    'mentor.rejected.reason': 'This decision may be due to incomplete profile information or other factors. You are welcome to reapply after 30 days.',
    'mentor.rejected.encourage': 'In the meantime, you can continue learning on our platform and building your skills.',

    // Course Completion
    'course.complete.subject': 'Congratulations on Completing Your Course!',
    'course.complete.title': 'Course Completed!',
    'course.complete.intro': 'Congratulations on completing your course! Your dedication to learning is truly inspiring.',
    'course.complete.certificate': 'Your certificate is now available in your dashboard.',
    'course.complete.next': 'What to do next:',
    'course.complete.step1': 'Download your certificate',
    'course.complete.step2': 'Share your achievement on LinkedIn',
    'course.complete.step3': 'Explore more courses',
    'course.complete.cta': 'View Certificate',

    // Assignment Submitted
    'assignment.submitted.subject': 'New Assignment Submission',
    'assignment.submitted.title': 'New Submission Received',
    'assignment.submitted.intro': 'A student has submitted an assignment for your course.',
    'assignment.submitted.student': 'Student:',
    'assignment.submitted.course': 'Course:',
    'assignment.submitted.cta': 'Review Submission',

    // Assignment Pending (for student)
    'assignment.pending.subject': 'Assignment Submitted Successfully!',
    'assignment.pending.title': 'Assignment Under Review',
    'assignment.pending.intro': 'Your assignment has been submitted and is now being reviewed by your mentor.',
    'assignment.pending.responseTime': 'You can expect a response within 48 hours.',
    'assignment.pending.track': 'Track the status of your submission from your dashboard.',

    // Assignment Graded
    'assignment.graded.subject': 'Your Assignment Has Been Graded',
    'assignment.graded.title': 'Assignment Graded!',
    'assignment.graded.intro': 'Your mentor has reviewed and graded your assignment.',
    'assignment.graded.course': 'Course:',
    'assignment.graded.cta': 'View Feedback',

    // Session Booked
    'session.booked.subject': 'Mentorship Session Confirmed',
    'session.booked.title': 'Session Booked!',
    'session.booked.intro': 'Your mentorship session has been confirmed.',
    'session.booked.details': 'Session Details:',
    'session.booked.date': 'Date:',
    'session.booked.time': 'Time:',
    'session.booked.mentor': 'Mentor:',
    'session.booked.student': 'Student:',
    'session.booked.addCalendar': 'Add to Calendar',
    'session.booked.reminder': 'You will receive a reminder before the session.',

    // Weekly Reminder (Student)
    'reminder.student.subject': 'Your Weekly Learning Reminder',
    'reminder.student.title': 'Time to Learn!',
    'reminder.student.intro': 'This is your weekly reminder to continue your learning journey on ACFE.',
    'reminder.student.tips': 'This week, you could:',
    'reminder.student.tip1': 'Continue your enrolled courses',
    'reminder.student.tip2': 'Explore new courses in your area of interest',
    'reminder.student.tip3': 'Connect with a mentor for guidance',
    'reminder.student.cta': 'Go to Dashboard',

    // Weekly Reminder (Mentor)
    'reminder.mentor.subject': 'Your Weekly Mentor Reminder',
    'reminder.mentor.title': 'Mentor Check-in',
    'reminder.mentor.intro': 'This is your weekly reminder to engage with your students and community.',
    'reminder.mentor.tips': 'This week, consider:',
    'reminder.mentor.tip1': 'Reviewing pending student submissions',
    'reminder.mentor.tip2': 'Responding to mentorship requests',
    'reminder.mentor.tip3': 'Engaging with your cohort community',
    'reminder.mentor.cta': 'Go to Dashboard',

    // Donation Welcome
    'donation.welcome.subject': 'Thank You for Your Donation!',
    'donation.welcome.title': 'Thank You!',
    'donation.welcome.intro': 'Your generous donation helps us empower more African youth with digital skills and mentorship opportunities.',
    'donation.welcome.impact': 'Your impact:',
    'donation.welcome.item1': 'Supporting free courses for students',
    'donation.welcome.item2': 'Funding internship opportunities',
    'donation.welcome.item3': 'Expanding our reach across Africa',

    // Idea Submission
    'idea.submitted.subject': 'Idea Submission Received',
    'idea.submitted.title': 'Idea Received!',
    'idea.submitted.intro': 'Thank you for submitting your startup idea to our Innovators Incubator.',
    'idea.submitted.next': 'What happens next:',
    'idea.submitted.step1': 'Our team will review your submission',
    'idea.submitted.step2': 'You may be contacted for additional information',
    'idea.submitted.step3': 'Selected ideas will receive mentorship and support',

    // Purchase/Enrollment
    'purchase.subject': 'Welcome to your new course!',
    'purchase.title': 'Payment Confirmed!',
    'purchase.intro': 'Thank you for enrolling. Your payment has been processed successfully.',
    'purchase.dripSchedule': 'Content Schedule',
    'purchase.dripExplanation': 'Your first lesson is available now! After that, new lessons unlock every',
    'purchase.dripBenefit': 'This paced approach helps you absorb the material better.',
    'purchase.nextSteps': "What's next?",
    'purchase.step1': 'Access your first lesson from the Dashboard',
    'purchase.step2Drip': 'New lessons unlock weekly - check back regularly!',
    'purchase.step2Self': 'Complete lessons at your own pace',
    'purchase.step3': 'Earn your certificate upon completion',
    'purchase.cta': 'Start Learning Now',
  },

  fr: {
    // Common
    'email.greeting': 'Bonjour',
    'email.thanks': 'Merci',
    'email.bestRegards': 'Cordialement',
    'email.team': "L'Équipe ACFE",
    'email.unsubscribe': 'Se désabonner',
    'email.viewInBrowser': 'Voir dans le navigateur',
    'email.questions': 'Questions? Contactez-nous à',
    'email.footerTagline': 'Autonomiser la jeunesse africaine grâce aux compétences numériques et au mentorat.',
    'email.allRights': 'Tous droits réservés.',

    // Welcome Email
    'welcome.subject': 'Bienvenue sur A Cloud for Everyone!',
    'welcome.title': 'Bienvenue sur ACFE!',
    'welcome.intro': "Nous sommes ravis de vous accueillir dans notre communauté d'apprenants et de mentors dédiée à l'avancement des compétences numériques en Afrique.",
    'welcome.nextSteps': 'Ce que vous pouvez faire ensuite:',
    'welcome.step1': 'Parcourez nos cours et commencez à apprendre',
    'welcome.step2': 'Connectez-vous avec des mentors expérimentés',
    'welcome.step3': 'Rejoignez les discussions de la communauté',
    'welcome.cta': 'Commencer à Apprendre',
    'welcome.support': "Si vous avez des questions, n'hésitez pas à nous contacter.",

    // Newsletter Welcome
    'newsletter.welcome.subject': 'Bienvenue à la Newsletter ACFE!',
    'newsletter.welcome.title': 'Vous êtes inscrit!',
    'newsletter.welcome.intro': 'Merci de vous être abonné à notre newsletter. Vous recevrez des mises à jour hebdomadaires sur les actualités tech africaines, des conseils en compétences numériques et les temps forts de la communauté.',
    'newsletter.welcome.expect': 'À quoi vous attendre:',
    'newsletter.welcome.item1': 'Digest hebdomadaire des actualités tech africaines',
    'newsletter.welcome.item2': 'Conseils et ressources en compétences numériques',
    'newsletter.welcome.item3': 'Histoires de réussite de la communauté',
    'newsletter.welcome.item4': 'Opportunités exclusives',

    // Mentor Application
    'mentor.request.subject': 'Candidature de Mentor Reçue',
    'mentor.request.title': 'Candidature Reçue!',
    'mentor.request.intro': 'Merci de votre candidature pour devenir mentor chez A Cloud for Everyone. Nous avons reçu votre candidature et notre équipe l\'examinera prochainement.',
    'mentor.request.next': 'Prochaines étapes:',
    'mentor.request.step1': 'Notre équipe examinera votre candidature',
    'mentor.request.step2': 'Vous recevrez un email avec notre décision',
    'mentor.request.step3': 'Si approuvé, vous pourrez créer des cours',
    'mentor.request.timeline': 'Ce processus prend généralement 3 à 5 jours ouvrables.',

    // Mentor Approved
    'mentor.approved.subject': 'Félicitations! Votre Candidature de Mentor est Approuvée',
    'mentor.approved.title': 'Bienvenue, Mentor!',
    'mentor.approved.intro': 'Bonne nouvelle! Votre candidature pour devenir mentor chez A Cloud for Everyone a été approuvée. Vous faites maintenant partie de notre communauté d\'éducateurs qui autonomisent la jeunesse africaine.',
    'mentor.approved.next': 'Pour commencer:',
    'mentor.approved.step1': 'Complétez votre profil de mentor',
    'mentor.approved.step2': 'Signez le contrat de mentor',
    'mentor.approved.step3': 'Créez votre premier cours',
    'mentor.approved.cta': 'Aller au Tableau de Bord',

    // Mentor Rejected
    'mentor.rejected.subject': 'Mise à Jour de Votre Candidature de Mentor',
    'mentor.rejected.title': 'Mise à Jour de Candidature',
    'mentor.rejected.intro': 'Merci de votre intérêt pour devenir mentor chez A Cloud for Everyone. Après examen attentif, nous ne pouvons pas approuver votre candidature pour le moment.',
    'mentor.rejected.reason': 'Cette décision peut être due à des informations de profil incomplètes ou à d\'autres facteurs. Vous êtes invité à postuler à nouveau après 30 jours.',
    'mentor.rejected.encourage': 'En attendant, vous pouvez continuer à apprendre sur notre plateforme et développer vos compétences.',

    // Course Completion
    'course.complete.subject': 'Félicitations pour avoir Terminé Votre Cours!',
    'course.complete.title': 'Cours Terminé!',
    'course.complete.intro': 'Félicitations pour avoir terminé votre cours! Votre dévouement à l\'apprentissage est vraiment inspirant.',
    'course.complete.certificate': 'Votre certificat est maintenant disponible dans votre tableau de bord.',
    'course.complete.next': 'Que faire ensuite:',
    'course.complete.step1': 'Téléchargez votre certificat',
    'course.complete.step2': 'Partagez votre réussite sur LinkedIn',
    'course.complete.step3': 'Explorez plus de cours',
    'course.complete.cta': 'Voir le Certificat',

    // Assignment Submitted
    'assignment.submitted.subject': 'Nouvelle Soumission de Devoir',
    'assignment.submitted.title': 'Nouvelle Soumission Reçue',
    'assignment.submitted.intro': 'Un étudiant a soumis un devoir pour votre cours.',
    'assignment.submitted.student': 'Étudiant:',
    'assignment.submitted.course': 'Cours:',
    'assignment.submitted.cta': 'Examiner la Soumission',

    // Assignment Pending (for student)
    'assignment.pending.subject': 'Devoir Soumis avec Succès!',
    'assignment.pending.title': 'Devoir en Cours d\'Examen',
    'assignment.pending.intro': 'Votre devoir a été soumis et est maintenant en cours d\'examen par votre mentor.',
    'assignment.pending.responseTime': 'Vous pouvez vous attendre à une réponse dans 48 heures.',
    'assignment.pending.track': 'Suivez l\'état de votre soumission depuis votre tableau de bord.',

    // Assignment Graded
    'assignment.graded.subject': 'Votre Devoir a été Noté',
    'assignment.graded.title': 'Devoir Noté!',
    'assignment.graded.intro': 'Votre mentor a examiné et noté votre devoir.',
    'assignment.graded.course': 'Cours:',
    'assignment.graded.cta': 'Voir les Commentaires',

    // Session Booked
    'session.booked.subject': 'Session de Mentorat Confirmée',
    'session.booked.title': 'Session Réservée!',
    'session.booked.intro': 'Votre session de mentorat a été confirmée.',
    'session.booked.details': 'Détails de la Session:',
    'session.booked.date': 'Date:',
    'session.booked.time': 'Heure:',
    'session.booked.mentor': 'Mentor:',
    'session.booked.student': 'Étudiant:',
    'session.booked.addCalendar': 'Ajouter au Calendrier',
    'session.booked.reminder': 'Vous recevrez un rappel avant la session.',

    // Weekly Reminder (Student)
    'reminder.student.subject': 'Votre Rappel Hebdomadaire d\'Apprentissage',
    'reminder.student.title': 'C\'est l\'Heure d\'Apprendre!',
    'reminder.student.intro': 'Ceci est votre rappel hebdomadaire pour continuer votre parcours d\'apprentissage sur ACFE.',
    'reminder.student.tips': 'Cette semaine, vous pourriez:',
    'reminder.student.tip1': 'Continuer vos cours inscrits',
    'reminder.student.tip2': 'Explorer de nouveaux cours dans votre domaine d\'intérêt',
    'reminder.student.tip3': 'Contacter un mentor pour des conseils',
    'reminder.student.cta': 'Aller au Tableau de Bord',

    // Weekly Reminder (Mentor)
    'reminder.mentor.subject': 'Votre Rappel Hebdomadaire de Mentor',
    'reminder.mentor.title': 'Point Mentor',
    'reminder.mentor.intro': 'Ceci est votre rappel hebdomadaire pour vous engager avec vos étudiants et la communauté.',
    'reminder.mentor.tips': 'Cette semaine, considérez:',
    'reminder.mentor.tip1': 'Examiner les soumissions des étudiants en attente',
    'reminder.mentor.tip2': 'Répondre aux demandes de mentorat',
    'reminder.mentor.tip3': 'Vous engager avec votre communauté de cohorte',
    'reminder.mentor.cta': 'Aller au Tableau de Bord',

    // Donation Welcome
    'donation.welcome.subject': 'Merci pour Votre Don!',
    'donation.welcome.title': 'Merci!',
    'donation.welcome.intro': 'Votre don généreux nous aide à autonomiser plus de jeunes africains avec des compétences numériques et des opportunités de mentorat.',
    'donation.welcome.impact': 'Votre impact:',
    'donation.welcome.item1': 'Soutenir des cours gratuits pour les étudiants',
    'donation.welcome.item2': 'Financer des opportunités de stage',
    'donation.welcome.item3': 'Étendre notre portée à travers l\'Afrique',

    // Idea Submission
    'idea.submitted.subject': 'Soumission d\'Idée Reçue',
    'idea.submitted.title': 'Idée Reçue!',
    'idea.submitted.intro': 'Merci d\'avoir soumis votre idée de startup à notre Incubateur d\'Innovateurs.',
    'idea.submitted.next': 'Prochaines étapes:',
    'idea.submitted.step1': 'Notre équipe examinera votre soumission',
    'idea.submitted.step2': 'Vous pourriez être contacté pour des informations supplémentaires',
    'idea.submitted.step3': 'Les idées sélectionnées recevront du mentorat et du soutien',

    // Purchase/Enrollment
    'purchase.subject': 'Bienvenue dans votre nouveau cours!',
    'purchase.title': 'Paiement Confirmé!',
    'purchase.intro': 'Merci de vous être inscrit. Votre paiement a été traité avec succès.',
    'purchase.dripSchedule': 'Calendrier du Contenu',
    'purchase.dripExplanation': 'Votre première leçon est disponible maintenant! Ensuite, de nouvelles leçons se débloquent chaque',
    'purchase.dripBenefit': 'Cette approche progressive vous aide à mieux assimiler le contenu.',
    'purchase.nextSteps': 'Prochaines étapes?',
    'purchase.step1': 'Accédez à votre première leçon depuis le Tableau de Bord',
    'purchase.step2Drip': 'De nouvelles leçons se débloquent chaque semaine - revenez régulièrement!',
    'purchase.step2Self': 'Complétez les leçons à votre rythme',
    'purchase.step3': 'Obtenez votre certificat à la fin',
    'purchase.cta': 'Commencer à Apprendre',
  },
};

// Get translation for email
export const getEmailTranslation = (key: string, language: EmailLanguage = 'en'): string => {
  return emailTranslations[language][key] || emailTranslations['en'][key] || key;
};

// Detect language from country code
export const detectLanguageFromCountry = (countryCode: string | null): EmailLanguage => {
  if (countryCode && FRANCOPHONE_COUNTRIES.includes(countryCode)) {
    return 'fr';
  }
  return 'en';
};
