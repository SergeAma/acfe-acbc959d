const HERO_IMAGE = '/images/hero-intro-static.jpg';

export const HeroVideoBackground = () => {
  return (
    <div className="w-full h-[calc(100vh-4rem)] min-h-[400px] max-h-[800px]">
      <img
        src={HERO_IMAGE}
        alt="African students"
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
};
