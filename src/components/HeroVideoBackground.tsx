const HERO_IMAGE = '/images/hero-intro-static.jpg';

export const HeroVideoBackground = () => {
  return (
    <div className="relative w-full h-[calc(100vh-5rem)] min-h-[400px] max-h-[800px] overflow-hidden">
      {/* Layer 1: Blurred background - fills entire viewport */}
      <div 
        className="absolute inset-0 blur-xl scale-110 bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
      />
      
      {/* Layer 2: Sharp main image - contained with proper aspect ratio */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <img
          src={HERO_IMAGE}
          alt="African students"
          className="h-full w-auto max-w-full object-contain"
        />
      </div>
    </div>
  );
};
