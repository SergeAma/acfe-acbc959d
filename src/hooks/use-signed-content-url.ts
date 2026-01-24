import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getVideoEmbedInfo } from '@/lib/video-utils';

interface UseSignedContentUrlOptions {
  contentId: string;
  originalUrl: string | null;
  urlType: 'video' | 'file' | 'audio';
  enabled?: boolean;
}

interface UseSignedContentUrlResult {
  signedUrl: string | null;
  isLoading: boolean;
  error: string | null;
  isExternal: boolean;
  refetch: () => Promise<void>;
}

export const useSignedContentUrl = ({
  contentId,
  originalUrl,
  urlType,
  enabled = true,
}: UseSignedContentUrlOptions): UseSignedContentUrlResult => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExternal, setIsExternal] = useState(false);

  const fetchSignedUrl = useCallback(async () => {
    if (!contentId || !originalUrl || !enabled) {
      return;
    }

    // Check if it's an external URL (YouTube, Vimeo, etc.) - use directly
    const embedInfo = getVideoEmbedInfo(originalUrl);
    if (embedInfo.isExternal) {
      setSignedUrl(originalUrl);
      setIsExternal(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-signed-content-url', {
        body: { contentId, urlType },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get signed URL');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSignedUrl(data.signedUrl);
      setIsExternal(data.isExternal || false);
    } catch (err: any) {
      console.error('Error fetching signed URL:', err);
      setError(err.message || 'Failed to load content');
      // Fallback to original URL if edge function fails (for backward compatibility)
      setSignedUrl(originalUrl);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, originalUrl, urlType, enabled]);

  useEffect(() => {
    fetchSignedUrl();
  }, [fetchSignedUrl]);

  // Refresh the signed URL every 25 minutes (before the 30-minute expiry)
  useEffect(() => {
    if (!enabled || !contentId || !originalUrl || isExternal) return;

    const refreshInterval = setInterval(() => {
      fetchSignedUrl();
    }, 25 * 60 * 1000); // 25 minutes

    return () => clearInterval(refreshInterval);
  }, [enabled, contentId, originalUrl, isExternal, fetchSignedUrl]);

  return {
    signedUrl,
    isLoading,
    error,
    isExternal,
    refetch: fetchSignedUrl,
  };
};
