import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MENTOR_VIDEO_WATCHED_KEY = 'acfe_mentor_video_watched';
const MENTOR_VIDEO_URL = 'https://www.youtube.com/embed/xhy28OBYLGQ?rel=0&modestbranding=1';

export const MentorOnboardingVideo = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const hasWatched = localStorage.getItem(MENTOR_VIDEO_WATCHED_KEY) === 'true';
    
    if (!hasWatched && !hasChecked) {
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, 1000);
      
      setHasChecked(true);
      return () => clearTimeout(timer);
    }
    setHasChecked(true);
  }, [hasChecked]);

  const handleClose = () => {
    localStorage.setItem(MENTOR_VIDEO_WATCHED_KEY, 'true');
    setShowDialog(false);
  };

  const handleWatchLater = () => {
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Welcome! Here's how to get started as a mentor
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Watch this quick video to learn how to create courses and connect with students.
          </p>
        </DialogHeader>
        
        <div className="relative w-full aspect-video bg-muted">
          <iframe
            src={MENTOR_VIDEO_URL}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Mentor Onboarding Video"
          />
        </div>
        
        <div className="p-4 flex justify-end gap-3 border-t">
          <Button variant="ghost" onClick={handleWatchLater}>
            Watch Later
          </Button>
          <Button onClick={handleClose}>
            <Play className="h-4 w-4 mr-2" />
            Got it, let's start!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
