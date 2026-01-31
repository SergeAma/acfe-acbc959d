import { useMemo } from 'react';
import { COUNTRIES } from '@/data/countries';

/**
 * Simple, deterministic country flag hook.
 * 
 * Priority:
 * 1. Logged-in user profile country (passed as prop)
 * 2. Browser locale (navigator.language)
 * 3. Globe icon (no country default)
 * 
 * NO IP lookups. NO external APIs. NO async operations.
 */

// Convert country code to flag emoji
const countryCodeToFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Parse country code from browser locale (e.g., "en-KE" → "KE")
const getLocaleCountryCode = (): string | null => {
  try {
    const locale = navigator.language || (navigator as any).userLanguage;
    if (locale && locale.includes('-')) {
      const parts = locale.split('-');
      const countryPart = parts[parts.length - 1].toUpperCase();
      // Validate against known countries
      if (COUNTRIES.find(c => c.code === countryPart)) {
        return countryPart;
      }
    }
  } catch {
    // Silent fail - return null
  }
  return null;
};

// Find country by name (profile.country stores full name)
const findCountryByName = (name: string): typeof COUNTRIES[0] | undefined => {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
};

interface CountryFlagResult {
  countryCode: string | null;
  countryName: string | null;
  flag: string;
  source: 'profile' | 'locale' | 'none';
}

export const useCountryFlag = (profileCountry?: string | null): CountryFlagResult => {
  return useMemo(() => {
    // PRIORITY 1: User profile country (logged-in users)
    if (profileCountry) {
      const country = findCountryByName(profileCountry);
      if (country) {
        return {
          countryCode: country.code,
          countryName: country.name,
          flag: countryCodeToFlag(country.code),
          source: 'profile' as const,
        };
      }
    }

    // PRIORITY 2: Browser locale
    const localeCode = getLocaleCountryCode();
    if (localeCode) {
      const country = COUNTRIES.find(c => c.code === localeCode);
      if (country) {
        return {
          countryCode: country.code,
          countryName: country.name,
          flag: countryCodeToFlag(country.code),
          source: 'locale' as const,
        };
      }
    }

    // PRIORITY 3: No country - show globe
    return {
      countryCode: null,
      countryName: null,
      flag: '🌍',
      source: 'none' as const,
    };
  }, [profileCountry]);
};
