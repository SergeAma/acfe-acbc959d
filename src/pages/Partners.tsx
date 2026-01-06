import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import spectrogramLogo from '@/assets/spectrogram-logo.png';
import eastAfricanUniversityLogo from '@/assets/east-african-university-logo.png';
import johannesburgLogo from '@/assets/johannesburg-logo.png';
import learnProjectLogo from '@/assets/learn-project-logo.png';

export const Partners = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: t('nav.partners') }]} />
      
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
            {t('partners.pageTitle')}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
            {t('partners.pageSubtitle')}
          </p>
          <Button asChild size="lg">
            <a href="mailto:contact@acloudforeveryone.org?subject=Partnership%20Inquiry%20with%20ACFE">
              <Mail className="h-5 w-5 mr-2" />
              {t('partners.becomePartner')}
            </a>
          </Button>
        </div>

        <div className="max-w-5xl mx-auto space-y-12 sm:space-y-20">
          {/* Spectrogram Consulting - Featured Partner */}
          <div className="bg-card rounded-lg p-6 sm:p-8 shadow-lg border-2 border-primary/20">
            <div className="flex flex-col items-center mb-6">
              <span className="text-xs uppercase tracking-wider text-primary font-semibold mb-4">{t('partners.title')}</span>
              <a 
                href="https://spectrogramconsulting.com/home" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              >
                <img 
                  src={spectrogramLogo} 
                  alt="Spectrogram Consulting" 
                  className="h-20 w-auto mb-6"
                />
              </a>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              {t('partners.spectrogram.desc')}
            </p>
          </div>

          {/* East African University Partnership */}
          <div className="bg-card rounded-lg p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col items-center mb-6">
              <a href="https://teau.ac.ke" target="_blank" rel="noopener noreferrer" className="hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                <img 
                  src={eastAfricanUniversityLogo} 
                  alt="The East African University" 
                  className="h-32 w-auto mb-6"
                />
              </a>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              {t('partners.teau.desc')}
            </p>
          </div>

          {/* Johustleburg Partnership */}
          <div className="bg-card rounded-lg p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col items-center mb-6">
              <a href="https://www.facebook.com/Thehonestgroupfundation/" target="_blank" rel="noopener noreferrer" className="hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                <img 
                  src={johannesburgLogo} 
                  alt="Johustleburg Foundation" 
                  className="h-32 w-auto mb-6"
                />
              </a>
              <h2 className="text-2xl font-bold text-foreground mb-4">JOHUSTLEBURG</h2>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              {t('partners.johannesburg.desc')}
            </p>
          </div>

          {/* The LEARN Project Partnership */}
          <div className="bg-card rounded-lg p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col items-center mb-6">
              <a href="https://thelearnproject.co.za/" target="_blank" rel="noopener noreferrer" className="hover-scale transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                <img 
                  src={learnProjectLogo} 
                  alt="The LEARN Project" 
                  className="h-40 w-auto mb-6"
                />
              </a>
            </div>
            <p className="text-lg text-foreground/90 leading-relaxed text-center">
              {t('partners.learn.desc')}
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};
