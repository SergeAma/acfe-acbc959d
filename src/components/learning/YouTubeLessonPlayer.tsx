import { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Play, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface YouTubeLessonPlayerProps {
  videoUrl: string;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  userEmail?: string;
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
  userEmail,
  onVideoComplete,
}: YouTubeLessonPlayerProps) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isMountedRef = useRef(true);
  const [playerKey] = useState(() => `yt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const videoId = getYouTubeVideoId(videoUrl);
  const canView = isAuthenticated && hasActiveSubscription;

  // Track mount status to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Create iframe manually to avoid React DOM reconciliation issues with YouTube
  const createIframe = useCallback(() => {
    if (!containerRef.current || !videoId || !isMountedRef.current) return;

    // Remove existing iframe safely
    if (iframeRef.current) {
      try {
        if (iframeRef.current.parentNode) {
          iframeRef.current.parentNode.removeChild(iframeRef.current);
        }
      } catch (e) {
        // Ignore - node may already be removed
      }
      iframeRef.current = null;
    }

    // Clear container safely
    try {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    } catch (e) {
      // Container may have been removed
      return;
    }

    // Create new iframe element manually (outside React's control)
    const iframe = document.createElement('iframe');
    // Note: Removed enablejsapi=1 to prevent YouTube API from modifying DOM
    iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&fs=0&disablekb=1`;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'encrypted-media');
    iframe.setAttribute('allowfullscreen', 'false');
    iframe.setAttribute('title', 'ACFE Lesson Video');
    iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;';

    try {
      if (containerRef.current && isMountedRef.current) {
        containerRef.current.appendChild(iframe);
        iframeRef.current = iframe;
      }
    } catch (e) {
      // Container may have been removed during operation
    }
  }, [videoId]);

  // Initialize iframe when component mounts or videoId changes
  useEffect(() => {
    if (!canView || !videoId) return;

    // Small delay to ensure container is ready
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        createIframe();
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup iframe on unmount
      if (iframeRef.current) {
        try {
          if (iframeRef.current.parentNode) {
            iframeRef.current.parentNode.removeChild(iframeRef.current);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        iframeRef.current = null;
      }
    };
  }, [canView, videoId, createIframe]);

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

  // Mask email for watermark (show first 3 chars + domain)
  const maskedEmail = userEmail 
    ? `${userEmail.substring(0, 3)}***@${userEmail.split('@')[1] || 'member'}`
    : 'Member';

  return (
    <div className="acfe-video-wrapper" key={playerKey}>
      {/* Watermark overlay - positioned above iframe, does not intercept clicks */}
      <div className="acfe-watermark">
        ACFE • Member Access Only • {maskedEmail}
      </div>
      {/* Container for manually managed iframe - React does NOT control children */}
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'auto' }}
      />
    </div>
  );
};
