import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, Globe, Award, FileText, TrendingUp, Lightbulb } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TechNewsSection } from '@/components/TechNewsSection';
import { HeroVideoBackground } from '@/components/HeroVideoBackground';
import { SupportSection } from '@/components/SupportSection';
import eastAfricanUniversityLogo from '@/assets/east-african-university-logo.png';
import johannesburgLogo from '@/assets/johannesburg-logo.png';
import spectrogramLogo from '@/assets/spectrogram-logo.png';
import learnProjectLogo from '@/assets/learn-project-logo.png';

export const Landing = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-end pb-28">
        <HeroVideoBackground />
        <div className="absolute inset-0 bg-black/50" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 text-white leading-tight flex flex-wrap justify-center gap-x-2 gap-y-1">
              {t('hero.title').split(' ').map((word, index) => (
                <span key={index} className="bg-black/20 backdrop-blur-[2px] px-1 rounded">
                  {word}
                </span>
              ))}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-3 sm:mb-4 leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <p className="text-sm sm:text-base text-white mb-6 sm:mb-8 inline-block bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg">
              {t('hero.context')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              {user ? (
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                    {t('hero.dashboard')}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth?mode=signup&role=student" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                      {t('hero.startLearning')}
                    </Button>
                  </Link>
                  <Link to="/auth?mode=signup&role=mentor" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                      {t('hero.becomeMentor')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('features.title')}</h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto items-stretch">
            <Link to="/mentors" className="h-full">
              <Card className="border-2 hover:border-primary transition-colors cursor-pointer group h-full">
                <CardContent className="pt-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{t('features.mentors.title')}</h3>
                  <p className="text-muted-foreground flex-1">{t('features.mentors.desc')}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/courses" className="h-full">
              <Card className="border-2 hover:border-secondary transition-colors cursor-pointer group h-full">
                <CardContent className="pt-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
                    <BookOpen className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-secondary transition-colors">{t('features.courses.title')}</h3>
                  <p className="text-muted-foreground flex-1">{t('features.courses.desc')}</p>
                </CardContent>
              </Card>
            </Link>

            <Link to="/jobs" className="h-full">
              <Card className="border-2 hover:border-accent transition-colors cursor-pointer group h-full">
                <CardContent className="pt-6 h-full flex flex-col">
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <Globe className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors">{t('features.community.title')}</h3>
                  <p className="text-muted-foreground flex-1">{t('features.community.desc')}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-10 sm:py-12 bg-muted">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('partners.title')}</h2>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-8 md:gap-12 max-w-5xl mx-auto">
            <a href="https://spectrogramconsulting.com/home" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={spectrogramLogo} alt="Spectrogram Consulting" className="h-12 sm:h-16 w-auto object-contain" />
            </a>
            <a href="https://teau.ac.ke" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={eastAfricanUniversityLogo} alt="The East African University" className="h-16 sm:h-24 w-auto object-contain" />
            </a>
            <a href="https://www.facebook.com/Thehonestgroupfundation/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={johannesburgLogo} alt="Johannesburg" className="h-16 sm:h-24 w-auto object-contain" />
            </a>
            <a href="https://thelearnproject.co.za/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              <img src={learnProjectLogo} alt="The LEARN Project" className="h-16 sm:h-24 w-auto object-contain" />
            </a>
          </div>
        </div>
      </section>

      {/* Innovators Incubator Section */}
      <section className="py-12 sm:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-3 sm:px-4 py-2 rounded-full mb-4 sm:mb-6">
              <Lightbulb className="h-4 sm:h-5 w-4 sm:w-5 text-foreground" />
              <span className="text-xs sm:text-sm font-semibold text-foreground">{t('innovation.badge')}</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 sm:mb-6">
              {t('innovation.title')}<br />
              <span className="text-primary">{t('innovation.titleHighlight')}</span>
            </h2>
            
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              {t('innovation.desc')}
            </p>
            
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
              <Link to="/submit-idea" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-primary transition-colors">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{t('innovation.mentorship.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('innovation.mentorship.desc')}</p>
              </Link>
              
              <Link to="/submit-idea" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-secondary transition-colors">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{t('innovation.resources.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('innovation.resources.desc')}</p>
              </Link>
              
              <Link to="/submit-idea" className="bg-card p-6 rounded-xl border border-border shadow-sm hover:border-accent transition-colors">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{t('innovation.funding.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('innovation.funding.desc')}</p>
              </Link>
            </div>
            
            <Link to="/submit-idea">
              <Button size="lg" className="text-lg px-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all">
                {t('innovation.cta')}
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">{t('innovation.footer')}</p>
          </div>
        </div>
      </section>

      <SupportSection />
      <TechNewsSection />
      <Footer />
    </div>
  );
};
