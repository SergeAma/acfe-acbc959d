import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Award, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  User, 
  BookOpen,
  Share2,
  Linkedin,
  Twitter,
  Facebook,
  Link as LinkIcon,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CertificateDetails {
  certificate_number: string;
  issued_at: string;
  course_title: string;
  mentor_name: string;
  student_name: string;
}

export const CertificatePublic = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [certificateDetails, setCertificateDetails] = useState<CertificateDetails | null>(null);

  useEffect(() => {
    if (certificateId) {
      fetchCertificate();
    }
  }, [certificateId]);

  const fetchCertificate = async () => {
    try {
      const { data, error } = await supabase
        .from('course_certificates')
        .select(`
          certificate_number,
          issued_at,
          student_id,
          courses!course_certificates_course_id_fkey(
            title,
            mentor_id
          )
        `)
        .eq('certificate_number', certificateId)
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

        let studentName = 'Certificate Holder';
        if (data.student_id) {
          // Use secure RPC function to get certificate holder name
          const { data: nameData } = await supabase
            .rpc('get_certificate_holder_name', { p_student_id: data.student_id });
          
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
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  const getShareUrl = () => {
    return `${window.location.origin}/certificate/${certificateId}`;
  };

  const addToLinkedIn = () => {
    if (!certificateDetails) return;
    const completionDateObj = new Date(certificateDetails.issued_at);
    const year = completionDateObj.getFullYear();
    const month = completionDateObj.getMonth() + 1;
    
    // LinkedIn Add to Profile URL for certifications
    const linkedInUrl = new URL('https://www.linkedin.com/profile/add');
    linkedInUrl.searchParams.set('startTask', 'CERTIFICATION_NAME');
    linkedInUrl.searchParams.set('name', certificateDetails.course_title);
    linkedInUrl.searchParams.set('organizationName', 'A Cloud for Everyone');
    linkedInUrl.searchParams.set('issueYear', year.toString());
    linkedInUrl.searchParams.set('issueMonth', month.toString());
    linkedInUrl.searchParams.set('certUrl', getShareUrl());
    linkedInUrl.searchParams.set('certId', certificateDetails.certificate_number);
    
    window.open(linkedInUrl.toString(), '_blank');
  };

  const shareToLinkedIn = () => {
    if (!certificateDetails) return;
    const text = encodeURIComponent(
      `🎓 Excited to share that I've just earned my certificate in "${certificateDetails.course_title}" from A Cloud for Everyone!\n\nThis course was taught by ${certificateDetails.mentor_name} and I'm excited to apply these new skills.\n\n#learning #certificate #ACFEcertified #professionaldevelopment`
    );
    const url = encodeURIComponent(getShareUrl());
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToTwitter = () => {
    if (!certificateDetails) return;
    const text = encodeURIComponent(
      `🎓 Just earned my certificate in "${certificateDetails.course_title}" from @ACFEAfrica!\n\nTaught by ${certificateDetails.mentor_name}\n\n#learning #certificate #ACFEcertified #digitalskills`
    );
    const url = encodeURIComponent(getShareUrl());
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast({
        title: 'Link copied!',
        description: 'Certificate link copied to clipboard',
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the URL from your browser',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!certificateDetails) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Certificate Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The certificate you're looking for doesn't exist or the link is incorrect.
            </p>
            <Button asChild>
              <Link to="/verify-certificate">Verify a Certificate</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Verified Badge */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">Verified Certificate</span>
          </div>

          {/* Certificate Display */}
          <Card className="mb-8 overflow-hidden">
            <CardContent className="p-0">
              <div 
                className="bg-white p-8 md:p-12 relative overflow-hidden"
                style={{ aspectRatio: '1.414' }}
              >
                {/* Decorative corners */}
                <div className="absolute top-4 left-4 w-16 h-16 border-l-4 border-t-4 border-primary/30" />
                <div className="absolute top-4 right-4 w-16 h-16 border-r-4 border-t-4 border-primary/30" />
                <div className="absolute bottom-4 left-4 w-16 h-16 border-l-4 border-b-4 border-primary/30" />
                <div className="absolute bottom-4 right-4 w-16 h-16 border-r-4 border-b-4 border-primary/30" />

                <div className="text-center space-y-6 relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-center gap-2">
                    <Award className="h-10 w-10 text-primary" />
                  </div>
                  
                  <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-wide">
                      Certificate of Completion
                    </h1>
                    <p className="text-muted-foreground mt-2">A Cloud for Everyone</p>
                  </div>

                  {/* Recipient */}
                  <div className="py-4">
                    <p className="text-muted-foreground text-sm uppercase tracking-wider">This is to certify that</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-primary mt-2 font-serif">
                      {certificateDetails.student_name}
                    </h2>
                  </div>

                  {/* Course */}
                  <div className="py-4">
                    <p className="text-muted-foreground text-sm uppercase tracking-wider">has successfully completed</p>
                    <h3 className="text-xl md:text-2xl font-semibold text-foreground mt-2">
                      {certificateDetails.course_title}
                    </h3>
                  </div>

                  {/* Mentor */}
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground">
                      Instructed by <span className="font-medium text-foreground">{certificateDetails.mentor_name}</span>
                    </p>
                  </div>

                  {/* Date and Certificate Number */}
                  <div className="pt-6 flex justify-between items-end text-sm text-muted-foreground border-t border-muted mt-6">
                    <div className="text-left">
                      <p className="font-medium text-foreground">
                        {format(new Date(certificateDetails.issued_at), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-xs">Date of Completion</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs">{certificateDetails.certificate_number}</p>
                      <p className="text-xs">Certificate ID</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2">
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
                    <p className="text-sm text-muted-foreground">Course</p>
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
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-semibold">
                      {format(new Date(certificateDetails.issued_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <Badge variant="secondary" className="font-mono text-xs">
                  {certificateDetails.certificate_number}
                </Badge>

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={addToLinkedIn} 
                    size="sm"
                    className="gap-2 bg-[#0077B5] hover:bg-[#006399] text-white"
                  >
                    <Linkedin className="h-4 w-4" />
                    Add to LinkedIn
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={shareToLinkedIn}>
                        <Linkedin className="h-4 w-4 mr-2" />
                        Share on LinkedIn
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareToTwitter}>
                        <Twitter className="h-4 w-4 mr-2" />
                        Share on X (Twitter)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareToFacebook}>
                        <Facebook className="h-4 w-4 mr-2" />
                        Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={copyLink}>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Want to earn your own certificate?
            </p>
            <Button asChild>
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
