import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  BookOpen, 
  CheckSquare, 
  FileText, 
  UserPlus,
  ArrowRight,
  ExternalLink,
  Briefcase,
  Shield,
  Users,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import acfeLogo from '@/assets/acfe-logo.png';
import spectrogramLogo from '@/assets/spectrogram-logo.png';

const steps = [
  { 
    icon: GraduationCap, 
    titleKey: 'spectrogram.jobs.step1.title',
    descKey: 'spectrogram.jobs.step1.desc',
    color: 'bg-amber-500' 
  },
  { 
    icon: BookOpen, 
    titleKey: 'spectrogram.jobs.step2.title',
    descKey: 'spectrogram.jobs.step2.desc',
    color: 'bg-blue-500' 
  },
  { 
    icon: CheckSquare, 
    titleKey: 'spectrogram.jobs.step3.title',
    descKey: 'spectrogram.jobs.step3.desc',
    color: 'bg-green-500' 
  },
  { 
    icon: FileText, 
    titleKey: 'spectrogram.jobs.step4.title',
    descKey: 'spectrogram.jobs.step4.desc',
    color: 'bg-purple-500' 
  },
  { 
    icon: UserPlus, 
    titleKey: 'spectrogram.jobs.step5.title',
    descKey: 'spectrogram.jobs.step5.desc',
    color: 'bg-primary' 
  },
];

export const SpectrogramJobs = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleStartLearning = () => {
    navigate('/auth?mode=signup&role=student');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section with Partnership Branding */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              {/* Partnership Logos */}
              <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8">
                <div className="h-16 sm:h-24 w-32 sm:w-48 flex items-center justify-center">
                  <img 
                    src={spectrogramLogo} 
                    alt="Spectrogram Consulting" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex flex-col items-center text-muted-foreground">
                  <span className="text-2xl sm:text-3xl">×</span>
                  <span className="text-xs font-medium">{t('spectrogram.jobs.partnership')}</span>
                </div>
                <div className="h-16 sm:h-24 w-32 sm:w-48 flex items-center justify-center">
                  <img 
                    src={acfeLogo} 
                    alt="A Cloud For Everyone" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
                {t('spectrogram.jobs.title')}
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-10">
                {t('spectrogram.jobs.subtitle')}
              </p>

              {/* Start Learning CTA */}
              <Button 
                onClick={handleStartLearning} 
                size="lg"
                className="text-lg px-10 rounded-full"
              >
                {t('spectrogram.jobs.startLearning')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Journey Steps */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
                Your Journey to Success
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {steps.map((step, index) => (
                  <div key={index} className="relative">
                    <Card className="h-full text-center hover:shadow-md transition-shadow">
                      <CardContent className="pt-6 pb-4">
                        <div className={`h-12 w-12 rounded-full ${step.color} flex items-center justify-center mx-auto mb-4`}>
                          <step.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">Step {index + 1}</div>
                        <h3 className="font-semibold text-sm mb-2">{t(step.titleKey)}</h3>
                        <p className="text-xs text-muted-foreground">{t(step.descKey)}</p>
                      </CardContent>
                    </Card>
                    {index < steps.length - 1 && (
                      <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground z-10" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
                {t('spectrogram.jobs.whyComplete')}
              </h2>
              
              <div className="grid sm:grid-cols-3 gap-6">
                <Card className="text-center border-2 hover:border-primary transition-colors">
                  <CardContent className="pt-6">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      {t('spectrogram.jobs.benefit1')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center border-2 hover:border-secondary transition-colors">
                  <CardContent className="pt-6">
                    <div className="h-14 w-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-7 w-7 text-secondary" />
                    </div>
                    <p className="text-muted-foreground">
                      {t('spectrogram.jobs.benefit2')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="text-center border-2 hover:border-accent transition-colors">
                  <CardContent className="pt-6">
                    <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="h-7 w-7 text-accent" />
                    </div>
                    <p className="text-muted-foreground">
                      {t('spectrogram.jobs.benefit3')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 bg-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
                {t('spectrogram.jobs.faq.title')}
              </h2>
              
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-2">{t('spectrogram.jobs.faq.q1')}</h3>
                    <p className="text-muted-foreground">{t('spectrogram.jobs.faq.a1')}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-2">{t('spectrogram.jobs.faq.q2')}</h3>
                    <p className="text-muted-foreground">{t('spectrogram.jobs.faq.a2')}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-2">{t('spectrogram.jobs.faq.q3')}</h3>
                    <p className="text-muted-foreground">{t('spectrogram.jobs.faq.a3')}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default SpectrogramJobs;
