import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// Simple device fingerprint based on available browser data
const generateFingerprint = (): string => {
  const nav = navigator;
  const screen = window.screen;
  const data = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset()
  ].join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

export const useSessionTracking = (userId: string | undefined) => {
  const { toast } = useToast();

  const trackSession = useCallback(async () => {
    if (!userId) return;

    const sessionToken = sessionStorage.getItem('session_token') || crypto.randomUUID();
    sessionStorage.setItem('session_token', sessionToken);

    const fingerprint = generateFingerprint();
    const countryCode = JSON.parse(sessionStorage.getItem('user_geo_data') || '{}').countryCode || null;

    try {
      // Check for concurrent sessions (different fingerprints)
      const { data: existingSessions } = await supabase
        .from('user_sessions')
        .select('id, device_fingerprint, last_active_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .neq('session_token', sessionToken);

      // If there are active sessions with different fingerprints from last 5 minutes
      const recentSessions = existingSessions?.filter(session => {
        const lastActive = new Date(session.last_active_at);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return lastActive > fiveMinutesAgo && session.device_fingerprint !== fingerprint;
      }) || [];

      if (recentSessions.length > 0) {
        // Detected concurrent login from different device
        toast({
          title: "Security Notice",
          description: "Your account is being used from another device. If this wasn't you, please change your password.",
          variant: "destructive",
        });
      }

      // Upsert current session
      await supabase
        .from('user_sessions')
        .upsert({
          user_id: userId,
          session_token: sessionToken,
          ip_address: null, // Would need server-side to get real IP
          user_agent: navigator.userAgent,
          country_code: countryCode,
          device_fingerprint: fingerprint,
          last_active_at: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'id'
        });
    } catch (error) {
      console.error('Session tracking error:', error);
    }
  }, [userId, toast]);

  useEffect(() => {
    trackSession();
    
    // Update last_active every 2 minutes
    const interval = setInterval(trackSession, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [trackSession]);

  // Deactivate session on logout/unmount
  const deactivateSession = useCallback(async () => {
    const sessionToken = sessionStorage.getItem('session_token');
    if (!sessionToken || !userId) return;

    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken)
      .eq('user_id', userId);
  }, [userId]);

  return { deactivateSession };
};
