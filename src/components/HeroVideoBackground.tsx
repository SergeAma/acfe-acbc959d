const HERO_IMAGE = '/images/hero-intro-static.jpg';

export const HeroVideoBackground = () => {
  return (
    <div className="w-full">
      <img
        src={HERO_IMAGE}
        alt="African students"
        className="w-full h-auto object-contain"
      />
    </div>
  );
};
