import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Briefcase, Save, Loader2, ExternalLink } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';

interface AssignmentBuilderProps {
  courseId: string;
}

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  is_required: boolean;
  google_form_url: string | null;
}

const DEFAULT_GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/1UNC2B8aRJzQX2xOZmeEsGiwmq7o2viwgL-ALx01ZYLs/edit';

export const AssignmentBuilder = ({ courseId }: AssignmentBuilderProps) => {
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localInstructions, setLocalInstructions] = useState<string>('');
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [localFormUrl, setLocalFormUrl] = useState<string>('');
  const [savingFormUrl, setSavingFormUrl] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [courseId]);

  const fetchAssignment = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('course_assignments')
      .select('id, course_id, title, description, instructions, is_required, google_form_url')
      .eq('course_id', courseId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching assignment:', error);
    } else {
      setAssignment(data);
      setLocalInstructions(data?.instructions || '');
      setLocalFormUrl(data?.google_form_url || '');
    }
    
    setLoading(false);
  };

  const createAssignment = async () => {
    setSaving(true);
    
    const { data, error } = await supabase
      .from('course_assignments')
      .insert({
        course_id: courseId,
        title: 'Course Assignment',
        description: 'Complete this assignment to demonstrate your understanding of the course material.',
        instructions: `## Assignment Instructions

Submit your work showcasing what you've learned in this course via the embedded Google Form below.

### Tips for a Great Submission:
- Be clear and concise
- Demonstrate practical application of course concepts
- Show your unique perspective and creativity

This assignment will be reviewed by your mentor.`,
        is_required: true,
        allow_video: false,
        allow_file: false,
        allow_text: false,
        google_form_url: null,
      })
      .select('id, course_id, title, description, instructions, is_required, google_form_url')
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create assignment', variant: 'destructive' });
    } else {
      setAssignment(data);
      setLocalInstructions(data.instructions || '');
      toast({ title: 'Success', description: 'Assignment created' });
    }
    
    setSaving(false);
  };

  const updateAssignment = async (updates: Partial<Assignment>) => {
    if (!assignment) return;
    
    const { error } = await supabase
      .from('course_assignments')
      .update(updates)
      .eq('id', assignment.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update assignment', variant: 'destructive' });
    } else {
      setAssignment({ ...assignment, ...updates });
    }
  };

  const saveInstructions = async () => {
    if (!assignment) return;
    
    setSavingInstructions(true);
    
    const { error } = await supabase
      .from('course_assignments')
      .update({ instructions: localInstructions })
      .eq('id', assignment.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save instructions', variant: 'destructive' });
    } else {
      setAssignment({ ...assignment, instructions: localInstructions });
      setInstructionsDirty(false);
      toast({ title: 'Saved', description: 'Instructions saved successfully' });
    }
    
    setSavingInstructions(false);
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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Course Assignment
          </CardTitle>
          <CardDescription>
            Create an assignment that students must complete before receiving their certificate.
            Submissions are collected via Google Form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createAssignment} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Course Assignment
        </CardTitle>
        <CardDescription>
          Students submit assignments via embedded Google Form
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assignment Settings */}
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Assignment Title</Label>
            <Input
              value={assignment.title}
              onChange={(e) => setAssignment({ ...assignment, title: e.target.value })}
              onBlur={() => updateAssignment({ title: assignment.title })}
              placeholder="Assignment title"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Brief Description</Label>
            <Input
              value={assignment.description || ''}
              onChange={(e) => setAssignment({ ...assignment, description: e.target.value })}
              onBlur={() => updateAssignment({ description: assignment.description })}
              placeholder="Brief description of the assignment"
            />
          </div>
        </div>

        {/* Instructions Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Detailed Instructions</Label>
            <Button 
              onClick={saveInstructions} 
              disabled={!instructionsDirty || savingInstructions}
              size="sm"
              className="gap-2"
            >
              {savingInstructions ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Instructions
                </>
              )}
            </Button>
          </div>
          <RichTextEditor
            content={localInstructions}
            onChange={(content) => {
              setLocalInstructions(content);
              setInstructionsDirty(true);
            }}
            placeholder="Write detailed instructions for the assignment..."
          />
          {instructionsDirty && (
            <p className="text-xs text-amber-600">You have unsaved changes</p>
          )}
        </div>

        {/* Required Toggle */}
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <Switch
            checked={assignment.is_required}
            onCheckedChange={(checked) => {
              setAssignment({ ...assignment, is_required: checked });
              updateAssignment({ is_required: checked });
            }}
          />
          <div>
            <p className="font-medium text-sm">Required for certificate</p>
            <p className="text-xs text-muted-foreground">
              Students must complete this assignment before receiving their course certificate
            </p>
          </div>
        </div>

        {/* Google Form URL Input */}
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="google-form-url">Google Form URL</Label>
            <Button 
              onClick={async () => {
                if (!assignment) return;
                setSavingFormUrl(true);
                const { error } = await supabase
                  .from('course_assignments')
                  .update({ google_form_url: localFormUrl || null })
                  .eq('id', assignment.id);
                if (error) {
                  toast({ title: 'Error', description: 'Failed to save form URL', variant: 'destructive' });
                } else {
                  setAssignment({ ...assignment, google_form_url: localFormUrl || null });
                  toast({ title: 'Saved', description: 'Google Form URL updated' });
                }
                setSavingFormUrl(false);
              }}
              disabled={savingFormUrl || localFormUrl === (assignment?.google_form_url || '')}
              size="sm"
              className="gap-2"
            >
              {savingFormUrl ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save URL
                </>
              )}
            </Button>
          </div>
          <Input
            id="google-form-url"
            value={localFormUrl}
            onChange={(e) => setLocalFormUrl(e.target.value)}
            placeholder="https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform"
          />
          <p className="text-xs text-muted-foreground">
            Paste the full Google Form URL. Students will see this form embedded on the assignment page.
          </p>
          {localFormUrl && (
            <a 
              href={localFormUrl.replace('/viewform', '/edit').replace('?embedded=true', '')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Edit Form in Google
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
