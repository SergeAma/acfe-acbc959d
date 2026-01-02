import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, FileUp, Video, FileText, Briefcase, Save, Loader2 } from 'lucide-react';
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
  allow_video: boolean;
  allow_file: boolean;
  allow_text: boolean;
}

export const AssignmentBuilder = ({ courseId }: AssignmentBuilderProps) => {
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [localInstructions, setLocalInstructions] = useState<string>('');
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [savingInstructions, setSavingInstructions] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [courseId]);

  const fetchAssignment = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('course_assignments')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching assignment:', error);
    } else {
      setAssignment(data);
      setLocalInstructions(data?.instructions || '');
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

Submit your work showcasing what you've learned in this course. Your submission can include:

1. **Video Pitch** - Record a 2-5 minute video explaining your project or solution
2. **Written Description** - Provide context and details about your work  
3. **Supporting Files** - Upload any relevant documents, code, or presentations

### Tips for a Great Submission:
- Be clear and concise
- Demonstrate practical application of course concepts
- Show your unique perspective and creativity

This assignment will be reviewed by your mentor and shared with Spectrogram Consulting for potential job opportunities.`,
        is_required: true,
        allow_video: true,
        allow_file: true,
        allow_text: true,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create assignment', variant: 'destructive' });
    } else {
      setAssignment(data);
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
            Submissions are shared with Spectrogram Consulting for job opportunities.
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
          Students submit this assignment which is shared with Spectrogram Consulting
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

        {/* Submission Types */}
        <div className="space-y-4">
          <Label>Allowed Submission Types</Label>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Video className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">Video</p>
                <p className="text-xs text-muted-foreground">Video pitch or demo</p>
              </div>
              <Switch
                checked={assignment.allow_video}
                onCheckedChange={(checked) => {
                  setAssignment({ ...assignment, allow_video: checked });
                  updateAssignment({ allow_video: checked });
                }}
              />
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">Text</p>
                <p className="text-xs text-muted-foreground">Written response</p>
              </div>
              <Switch
                checked={assignment.allow_text}
                onCheckedChange={(checked) => {
                  setAssignment({ ...assignment, allow_text: checked });
                  updateAssignment({ allow_text: checked });
                }}
              />
            </div>
            
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium text-sm">File</p>
                <p className="text-xs text-muted-foreground">Upload documents</p>
              </div>
              <Switch
                checked={assignment.allow_file}
                onCheckedChange={(checked) => {
                  setAssignment({ ...assignment, allow_file: checked });
                  updateAssignment({ allow_file: checked });
                }}
              />
            </div>
          </div>
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

        {/* Spectrogram Info */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-background flex items-center justify-center border">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Shared with Spectrogram Consulting</p>
              <p className="text-xs text-muted-foreground mt-1">
                Assignment submissions are automatically shared with Spectrogram Consulting's talent network. Students can use these submissions when applying for jobs through the Spectrogram platform.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
