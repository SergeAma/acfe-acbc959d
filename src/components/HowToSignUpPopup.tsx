import { useState, useEffect, useCallback } from 'react';
import { X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const POPUP_WATCHED_KEY = 'acfe_signup_video_watched';
const INITIAL_DELAY_MS = 7000;
const REAPPEAR_DELAY_MS = 10000;

declare global {
  interface Window {
    Storylane?: {
      Play: (config: {
        type: string;
        demo_type: string;
        width: number;
        height: number;
        scale: string;
        demo_url: string;
        padding_bottom: string;
      }) => void;
    };
  }
}

export const HowToSignUpPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Storylane script once
  useEffect(() => {
    const existingScript = document.querySelector('script[src*="storylane.io"]');
    if (existingScript) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.storylane.io/js/v2/storylane.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount - it may be needed
    };
  }, []);

  // Handle initial appearance and reappearance logic
  useEffect(() => {
    const hasWatched = sessionStorage.getItem(POPUP_WATCHED_KEY) === 'true';
    
    if (hasWatched) {
      return; // User has watched, never show again this session
    }

    // Show popup after initial delay
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, INITIAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleWatch = useCallback(() => {
    // Mark as watched so it never reappears
    sessionStorage.setItem(POPUP_WATCHED_KEY, 'true');
    setShowPopup(false);

    // Trigger Storylane popup
    if (window.Storylane) {
      window.Storylane.Play({
        type: 'popup',
        demo_type: 'image',
        width: 2560,
        height: 1400,
        scale: '0.95',
        demo_url: 'https://app.storylane.io/demo/70er0b80dgh2?embed=popup',
        padding_bottom: 'calc(54.69% + 25px)'
      });
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPopup(false);

    // Reappear after 10 seconds if not watched
    const hasWatched = sessionStorage.getItem(POPUP_WATCHED_KEY) === 'true';
    if (!hasWatched) {
      setTimeout(() => {
        setShowPopup(true);
      }, REAPPEAR_DELAY_MS);
    }
  }, []);

  if (!showPopup || !scriptLoaded) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-4 sm:max-w-xs w-full sm:w-auto relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss popup"
        >
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
        </button>

        <div className="pr-8 sm:pr-6">
          <h3 className="font-semibold text-foreground mb-1 text-base sm:text-sm">
            New here?
          </h3>
          <p className="text-sm sm:text-xs text-muted-foreground mb-3">
            Watch a quick walkthrough on how to sign up and get started.
          </p>
          
          <Button
            onClick={handleWatch}
            size="sm"
            className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Play className="h-4 w-4" />
            How It Works
          </Button>
        </div>
      </div>
    </div>
  );
};
