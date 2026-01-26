import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ExternalLink, FileText, Shield, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSct5Mq4TJ84YDSROIC3MAv8V2iOj8jEhqFl8H9nl1Eron65bg/viewform';

export const CreateCourse = () => {
  const navigate = useNavigate();
  const { profile, isActualAdmin } = useAuth();
  
  // If admin, redirect to admin course creation
  useEffect(() => {
    if (profile?.role === 'admin' || isActualAdmin) {
      navigate('/admin/courses');
    }
  }, [profile, isActualAdmin, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-primary/30">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Submit Your Course Content</CardTitle>
            <CardDescription className="text-base">
              Share your expertise with learners across Africa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Course creation is handled by our admin team to ensure quality and consistency. 
                Submit your content through our Google Form and we'll take care of the rest!
              </AlertDescription>
            </Alert>

            <div className="bg-muted/50 rounded-lg p-5 space-y-4">
              <h3 className="font-semibold">What to prepare:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Course title and description</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>YouTube video links for each lesson</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Lesson titles and text content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Section/module structure</span>
                </li>
              </ul>
            </div>

            <Button 
              className="w-full gap-2 h-12 text-base" 
              size="lg"
              onClick={() => window.open(GOOGLE_FORM_URL, '_blank')}
            >
              <FileText className="h-5 w-5" />
              Open Content Submission Form
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <Shield className="h-3 w-3" />
              <span>Your content is reviewed before publishing</span>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">1</span>
                <div>
                  <p className="font-medium">Submit your content</p>
                  <p className="text-sm text-muted-foreground">Fill out the form with your course details and YouTube links</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">2</span>
                <div>
                  <p className="font-medium">Admin review</p>
                  <p className="text-sm text-muted-foreground">Our team reviews and structures your content</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">3</span>
                <div>
                  <p className="font-medium">Course goes live</p>
                  <p className="text-sm text-muted-foreground">Students can enroll and start learning from you!</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
