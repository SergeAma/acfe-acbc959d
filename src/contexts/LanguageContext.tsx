import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCountryFlag } from '@/hooks/useCountryFlag';

type Language = 'en' | 'fr';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Francophone African countries
const FRANCOPHONE_COUNTRIES = [
  'SN', // Senegal
  'CI', // Côte d'Ivoire
  'CM', // Cameroon
  'CD', // DR Congo
  'CG', // Republic of Congo
  'BJ', // Benin
  'TG', // Togo
  'BF', // Burkina Faso
  'ML', // Mali
  'NE', // Niger
  'TD', // Chad
  'GA', // Gabon
  'GN', // Guinea
  'CF', // Central African Republic
  'MG', // Madagascar
  'DJ', // Djibouti
  'KM', // Comoros
  'RW', // Rwanda
  'BI', // Burundi
  'SC', // Seychelles
  'MU', // Mauritius
  'MA', // Morocco
  'DZ', // Algeria
  'TN', // Tunisia
];

// Translations
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.partners': 'Partners',
    'nav.jobs': 'Jobs',
    'nav.pricing': 'Pricing',
    'nav.careerCentre': 'Career Centre',
    'nav.startups': 'Startups',
    'nav.account': 'Account',
    'nav.dashboard': 'Dashboard',
    'nav.browseCourses': 'Browse Courses',
    'nav.manageCourses': 'Manage Courses',
    'nav.adminPanel': 'Admin Panel',
    'nav.profileSettings': 'Profile Settings',
    'nav.signOut': 'Sign Out',

    // Hero Section
    'hero.title': 'Join 300+ Learners and Master a Career-Boosting Digital Skill!',
    'hero.subtitle': 'Zero experience required | Any background | Learn Anytime',
    'hero.context': 'Training delivered by tech experts who understand the African context.',
    'hero.dashboard': 'Go to Dashboard',
    'hero.startLearning': 'START LEARNING',
    'hero.becomeMentor': 'BECOME A MENTOR',

    // Features Section
    'features.title': 'Why Choose Us',
    'features.mentors.title': 'Our Mentors',
    'features.mentors.desc': 'Learn from experienced professionals who are passionate about sharing their knowledge and empowering the next generation',
    'features.courses.title': 'Explore Courses',
    'features.courses.desc': 'Outcome-focused training designed to get you job-ready, not just traditional learning but practical skills that lead to real career opportunities',
    'features.community.title': 'Join Our Community',
    'features.community.desc': 'Join a supportive community of learners and mentors dedicated to advancing digital skills across Africa',

    // Partners Section
    'partners.title': 'Our Partners',

    // Innovation Hub Section
    'innovation.badge': 'Innovation Hub',
    'innovation.title': 'Got a Big Idea?',
    'innovation.titleHighlight': "We'll Help You Build It.",
    'innovation.desc': "We're building Africa's next generation of tech leaders. If you're a young innovator with a vision that could transform communities, we want to hear from you. Get access to mentorship, resources, and the support you need to bring your idea to life.",
    'innovation.mentorship.title': 'Mentorship',
    'innovation.mentorship.desc': "1-on-1 guidance from industry experts who've been there",
    'innovation.resources.title': 'Resources',
    'innovation.resources.desc': 'Access to tools, training, and community support',
    'innovation.funding.title': 'Funding Guidance',
    'innovation.funding.desc': 'Learn how to pitch and connect with potential investors',
    'innovation.cta': 'Submit Your Idea',
    'innovation.footer': 'Join forward-thinking young African innovators already in our program',

    // Support Section
    'support.title': 'Support Our Mission',
    'support.desc': 'Help us empower more African youth with digital skills',
    'support.cta': 'Make a Donation',

    // Footer
    'footer.tagline': 'Empowering African youth through digital skills and mentorship.',
    'footer.quickLinks': 'Quick Links',
    'footer.courses': 'Courses',
    'footer.mentors': 'Mentors',
    'footer.pricing': 'Pricing',
    'footer.jobs': 'Jobs',
    'footer.legal': 'Legal',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
    'footer.connect': 'Connect',
    'footer.rights': 'All rights reserved.',

    // Auth
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.orContinueWith': 'or continue with',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.submit': 'Submit',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.continue': 'Continue',
    'common.learnMore': 'Learn More',
    'common.viewAll': 'View All',

    // Spectrogram Jobs
    'spectrogram.jobs.title': 'Your Path to a Career at Spectrogram Consulting',
    'spectrogram.jobs.subtitle': 'Complete your skills assessment through A Cloud For Everyone',
    'spectrogram.jobs.partnership': 'In Partnership',
    'spectrogram.jobs.startLearning': 'Start Learning Now',
    'spectrogram.jobs.step1.title': 'Create Your Account',
    'spectrogram.jobs.step1.desc': 'Sign up for free on A Cloud For Everyone',
    'spectrogram.jobs.step2.title': 'Complete a Course',
    'spectrogram.jobs.step2.desc': 'Learn essential digital skills from expert mentors',
    'spectrogram.jobs.step3.title': 'Pass the Quiz',
    'spectrogram.jobs.step3.desc': 'Demonstrate your understanding of the material',
    'spectrogram.jobs.step4.title': 'Submit Assignment',
    'spectrogram.jobs.step4.desc': 'Apply your skills in a practical assessment',
    'spectrogram.jobs.step5.title': 'Create Your Profile',
    'spectrogram.jobs.step5.desc': 'Join the Spectrogram Talent Network',
    'spectrogram.jobs.couponPlaceholder': 'Enter your coupon code',
    'spectrogram.jobs.apply': 'Apply Code & Start',
    'spectrogram.jobs.whyComplete': 'Why Complete This Assessment?',
    'spectrogram.jobs.benefit1': 'Demonstrate your commitment to professional growth',
    'spectrogram.jobs.benefit2': 'Gain verified digital skills that enhance your application',
    'spectrogram.jobs.benefit3': 'Join a network of talented professionals across Africa',
    'spectrogram.jobs.questions': 'Questions about your application?',
    'spectrogram.jobs.contact': 'Contact Spectrogram HR',
  },
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.partners': 'Partenaires',
    'nav.jobs': 'Emplois',
    'nav.pricing': 'Tarifs',
    'nav.careerCentre': 'Centre de Carrière',
    'nav.startups': 'Startups',
    'nav.account': 'Compte',
    'nav.dashboard': 'Tableau de Bord',
    'nav.browseCourses': 'Parcourir les Cours',
    'nav.manageCourses': 'Gérer les Cours',
    'nav.adminPanel': 'Panneau Admin',
    'nav.profileSettings': 'Paramètres du Profil',
    'nav.signOut': 'Déconnexion',

    // Hero Section
    'hero.title': 'Rejoignez plus de 300 apprenants et maîtrisez une compétence numérique qui booste votre carrière!',
    'hero.subtitle': "Aucune expérience requise | Tous profils | Apprenez à tout moment",
    'hero.context': 'Formation dispensée par des experts tech qui comprennent le contexte africain.',
    'hero.dashboard': 'Aller au Tableau de Bord',
    'hero.startLearning': 'COMMENCER À APPRENDRE',
    'hero.becomeMentor': 'DEVENIR MENTOR',

    // Features Section
    'features.title': 'Pourquoi Nous Choisir',
    'features.mentors.title': 'Nos Mentors',
    'features.mentors.desc': 'Apprenez auprès de professionnels expérimentés passionnés par le partage de leurs connaissances et l\'autonomisation de la prochaine génération',
    'features.courses.title': 'Explorer les Cours',
    'features.courses.desc': 'Formation axée sur les résultats conçue pour vous rendre opérationnel, pas seulement un apprentissage traditionnel mais des compétences pratiques menant à de vraies opportunités de carrière',
    'features.community.title': 'Rejoindre Notre Communauté',
    'features.community.desc': 'Rejoignez une communauté de soutien d\'apprenants et de mentors dédiée à l\'avancement des compétences numériques en Afrique',

    // Partners Section
    'partners.title': 'Nos Partenaires',

    // Innovation Hub Section
    'innovation.badge': 'Hub d\'Innovation',
    'innovation.title': 'Vous avez une grande idée?',
    'innovation.titleHighlight': 'Nous vous aiderons à la réaliser.',
    'innovation.desc': 'Nous construisons la prochaine génération de leaders technologiques africains. Si vous êtes un jeune innovateur avec une vision qui pourrait transformer les communautés, nous voulons vous entendre. Accédez au mentorat, aux ressources et au soutien dont vous avez besoin pour donner vie à votre idée.',
    'innovation.mentorship.title': 'Mentorat',
    'innovation.mentorship.desc': 'Accompagnement personnalisé par des experts de l\'industrie expérimentés',
    'innovation.resources.title': 'Ressources',
    'innovation.resources.desc': 'Accès aux outils, formations et soutien communautaire',
    'innovation.funding.title': 'Guide de Financement',
    'innovation.funding.desc': 'Apprenez à pitcher et connectez-vous avec des investisseurs potentiels',
    'innovation.cta': 'Soumettre Votre Idée',
    'innovation.footer': 'Rejoignez les jeunes innovateurs africains visionnaires déjà dans notre programme',

    // Support Section
    'support.title': 'Soutenez Notre Mission',
    'support.desc': 'Aidez-nous à autonomiser plus de jeunes africains avec des compétences numériques',
    'support.cta': 'Faire un Don',

    // Footer
    'footer.tagline': 'Autonomiser la jeunesse africaine grâce aux compétences numériques et au mentorat.',
    'footer.quickLinks': 'Liens Rapides',
    'footer.courses': 'Cours',
    'footer.mentors': 'Mentors',
    'footer.pricing': 'Tarifs',
    'footer.jobs': 'Emplois',
    'footer.legal': 'Légal',
    'footer.privacy': 'Politique de Confidentialité',
    'footer.terms': "Conditions d'Utilisation",
    'footer.connect': 'Connecter',
    'footer.rights': 'Tous droits réservés.',

    // Auth
    'auth.signIn': 'Se Connecter',
    'auth.signUp': "S'Inscrire",
    'auth.email': 'Email',
    'auth.password': 'Mot de Passe',
    'auth.forgotPassword': 'Mot de passe oublié?',
    'auth.noAccount': "Vous n'avez pas de compte?",
    'auth.hasAccount': 'Vous avez déjà un compte?',
    'auth.orContinueWith': 'ou continuer avec',

    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.submit': 'Soumettre',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.continue': 'Continuer',
    'common.learnMore': 'En Savoir Plus',
    'common.viewAll': 'Voir Tout',

    // Spectrogram Jobs
    'spectrogram.jobs.title': 'Votre Chemin vers une Carrière chez Spectrogram Consulting',
    'spectrogram.jobs.subtitle': 'Complétez votre évaluation des compétences via A Cloud For Everyone',
    'spectrogram.jobs.partnership': 'En Partenariat',
    'spectrogram.jobs.startLearning': 'Commencer à Apprendre',
    'spectrogram.jobs.step1.title': 'Créez Votre Compte',
    'spectrogram.jobs.step1.desc': 'Inscrivez-vous gratuitement sur A Cloud For Everyone',
    'spectrogram.jobs.step2.title': 'Complétez un Cours',
    'spectrogram.jobs.step2.desc': 'Apprenez les compétences numériques essentielles avec des mentors experts',
    'spectrogram.jobs.step3.title': 'Réussissez le Quiz',
    'spectrogram.jobs.step3.desc': 'Démontrez votre compréhension du contenu',
    'spectrogram.jobs.step4.title': 'Soumettez le Devoir',
    'spectrogram.jobs.step4.desc': 'Appliquez vos compétences dans une évaluation pratique',
    'spectrogram.jobs.step5.title': 'Créez Votre Profil',
    'spectrogram.jobs.step5.desc': 'Rejoignez le Réseau de Talents Spectrogram',
    'spectrogram.jobs.whyComplete': 'Pourquoi Compléter Cette Évaluation?',
    'spectrogram.jobs.benefit1': 'Démontrez votre engagement envers la croissance professionnelle',
    'spectrogram.jobs.benefit2': 'Acquérez des compétences numériques vérifiées qui renforcent votre candidature',
    'spectrogram.jobs.benefit3': 'Rejoignez un réseau de professionnels talentueux à travers l\'Afrique',
    'spectrogram.jobs.questions': 'Questions sur votre candidature?',
    'spectrogram.jobs.contact': 'Contacter les RH de Spectrogram',
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { countryCode } = useCountryFlag();
  
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('user_language');
    if (stored === 'en' || stored === 'fr') {
      return stored;
    }
    return 'en'; // Default, will be updated by geo detection
  });

  const [hasManuallySet, setHasManuallySet] = useState(() => {
    return localStorage.getItem('language_manually_set') === 'true';
  });

  // Geo-detection logic (only if not manually set)
  useEffect(() => {
    if (!hasManuallySet && countryCode) {
      const detectedLang = FRANCOPHONE_COUNTRIES.includes(countryCode) ? 'fr' : 'en';
      setLanguageState(detectedLang);
      localStorage.setItem('user_language', detectedLang);
    }
  }, [countryCode, hasManuallySet]);

  // Update HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('user_language', lang);
    localStorage.setItem('language_manually_set', 'true');
    setHasManuallySet(true);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
