import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Heart, CheckCircle, Loader2, Home } from 'lucide-react';
import { Confetti } from '@/components/Confetti';

export const DonationSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verifyDonation = async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        // Update donation status and send welcome email
        const { data, error } = await supabase.functions.invoke('verify-donation', {
          body: { sessionId }
        });

        if (!error && data?.success) {
          setVerified(true);
        }
      } catch (error) {
        console.error('Error verifying donation:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyDonation();
  }, [sessionId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <Confetti isActive={verified} />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 text-center">
            {loading ? (
              <div className="py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Confirming your donation...</p>
              </div>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-secondary" />
                </div>
                
                <h1 className="text-3xl font-bold mb-4">Thank You for Your Support!</h1>
                
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Heart className="h-5 w-5 text-primary fill-primary" />
                  <span className="text-lg text-muted-foreground">You're making a difference</span>
                </div>
                
                <p className="text-muted-foreground mb-8">
                  Your generous monthly donation will help us sponsor more internships 
                  and provide resources to learners across Africa. We've sent a confirmation 
                  email with more details about your impact.
                </p>
                
                <div className="bg-muted/50 rounded-lg p-4 mb-8">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <ul className="text-sm text-muted-foreground text-left space-y-2">
                    <li>• You'll receive a welcome email with more information</li>
                    <li>• Monthly updates on how your donation is helping</li>
                    <li>• Manage your donation anytime via Stripe portal</li>
                  </ul>
                </div>
                
                <Link to="/home">
                  <Button className="w-full sm:w-auto">
                    <Home className="mr-2 h-4 w-4" />
                    Return to Home
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};
