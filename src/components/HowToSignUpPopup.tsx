import { useState, useEffect, useCallback } from 'react';
import { X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import walkthroughThumbnail from '@/assets/walkthrough-thumbnail.png';

const POPUP_WATCHED_KEY = 'acfe_signup_video_watched';
const POPUP_SHOW_COUNT_KEY = 'acfe_popup_show_count';
const MAX_POPUP_SHOWS = 2;
const INITIAL_DELAY_MS = 7000;
const REAPPEAR_DELAY_MS = 10000;
const WALKTHROUGH_VIDEO_URL = 'https://www.youtube.com/embed/xhy28OBYLGQ?rel=0&modestbranding=1';

export const HowToSignUpPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);

  useEffect(() => {
    const hasWatched = sessionStorage.getItem(POPUP_WATCHED_KEY) === 'true';
    const showCount = parseInt(sessionStorage.getItem(POPUP_SHOW_COUNT_KEY) || '0', 10);
    
    if (hasWatched || showCount >= MAX_POPUP_SHOWS) {
      return;
    }

    const timer = setTimeout(() => {
      const currentCount = parseInt(sessionStorage.getItem(POPUP_SHOW_COUNT_KEY) || '0', 10);
      if (currentCount < MAX_POPUP_SHOWS) {
        sessionStorage.setItem(POPUP_SHOW_COUNT_KEY, String(currentCount + 1));
        setShowPopup(true);
      }
    }, INITIAL_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleWatch = useCallback(() => {
    sessionStorage.setItem(POPUP_WATCHED_KEY, 'true');
    setShowPopup(false);
    setShowVideoDialog(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowPopup(false);

    const hasWatched = sessionStorage.getItem(POPUP_WATCHED_KEY) === 'true';
    const showCount = parseInt(sessionStorage.getItem(POPUP_SHOW_COUNT_KEY) || '0', 10);
    
    if (!hasWatched && showCount < MAX_POPUP_SHOWS) {
      setTimeout(() => {
        const currentCount = parseInt(sessionStorage.getItem(POPUP_SHOW_COUNT_KEY) || '0', 10);
        if (currentCount < MAX_POPUP_SHOWS) {
          sessionStorage.setItem(POPUP_SHOW_COUNT_KEY, String(currentCount + 1));
          setShowPopup(true);
        }
      }, REAPPEAR_DELAY_MS);
    }
  }, []);

  return (
    <>
      {showPopup && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-4 sm:max-w-xs w-full sm:w-auto relative">
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
              <p className="text-sm sm:text-xs text-muted-foreground mb-2">
                Watch a quick walkthrough on how to sign up and get started.
              </p>
              
              <button
                onClick={handleWatch}
                className="relative w-full aspect-video rounded-lg overflow-hidden mb-3 group cursor-pointer border border-border hover:border-primary/50 transition-colors"
              >
                <img
                  src={walkthroughThumbnail}
                  alt="How to sign up walkthrough preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Play className="h-5 w-5 sm:h-4 sm:w-4 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              </button>
              
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
      )}

      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Welcome to ACFE: Platform Walkthrough</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video bg-black">
            <iframe
              src={WALKTHROUGH_VIDEO_URL}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="ACFE Platform Walkthrough"
            />
          </div>
          <div className="p-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Learn how to navigate the platform and make the most of your learning journey.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
