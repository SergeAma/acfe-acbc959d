import { useState, useEffect } from 'react';

interface GeoData {
  countryCode: string;
  countryName: string;
}

// Convert country code to flag emoji
const countryCodeToFlag = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export const useCountryFlag = () => {
  const [geoData, setGeoData] = useState<GeoData | null>(() => {
    const cached = sessionStorage.getItem('user_geo_data');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!geoData);

  useEffect(() => {
    if (geoData) return;

    const fetchGeoData = async () => {
      try {
        // Using a free IP geolocation API
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) throw new Error('Geo fetch failed');
        
        const data = await response.json();
        const geo: GeoData = {
          countryCode: data.country_code || 'ZA',
          countryName: data.country_name || 'South Africa'
        };
        
        sessionStorage.setItem('user_geo_data', JSON.stringify(geo));
        setGeoData(geo);
      } catch (error) {
        // Default to South Africa on error
        const defaultGeo: GeoData = { countryCode: 'ZA', countryName: 'South Africa' };
        setGeoData(defaultGeo);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, [geoData]);

  return {
    countryCode: geoData?.countryCode || 'ZA',
    countryName: geoData?.countryName || 'South Africa',
    flag: geoData ? countryCodeToFlag(geoData.countryCode) : '🇿🇦',
    loading
  };
};
