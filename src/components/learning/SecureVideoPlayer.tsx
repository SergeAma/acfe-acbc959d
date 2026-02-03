import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Bookmark,
  SkipBack,
  SkipForward,
  Check,
} from 'lucide-react';

interface SecureVideoPlayerProps {
  videoUrl: string;
  contentId: string;
  enrollmentId: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onBookmark?: (timestamp: number) => void;
  onVideoComplete?: () => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const VIDEO_QUALITIES = [
  { label: 'Auto', value: 'auto' },
  { label: '1080p', value: '1080' },
  { label: '720p', value: '720' },
  { label: '480p', value: '480' },
  { label: '360p', value: '360' },
];

export const SecureVideoPlayer = ({
  videoUrl,
  contentId,
  enrollmentId,
  onTimeUpdate,
  onBookmark,
  onVideoComplete,
}: SecureVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredComplete = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRestoredPosition, setHasRestoredPosition] = useState(false);
  const [videoQuality, setVideoQuality] = useState('auto');

  // Reset completion trigger when content changes
  useEffect(() => {
    hasTriggeredComplete.current = false;
  }, [contentId]);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const { data } = await supabase
        .from('video_progress')
        .select('current_time_seconds, playback_speed')
        .eq('enrollment_id', enrollmentId)
        .eq('content_id', contentId)
        .maybeSingle();

      if (data && videoRef.current && !hasRestoredPosition) {
        // Resume from saved position if more than 5 seconds in
        if (data.current_time_seconds > 5) {
          videoRef.current.currentTime = data.current_time_seconds;
        }
        if (data.playback_speed) {
          setPlaybackSpeed(Number(data.playback_speed));
          videoRef.current.playbackRate = Number(data.playback_speed);
        }
        setHasRestoredPosition(true);
      }
    };

    if (enrollmentId && contentId) {
      loadProgress();
    }
  }, [enrollmentId, contentId, hasRestoredPosition]);

  // Save progress periodically
  const saveProgress = useCallback(async () => {
    if (!videoRef.current || !enrollmentId || !contentId) return;

    const video = videoRef.current;
    const watchPercentage = video.duration > 0 
      ? Math.round((video.currentTime / video.duration) * 100) 
      : 0;

    await supabase
      .from('video_progress')
      .upsert({
        enrollment_id: enrollmentId,
        content_id: contentId,
        current_time_seconds: Math.floor(video.currentTime),
        total_duration_seconds: Math.floor(video.duration),
        playback_speed: playbackSpeed,
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
        total_time_spent_seconds: Math.floor(video.currentTime),
        last_position_seconds: Math.floor(video.currentTime),
        completed: watchPercentage >= 90,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'enrollment_id,content_id'
      });
  }, [enrollmentId, contentId, playbackSpeed]);

  // Set up periodic save
  useEffect(() => {
    if (isPlaying) {
      progressSaveInterval.current = setInterval(saveProgress, 10000); // Save every 10 seconds
    } else {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
      saveProgress(); // Save when pausing
    }

    return () => {
      if (progressSaveInterval.current) {
        clearInterval(progressSaveInterval.current);
      }
    };
  }, [isPlaying, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [saveProgress]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
      
      // Auto-complete when video reaches 95%
      if (video.duration > 0 && !hasTriggeredComplete.current) {
        const watchPercentage = (video.currentTime / video.duration) * 100;
        if (watchPercentage >= 95) {
          hasTriggeredComplete.current = true;
          onVideoComplete?.();
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 1;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleQualityChange = (quality: string) => {
    setVideoQuality(quality);
    // Note: Actual quality switching requires HLS/DASH streaming with multiple quality sources
    // This sets the preference for when streaming is available
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error enabling fullscreen:', err);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error exiting fullscreen:', err);
      }
    }
  };

  const handleBookmark = () => {
    if (videoRef.current) {
      onBookmark?.(Math.floor(videoRef.current.currentTime));
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds)
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseenter', () => setShowControls(true));
      container.addEventListener('mouseleave', () => isPlaying && setShowControls(false));
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseenter', () => setShowControls(true));
        container.removeEventListener('mouseleave', () => setShowControls(false));
      }
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <TooltipProvider>
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
        onContextMenu={(e) => e.preventDefault()} // Disable right-click
      >
        {/* Video Element - No download, no controls */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            saveProgress();
          }}
          onClick={handlePlayPause}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          playsInline
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && !isLoading && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
            aria-label="Play video"
          >
            <div className="w-20 h-20 flex items-center justify-center bg-primary/90 rounded-full">
              <Play className="h-8 w-8 text-primary-foreground ml-1" />
            </div>
          </button>
        )}

        {/* Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress Bar */}
          <div className="mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
              </Tooltip>

              {/* Skip Backward */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skip(-10)}
                    className="text-white hover:bg-white/20"
                    aria-label="Skip 10 seconds back"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip 10s back</TooltipContent>
              </Tooltip>

              {/* Skip Forward */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => skip(10)}
                    className="text-white hover:bg-white/20"
                    aria-label="Skip 10 seconds forward"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Skip 10s forward</TooltipContent>
              </Tooltip>

              {/* Volume */}
              <div className="flex items-center gap-2 group/volume">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
                </Tooltip>
                <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-200">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Display */}
              <span className="text-sm ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Bookmark */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBookmark}
                    className="text-white hover:bg-white/20"
                    aria-label="Bookmark this moment"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bookmark this moment</TooltipContent>
              </Tooltip>

              {/* Playback Speed */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20 px-2"
                      >
                        {playbackSpeed}x
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Playback speed</TooltipContent>
                </Tooltip>
                <DropdownMenuContent>
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={playbackSpeed === speed ? 'bg-accent' : ''}
                    >
                      {speed}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Quality</DropdownMenuLabel>
                  {VIDEO_QUALITIES.map((quality) => (
                    <DropdownMenuItem
                      key={quality.value}
                      onClick={() => handleQualityChange(quality.value)}
                      className="flex items-center justify-between"
                    >
                      {quality.label}
                      {videoQuality === quality.value && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Speed</DropdownMenuLabel>
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className="flex items-center justify-between"
                    >
                      {speed}x
                      {playbackSpeed === speed && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fullscreen */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="text-white hover:bg-white/20"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
