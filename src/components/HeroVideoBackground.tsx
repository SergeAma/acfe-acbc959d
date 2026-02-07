const HERO_IMAGE = '/images/hero-intro-static.jpg';

export const HeroVideoBackground = () => {
  return (
    <div className="w-full h-full bg-[hsl(30,15%,12%)] flex items-center justify-center">
      <img
        src={HERO_IMAGE}
        alt="African students"
        className="w-full h-full object-contain"
      />
    </div>
  );
};
