import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVideoEmbedInfo, getProviderDisplayName } from '@/lib/video-utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Youtube, Video, Loader2, Lock, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Player from '@vimeo/player';

interface ExternalVideoPlayerProps {
  videoUrl: string;
  contentId?: string;
  enrollmentId?: string;
  userEmail?: string;
  hasActiveSubscription?: boolean;
  isPreviewMode?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onVideoComplete?: () => void;
}

// Load YouTube IFrame API
const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve();
      return;
    }
    
    const existingScript = document.getElementById('youtube-iframe-api');
    if (existingScript) {
      const checkYT = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkYT);
          resolve();
        }
      }, 100);
      return;
    }

    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    
    (window as any).onYouTubeIframeAPIReady = () => {
      resolve();
    };
    
    document.head.appendChild(tag);
  });
};

export const ExternalVideoPlayer = ({ 
  videoUrl, 
  contentId, 
  enrollmentId,
  userEmail,
  hasActiveSubscription = false,
  isPreviewMode = false,
  onTimeUpdate,
  onVideoComplete,
}: ExternalVideoPlayerProps) => {
  const navigate = useNavigate();
  
  // Allow access in preview mode OR with active subscription
  const canView = isPreviewMode || hasActiveSubscription;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const progressSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredComplete = useRef(false);
  const isMountedRef = useRef(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number>(0);
  
  // Generate a unique key for each content to force fresh DOM
  const playerKey = useMemo(() => `player-${contentId || 'default'}-${Date.now()}`, [contentId]);

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset completion trigger when content changes
  useEffect(() => {
    hasTriggeredComplete.current = false;
    setIsLoading(true);
    setHasRestoredPosition(false);
  }, [contentId]);

  const embedInfo = getVideoEmbedInfo(videoUrl);

  // Save progress to database
  const saveProgress = useCallback(async (currentTime: number, duration: number) => {
    if (!enrollmentId || !contentId || duration === 0) return;

    const watchPercentage = Math.round((currentTime / duration) * 100);

    try {
      await supabase
        .from('video_progress')
        .upsert({
          enrollment_id: enrollmentId,
          content_id: contentId,
          current_time_seconds: Math.floor(currentTime),
          total_duration_seconds: Math.floor(duration),
          watch_percentage: watchPercentage,
          last_watched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'enrollment_id,content_id'
        });

      // Update learner analytics
      await supabase
        .from('learner_analytics')
        .upsert({
          enrollment_id: enrollmentId,
          content_id: contentId,
          total_time_spent_seconds: Math.floor(currentTime),
          last_position_seconds: Math.floor(currentTime),
          completed: watchPercentage >= 90,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'enrollment_id,content_id'
        });
    } catch (error) {
      console.error('Failed to save video progress:', error);
    }
  }, [enrollmentId, contentId]);

  // Load saved progress
  useEffect(() => {
    const loadProgress = async () => {
      if (!enrollmentId || !contentId) return;

      const { data } = await supabase
        .from('video_progress')
        .select('current_time_seconds')
        .eq('enrollment_id', enrollmentId)
        .eq('content_id', contentId)
        .maybeSingle();

      if (data?.current_time_seconds && data.current_time_seconds > 5) {
        setSavedProgress(data.current_time_seconds);
      }
    };

    loadProgress();
  }, [enrollmentId, contentId]);

  // Initialize YouTube player
  useEffect(() => {
    if (embedInfo.provider !== 'youtube' || !containerRef.current) return;

    let ytPlayer: any = null;
    let localMounted = true;

    const initYouTube = async () => {
      await loadYouTubeAPI();
      
      if (!localMounted || !isMountedRef.current || !containerRef.current) return;

      // Extract video ID from embed URL
      const videoIdMatch = embedInfo.embedUrl?.match(/embed\/([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch?.[1];
      
      if (!videoId) {
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      // Create a div for the player
      const playerDiv = document.createElement('div');
      playerDiv.id = `yt-player-${contentId || Date.now()}`;
      
      // Clear container safely - check if container still exists and has children
      if (containerRef.current) {
        try {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(playerDiv);
        } catch (e) {
          // Container was removed from DOM during operation
          return;
        }
      } else {
        return;
      }

      try {
        ytPlayer = new (window as any).YT.Player(playerDiv.id, {
          videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            controls: 1,
            fs: 0, // Disable fullscreen
            disablekb: 1, // Disable keyboard shortcuts
            start: savedProgress > 5 ? Math.floor(savedProgress) : 0,
          },
          events: {
            onReady: () => {
              if (!localMounted || !isMountedRef.current) return;
              setIsLoading(false);
              setHasRestoredPosition(true);
              playerRef.current = ytPlayer;
            },
            onStateChange: (event: any) => {
              if (!localMounted || !isMountedRef.current) return;
              // YT.PlayerState.PLAYING = 1, YT.PlayerState.ENDED = 0
              if (event.data === 1) {
                // Start periodic progress saving
                if (progressSaveInterval.current) {
                  clearInterval(progressSaveInterval.current);
                }
                progressSaveInterval.current = setInterval(() => {
                  if (!localMounted || !isMountedRef.current) {
                    if (progressSaveInterval.current) clearInterval(progressSaveInterval.current);
                    return;
                  }
                  if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                    try {
                      const currentTime = ytPlayer.getCurrentTime();
                      const duration = ytPlayer.getDuration();
                      saveProgress(currentTime, duration);
                      onTimeUpdate?.(currentTime, duration);
                      
                      // Auto-complete at 95%
                      if (duration > 0 && !hasTriggeredComplete.current) {
                        const watchPercentage = (currentTime / duration) * 100;
                        if (watchPercentage >= 95) {
                          hasTriggeredComplete.current = true;
                          onVideoComplete?.();
                        }
                      }
                    } catch (e) {
                      // Player was destroyed
                    }
                  }
                }, 5000);
              } else if (event.data === 0) {
                // Video ended
                if (progressSaveInterval.current) {
                  clearInterval(progressSaveInterval.current);
                }
                if (!hasTriggeredComplete.current) {
                  hasTriggeredComplete.current = true;
                  onVideoComplete?.();
                }
              } else {
                // Save on pause
                if (progressSaveInterval.current) {
                  clearInterval(progressSaveInterval.current);
                }
                if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
                  try {
                    const currentTime = ytPlayer.getCurrentTime();
                    const duration = ytPlayer.getDuration();
                    saveProgress(currentTime, duration);
                  } catch (e) {
                    // Player was destroyed
                  }
                }
              }
            },
          },
        });
      } catch (e) {
        console.error('Failed to create YouTube player:', e);
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    initYouTube();

    return () => {
      localMounted = false;
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
        progressSaveInterval.current = null;
      }
      if (ytPlayer) {
        try {
          if (typeof ytPlayer.destroy === 'function') {
            ytPlayer.destroy();
          }
        } catch (e) {
          // Ignore destroy errors during unmount
        }
        ytPlayer = null;
      }
      playerRef.current = null;
    };
  }, [embedInfo.provider, embedInfo.embedUrl, savedProgress, saveProgress, onTimeUpdate, contentId, onVideoComplete]);

  // Initialize Vimeo player
  useEffect(() => {
    if (embedInfo.provider !== 'vimeo' || !containerRef.current || !embedInfo.embedUrl) return;

    let vimeoPlayer: Player | null = null;
    let localMounted = true;

    const initVimeo = async () => {
      if (!containerRef.current || !localMounted || !isMountedRef.current) return;

      // Create iframe for Vimeo
      const iframe = document.createElement('iframe');
      iframe.src = embedInfo.embedUrl!;
      iframe.className = 'absolute inset-0 w-full h-full';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      
      // Clear container safely
      if (containerRef.current) {
        try {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(iframe);
        } catch (e) {
          return;
        }
      } else {
        return;
      }

      try {
        vimeoPlayer = new Player(iframe);
        playerRef.current = vimeoPlayer;

        vimeoPlayer.on('loaded', async () => {
          if (!localMounted || !isMountedRef.current) return;
          setIsLoading(false);
          
          // Restore position
          if (savedProgress > 5 && !hasRestoredPosition) {
            try {
              await vimeoPlayer?.setCurrentTime(savedProgress);
              if (isMountedRef.current) setHasRestoredPosition(true);
            } catch (e) {
              // Player was destroyed
            }
          }
        });

        vimeoPlayer.on('play', () => {
          if (!localMounted || !isMountedRef.current) return;
          if (progressSaveInterval.current) {
            clearInterval(progressSaveInterval.current);
          }
          progressSaveInterval.current = setInterval(async () => {
            if (!localMounted || !isMountedRef.current || !vimeoPlayer) {
              if (progressSaveInterval.current) clearInterval(progressSaveInterval.current);
              return;
            }
            try {
              const currentTime = await vimeoPlayer.getCurrentTime();
              const duration = await vimeoPlayer.getDuration();
              saveProgress(currentTime, duration);
              onTimeUpdate?.(currentTime, duration);
              
              // Auto-complete at 95%
              if (duration > 0 && !hasTriggeredComplete.current) {
                const watchPercentage = (currentTime / duration) * 100;
                if (watchPercentage >= 95) {
                  hasTriggeredComplete.current = true;
                  onVideoComplete?.();
                }
              }
            } catch (e) {
              // Player was destroyed
            }
          }, 5000);
        });

        vimeoPlayer.on('pause', async () => {
          if (!localMounted || !isMountedRef.current) return;
          if (progressSaveInterval.current) {
            clearInterval(progressSaveInterval.current);
          }
          if (vimeoPlayer) {
            try {
              const currentTime = await vimeoPlayer.getCurrentTime();
              const duration = await vimeoPlayer.getDuration();
              saveProgress(currentTime, duration);
            } catch (e) {
              // Player was destroyed
            }
          }
        });

        vimeoPlayer.on('ended', async () => {
          if (!localMounted || !isMountedRef.current) return;
          if (progressSaveInterval.current) {
            clearInterval(progressSaveInterval.current);
          }
          if (vimeoPlayer) {
            try {
              const duration = await vimeoPlayer.getDuration();
              saveProgress(duration, duration);
            } catch (e) {
              // Player was destroyed
            }
          }
          if (!hasTriggeredComplete.current) {
            hasTriggeredComplete.current = true;
            onVideoComplete?.();
          }
        });
      } catch (error) {
        console.error('Failed to initialize Vimeo player:', error);
        if (isMountedRef.current) setIsLoading(false);
      }
    };

    initVimeo();

    return () => {
      localMounted = false;
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
        progressSaveInterval.current = null;
      }
      if (vimeoPlayer) {
        try {
          vimeoPlayer.destroy();
        } catch (e) {
          // Ignore destroy errors during unmount
        }
        vimeoPlayer = null;
      }
      playerRef.current = null;
    };
  }, [embedInfo.provider, embedInfo.embedUrl, savedProgress, hasRestoredPosition, saveProgress, onTimeUpdate, onVideoComplete]);

  // Fallback for other providers (no tracking)
  useEffect(() => {
    if (embedInfo.provider === 'youtube' || embedInfo.provider === 'vimeo') return;
    if (!containerRef.current || !embedInfo.embedUrl) return;

    const iframe = document.createElement('iframe');
    iframe.src = embedInfo.embedUrl;
    iframe.className = 'absolute inset-0 w-full h-full';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.title = 'Video player';
    
    // Clear container safely
    if (containerRef.current) {
      try {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(iframe);
      } catch (e) {
        return;
      }
    }
    setIsLoading(false);
  }, [embedInfo.provider, embedInfo.embedUrl]);

  if (!embedInfo.embedUrl) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Unable to load video</p>
      </div>
    );
  }

  // Show subscription required message if not allowed to view
  if (!canView) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 mb-4">
            <Lock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Subscription Required</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Please subscribe to access this lesson content.
          </p>
          <Button 
            onClick={() => navigate('/pricing')}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            View Subscription Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getProviderIcon = () => {
    switch (embedInfo.provider) {
      case 'youtube':
        return <Youtube className="h-3.5 w-3.5" />;
      default:
        return <ExternalLink className="h-3.5 w-3.5" />;
    }
  };

  // Mask email for watermark (show first 3 chars + domain)
  const maskedEmail = userEmail 
    ? `${userEmail.substring(0, 3)}***@${userEmail.split('@')[1] || 'member'}`
    : 'Member';

  return (
    <div className="space-y-2" key={playerKey}>
      <div className="acfe-video-wrapper">
        {/* Watermark overlay - positioned above iframe, does not intercept clicks */}
        <div className="acfe-watermark">
          ACFE • Member Access Only • {maskedEmail}
        </div>
        {/* Loading spinner - positioned outside the container to avoid React reconciliation issues */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        {/* Container for manually managed iframes - React does NOT control children */}
        <div 
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'auto' }}
        />
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="gap-1.5 text-xs">
          {getProviderIcon()}
          {getProviderDisplayName(embedInfo.provider)}
        </Badge>
        {savedProgress > 0 && !hasRestoredPosition && (
          <span className="text-xs text-muted-foreground">
            Resuming from {Math.floor(savedProgress / 60)}:{String(Math.floor(savedProgress % 60)).padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  );
};