import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

interface TranslationOverride {
  language: string;
  translation_key: string;
  translation_value: string;
}

export const useTranslations = () => {
  const { language, t: baseT } = useLanguage();

  // Fetch admin overrides from database
  const { data: overrides = [] } = useQuery({
    queryKey: ['translation-overrides', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translation_overrides')
        .select('language, translation_key, translation_value')
        .eq('language', language);

      if (error) {
        console.error('Error fetching translation overrides:', error);
        return [];
      }

      return data as TranslationOverride[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create a map of overrides for quick lookup
  const overrideMap = new Map(
    overrides.map(o => [o.translation_key, o.translation_value])
  );

  // Enhanced translation function that checks overrides first
  const t = (key: string): string => {
    // Check overrides first
    if (overrideMap.has(key)) {
      return overrideMap.get(key)!;
    }
    // Fall back to base translations
    return baseT(key);
  };

  return { t, language };
};

// Hook for fetching all translation keys for admin editor
export const useAllTranslationKeys = () => {
  return useQuery({
    queryKey: ['all-translation-keys'],
    queryFn: async () => {
      // Get all keys from the static translations
      const allKeys = Object.keys(translations.en);
      
      // Fetch current overrides
      const { data: overrides, error } = await supabase
        .from('translation_overrides')
        .select('*')
        .order('translation_key');

      if (error) {
        console.error('Error fetching overrides:', error);
      }

      return {
        keys: allKeys,
        overrides: overrides || [],
      };
    },
  });
};

// Hook to save a translation override
export const useSaveTranslationOverride = () => {
  const saveOverride = async (
    language: 'en' | 'fr',
    key: string,
    value: string
  ) => {
    const { data, error } = await supabase
      .from('translation_overrides')
      .upsert(
        {
          language,
          translation_key: key,
          translation_value: value,
        },
        {
          onConflict: 'language,translation_key',
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteOverride = async (language: 'en' | 'fr', key: string) => {
    const { error } = await supabase
      .from('translation_overrides')
      .delete()
      .eq('language', language)
      .eq('translation_key', key);

    if (error) throw error;
  };

  return { saveOverride, deleteOverride };
};
