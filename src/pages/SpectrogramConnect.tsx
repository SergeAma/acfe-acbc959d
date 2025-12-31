import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, ExternalLink, ArrowLeft } from 'lucide-react';
import acfeLogo from '@/assets/acfe-logo.png';
import spectrogramLogo from '@/assets/spectrogram-logo.png';

export const SpectrogramConnect = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Get callback URL from Spectrogram
  const callbackUrl = searchParams.get('callback') || 'https://spectrogramconsulting.com/acfe-callback';
  const returnUrl = searchParams.get('return') || 'https://spectrogramconsulting.com';

  // If user is logged in, automatically generate token and redirect back
  useEffect(() => {
    if (user && !authLoading && !isGeneratingToken && !isComplete) {
      handleConnect();
    }
  }, [user, authLoading]);

  const handleConnect = async () => {
    if (!user) {
      // Redirect to auth with return URL
      const currentUrl = window.location.href;
      navigate(`/auth?mode=login&redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    setIsGeneratingToken(true);

    try {
      // Generate the Spectrogram token
      const { data, error } = await supabase.functions.invoke('generate-spectrogram-token', {
        body: {
          certificateId: null, // No specific certificate - just profile sync
          courseName: 'ACFE Profile Sync',
          skills: [],
        },
      });

      if (error) throw error;

      if (data?.redirectUrl) {
        setIsComplete(true);
        toast({
          title: 'Profile Connected!',
          description: 'Redirecting you back to Spectrogram Consulting...',
        });
        
        // Redirect to Spectrogram with the token
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error connecting profile:', error);
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to connect your ACFE profile. Please try again.',
        variant: 'destructive',
      });
      setIsGeneratingToken(false);
    }
  };

  const handleSignIn = () => {
    const currentUrl = window.location.href;
    navigate(`/auth?mode=login&redirect=${encodeURIComponent(currentUrl)}`);
  };

  const handleSignUp = () => {
    const currentUrl = window.location.href;
    navigate(`/auth?mode=signup&redirect=${encodeURIComponent(currentUrl)}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            {/* Partner Logos */}
            <div className="flex items-center justify-center gap-4">
              <img src={acfeLogo} alt="A Cloud For Everyone" className="h-12 w-auto" />
              <span className="text-2xl text-muted-foreground">+</span>
              <img src={spectrogramLogo} alt="Spectrogram Consulting" className="h-12 w-auto" />
            </div>
            
            <div>
              <CardTitle className="text-2xl">Connect Your ACFE Profile</CardTitle>
              <CardDescription className="mt-2">
                Import your A Cloud For Everyone profile to Spectrogram Consulting's talent network
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {isComplete ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Profile Connected Successfully!</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Redirecting you back to Spectrogram Consulting...
                  </p>
                </div>
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
              </div>
            ) : isGeneratingToken ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <div>
                  <h3 className="font-semibold">Connecting your profile...</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Please wait while we securely transfer your profile data.
                  </p>
                </div>
              </div>
            ) : user ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Signed in as:</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Your profile data will include:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Name and bio</li>
                    <li>Profile photo</li>
                    <li>Skills and experience</li>
                    <li>Social media links</li>
                    <li>University/Institution</li>
                  </ul>
                </div>

                <Button onClick={handleConnect} className="w-full" size="lg">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect & Continue
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  By connecting, you agree to share your ACFE profile data with Spectrogram Consulting.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Sign in to your A Cloud For Everyone account to connect your profile.
                </p>
                
                <div className="space-y-3">
                  <Button onClick={handleSignIn} className="w-full" size="lg">
                    Sign In to ACFE
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  
                  <Button onClick={handleSignUp} variant="outline" className="w-full" size="lg">
                    Create ACFE Account
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Don't have an ACFE account yet? Create one to access free courses and join our community.
                </p>
              </div>
            )}

            {!isComplete && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => window.location.href = returnUrl}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Spectrogram
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default SpectrogramConnect;
