import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import { createSafeHtml } from '@/lib/sanitize-html';

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
  google_form_url: string | null;
}

// Legacy fallback for courses without a custom form URL
const LEGACY_GOOGLE_FORM_EMBED_URL = 'https://docs.google.com/forms/d/1UNC2B8aRJzQX2xOZmeEsGiwmq7o2viwgL-ALx01ZYLs/viewform?embedded=true';

export const CourseAssignment = ({ courseId, enrollmentId, onComplete }: CourseAssignmentProps) => {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignment();
  }, [courseId]);

  const fetchAssignment = async () => {
    setLoading(true);

    const { data: assignmentData, error: assignmentError } = await supabase
      .from('course_assignments')
      .select('id, title, description, instructions, is_required, google_form_url')
      .eq('course_id', courseId)
      .maybeSingle();

    if (assignmentError || !assignmentData) {
      setLoading(false);
      return;
    }

    setAssignment(assignmentData);
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading assignment...
        </CardContent>
      </Card>
    );
  }

  if (!assignment) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          {assignment.title}
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

        {/* Embedded Google Form */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Submit Your Assignment</p>
          {assignment.google_form_url || LEGACY_GOOGLE_FORM_EMBED_URL ? (
            <div className="w-full rounded-lg overflow-hidden border bg-background">
              <iframe
                src={getEmbedUrl(assignment.google_form_url || LEGACY_GOOGLE_FORM_EMBED_URL)}
                width="100%"
                height="800"
                frameBorder="0"
                marginHeight={0}
                marginWidth={0}
                title="Assignment Submission Form"
                className="w-full"
              >
                Loading form...
              </iframe>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground bg-muted rounded-lg">
              No submission form configured for this assignment.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper to ensure URL has embed parameters
function getEmbedUrl(url: string): string {
  if (!url) return '';
  let embedUrl = url;
  // Ensure it ends with viewform or has embedded=true
  if (!embedUrl.includes('viewform')) {
    embedUrl = embedUrl.replace('/edit', '/viewform');
  }
  if (!embedUrl.includes('embedded=true')) {
    embedUrl += embedUrl.includes('?') ? '&embedded=true' : '?embedded=true';
  }
  return embedUrl;
}
