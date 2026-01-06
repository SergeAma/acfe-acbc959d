import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Users, ArrowRight, Handshake } from 'lucide-react';
import { DonationDialog } from '@/components/DonationDialog';
import { ReferralDialog } from '@/components/ReferralDialog';

export const SupportSection = () => {
  const [donationOpen, setDonationOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  return (
    <section className="py-12 sm:py-20 bg-muted">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How You Can Support Us</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join us in empowering African youth with digital skills. Your support helps us sponsor more internships and expand our reach.
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
                Volunteer as a Mentor
              </h3>
              <p className="text-muted-foreground flex-1 mb-6 text-center">
                Share your expertise and guide the next generation of African tech talent. 
                Help students navigate their career paths and develop practical skills.
              </p>
              <Link to="/auth?mode=signup&role=mentor" className="w-full">
                <Button variant="outline" className="w-full group/btn">
                  Become a Mentor
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
                Make a Monthly Donation
              </h3>
              <p className="text-muted-foreground flex-1 mb-6 text-center">
                Your recurring contribution helps us sponsor more internships through Spectrogram Consulting 
                and provide resources to learners across Africa.
              </p>
              <Button 
                onClick={() => setDonationOpen(true)} 
                className="w-full bg-primary hover:bg-primary/90"
              >
                <Heart className="mr-2 h-4 w-4" />
                Donate Now (Starting $10/month)
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
                Introduce Us to Partners
              </h3>
              <p className="text-muted-foreground flex-1 mb-6 text-center">
                Know an educational institution or potential sponsor? Help us connect with organizations 
                that share our vision for empowering African youth.
              </p>
              <Button 
                onClick={() => setReferralOpen(true)} 
                variant="outline"
                className="w-full"
              >
                <Handshake className="mr-2 h-4 w-4" />
                Recommend
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <DonationDialog open={donationOpen} onOpenChange={setDonationOpen} />
      <ReferralDialog open={referralOpen} onOpenChange={setReferralOpen} />
    </section>
  );
};
