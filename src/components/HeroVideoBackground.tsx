const HERO_IMAGE = '/images/hero-intro-static.jpg';

export const HeroVideoBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full">
      <img
        src={HERO_IMAGE}
        alt="African students"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};
