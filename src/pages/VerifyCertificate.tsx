import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Award, Search, XCircle, Loader2 } from 'lucide-react';

export const VerifyCertificate = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [certificateId, setCertificateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleVerify = async () => {
    const trimmedId = certificateId.trim();
    if (!trimmedId) {
      toast({
        title: 'Enter Certificate ID',
        description: 'Please enter a certificate ID to verify',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setNotFound(false);

    try {
      // Check if certificate exists
      const { data, error } = await supabase
        .from('course_certificates')
        .select('certificate_number')
        .eq('certificate_number', trimmedId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Certificate found - redirect to the certificate page
        navigate(`/certificate/${data.certificate_number}`);
      } else {
        setNotFound(true);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify certificate. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Verify Certificate
            </h1>
            <p className="text-muted-foreground">
              Enter a certificate ID to verify its authenticity
            </p>
          </div>

          {/* Search Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Certificate Verification</CardTitle>
              <CardDescription>
                Enter the certificate ID found at the bottom of the certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="e.g., ACFE-M5ABCD-XY12"
                  value={certificateId}
                  onChange={(e) => {
                    setCertificateId(e.target.value.toUpperCase());
                    setNotFound(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="flex-1 font-mono"
                />
                <Button onClick={handleVerify} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Not Found Result */}
          {notFound && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-destructive" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">
                      Certificate Not Found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      We could not find a certificate with this ID. Please check the ID and try again.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
