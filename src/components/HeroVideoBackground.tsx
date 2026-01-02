import { useState, useEffect } from 'react';

const heroVideos = [
  '/videos/hero-background.mp4',
  '/videos/cape-town.mp4',
  '/videos/lagos.mp4',
  '/videos/johannesburg.mp4',
];

export const HeroVideoBackground = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Simple interval-based crossfade - just toggle active class
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroVideos.length);
    }, 8000); // 8 seconds per video

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {heroVideos.map((src, index) => (
        <video
          key={src}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
            index === activeIndex ? 'opacity-100 z-[2]' : 'opacity-0 z-[1]'
          }`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}
    </div>
  );
};
