import { Card, CardContent } from '@/components/ui/card';
import { Heart, Quote } from 'lucide-react';
import { SupportSection } from '@/components/SupportSection';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import founderPortrait from '@/assets/founder-portrait.jpg';

export const SupportMission = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Founder's Foreword Section */}
        <section className="py-16 sm:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Quote className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                A Personal Note from Our Founder
              </h1>
            </div>
            
            <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
              {/* Founder Photo */}
              <div className="lg:col-span-2 flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="w-64 h-80 sm:w-72 sm:h-96 lg:w-80 lg:h-[28rem] rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary/20">
                    <img 
                      src={founderPortrait} 
                      alt="ACFE Founder" 
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  {/* Decorative accent */}
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl -z-10" />
                  <div className="absolute -top-4 -left-4 w-32 h-32 bg-secondary/10 rounded-full blur-2xl -z-10" />
                </div>
              </div>

              {/* Letter Content */}
              <Card className="lg:col-span-3 border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8 lg:p-10">
                  <div className="prose prose-lg max-w-none text-muted-foreground">
                    <p className="text-lg leading-relaxed mb-5">
                      Dear Friend,
                    </p>
                    <p className="leading-relaxed mb-5">
                      Thank you for taking the time to learn more about our mission. Every great journey begins with a single step, and your interest in learning more about us is greatly encouraging.
                    </p>
                    <p className="leading-relaxed mb-5">
                      We founded ACFE with a simple but powerful belief: that every young African has the potential to become a changemaker. Our role is to unlock that potential through world-class mentorship, practical skills training, and a supportive community that believes in their dreams.
                    </p>
                    <p className="leading-relaxed mb-5">
                      Whether you choose to volunteer <strong className="text-foreground">your time as a mentor, contribute financially, or connect us with institutions and sponsors</strong> who share our vision, every act of support creates ripples of impact that extend far beyond what we can measure.
                    </p>
                    <p className="leading-relaxed mb-6">
                      Together, we are building a generation of innovators, problem-solvers, and leaders who will shape Africa's future. Thank you for considering being part of this journey.
                    </p>
                    <div className="border-t border-border pt-5">
                      <p className="font-semibold text-foreground mb-1">
                        With gratitude and hope,
                      </p>
                      <p className="text-lg font-bold text-primary">
                        The ACFE Founding Team
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Reuse existing SupportSection component */}
        <SupportSection />

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
              Your support, in whatever form it takes, helps us continue empowering the next generation of African entrepreneurs. Whether you mentor a single student, make a contribution, or connect us with like-minded partners, you become part of a movement that is reshaping digital skills across Africa.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We are deeply grateful for your consideration and look forward to the possibility of working together to create lasting impact.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SupportMission;
