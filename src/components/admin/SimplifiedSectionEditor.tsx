import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { 
  GripVertical, Plus, Trash2, ChevronDown, ChevronUp, 
  Save, X, Loader2 
} from 'lucide-react';
import { SimplifiedLessonEditor } from './SimplifiedLessonEditor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface LessonItem {
  id: string;
  title: string;
  content_type: 'text' | 'video' | 'file' | 'audio';
  text_content: string | null;
  video_url: string | null;
  audio_url: string | null;
  file_url: string | null;
  file_name: string | null;
  sort_order: number;
  duration_minutes: number | null;
  drip_delay_days: number | null;
}

interface SimplifiedSectionEditorProps {
  section: Section;
  onDelete: () => void;
  onUpdate?: (updatedSection: Section) => void;
}

export const SimplifiedSectionEditor = ({ section, onDelete, onUpdate }: SimplifiedSectionEditorProps) => {
  const { toast } = useToast();
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(section.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const lessonSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    fetchLessons();
  }, [section.id]);

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('course_content')
      .select('*')
      .eq('section_id', section.id)
      .order('sort_order', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load lessons', variant: 'destructive' });
    } else {
      setLessons((data || []) as LessonItem[]);
    }
    setLoading(false);
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) return;
    setSavingTitle(true);

    const { error } = await supabase
      .from('course_sections')
      .update({ title: editedTitle.trim() })
      .eq('id', section.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update section title', variant: 'destructive' });
    } else {
      onUpdate?.({ ...section, title: editedTitle.trim() });
      setEditingTitle(false);
      toast({ title: 'Saved', description: 'Section title updated' });
    }
    setSavingTitle(false);
  };

  const handleAddLesson = async () => {
    setAddingLesson(true);
    
    const { data, error } = await supabase
      .from('course_content')
      .insert({
        section_id: section.id,
        title: 'New Lesson',
        content_type: 'text',
        sort_order: lessons.length,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create lesson', variant: 'destructive' });
    } else {
      setLessons([...lessons, data as LessonItem]);
      toast({ title: 'Created', description: 'New lesson added' });
    }
    setAddingLesson(false);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const { error } = await supabase
      .from('course_content')
      .delete()
      .eq('id', lessonId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete lesson', variant: 'destructive' });
    } else {
      setLessons(lessons.filter(l => l.id !== lessonId));
      toast({ title: 'Deleted', description: 'Lesson removed' });
    }
  };

  const handleLessonDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);

      const newItems = arrayMove(lessons, oldIndex, newIndex);
      setLessons(newItems);

      // Update sort_order in database
      const updates = newItems.map((item, index) =>
        supabase
          .from('course_content')
          .update({ sort_order: index })
          .eq('id', item.id)
      );

      await Promise.all(updates);
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="h-9 font-semibold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setEditingTitle(false);
                      setEditedTitle(section.title);
                    }
                  }}
                />
                <Button onClick={handleSaveTitle} disabled={savingTitle || !editedTitle.trim()} size="sm" variant="ghost">
                  {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingTitle(false);
                    setEditedTitle(section.title);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h3 
                className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors truncate"
                onClick={() => setEditingTitle(true)}
                title="Click to edit"
              >
                {section.title}
              </h3>
            )}
          </div>
          
          <Badge variant="secondary" className="shrink-0">
            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
          </Badge>
          
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Section</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{section.title}" and all its lessons. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Section
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="p-4 pt-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {lessons.length > 0 && (
                  <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
                    <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {lessons.map((lesson) => (
                          <SimplifiedLessonEditor
                            key={lesson.id}
                            item={lesson}
                            onDelete={() => handleDeleteLesson(lesson.id)}
                            onUpdate={fetchLessons}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
                
                {/* Add Lesson Button - Large touch target */}
                <Button 
                  variant="outline" 
                  onClick={handleAddLesson}
                  disabled={addingLesson}
                  className="w-full h-12 border-dashed text-muted-foreground hover:text-foreground"
                >
                  {addingLesson ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5 mr-2" />
                  )}
                  Add Lesson
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
