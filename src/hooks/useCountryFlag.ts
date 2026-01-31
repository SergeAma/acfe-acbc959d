import { useState, useEffect, useCallback } from 'react';
import { COUNTRIES } from '@/data/countries';

interface GeoData {
  countryCode: string;
  countryName: string;
  source: 'profile' | 'ip' | 'locale' | 'fallback';
}

// Convert country code to flag emoji
const countryCodeToFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Get country code from browser locale
const getLocaleCountry = (): string | null => {
  try {
    const locale = navigator.language || (navigator as any).userLanguage;
    if (locale && locale.includes('-')) {
      const parts = locale.split('-');
      const countryPart = parts[parts.length - 1].toUpperCase();
      // Validate it's a known country code
      if (COUNTRIES.find(c => c.code === countryPart)) {
        return countryPart;
      }
    }
  } catch {
    // Silent fail
  }
  return null;
};

// Find country by name (for profile.country which stores full name)
const findCountryByName = (name: string): typeof COUNTRIES[0] | undefined => {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
};

// Cache key includes version to invalidate stale caches
const CACHE_KEY = 'user_geo_data_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedGeoData extends GeoData {
  timestamp: number;
}

export const useCountryFlag = (profileCountry?: string | null) => {
  const [geoData, setGeoData] = useState<GeoData | null>(() => {
    // Check for valid cached data
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: CachedGeoData = JSON.parse(cached);
        // Only use cache if it's still valid and not a fallback
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          // If cache is from IP or locale, it's valid
          if (parsed.source === 'ip' || parsed.source === 'locale') {
            return parsed;
          }
        }
        // Clear stale cache
        sessionStorage.removeItem(CACHE_KEY);
      }
    } catch {
      sessionStorage.removeItem(CACHE_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Memoized IP fetch function
  const fetchGeoFromIP = useCallback(async (): Promise<GeoData | null> => {
    try {
      // Using ipapi.co with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn('[GeoFlag] IP lookup failed with status:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      // Validate response has expected fields
      if (!data.country_code || !data.country_name) {
        console.warn('[GeoFlag] IP lookup returned invalid data:', data);
        return null;
      }
      
      return {
        countryCode: data.country_code,
        countryName: data.country_name,
        source: 'ip',
      };
    } catch (error) {
      // Log but don't throw - this is expected to fail sometimes
      console.warn('[GeoFlag] IP lookup error:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }, []);

  useEffect(() => {
    const resolveCountry = async () => {
      setLoading(true);
      
      // PRIORITY 1: Use profile country if available (logged-in user)
      if (profileCountry) {
        const country = findCountryByName(profileCountry);
        if (country) {
          const geo: GeoData = {
            countryCode: country.code,
            countryName: country.name,
            source: 'profile',
          };
          console.log('[GeoFlag] Using profile country:', geo.countryName);
          setGeoData(geo);
          setLoading(false);
          // Don't cache profile-based data (it changes on login/logout)
          return;
        }
      }
      
      // PRIORITY 2: Use valid cached IP/locale data
      if (geoData && (geoData.source === 'ip' || geoData.source === 'locale')) {
        console.log('[GeoFlag] Using cached data from:', geoData.source);
        setLoading(false);
        return;
      }
      
      // PRIORITY 3: Fetch from IP
      const ipGeo = await fetchGeoFromIP();
      if (ipGeo) {
        console.log('[GeoFlag] Resolved from IP:', ipGeo.countryName);
        setGeoData(ipGeo);
        // Cache with timestamp
        const cached: CachedGeoData = { ...ipGeo, timestamp: Date.now() };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        setLoading(false);
        return;
      }
      
      // PRIORITY 4: Use browser locale
      const localeCode = getLocaleCountry();
      if (localeCode) {
        const country = COUNTRIES.find(c => c.code === localeCode);
        if (country) {
          const geo: GeoData = {
            countryCode: country.code,
            countryName: country.name,
            source: 'locale',
          };
          console.log('[GeoFlag] Using browser locale:', geo.countryName);
          setGeoData(geo);
          const cached: CachedGeoData = { ...geo, timestamp: Date.now() };
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
          setLoading(false);
          return;
        }
      }
      
      // PRIORITY 5: Global fallback (explicitly logged)
      console.warn('[GeoFlag] All detection methods failed, using fallback: South Africa');
      const fallbackGeo: GeoData = { 
        countryCode: 'ZA', 
        countryName: 'South Africa',
        source: 'fallback',
      };
      setGeoData(fallbackGeo);
      // Don't cache fallback - try again next session
      setLoading(false);
    };

    resolveCountry();
  }, [profileCountry, geoData, fetchGeoFromIP]);

  return {
    countryCode: geoData?.countryCode || 'ZA',
    countryName: geoData?.countryName || 'South Africa',
    flag: geoData ? countryCodeToFlag(geoData.countryCode) : '🇿🇦',
    source: geoData?.source || 'fallback',
    loading,
  };
};
