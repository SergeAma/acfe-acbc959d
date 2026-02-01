import { useState, useEffect, useCallback } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import mentorWalkthroughThumbnail from '@/assets/mentor-walkthrough-thumbnail.png';

const MENTOR_VIDEO_WATCHED_KEY = 'acfe_mentor_video_watched';
// Use /view URL for opening in new tab (not /preview which is blocked in iframes)
const MENTOR_VIDEO_URL = 'https://drive.google.com/file/d/1eAYdL3_k_xZmmWSs80xNUBmhvcbBCyBM/view?usp=sharing';

export const MentorOnboardingVideo = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Check if mentor has already watched the video this session
    const hasWatched = localStorage.getItem(MENTOR_VIDEO_WATCHED_KEY) === 'true';
    
    if (!hasWatched && !hasChecked) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => {
        setShowDialog(true);
      }, 1000);
      
      setHasChecked(true);
      return () => clearTimeout(timer);
    }
    setHasChecked(true);
  }, [hasChecked]);

  const handleClose = useCallback(() => {
    localStorage.setItem(MENTOR_VIDEO_WATCHED_KEY, 'true');
    setShowDialog(false);
  }, []);

  const handleWatchLater = useCallback(() => {
    setShowDialog(false);
    // Don't mark as watched - will show again next session
  }, []);

  const handleOpenVideo = useCallback(() => {
    window.open(MENTOR_VIDEO_URL, '_blank', 'noopener,noreferrer');
    localStorage.setItem(MENTOR_VIDEO_WATCHED_KEY, 'true');
    setShowDialog(false);
  }, []);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
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
        
        {/* Thumbnail with play overlay */}
        <div className="relative w-full aspect-video bg-muted">
          <img
            src={mentorWalkthroughThumbnail}
            alt="Mentor onboarding video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
        
        <div className="p-4 flex flex-col sm:flex-row justify-end gap-3 border-t">
          <Button variant="ghost" onClick={handleWatchLater}>
            Watch Later
          </Button>
          <Button onClick={handleOpenVideo} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Watch Video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
