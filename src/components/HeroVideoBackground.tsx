import { useState, useEffect, useRef, useCallback } from 'react';

const heroVideos = [
  '/videos/hero-background.mp4',
  '/videos/cape-town.mp4',
  '/videos/lagos.mp4',
  '/videos/johannesburg.mp4',
];

export const HeroVideoBackground = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInViewport, setIsInViewport] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Interval-based crossfade
  useEffect(() => {
    if (isMobile) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroVideos.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isMobile]);

  // Handle video load events
  const handleLoadedData = useCallback((index: number) => {
    if (index === 0 && !isLoaded) {
      setIsLoaded(true);
    }
  }, [isLoaded]);

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

  // Mobile: show static background image
  if (isMobile) {
    return (
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full overflow-hidden bg-[hsl(30,15%,12%)]"
        style={{
          backgroundImage: 'url(/videos/hero-background.mp4#t=0.1)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay for mobile static background */}
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full overflow-hidden bg-[hsl(30,15%,12%)] transition-opacity duration-500 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {heroVideos.map((src, index) => (
        <video
          key={src}
          ref={(el) => { videoRefs.current[index] = el; }}
          className={`hero-video absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out pointer-events-none ${
            index === activeIndex ? 'opacity-100 z-[2]' : 'opacity-0 z-[1]'
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          onLoadedData={() => handleLoadedData(index)}
          onCanPlay={(e) => handleCanPlay(e.currentTarget)}
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}
    </div>
  );
};
