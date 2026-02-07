const HERO_IMAGE = '/images/hero-intro-static.jpg';

export const HeroVideoBackground = () => {
  return (
    <div className="relative w-full h-[calc(100vh-5rem)] min-h-[400px] overflow-hidden">
      {/* Blurred background for desktop gaps */}
      <img
        src={HERO_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60 hidden md:block"
      />
      
      {/* Main hero image - object-cover on mobile, object-contain on desktop */}
      <img
        src={HERO_IMAGE}
        alt="African students"
        className="relative w-full h-full object-cover md:object-contain md:mx-auto z-10"
      />
    </div>
  );
};
