import { useEffect, useRef, useState, useCallback } from 'react';
import { getVideoEmbedInfo, getProviderDisplayName } from '@/lib/video-utils';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Youtube, Video, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Player from '@vimeo/player';

interface ExternalVideoPlayerProps {
  videoUrl: string;
  contentId?: string;
  enrollmentId?: string;
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
  onTimeUpdate,
  onVideoComplete,
}: ExternalVideoPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const progressSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredComplete = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number>(0);

  // Reset completion trigger when content changes
  useEffect(() => {
    hasTriggeredComplete.current = false;
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
    let isMounted = true;

    const initYouTube = async () => {
      await loadYouTubeAPI();
      
      if (!isMounted || !containerRef.current) return;

      // Extract video ID from embed URL
      const videoIdMatch = embedInfo.embedUrl?.match(/embed\/([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch?.[1];
      
      if (!videoId) {
        setIsLoading(false);
        return;
      }

      // Create a div for the player
      const playerDiv = document.createElement('div');
      playerDiv.id = `yt-player-${contentId || Date.now()}`;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(playerDiv);

      ytPlayer = new (window as any).YT.Player(playerDiv.id, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          start: savedProgress > 5 ? Math.floor(savedProgress) : 0,
        },
        events: {
          onReady: () => {
            setIsLoading(false);
            setHasRestoredPosition(true);
            playerRef.current = ytPlayer;
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1, YT.PlayerState.ENDED = 0
            if (event.data === 1) {
              // Start periodic progress saving
              if (progressSaveInterval.current) {
                clearInterval(progressSaveInterval.current);
              }
              progressSaveInterval.current = setInterval(() => {
                if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
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
                const currentTime = ytPlayer.getCurrentTime();
                const duration = ytPlayer.getDuration();
                saveProgress(currentTime, duration);
              }
            }
          },
        },
      });
    };

    initYouTube();

    return () => {
      isMounted = false;
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        ytPlayer.destroy();
      }
    };
  }, [embedInfo.provider, embedInfo.embedUrl, savedProgress, saveProgress, onTimeUpdate, contentId]);

  // Initialize Vimeo player
  useEffect(() => {
    if (embedInfo.provider !== 'vimeo' || !containerRef.current || !embedInfo.embedUrl) return;

    let vimeoPlayer: Player | null = null;
    let isMounted = true;

    const initVimeo = async () => {
      if (!containerRef.current) return;

      // Create iframe for Vimeo
      const iframe = document.createElement('iframe');
      iframe.src = embedInfo.embedUrl!;
      iframe.className = 'absolute inset-0 w-full h-full';
      iframe.allow = 'autoplay; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true;
      
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(iframe);

      try {
        vimeoPlayer = new Player(iframe);
        playerRef.current = vimeoPlayer;

        vimeoPlayer.on('loaded', async () => {
          if (!isMounted) return;
          setIsLoading(false);
          
          // Restore position
          if (savedProgress > 5 && !hasRestoredPosition) {
            await vimeoPlayer?.setCurrentTime(savedProgress);
            setHasRestoredPosition(true);
          }
        });

        vimeoPlayer.on('play', () => {
          if (progressSaveInterval.current) {
            clearInterval(progressSaveInterval.current);
          }
          progressSaveInterval.current = setInterval(async () => {
            if (vimeoPlayer) {
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
            }
          }, 5000);
        });

        vimeoPlayer.on('pause', async () => {
          if (progressSaveInterval.current) {
            clearInterval(progressSaveInterval.current);
          }
          if (vimeoPlayer) {
            const currentTime = await vimeoPlayer.getCurrentTime();
            const duration = await vimeoPlayer.getDuration();
            saveProgress(currentTime, duration);
          }
        });

        vimeoPlayer.on('ended', async () => {
          if (progressSaveInterval.current) {
            clearInterval(progressSaveInterval.current);
          }
          if (vimeoPlayer) {
            const duration = await vimeoPlayer.getDuration();
            saveProgress(duration, duration);
          }
          if (!hasTriggeredComplete.current) {
            hasTriggeredComplete.current = true;
            onVideoComplete?.();
          }
        });
      } catch (error) {
        console.error('Failed to initialize Vimeo player:', error);
        setIsLoading(false);
      }
    };

    initVimeo();

    return () => {
      isMounted = false;
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      if (vimeoPlayer) {
        vimeoPlayer.destroy();
      }
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
    
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(iframe);
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

  const getProviderIcon = () => {
    switch (embedInfo.provider) {
      case 'youtube':
        return <Youtube className="h-3.5 w-3.5" />;
      default:
        return <ExternalLink className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-2">
      <div 
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
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
