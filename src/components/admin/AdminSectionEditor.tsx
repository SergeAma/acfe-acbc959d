import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Loader2 } from 'lucide-react';
import { AdminLessonEditor } from './AdminLessonEditor';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface LessonItem {
  id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  video_url: string | null;
  sort_order: number;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  content?: LessonItem[];
}

interface AdminSectionEditorProps {
  section: Section;
  onDelete: () => void;
  onUpdate: () => void;
}

export const AdminSectionEditor = ({ section, onDelete, onUpdate }: AdminSectionEditorProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [title, setTitle] = useState(section.title);
  const [lessons, setLessons] = useState<LessonItem[]>(section.content || []);
  const [addingLesson, setAddingLesson] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    setLessons(section.content || []);
    setTitle(section.title);
  }, [section]);

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from('course_content')
      .select('id, title, content_type, text_content, video_url, sort_order')
      .eq('section_id', section.id)
      .order('sort_order');

    if (!error && data) {
      setLessons(data);
    }
  };

  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    
    setSavingTitle(true);
    const { error } = await supabase
      .from('course_sections')
      .update({ title: title.trim() })
      .eq('id', section.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save section title', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Section title updated' });
      onUpdate();
    }
    setSavingTitle(false);
  };

  const handleAddLesson = async () => {
    setAddingLesson(true);
    const maxOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.sort_order)) : 0;
    
    const { data, error } = await supabase
      .from('course_content')
      .insert({
        section_id: section.id,
        title: 'New Lesson',
        content_type: 'text',
        sort_order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add lesson', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Lesson added' });
      await fetchLessons();
      onUpdate();
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
      toast({ title: 'Deleted', description: 'Lesson removed' });
      await fetchLessons();
      onUpdate();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex(l => l.id === active.id);
    const newIndex = lessons.findIndex(l => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...lessons];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);

    // Update local state immediately for UI responsiveness
    setLessons(reordered);

    // Update sort_order in database
    const updates = reordered.map((lesson, index) => 
      supabase
        .from('course_content')
        .update({ sort_order: index })
        .eq('id', lesson.id)
    );

    try {
      await Promise.all(updates);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reorder lessons', variant: 'destructive' });
      await fetchLessons(); // Revert to actual order
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden border-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="p-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            
            <div className="flex-1 min-w-0">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title !== section.title && title.trim()) {
                    handleSaveTitle();
                  }
                }}
                placeholder="Section title..."
                className="h-10 text-lg font-semibold bg-background"
              />
            </div>

            <span className="text-sm text-muted-foreground hidden sm:block">
              {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            </span>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete} 
              className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-4 space-y-4">
            {/* Lessons List */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <AdminLessonEditor
                      key={lesson.id}
                      item={lesson}
                      onDelete={() => handleDeleteLesson(lesson.id)}
                      onUpdate={fetchLessons}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {lessons.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p className="mb-2">No lessons yet</p>
                <p className="text-sm">Add your first lesson to this section</p>
              </div>
            )}

            {/* Add Lesson Button */}
            <Button 
              onClick={handleAddLesson} 
              disabled={addingLesson}
              variant="outline" 
              className="w-full h-12 border-dashed"
            >
              {addingLesson ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Lesson
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
