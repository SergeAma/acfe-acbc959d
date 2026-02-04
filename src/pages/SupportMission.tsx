import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, ArrowRight, Handshake, Quote } from 'lucide-react';
import { DonationDialog } from '@/components/DonationDialog';
import { ReferralDialog } from '@/components/ReferralDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const SupportMission = () => {
  const [donationOpen, setDonationOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Founder's Foreword Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Quote className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                A Personal Note from Our Founder
              </h1>
            </div>
            
            <Card className="border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-8 sm:p-12">
                <div className="prose prose-lg max-w-none text-muted-foreground">
                  <p className="text-lg leading-relaxed mb-6">
                    Dear Friend,
                  </p>
                  <p className="text-lg leading-relaxed mb-6">
                    Thank you for taking the time to learn more about our mission. Every great journey begins with a single step, and your interest in supporting the Africa Centre for Future Entrepreneurs represents a meaningful step toward transforming lives across our continent.
                  </p>
                  <p className="text-lg leading-relaxed mb-6">
                    We founded ACFE with a simple but powerful belief: that every young African has the potential to become a changemaker. Our role is to unlock that potential through world-class mentorship, practical skills training, and a supportive community that believes in their dreams.
                  </p>
                  <p className="text-lg leading-relaxed mb-6">
                    Whether you choose to volunteer your time as a mentor, contribute financially, or connect us with institutions and sponsors who share our vision—every act of support creates ripples of impact that extend far beyond what we can measure.
                  </p>
                  <p className="text-lg leading-relaxed mb-8">
                    Together, we are building a generation of innovators, problem-solvers, and leaders who will shape Africa's future. Thank you for considering being part of this journey.
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    With gratitude and hope,
                  </p>
                  <p className="text-lg font-bold text-primary mt-2">
                    The ACFE Founding Team
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Support Options Section - Reproduced from SupportSection */}
        <section className="py-12 sm:py-20 bg-muted">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('support.title')}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('support.desc')}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
              {/* Volunteer as Mentor */}
              <Card className="border-2 hover:border-secondary transition-all duration-300 group h-full">
                <CardContent className="pt-6 h-full flex flex-col items-center text-center">
                  <div className="h-14 w-14 rounded-xl bg-secondary/20 flex items-center justify-center mb-5 group-hover:bg-secondary/30 transition-colors">
                    <Users className="h-7 w-7 text-secondary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-secondary transition-colors text-center">
                    {t('support.volunteer.title')}
                  </h3>
                  <p className="text-muted-foreground flex-1 mb-6 text-center">
                    {t('support.volunteer.desc')}
                  </p>
                  <Link to="/auth?mode=signup&role=mentor" className="w-full">
                    <Button variant="outline" className="w-full group/btn">
                      {t('support.volunteer.cta')}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Monthly Donation */}
              <Card className="border-2 hover:border-primary transition-all duration-300 group h-full">
                <CardContent className="pt-6 h-full flex flex-col items-center text-center">
                  <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/30 transition-colors">
                    <Heart className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors text-center">
                    {t('support.donate.title')}
                  </h3>
                  <p className="text-muted-foreground flex-1 mb-6 text-center">
                    {t('support.donate.desc')}
                  </p>
                  <Button 
                    onClick={() => setDonationOpen(true)} 
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    {t('support.donate.cta')}
                  </Button>
                </CardContent>
              </Card>

              {/* Recommend Institution/Sponsor */}
              <Card className="border-2 hover:border-accent transition-all duration-300 group h-full sm:col-span-2 lg:col-span-1">
                <CardContent className="pt-6 h-full flex flex-col items-center text-center">
                  <div className="h-14 w-14 rounded-xl bg-accent/20 flex items-center justify-center mb-5 group-hover:bg-accent/30 transition-colors">
                    <Handshake className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-accent-foreground transition-colors text-center">
                    {t('support.partner.title')}
                  </h3>
                  <p className="text-muted-foreground flex-1 mb-6 text-center">
                    {t('support.partner.desc')}
                  </p>
                  <Button 
                    onClick={() => setReferralOpen(true)} 
                    variant="outline"
                    className="w-full"
                  >
                    <Handshake className="mr-2 h-4 w-4" />
                    {t('support.partner.cta')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Thank You Section */}
        <section className="py-16 sm:py-24 bg-background">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-8">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-foreground">
              Thank You for Considering Us
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Your support—in whatever form it takes—helps us continue empowering the next generation of African entrepreneurs. Whether you mentor a single student, make a contribution, or connect us with like-minded partners, you become part of a movement that is reshaping Africa's future.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We are deeply grateful for your consideration and look forward to the possibility of working together to create lasting impact.
            </p>
          </div>
        </section>
      </main>

      <Footer />
      
      <DonationDialog open={donationOpen} onOpenChange={setDonationOpen} />
      <ReferralDialog open={referralOpen} onOpenChange={setReferralOpen} />
    </div>
  );
};

export default SupportMission;
