import { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Play, AlertCircle, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface YouTubeLessonPlayerProps {
  videoUrl: string;
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
  userEmail?: string;
  onVideoComplete?: () => void;
}

// YouTube Iframe API types
interface YTPlayer {
  destroy: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  getIframe: () => HTMLIFrameElement;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars?: {
    autoplay?: number;
    mute?: number;
    controls?: number;
    modestbranding?: number;
    rel?: number;
    iv_load_policy?: number;
    fs?: number;
    disablekb?: number;
    playsinline?: number;
    enablejsapi?: number;
    origin?: string;
  };
  events?: {
    onReady?: (event: YTPlayerEvent) => void;
    onStateChange?: (event: YTPlayerEvent) => void;
  };
}

interface YTPlayerConstructor {
  new (elementId: string, options: YTPlayerOptions): YTPlayer;
}

interface YTNamespace {
  Player: YTPlayerConstructor;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

// Extend window for YouTube Iframe API
declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: () => void;
  }
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

// Load YouTube Iframe API script once
let ytApiLoaded = false;
let ytApiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (ytApiLoaded && window.YT?.Player) {
    return Promise.resolve();
  }
  
  if (ytApiLoadPromise) {
    return ytApiLoadPromise;
  }

  ytApiLoadPromise = new Promise((resolve) => {
    // Check if already loaded
    if (window.YT?.Player) {
      ytApiLoaded = true;
      resolve();
      return;
    }

    // Set callback before loading script
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      resolve();
    };

    // Check if script already exists
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return ytApiLoadPromise;
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
  const playerRef = useRef<YTPlayer | null>(null);
  const isMountedRef = useRef(true);
  const hasUnmutedRef = useRef(false);
  const [playerKey] = useState(() => `yt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteHint, setShowUnmuteHint] = useState(true);

  const videoId = getYouTubeVideoId(videoUrl);
  const canView = isAuthenticated && hasActiveSubscription;

  // Track mount status to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Unmute handler - triggered on first user interaction
  const handleUnmute = useCallback(() => {
    if (hasUnmutedRef.current || !playerRef.current) return;
    
    try {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      hasUnmutedRef.current = true;
      if (isMountedRef.current) {
        setIsMuted(false);
        setShowUnmuteHint(false);
      }
    } catch (e) {
      console.warn('Could not unmute video:', e);
    }
  }, []);

  // Create YouTube player using Iframe API
  const createPlayer = useCallback(async () => {
    if (!containerRef.current || !videoId || !isMountedRef.current) return;

    try {
      await loadYouTubeAPI();
    } catch (e) {
      console.error('Failed to load YouTube API:', e);
      return;
    }

    if (!isMountedRef.current || !containerRef.current) return;

    // Destroy existing player
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (e) {
        // Ignore
      }
      playerRef.current = null;
    }

    // Clear container
    try {
      containerRef.current.innerHTML = '';
    } catch (e) {
      return;
    }

    // Create player div
    const playerDiv = document.createElement('div');
    playerDiv.id = `youtube-player-${playerKey}`;
    containerRef.current.appendChild(playerDiv);

    // Initialize YouTube player with API
    playerRef.current = new window.YT.Player(playerDiv.id, {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        mute: 1, // Start muted for autoplay compliance
        controls: 1,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3, // Hide video annotations
        fs: 0, // Disable fullscreen button
        disablekb: 0, // Allow keyboard for seeking
        playsinline: 1,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          // Style the iframe - CRITICAL: z-index must stay at 1 so shields (z-index: 50) stay above
          const iframe = event.target.getIframe();
          if (iframe) {
            iframe.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; z-index: 1 !important; pointer-events: auto;';
            // Apply sandbox for security (blocks popups and top-navigation)
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
          }
        },
        onStateChange: (event) => {
          // Track video completion
          if (event.data === window.YT.PlayerState.ENDED && onVideoComplete) {
            onVideoComplete();
          }
        },
      },
    });
  }, [videoId, playerKey, onVideoComplete]);

  // Initialize player when component mounts or videoId changes
  useEffect(() => {
    if (!canView || !videoId) return;

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        createPlayer();
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [canView, videoId, createPlayer]);

  // Add global first-interaction listener for unmuting
  useEffect(() => {
    if (!canView) return;

    const handleFirstInteraction = () => {
      handleUnmute();
    };

    // Listen for various user interactions
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('scroll', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('scroll', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [canView, handleUnmute]);

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

  // Click suppression handler - blocks all clicks except in allowed zones
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickX = e.clientX - rect.left;
    const containerHeight = rect.height;
    const containerWidth = rect.width;
    
    // Define allowed zones (progress bar and volume control)
    const progressBarTop = containerHeight * 0.88; // Bottom 12% is progress bar area
    const volumeControlLeft = containerWidth * 0.02; // Left 8% for volume
    const volumeControlRight = containerWidth * 0.10;
    const volumeControlTop = containerHeight * 0.88;
    
    const isInProgressBar = clickY >= progressBarTop;
    const isInVolumeControl = (
      clickY >= volumeControlTop &&
      clickX >= volumeControlLeft &&
      clickX <= volumeControlRight
    );
    
    // Allow click only if in permitted zones
    if (!isInProgressBar && !isInVolumeControl) {
      e.preventDefault();
      e.stopPropagation();
      // Trigger unmute on any blocked click
      handleUnmute();
    }
  }, [handleUnmute]);

  return (
    <div 
      className="acfe-video-wrapper" 
      key={playerKey}
      onClick={handleContainerClick}
      onMouseDown={(e) => {
        // Additional safety: block mousedown on non-permitted areas
        const container = e.currentTarget;
        const rect = container.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const containerHeight = rect.height;
        if (clickY < containerHeight * 0.88) {
          e.preventDefault();
        }
      }}
    >
      {/* ===== COMPREHENSIVE SHIELD SYSTEM ===== */}
      
      {/* TOP SHIELD: Blocks title, channel, "Watch Later", share (top 35%) */}
      <div 
        className="acfe-shield-top"
        aria-hidden="true"
      />
      
      {/* CENTER SHIELD: Blocks video playback area clicks (middle section) */}
      <div 
        className="acfe-shield-center"
        aria-hidden="true"
      />
      
      {/* LEFT SIDE SHIELD: Blocks left edge interactions */}
      <div 
        className="acfe-shield-left"
        aria-hidden="true"
      />
      
      {/* RIGHT SIDE SHIELD: Blocks right edge interactions */}
      <div 
        className="acfe-shield-right"
        aria-hidden="true"
      />
      
      {/* BOTTOM-RIGHT SHIELD: Precisely covers YouTube logo */}
      <div 
        className="acfe-shield-bottom-right"
        aria-hidden="true"
      />
      
      {/* BOTTOM-LEFT SHIELD: Blocks "Watch on YouTube" text when paused */}
      <div 
        className="acfe-shield-bottom-left"
        aria-hidden="true"
      />
      
      {/* SETTINGS SHIELD: Blocks settings gear area */}
      <div 
        className="acfe-shield-settings"
        aria-hidden="true"
      />
      
      {/* ===== INTERACTION CUT-OUTS (pointer-events: none) ===== */}
      
      {/* PROGRESS BAR WINDOW: Only scrub bar is exposed */}
      <div 
        className="acfe-cutout-progress"
        aria-hidden="true"
      />
      
      {/* VOLUME CONTROL WINDOW: Only mute/unmute is exposed */}
      <div 
        className="acfe-cutout-volume"
        aria-hidden="true"
      />
      
      {/* ===== END SHIELD SYSTEM ===== */}
      
      {/* Unmute hint button - shows until user interacts */}
      {isMuted && showUnmuteHint && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleUnmute();
          }}
          className="acfe-unmute-hint"
          aria-label="Click to unmute video"
        >
          <Volume2 className="h-4 w-4 mr-2" />
          Click to unmute
        </button>
      )}
      
      {/* Watermark overlay - positioned above shields, non-interactive */}
      <div className="acfe-watermark">
        ACFE • Member Access Only • {maskedEmail}
      </div>
      
      {/* Container for YouTube player - React does NOT control children */}
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />
    </div>
  );
};
