const HERO_IMAGE = '/images/hero-intro-static.jpg';

export const HeroVideoBackground = () => {
  return (
    <div className="w-full max-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden">
      <img
        src={HERO_IMAGE}
        alt="African students"
        className="w-full h-auto max-h-[calc(100vh-5rem)] object-contain"
      />
    </div>
  );
};
