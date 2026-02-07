import { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

// Static intro image shown first, then videos cycle
const INTRO_IMAGE = '/images/hero-intro-static.jpg';
const INTRO_DURATION = 5000; // 5 seconds for static image

const heroMedia = [
  { video: '/videos/hero-background.mp4', poster: '/images/hero-poster-main.jpg' },
  { video: '/videos/cape-town.mp4', poster: '/images/hero-poster-capetown.jpg' },
  { video: '/videos/lagos.mp4', poster: '/images/hero-poster-lagos.jpg' },
  { video: '/videos/johannesburg.mp4', poster: '/images/hero-poster-johannesburg.jpg' },
];

export const HeroVideoBackground = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videosLoaded, setVideosLoaded] = useState<boolean[]>(new Array(heroMedia.length).fill(false));
  const isMobile = useIsMobile();
  const [isInViewport, setIsInViewport] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Intersection Observer for viewport visibility
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pause/play videos based on viewport visibility
  useEffect(() => {
    if (isMobile) return;

    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (isInViewport && index === activeIndex) {
        video.play().catch(() => {});
      } else if (!isInViewport) {
        video.pause();
      }
    });
  }, [isInViewport, activeIndex, isMobile]);

  // Show intro image for 5 seconds, then start video carousel
  useEffect(() => {
    const introTimer = setTimeout(() => {
      setShowIntro(false);
    }, INTRO_DURATION);

    return () => clearTimeout(introTimer);
  }, []);

  // Interval-based crossfade (only starts after intro ends)
  useEffect(() => {
    if (showIntro) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroMedia.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [showIntro]);

  // Handle video load events
  const handleLoadedData = useCallback((index: number) => {
    setVideosLoaded(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  }, []);

  const handleCanPlay = useCallback((video: HTMLVideoElement) => {
    if (isInViewport) {
      video.play().catch(() => {
        // Retry on first user interaction if autoplay fails
        const retryPlay = () => {
          video.play().catch(() => {});
          document.removeEventListener('click', retryPlay);
        };
        document.addEventListener('click', retryPlay, { once: true });
      });
    }
  }, [isInViewport]);

  // Mobile: show static background image with crossfade
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full overflow-hidden bg-[hsl(30,15%,12%)]"
      >
        {/* Intro static image */}
        <div
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
            showIntro ? 'opacity-100 z-[2]' : 'opacity-0 z-0'
          }`}
          style={{ backgroundImage: `url(${INTRO_IMAGE})` }}
        />
        {/* Regular poster carousel */}
        {heroMedia.map((media, index) => (
          <div
            key={media.poster}
            className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
              !showIntro && index === activeIndex ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
            }`}
            style={{ backgroundImage: `url(${media.poster})` }}
          />
        ))}
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-[hsl(30,15%,12%)]"
    >
      {/* Intro static image - shown first for 5 seconds */}
      <div
        className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ${
          showIntro ? 'opacity-100 z-[3]' : 'opacity-0 z-0'
        }`}
        style={{ backgroundImage: `url(${INTRO_IMAGE})` }}
      />

      {/* Poster images as immediate background */}
      {heroMedia.map((media, index) => (
        <div
          key={`poster-${media.poster}`}
          className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-500 ${
            !showIntro && index === activeIndex && !videosLoaded[index] ? 'opacity-100 z-[1]' : 'opacity-0 z-0'
          }`}
          style={{ backgroundImage: `url(${media.poster})` }}
        />
      ))}
      
      {/* Videos with crossfade - only show after intro ends */}
      {heroMedia.map((media, index) => (
        <video
          key={media.video}
          ref={(el) => { videoRefs.current[index] = el; }}
          className={`hero-video absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out pointer-events-none ${
            !showIntro && index === activeIndex && videosLoaded[index] ? 'opacity-100 z-[2]' : 'opacity-0 z-[1]'
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={media.poster}
          disablePictureInPicture
          onLoadedData={() => handleLoadedData(index)}
          onCanPlay={(e) => handleCanPlay(e.currentTarget)}
        >
          <source src={media.video} type="video/mp4" />
        </video>
      ))}
    </div>
  );
};
