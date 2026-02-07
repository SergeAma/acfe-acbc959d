import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Briefcase, Youtube, FolderOpen, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { createSafeHtml } from '@/lib/sanitize-html';
import { useToast } from '@/hooks/use-toast';
import { callEdgeFunction } from '@/lib/api';
import { formatSubmissionStatus } from '@/lib/formatters';

interface CourseAssignmentProps {
  courseId: string;
  enrollmentId: string;
  onComplete: (status: 'submitted' | 'approved') => void;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  is_required: boolean;
}

interface ExistingSubmission {
  id: string;
  video_url: string | null;
  status: string;
  submitted_at: string;
}

export const CourseAssignment = ({ courseId, enrollmentId, onComplete }: CourseAssignmentProps) => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<ExistingSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionType, setSubmissionType] = useState<'youtube' | 'drive'>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignment();
  }, [courseId, enrollmentId]);

  const fetchAssignment = async () => {
    setLoading(true);

    // Fetch assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('course_assignments')
      .select('id, title, description, instructions, is_required')
      .eq('course_id', courseId)
      .maybeSingle();

    if (assignmentError || !assignmentData) {
      setLoading(false);
      return;
    }

    setAssignment(assignmentData);

    // Check for existing submission
    const { data: submissionData } = await supabase
      .from('assignment_submissions')
      .select('id, video_url, status, submitted_at')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    if (submissionData) {
      setExistingSubmission(submissionData);
      if (submissionData.video_url) {
        setVideoUrl(submissionData.video_url);
        // Auto-detect type from URL
        if (submissionData.video_url.includes('youtube.com') || submissionData.video_url.includes('youtu.be')) {
          setSubmissionType('youtube');
        } else {
          setSubmissionType('drive');
        }
      }
    }

    setLoading(false);
  };

  const validateUrl = (url: string): boolean => {
    if (submissionType === 'youtube') {
      return url.includes('youtube.com') || url.includes('youtu.be');
    }
    return url.includes('drive.google.com');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!videoUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a video link',
        variant: 'destructive',
      });
      return;
    }

    if (!validateUrl(videoUrl)) {
      toast({
        title: 'Invalid Link',
        description: submissionType === 'youtube' 
          ? 'Please provide a valid YouTube link (youtube.com or youtu.be)'
          : 'Please provide a valid Google Drive link (drive.google.com)',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await callEdgeFunction('process-assignment-submission', {
        assignmentId: assignment?.id,
        enrollmentId,
        videoUrl: videoUrl.trim(),
        submissionType,
      });

      if (error) throw error;

      toast({
        title: 'Assignment Submitted!',
        description: 'Your mentor will review your submission and provide feedback.',
      });

      // Refresh to show updated submission status
      await fetchAssignment();
      onComplete('submitted');

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit assignment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          Loading assignment...
        </CardContent>
      </Card>
    );
  }

  if (!assignment) {
    return null;
  }

  const isApproved = existingSubmission?.status === 'approved';
  const isPending = existingSubmission?.status === 'pending';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          {assignment.title}
          {isApproved && <CheckCircle2 className="h-5 w-5 text-green-600" />}
        </CardTitle>
        {assignment.description && (
          <CardDescription>{assignment.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        {assignment.instructions && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Assignment Instructions</p>
            <div 
              className="prose prose-sm max-w-none p-4 bg-muted/50 rounded-lg [&>h2]:text-base [&>h2]:font-semibold [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:text-sm [&>p]:mb-2 [&>ol]:pl-4 [&>ol]:space-y-1 [&>ul]:pl-4 [&>ul]:space-y-1 [&>li]:text-sm"
              dangerouslySetInnerHTML={createSafeHtml(assignment.instructions)}
            />
          </div>
        )}

        {/* Existing Submission Status */}
        {existingSubmission && (
          <div className={`p-4 rounded-lg border ${
            isApproved ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
            isPending ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' :
            'bg-muted/50 border-border'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {isApproved ? '✅ Assignment Approved' :
                   isPending ? '⏳ Pending Review' :
                   formatSubmissionStatus(existingSubmission.status)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Submitted on {new Date(existingSubmission.submitted_at).toLocaleDateString()}
                </p>
              </div>
              {existingSubmission.video_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={existingSubmission.video_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Submission
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Submission Form - show if not approved */}
        {!isApproved && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label>Submission Type</Label>
              <RadioGroup 
                value={submissionType} 
                onValueChange={(v) => setSubmissionType(v as 'youtube' | 'drive')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="youtube" id="youtube" />
                  <Label htmlFor="youtube" className="flex items-center gap-2 cursor-pointer">
                    <Youtube className="h-4 w-4 text-red-600" />
                    YouTube Link
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="drive" id="drive" />
                  <Label htmlFor="drive" className="flex items-center gap-2 cursor-pointer">
                    <FolderOpen className="h-4 w-4 text-blue-600" />
                    Google Drive Link
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">
                {submissionType === 'youtube' ? 'YouTube Video URL' : 'Google Drive Video URL'}
              </Label>
              <Input
                id="videoUrl"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder={submissionType === 'youtube' 
                  ? 'https://youtube.com/watch?v=... or https://youtu.be/...'
                  : 'https://drive.google.com/file/d/...'}
                required
              />
              <p className="text-xs text-muted-foreground">
                {submissionType === 'youtube' 
                  ? 'Upload your video to YouTube and paste the link here. You can set it as "Unlisted" for privacy.'
                  : 'Upload your video to Google Drive and paste the sharing link here. Make sure to enable "Anyone with the link can view".'}
              </p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : existingSubmission ? (
                'Update Submission'
              ) : (
                'Submit Assignment'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
