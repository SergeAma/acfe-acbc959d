import { useState, useRef, useEffect, useCallback } from 'react';

const heroVideos = [
  '/videos/hero-background.mp4',
  '/videos/cape-town.mp4',
  '/videos/lagos.mp4',
  '/videos/johannesburg.mp4',
];

// Static fallback images extracted from videos (first frame approximation)
const fallbackImages = [
  '/videos/hero-background.mp4#t=0.1',
  '/videos/cape-town.mp4#t=0.1',
  '/videos/lagos.mp4#t=0.1',
  '/videos/johannesburg.mp4#t=0.1',
];

export const HeroVideoBackground = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [showNext, setShowNext] = useState(false);
  const [canPlayVideo, setCanPlayVideo] = useState(true);
  const [videosReady, setVideosReady] = useState<boolean[]>([false, false, false, false]);
  
  const currentVideoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if video can play (network/device capability)
  useEffect(() => {
    const checkVideoCapability = async () => {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.src = heroVideos[0];
        
        const canPlay = await Promise.race([
          new Promise<boolean>((resolve) => {
            video.oncanplaythrough = () => resolve(true);
            video.onerror = () => resolve(false);
          }),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
        ]);
        
        setCanPlayVideo(canPlay);
        video.remove();
      } catch {
        setCanPlayVideo(false);
      }
    };
    
    checkVideoCapability();
  }, []);

  // Handle video ready state
  const handleVideoCanPlay = useCallback((index: number) => {
    setVideosReady(prev => {
      const newState = [...prev];
      newState[index] = true;
      return newState;
    });
  }, []);

  // Transition to next video
  const transitionToNext = useCallback(() => {
    if (!canPlayVideo) {
      // For static images, just swap immediately with a fade
      setShowNext(true);
      
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(nextIndex);
        setNextIndex((nextIndex + 1) % heroVideos.length);
        setShowNext(false);
      }, 1500);
      return;
    }

    // Start playing next video before transition
    if (nextVideoRef.current) {
      nextVideoRef.current.currentTime = 0;
      nextVideoRef.current.play().catch(() => {
        // If play fails, fallback to static mode
        setCanPlayVideo(false);
      });
    }

    setShowNext(true);

    transitionTimeoutRef.current = setTimeout(() => {
      // Swap indices
      const newCurrent = nextIndex;
      const newNext = (nextIndex + 1) % heroVideos.length;
      
      setCurrentIndex(newCurrent);
      setNextIndex(newNext);
      setShowNext(false);

      // Restart current video (now the old next)
      if (currentVideoRef.current) {
        currentVideoRef.current.currentTime = 0;
        currentVideoRef.current.play().catch(() => {});
      }
    }, 1500);
  }, [nextIndex, canPlayVideo]);

  // Handle video ended - trigger transition
  const handleVideoEnded = useCallback(() => {
    transitionToNext();
  }, [transitionToNext]);

  // Fallback rotation for static images or if video doesn't trigger ended
  useEffect(() => {
    if (!canPlayVideo) {
      rotationIntervalRef.current = setInterval(() => {
        transitionToNext();
      }, 8000); // Rotate every 8 seconds for static images
      
      return () => {
        if (rotationIntervalRef.current) {
          clearInterval(rotationIntervalRef.current);
        }
      };
    }
  }, [canPlayVideo, transitionToNext]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
      }
    };
  }, []);

  // Auto-start first video
  useEffect(() => {
    if (canPlayVideo && currentVideoRef.current && videosReady[currentIndex]) {
      currentVideoRef.current.play().catch(() => {
        setCanPlayVideo(false);
      });
    }
  }, [canPlayVideo, videosReady, currentIndex]);

  if (!canPlayVideo) {
    // Static image fallback mode
    return (
      <>
        {/* Current static image */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1500 ease-in-out ${
            showNext ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            backgroundImage: `url('${heroVideos[currentIndex]}')`,
            backgroundColor: '#1a1a1a',
          }}
        >
          <video
            src={heroVideos[currentIndex]}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            poster={fallbackImages[currentIndex]}
          />
        </div>
        
        {/* Next static image */}
        <div
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1500 ease-in-out ${
            showNext ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url('${heroVideos[nextIndex]}')`,
            backgroundColor: '#1a1a1a',
          }}
        >
          <video
            src={heroVideos[nextIndex]}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
            poster={fallbackImages[nextIndex]}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Current video */}
      <video
        ref={currentVideoRef}
        src={heroVideos[currentIndex]}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1500 ease-in-out ${
          showNext ? 'opacity-0' : 'opacity-100'
        }`}
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={() => handleVideoCanPlay(currentIndex)}
        onEnded={handleVideoEnded}
        onError={() => setCanPlayVideo(false)}
        style={{ backgroundColor: '#1a1a1a' }}
      />
      
      {/* Next video (preloaded) */}
      <video
        ref={nextVideoRef}
        src={heroVideos[nextIndex]}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1500 ease-in-out ${
          showNext ? 'opacity-100' : 'opacity-0'
        }`}
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={() => handleVideoCanPlay(nextIndex)}
        onError={() => setCanPlayVideo(false)}
        style={{ backgroundColor: '#1a1a1a' }}
      />
      
      {/* Loading state - dark background to prevent white flash */}
      {!videosReady[currentIndex] && (
        <div className="absolute inset-0 bg-foreground/90" />
      )}
    </>
  );
};
