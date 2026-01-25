import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { GripVertical, Trash2, Save, Loader2, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';
import { UnifiedMediaInput } from './UnifiedMediaInput';
import type { MediaType } from './UnifiedMediaInput';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

/**
 * Simplified Lesson Editor
 * 
 * DESIGN PRINCIPLES:
 * - Each lesson has: Title, optional Text, optional Media
 * - No content_type selection - auto-detected
 * - Single media block (not separate video/audio buttons)
 * - Lesson-first design: Add lesson → Add content
 * 
 * SCHEMA (course_content):
 * - title: string
 * - text_content: string | null
 * - video_url: string | null (also used for audio - renamed in future migration)
 * - audio_url: string | null
 * - duration_minutes: number | null
 * - drip_delay_days: number | null
 */
interface Lesson {
  id: string;
  title: string;
  text_content: string | null;
  video_url: string | null;
  audio_url: string | null;
  duration_minutes: number | null;
  drip_delay_days: number | null;
  sort_order: number;
}

interface SimpleLessonEditorProps {
  lesson: Lesson;
  onDelete: () => void;
  onUpdate: () => void;
}

export const SimpleLessonEditor = ({
  lesson,
  onDelete,
  onUpdate,
}: SimpleLessonEditorProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [textContent, setTextContent] = useState(lesson.text_content || '');
  const [savingText, setSavingText] = useState(false);
  const [hasUnsavedText, setHasUnsavedText] = useState(false);

  // Drag and drop
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sync with prop changes
  useEffect(() => {
    setTitle(lesson.title);
    setTextContent(lesson.text_content || '');
    setHasUnsavedText(false);
  }, [lesson]);

  // Get current media URL (prefer video_url, fallback to audio_url)
  const currentMediaUrl = lesson.video_url || lesson.audio_url;

  // Save title
  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    setSavingTitle(true);

    const { error } = await supabase
      .from('course_content')
      .update({ title: title.trim() })
      .eq('id', lesson.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save title',
        variant: 'destructive',
      });
    } else {
      setEditingTitle(false);
      onUpdate();
    }
    setSavingTitle(false);
  };

  // Save text content
  const handleSaveText = async () => {
    setSavingText(true);

    const { error } = await supabase
      .from('course_content')
      .update({ text_content: textContent.trim() || null })
      .eq('id', lesson.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save content',
        variant: 'destructive',
      });
    } else {
      setHasUnsavedText(false);
      toast({
        title: 'Saved',
        description: 'Lesson content updated',
      });
      onUpdate();
    }
    setSavingText(false);
  };

  // Handle media change from UnifiedMediaInput
  const handleMediaChange = async (media: { url: string; type: MediaType } | null) => {
    const updates: Record<string, any> = {
      video_url: null,
      audio_url: null,
    };

    if (media) {
      // Store based on detected type
      if (media.type === 'video') {
        updates.video_url = media.url;
      } else {
        updates.audio_url = media.url;
      }
    }

    const { error } = await supabase
      .from('course_content')
      .update(updates)
      .eq('id', lesson.id);

    if (error) {
      throw error;
    }

    onUpdate();
  };

  // Track text changes
  const handleTextChange = (content: string) => {
    setTextContent(content);
    setHasUnsavedText(content !== (lesson.text_content || ''));
  };

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
          {/* Drag handle */}
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Title (inline editable) */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setEditingTitle(false);
                      setTitle(lesson.title);
                    }
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleSaveTitle} disabled={savingTitle}>
                  {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setTitle(lesson.title); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 text-left w-full group hover:text-primary transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                <span className="font-medium truncate">{lesson.title}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {currentMediaUrl && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Has media
              </span>
            )}
            {hasUnsavedText && (
              <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                Unsaved
              </span>
            )}
          </div>

          {/* Actions */}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{lesson.title}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-4 space-y-6">
            {/* Text content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Lesson Text (optional)</label>
                {hasUnsavedText && (
                  <Button size="sm" onClick={handleSaveText} disabled={savingText}>
                    {savingText ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Text
                  </Button>
                )}
              </div>
              <RichTextEditor
                content={textContent}
                onChange={handleTextChange}
                placeholder="Add lesson content, instructions, or notes..."
              />
            </div>

            {/* Media input */}
            <UnifiedMediaInput
              currentUrl={currentMediaUrl}
              onMediaChange={handleMediaChange}
              contentId={lesson.id}
              context="lesson"
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
