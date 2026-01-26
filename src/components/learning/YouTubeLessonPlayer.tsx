import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Play, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface YouTubeLessonPlayerProps {
  videoUrl: string;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  onVideoComplete?: () => void;
}

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export const YouTubeLessonPlayer = ({
  videoUrl,
  isAuthenticated,
  hasActiveSubscription,
  onVideoComplete,
}: YouTubeLessonPlayerProps) => {
  const navigate = useNavigate();
  const playerRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  const videoId = getYouTubeVideoId(videoUrl);
  const canView = isAuthenticated && hasActiveSubscription;

  // Handle message from YouTube iframe for video completion tracking
  useEffect(() => {
    if (!canView || !videoId) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        // YouTube sends state changes - state 0 = ended
        if (data.event === 'onStateChange' && data.info === 0) {
          onVideoComplete?.();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [canView, videoId, onVideoComplete]);

  if (!videoId) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
        <p>Invalid video URL</p>
      </div>
    );
  }

  // Show subscription required message
  if (!canView) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 mb-4">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Subscription Required</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {!isAuthenticated 
              ? "Please sign in to access this lesson."
              : "Please subscribe to access this lesson content."
            }
          </p>
          <Button 
            onClick={() => navigate(!isAuthenticated ? '/auth' : '/pricing')}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {!isAuthenticated ? 'Sign In' : 'View Subscription Plans'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show embedded YouTube player for subscribed users
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        ref={playerRef}
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="YouTube video player"
      />
    </div>
  );
};
