import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Award, Download, Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CourseCertificate } from '@/components/CourseCertificate';

interface CertificateData {
  id: string;
  certificate_number: string;
  issued_at: string;
  course: {
    id: string;
    title: string;
    mentor_name: string;
  };
}

export const MyCertificates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    if (user) {
      fetchCertificates();
      fetchStudentName();
    }
  }, [user]);

  const fetchStudentName = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user?.id)
      .single();
    
    if (data?.full_name) {
      setStudentName(data.full_name);
    }
  };

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('course_certificates')
        .select(`
          id,
          certificate_number,
          issued_at,
          course:courses(
            id,
            title,
            profiles!courses_mentor_id_fkey(full_name)
          )
        `)
        .eq('student_id', user?.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;

      const formattedCerts = data?.map((cert: any) => ({
        id: cert.id,
        certificate_number: cert.certificate_number,
        issued_at: cert.issued_at,
        course: {
          id: cert.course.id,
          title: cert.course.title,
          mentor_name: cert.course.profiles?.full_name || 'Instructor'
        }
      })) || [];

      setCertificates(formattedCerts);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load certificates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <Award className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Certificates</h1>
        </div>

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete a course to earn your first certificate
              </p>
              <Button asChild>
                <Link to="/courses">Browse Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {certificates.map((cert) => (
              <Card key={cert.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Award className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{cert.course.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Instructed by {cert.course.mentor_name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Issued on {format(new Date(cert.issued_at), 'MMMM d, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-2">
                          Certificate ID: {cert.certificate_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedCertificate(cert)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Certificate Dialog */}
      <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate of Completion</DialogTitle>
          </DialogHeader>
          {selectedCertificate && (
            <CourseCertificate
              studentName={studentName || 'Student'}
              courseName={selectedCertificate.course.title}
              mentorName={selectedCertificate.course.mentor_name}
              completionDate={selectedCertificate.issued_at}
              certificateNumber={selectedCertificate.certificate_number}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};