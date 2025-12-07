import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Pencil, Save, X } from 'lucide-react';
import { SectionEditor } from '@/components/admin/SectionEditor';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';

interface Course {
  id: string;
  title: string;
  description: string;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

export const AdminCourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSectionOpen, setNewSectionOpen] = useState(false);
  const [newSectionData, setNewSectionData] = useState({ title: '', description: '' });
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    if (!courseId) return;

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      toast({
        title: 'Error',
        description: 'Failed to load course',
        variant: 'destructive',
      });
      return;
    }

    const { data: sectionsData, error: sectionsError } = await supabase
      .from('course_sections')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true });

    if (sectionsError) {
      toast({
        title: 'Error',
        description: 'Failed to load sections',
        variant: 'destructive',
      });
    }

    setCourse(courseData);
    setEditedDescription(courseData?.description || '');
    setEditedTitle(courseData?.title || '');
    setSections(sectionsData || []);
    setLoading(false);
  };

  const handleSaveTitle = async () => {
    if (!courseId || !editedTitle.trim()) return;
    setSavingTitle(true);

    const { error } = await supabase
      .from('courses')
      .update({ title: editedTitle.trim() })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update title',
        variant: 'destructive',
      });
    } else {
      setCourse(prev => prev ? { ...prev, title: editedTitle.trim() } : null);
      setEditingTitle(false);
      toast({
        title: 'Success',
        description: 'Title updated',
      });
    }
    setSavingTitle(false);
  };

  const handleSaveDescription = async () => {
    if (!courseId) return;
    setSavingDescription(true);

    const { error } = await supabase
      .from('courses')
      .update({ description: editedDescription })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update description',
        variant: 'destructive',
      });
    } else {
      setCourse(prev => prev ? { ...prev, description: editedDescription } : null);
      setEditingDescription(false);
      toast({
        title: 'Success',
        description: 'Description updated',
      });
    }
    setSavingDescription(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex);
      setSections(newSections);

      // Update sort_order in database
      const updates = newSections.map((section, index) =>
        supabase
          .from('course_sections')
          .update({ sort_order: index })
          .eq('id', section.id)
      );

      await Promise.all(updates);
    }
  };

  const handleCreateSection = async () => {
    if (!courseId || !newSectionData.title) return;

    const { data, error } = await supabase
      .from('course_sections')
      .insert({
        course_id: courseId,
        title: newSectionData.title,
        description: newSectionData.description || null,
        sort_order: sections.length,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create section',
        variant: 'destructive',
      });
    } else {
      setSections([...sections, data]);
      setNewSectionData({ title: '', description: '' });
      setNewSectionOpen(false);
      toast({
        title: 'Success',
        description: 'Section created',
      });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    const { error } = await supabase
      .from('course_sections')
      .delete()
      .eq('id', sectionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete section',
        variant: 'destructive',
      });
    } else {
      setSections(sections.filter((s) => s.id !== sectionId));
      toast({
        title: 'Success',
        description: 'Section deleted',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate('/admin/courses')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <div className="mb-8">
          {editingTitle ? (
            <div className="flex items-center gap-2 mb-4">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-3xl font-bold h-auto py-2"
                autoFocus
              />
              <Button onClick={handleSaveTitle} disabled={savingTitle || !editedTitle.trim()} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {savingTitle ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEditingTitle(false);
                  setEditedTitle(course?.title || '');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-4 group">
              <h1 className="text-4xl font-bold">{course?.title}</h1>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingTitle(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {editingDescription ? (
            <div className="space-y-4">
              <RichTextEditor
                content={editedDescription}
                onChange={setEditedDescription}
                placeholder="Describe what students will learn in this course..."
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveDescription} disabled={savingDescription} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  {savingDescription ? 'Saving...' : 'Save'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setEditingDescription(false);
                    setEditedDescription(course?.description || '');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <div 
                className="rich-text-content max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: course?.description || '<p>No description</p>' }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={() => setEditingDescription(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Description
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Course Content</h2>
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
                  <Label htmlFor="section-title">Section Title *</Label>
                  <Input
                    id="section-title"
                    value={newSectionData.title}
                    onChange={(e) => setNewSectionData({ ...newSectionData, title: e.target.value })}
                    placeholder="e.g., Introduction to JavaScript"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section-description">Description (optional)</Label>
                  <Textarea
                    id="section-description"
                    value={newSectionData.description}
                    onChange={(e) => setNewSectionData({ ...newSectionData, description: e.target.value })}
                    placeholder="Brief description of this section"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateSection} className="w-full" disabled={!newSectionData.title}>
                  Create Section
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No sections yet</h3>
              <p className="text-muted-foreground mb-4">Create your first section to start building the course</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sections.map((section) => (
                  <SectionEditor
                    key={section.id}
                    section={section}
                    onDelete={() => handleDeleteSection(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};
