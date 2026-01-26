import { ExternalLink, FileText, Upload, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSct5Mq4TJ84YDSROIC3MAv8V2iOj8jEhqFl8H9nl1Eron65bg/viewform';
export const ContentSubmissionCard = () => {
  return <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Upload className="h-5 w-5 text-primary" />
              Submit Course Content
            </CardTitle>
            <CardDescription className="mt-1">
              Share your expertise with learners across Africa
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            External Form
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-background/80 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">How it works:</h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
              <span>Fill out the Google Form with your course details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
              <span>Upload your video or audio content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
              <span>Our admin team will review and publish your course</span>
            </li>
          </ol>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> All courses are reviewed by our team before publishing to ensure quality and consistency for learners.
          </p>
        </div>

        <Button className="w-full gap-2 h-12 text-base" size="lg" onClick={() => window.open(GOOGLE_FORM_URL, '_blank')}>
          <FileText className="h-5 w-5" />
          Open Content Submission Form
          <ExternalLink className="h-4 w-4 ml-1" />
        </Button>

        
      </CardContent>
    </Card>;
};