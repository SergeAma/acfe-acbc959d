import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Award, Search, CheckCircle2, XCircle, Loader2, Calendar, User, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface CertificateDetails {
  certificate_number: string;
  issued_at: string;
  course_title: string;
  mentor_name: string;
  student_name: string;
}

export const VerifyCertificate = () => {
  const { toast } = useToast();
  const [certificateId, setCertificateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [certificateDetails, setCertificateDetails] = useState<CertificateDetails | null>(null);

  const handleVerify = async () => {
    if (!certificateId.trim()) {
      toast({
        title: 'Enter Certificate ID',
        description: 'Please enter a certificate ID to verify',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setVerified(null);
    setCertificateDetails(null);

    try {
      const { data, error } = await supabase
        .from('course_certificates')
        .select(`
          certificate_number,
          issued_at,
          course_id,
          courses!course_certificates_course_id_fkey(
            title,
            mentor_id
          )
        `)
        .eq('certificate_number', certificateId.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const course = data.courses as any;
        
        // Fetch mentor name using the public profiles view
        let mentorName = 'Instructor';
        if (course?.mentor_id) {
          const { data: mentorData } = await supabase
            .from('profiles_public')
            .select('full_name')
            .eq('id', course.mentor_id)
            .single();
          
          if (mentorData?.full_name) {
            mentorName = mentorData.full_name;
          }
        }

        // Fetch student name using the student_id from the certificate
        const { data: certWithStudent } = await supabase
          .from('course_certificates')
          .select('student_id')
          .eq('certificate_number', certificateId.trim())
          .single();

        let studentName = 'Unknown';
        if (certWithStudent?.student_id) {
          // Use secure RPC function to get certificate holder name
          const { data: nameData } = await supabase
            .rpc('get_certificate_holder_name', { p_student_id: certWithStudent.student_id });
          
          if (nameData) {
            studentName = nameData;
          }
        }

        setCertificateDetails({
          certificate_number: data.certificate_number,
          issued_at: data.issued_at,
          course_title: course?.title || 'Unknown Course',
          mentor_name: mentorName,
          student_name: studentName,
        });
        setVerified(true);
      } else {
        setVerified(false);
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
                  onChange={(e) => setCertificateId(e.target.value.toUpperCase())}
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

          {/* Results */}
          {verified === true && certificateDetails && (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                      Certificate Verified
                    </h3>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      This is an authentic certificate issued by A Cloud for Everyone
                    </p>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Awarded to</p>
                      <p className="font-semibold">{certificateDetails.student_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Course Completed</p>
                      <p className="font-semibold">{certificateDetails.course_title}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Instructor</p>
                      <p className="font-semibold">{certificateDetails.mentor_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date Issued</p>
                      <p className="font-semibold">
                        {format(new Date(certificateDetails.issued_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {certificateDetails.certificate_number}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {verified === false && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                      Certificate Not Found
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-400">
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
