import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Upload, Mail, CheckCircle } from 'lucide-react';

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSct5Mq4TJ84YDSROIC3MAv8V2iOj8jEhqFl8H9nl1Eron65bg/viewform';

export const ContributorSubmit = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">Submit Course Content</CardTitle>
            <CardDescription className="text-base mt-2">
              Upload your lesson materials using our secure submission form. You will receive a confirmation email once submitted.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-5 space-y-4">
              <h3 className="font-semibold text-lg">How it works</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                    1
                  </div>
                  <p className="text-muted-foreground">
                    Click the button below to open the submission form
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                    2
                  </div>
                  <p className="text-muted-foreground">
                    Upload your video or audio content to Google Drive and share the links
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                    3
                  </div>
                  <p className="text-muted-foreground">
                    Our team will review and publish your course
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button 
              size="lg" 
              className="w-full h-14 text-lg gap-3"
              onClick={() => window.open(GOOGLE_FORM_URL, '_blank')}
            >
              <ExternalLink className="h-5 w-5" />
              Submit Content
            </Button>

            {/* Confirmation note */}
            <div className="flex items-start gap-3 p-4 bg-accent/50 rounded-lg border border-border">
              <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Confirmation:</strong> You will receive an email confirmation once your submission is reviewed.
              </p>
            </div>

            {/* What happens next */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                After submission
              </h4>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside ml-1">
                <li>Our team reviews your content for quality and alignment</li>
                <li>We format and publish your course on the platform</li>
                <li>Students can then enroll and learn from your expertise</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
