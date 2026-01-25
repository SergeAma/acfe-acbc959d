import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, GripVertical, Pencil, Save, X, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { SimpleLessonEditor } from '../SimpleLessonEditor';
import { RichTextEditor } from '@/components/RichTextEditor';
import { createSafeHtml } from '@/lib/sanitize-html';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

/**
 * Lessons Tab
 * 
 * TAB 2 of 3 in simplified course builder
 * Contains: Sections and Lessons management
 * 
 * DESIGN:
 * - Add Section → Add Lesson → Add Content flow
 * - Drag-and-drop reordering
 * - Each lesson has: Title, optional Text, optional Media
 */

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

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

interface LessonsTabProps {
  courseId: string;
}

// Sortable Section Component
const SortableSection = ({ 
  section, 
  lessons,
  onDelete,
  onUpdate,
  onAddLesson,
  onDeleteLesson,
  onUpdateLesson,
  onReorderLessons,
}: {
  section: Section;
  lessons: Lesson[];
  onDelete: () => void;
  onUpdate: (updates: Partial<Section>) => void;
  onAddLesson: () => void;
  onDeleteLesson: (lessonId: string) => void;
  onUpdateLesson: () => void;
  onReorderLessons: (newOrder: Lesson[]) => void;
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(section.description || '');
  const [savingDescription, setSavingDescription] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const lessonSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = lessons.findIndex((l) => l.id === active.id);
      const newIndex = lessons.findIndex((l) => l.id === over.id);
      onReorderLessons(arrayMove(lessons, oldIndex, newIndex));
    }
  };

  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    setSavingTitle(true);
    const { error } = await supabase
      .from('course_sections')
      .update({ title: title.trim() })
      .eq('id', section.id);
    
    if (!error) {
      onUpdate({ title: title.trim() });
      setEditingTitle(false);
    }
    setSavingTitle(false);
  };

  const handleSaveDescription = async () => {
    setSavingDescription(true);
    const { error } = await supabase
      .from('course_sections')
      .update({ description: description.trim() || null })
      .eq('id', section.id);
    
    if (!error) {
      onUpdate({ description: description.trim() || null });
      setEditingDescription(false);
    }
    setSavingDescription(false);
  };

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-4 border-b bg-muted/50">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="flex-1">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') { setEditingTitle(false); setTitle(section.title); }
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleSaveTitle} disabled={savingTitle}>
                  {savingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingTitle(false); setTitle(section.title); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 group hover:text-primary transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                <span className="font-semibold text-lg">{section.title}</span>
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          <span className="text-sm text-muted-foreground">{lessons.length} lessons</span>

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                <AlertDialogTitle>Delete Section</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete "{section.title}" and all its lessons. This cannot be undone.
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
          <CardContent className="pt-4 space-y-4">
            {/* Section description */}
            {editingDescription ? (
              <div className="space-y-2">
                <Label>Section Description (optional)</Label>
                <RichTextEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Brief description of this section..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveDescription} disabled={savingDescription}>
                    {savingDescription ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingDescription(false); setDescription(section.description || ''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : section.description ? (
              <div 
                className="group cursor-pointer p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                onClick={() => setEditingDescription(true)}
              >
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={createSafeHtml(section.description)} />
                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditingDescription(true)} className="text-muted-foreground">
                + Add section description
              </Button>
            )}

            {/* Lessons */}
            <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
              <SortableContext items={lessons.map(l => l.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <SimpleLessonEditor
                      key={lesson.id}
                      lesson={lesson}
                      onDelete={() => onDeleteLesson(lesson.id)}
                      onUpdate={onUpdateLesson}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button variant="outline" onClick={onAddLesson} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Lesson
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const LessonsTab = ({ courseId }: LessonsTabProps) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [lessonsBySection, setLessonsBySection] = useState<Record<string, Lesson[]>>({});
  const [loading, setLoading] = useState(true);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const sectionSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchSectionsAndLessons();
  }, [courseId]);

  const fetchSectionsAndLessons = async () => {
    setLoading(true);

    // Fetch sections
    const { data: sectionsData } = await supabase
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order');

    if (sectionsData) {
      setSections(sectionsData);

      // Fetch lessons for all sections
      const { data: lessonsData } = await supabase
        .from('course_content')
        .select('*')
        .in('section_id', sectionsData.map(s => s.id))
        .order('sort_order');

      if (lessonsData) {
        const grouped: Record<string, Lesson[]> = {};
        sectionsData.forEach(s => grouped[s.id] = []);
        lessonsData.forEach((l: any) => {
          if (grouped[l.section_id]) {
            grouped[l.section_id].push(l);
          }
        });
        setLessonsBySection(grouped);
      }
    }

    setLoading(false);
  };

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim()) return;

    const { data, error } = await supabase
      .from('course_sections')
      .insert({
        course_id: courseId,
        title: newSectionTitle.trim(),
        sort_order: sections.length,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create section', variant: 'destructive' });
    } else {
      setSections([...sections, data]);
      setLessonsBySection({ ...lessonsBySection, [data.id]: [] });
      setNewSectionTitle('');
      setNewSectionOpen(false);
      toast({ title: 'Created', description: 'Section added' });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const { error } = await supabase.from('course_sections').delete().eq('id', sectionId);
    if (!error) {
      setSections(sections.filter(s => s.id !== sectionId));
      const updated = { ...lessonsBySection };
      delete updated[sectionId];
      setLessonsBySection(updated);
      toast({ title: 'Deleted', description: 'Section removed' });
    }
  };

  const handleAddLesson = async (sectionId: string) => {
    const currentLessons = lessonsBySection[sectionId] || [];
    const { data, error } = await supabase
      .from('course_content')
      .insert({
        section_id: sectionId,
        title: 'New Lesson',
        content_type: 'text', // Default type
        sort_order: currentLessons.length,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create lesson', variant: 'destructive' });
    } else {
      setLessonsBySection({
        ...lessonsBySection,
        [sectionId]: [...currentLessons, data as Lesson],
      });
    }
  };

  const handleDeleteLesson = async (sectionId: string, lessonId: string) => {
    const { error } = await supabase.from('course_content').delete().eq('id', lessonId);
    if (!error) {
      setLessonsBySection({
        ...lessonsBySection,
        [sectionId]: lessonsBySection[sectionId].filter(l => l.id !== lessonId),
      });
      toast({ title: 'Deleted', description: 'Lesson removed' });
    }
  };

  const handleReorderLessons = async (sectionId: string, newOrder: Lesson[]) => {
    setLessonsBySection({ ...lessonsBySection, [sectionId]: newOrder });

    // Update sort orders in database
    await Promise.all(
      newOrder.map((lesson, index) =>
        supabase.from('course_content').update({ sort_order: index }).eq('id', lesson.id)
      )
    );
  };

  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      const newOrder = arrayMove(sections, oldIndex, newIndex);
      setSections(newOrder);

      // Update sort orders in database
      await Promise.all(
        newOrder.map((section, index) =>
          supabase.from('course_sections').update({ sort_order: index }).eq('id', section.id)
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Course Content</h2>
          <p className="text-sm text-muted-foreground">
            {sections.length} sections, {Object.values(lessonsBySection).flat().length} lessons
          </p>
        </div>
        <Dialog open={newSectionOpen} onOpenChange={setNewSectionOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Section Title</Label>
                <Input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g., Introduction"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSection(); }}
                />
              </div>
              <Button onClick={handleCreateSection} className="w-full" disabled={!newSectionTitle.trim()}>
                Create Section
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-semibold mb-2">No sections yet</h3>
            <p className="text-muted-foreground mb-4">Create your first section to start adding lessons</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sectionSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  lessons={lessonsBySection[section.id] || []}
                  onDelete={() => handleDeleteSection(section.id)}
                  onUpdate={(updates) => setSections(sections.map(s => s.id === section.id ? { ...s, ...updates } : s))}
                  onAddLesson={() => handleAddLesson(section.id)}
                  onDeleteLesson={(lessonId) => handleDeleteLesson(section.id, lessonId)}
                  onUpdateLesson={fetchSectionsAndLessons}
                  onReorderLessons={(newOrder) => handleReorderLessons(section.id, newOrder)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
