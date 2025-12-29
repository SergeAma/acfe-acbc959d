import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Linkedin, Twitter, Facebook, Link as LinkIcon, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import acfeLogo from '@/assets/acfe-logo.png';
import spectrogramLogo from '@/assets/spectrogram-logo.png';
import { supabase } from '@/integrations/supabase/client';

interface CourseCertificateProps {
  studentName: string;
  courseName: string;
  mentorName: string;
  completionDate: string;
  certificateNumber: string;
  skills?: string[];
}

export const CourseCertificate = ({
  studentName,
  courseName,
  mentorName,
  completionDate,
  certificateNumber,
  skills,
}: CourseCertificateProps) => {
  const certificateRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  const handleCreateSpectrogramProfile = async () => {
    setIsCreatingProfile(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-spectrogram-token', {
        body: {
          certificateId: certificateNumber,
          courseName: courseName,
          skills: skills,
        },
      });

      if (error) throw error;

      if (data?.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        toast({
          title: 'Redirecting to Spectrogram',
          description: 'Complete your talent profile on our partner platform.',
        });
      }
    } catch (error: any) {
      console.error('Error creating Spectrogram profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate profile link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleDownload = () => {
    if (!certificateRef.current) return;

    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(certificateRef.current!, {
        scale: 2,
        backgroundColor: '#ffffff',
      }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `certificate-${certificateNumber}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    });
  };

  const getShareUrl = () => {
    return `${window.location.origin}/certificate/${certificateNumber}`;
  };

  const addToLinkedIn = () => {
    const completionDateObj = new Date(completionDate);
    const year = completionDateObj.getFullYear();
    const month = completionDateObj.getMonth() + 1;
    
    // LinkedIn Add to Profile URL for certifications
    const linkedInUrl = new URL('https://www.linkedin.com/profile/add');
    linkedInUrl.searchParams.set('startTask', 'CERTIFICATION_NAME');
    linkedInUrl.searchParams.set('name', courseName);
    linkedInUrl.searchParams.set('organizationName', 'A Cloud for Everyone');
    linkedInUrl.searchParams.set('issueYear', year.toString());
    linkedInUrl.searchParams.set('issueMonth', month.toString());
    linkedInUrl.searchParams.set('certUrl', getShareUrl());
    linkedInUrl.searchParams.set('certId', certificateNumber);
    
    window.open(linkedInUrl.toString(), '_blank');
  };

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `🎓 I just earned my certificate in "${courseName}" from A Cloud for Everyone! #learning #certificate #ACFEcertified`
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

  return (
    <div className="space-y-4">
      <div 
        ref={certificateRef} 
        className="bg-white p-8 md:p-12 rounded-lg border-4 border-primary/20 relative overflow-hidden"
        style={{ aspectRatio: '1.414' }}
      >
        {/* Decorative corners */}
        <div className="absolute top-4 left-4 w-16 h-16 border-l-4 border-t-4 border-primary/30" />
        <div className="absolute top-4 right-4 w-16 h-16 border-r-4 border-t-4 border-primary/30" />
        <div className="absolute bottom-4 left-4 w-16 h-16 border-l-4 border-b-4 border-primary/30" />
        <div className="absolute bottom-4 right-4 w-16 h-16 border-r-4 border-b-4 border-primary/30" />

        <div className="text-center space-y-6 relative z-10">
          {/* Header with ACFE Logo */}
          <div className="flex items-center justify-center">
            <img src={acfeLogo} alt="ACFE" className="h-16 w-auto" />
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
              {studentName}
            </h2>
          </div>

          {/* Course */}
          <div className="py-4">
            <p className="text-muted-foreground text-sm uppercase tracking-wider">has successfully completed</p>
            <h3 className="text-xl md:text-2xl font-semibold text-foreground mt-2">
              {courseName}
            </h3>
          </div>

          {/* Mentor */}
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Instructed by <span className="font-medium text-foreground">{mentorName || 'Instructor'}</span>
            </p>
          </div>

          {/* Date and Certificate Number */}
          <div className="pt-6 flex justify-between items-end text-sm text-muted-foreground border-t border-muted mt-6">
            <div className="text-left">
              <p className="font-medium text-foreground">
                {format(new Date(completionDate), 'MMMM d, yyyy')}
              </p>
              <p className="text-xs">Date of Completion</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs">{certificateNumber}</p>
              <p className="text-xs">Certificate ID</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spectrogram Profile CTA */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-lg border border-primary/20">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <img src={spectrogramLogo} alt="Spectrogram Consulting" className="h-12 w-auto" />
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-semibold text-foreground">Join the Talent Network</h3>
            <p className="text-sm text-muted-foreground">
              Create your talent profile on Spectrogram Consulting and get discovered by top recruiters
            </p>
          </div>
          <Button 
            onClick={handleCreateSpectrogramProfile}
            disabled={isCreatingProfile}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isCreatingProfile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Create Profile
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>

        <Button 
          onClick={addToLinkedIn} 
          variant="outline" 
          className="gap-2 bg-[#0077B5] hover:bg-[#006399] text-white hover:text-white border-[#0077B5]"
        >
          <Linkedin className="h-4 w-4" />
          Add to LinkedIn
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
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
  );
};