import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCountryFlag } from '@/hooks/useCountryFlag';
import { translations, Language } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Francophone African countries
const FRANCOPHONE_COUNTRIES = [
  'SN', 'CI', 'CM', 'CD', 'CG', 'BJ', 'TG', 'BF', 'ML', 'NE', 'TD', 'GA', 'GN', 'CF', 'MG', 'DJ', 'KM', 'RW', 'BI', 'SC', 'MU', 'MA', 'DZ', 'TN',
];

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const { countryCode } = useCountryFlag();
  
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('user_language');
    if (stored === 'en' || stored === 'fr') return stored;
    return 'en';
  });

  const [hasManuallySet, setHasManuallySet] = useState(() => {
    return localStorage.getItem('language_manually_set') === 'true';
  });

  useEffect(() => {
    if (!hasManuallySet && countryCode) {
      const detectedLang = FRANCOPHONE_COUNTRIES.includes(countryCode) ? 'fr' : 'en';
      setLanguageState(detectedLang);
      localStorage.setItem('user_language', detectedLang);
    }
  }, [countryCode, hasManuallySet]);

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
    return translations[language][key] || translations['en'][key] || key;
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
