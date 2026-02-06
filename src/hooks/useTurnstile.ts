import { useState, useEffect, useRef, useCallback } from 'react';

const TURNSTILE_SITE_KEY = '0x4AAAAAACKo5KDG-bJ1_43d';

// Turnstile types are already declared in DonationDialog.tsx
// We use the existing Window.turnstile interface

interface UseTurnstileOptions {
  /** Whether the CAPTCHA should be active (e.g., dialog open) */
  enabled?: boolean;
  /** Theme for the widget */
  theme?: 'light' | 'dark' | 'auto';
  /** Callback when CAPTCHA fails */
  onError?: () => void;
}

interface UseTurnstileReturn {
  /** The CAPTCHA verification token (null if not verified) */
  token: string | null;
  /** Whether the CAPTCHA widget is ready */
  isReady: boolean;
  /** Whether the CAPTCHA is currently loading */
  isLoading: boolean;
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Reset the CAPTCHA widget */
  reset: () => void;
}

/**
 * Custom hook for Cloudflare Turnstile CAPTCHA integration.
 * 
 * Usage:
 * ```tsx
 * const { token, isReady, containerRef, reset } = useTurnstile({ enabled: dialogOpen });
 * 
 * // In your JSX:
 * <div ref={containerRef} className="flex justify-center" />
 * 
 * // In your submit handler:
 * if (!token) {
 *   toast.error('Please complete the security verification');
 *   return;
 * }
 * 
 * // After error, reset the CAPTCHA:
 * reset();
 * ```
 */
export function useTurnstile(options: UseTurnstileOptions = {}): UseTurnstileReturn {
  const { enabled = true, theme = 'auto', onError } = options;
  
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // Widget may have been removed
      }
    }
    setToken(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Cleanup when disabled
      setToken(null);
      setIsReady(false);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget may already be removed
        }
        widgetIdRef.current = null;
      }
      return;
    }

    const initTurnstile = () => {
      if (!containerRef.current || widgetIdRef.current) return;
      
      if (window.turnstile) {
        setIsLoading(true);
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: (newToken: string) => {
              setToken(newToken);
              setIsLoading(false);
              setIsReady(true);
            },
            'error-callback': () => {
              setToken(null);
              setIsLoading(false);
              onError?.();
            },
            theme: theme as 'light' | 'dark' | undefined,
          } as Parameters<typeof window.turnstile.render>[1]);
          setIsReady(true);
        } catch {
          setIsLoading(false);
        }
      }
    };

    // Script is preloaded in index.html - just init when ready
    if (window.turnstile) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(initTurnstile);
    } else {
      // Fallback: wait for script to load
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          initTurnstile();
        }
      }, 50);
      
      // Cleanup interval after 5 seconds
      const timeoutId = setTimeout(() => clearInterval(checkInterval), 5000);
      
      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget may already be removed
        }
        widgetIdRef.current = null;
      }
    };
  }, [enabled, theme, onError]);

  return {
    token,
    isReady,
    isLoading,
    containerRef,
    reset,
  };
}

export { TURNSTILE_SITE_KEY };
