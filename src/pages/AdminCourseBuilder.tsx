import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Pencil, Save, X, Upload, Image, Eye, Award, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionEditor } from '@/components/admin/SectionEditor';
import { ThumbnailDropzone } from '@/components/admin/ThumbnailDropzone';
import { CoursePrerequisites } from '@/components/admin/CoursePrerequisites';
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
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  mentor_id: string;
  certificate_enabled: boolean;
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
  const location = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isAdminRoute = location.pathname.startsWith('/admin');
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
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [certificateEnabled, setCertificateEnabled] = useState(true);
  const [showEditingTip, setShowEditingTip] = useState(() => {
    return localStorage.getItem('courseBuilderTipDismissed') !== 'true';
  });

  const dismissEditingTip = () => {
    localStorage.setItem('courseBuilderTipDismissed', 'true');
    setShowEditingTip(false);
  };

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
    setCertificateEnabled(courseData?.certificate_enabled ?? true);
    setSections(sectionsData || []);
    setLoading(false);
  };

  const handleCertificateToggle = async (enabled: boolean) => {
    if (!courseId) return;
    
    setCertificateEnabled(enabled);
    const { error } = await supabase
      .from('courses')
      .update({ certificate_enabled: enabled })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update certificate setting',
        variant: 'destructive',
      });
      setCertificateEnabled(!enabled);
    } else {
      setCourse(prev => prev ? { ...prev, certificate_enabled: enabled } : null);
      toast({
        title: 'Success',
        description: `Certificates ${enabled ? 'enabled' : 'disabled'}`,
      });
    }
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

  const handleThumbnailUpload = async (file: File) => {
    if (!file || !courseId) return;

    setUploadingThumbnail(true);

    try {
      const fileName = `${courseId}-thumbnail.jpg`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-files')
        .upload(filePath, file, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('course-files')
        .getPublicUrl(filePath);

      // Add cache-busting query param to force refresh
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('courses')
        .update({ thumbnail_url: urlWithCacheBust })
        .eq('id', courseId);

      if (updateError) {
        throw updateError;
      }

      setCourse(prev => prev ? { ...prev, thumbnail_url: urlWithCacheBust } : null);
      toast({
        title: 'Success',
        description: 'Thumbnail uploaded',
      });
    } catch (error) {
      console.error('Thumbnail upload error:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload thumbnail. Please try a different image.',
        variant: 'destructive',
      });
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSectionUpdate = (updatedSection: Section) => {
    setSections(prev => prev.map(s => s.id === updatedSection.id ? updatedSection : s));
  };

  const handleDuplicateSection = async (sectionId: string) => {
    const sectionToDuplicate = sections.find(s => s.id === sectionId);
    if (!sectionToDuplicate || !courseId) return;

    // First, create the new section
    const { data: newSection, error: sectionError } = await supabase
      .from('course_sections')
      .insert({
        course_id: courseId,
        title: `${sectionToDuplicate.title} (Copy)`,
        description: sectionToDuplicate.description,
        sort_order: sections.length,
      })
      .select()
      .single();

    if (sectionError || !newSection) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate section',
        variant: 'destructive',
      });
      return;
    }

    // Fetch content items from original section
    const { data: originalContent } = await supabase
      .from('course_content')
      .select('*')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true });

    // Duplicate content items
    if (originalContent && originalContent.length > 0) {
      const newContent = originalContent.map((item, index) => ({
        section_id: newSection.id,
        title: item.title,
        content_type: item.content_type,
        text_content: item.text_content,
        video_url: item.video_url,
        file_url: item.file_url,
        file_name: item.file_name,
        duration_minutes: item.duration_minutes,
        drip_delay_days: item.drip_delay_days,
        sort_order: index,
      }));

      await supabase.from('course_content').insert(newContent);
    }

    setSections([...sections, newSection as Section]);
    toast({
      title: 'Success',
      description: 'Section duplicated with all content',
    });
  };

  const handleMoveContent = async (contentId: string, fromSectionId: string, toSectionId: string) => {
    // Get the count of items in the target section to set sort_order
    const { data: targetItems } = await supabase
      .from('course_content')
      .select('id')
      .eq('section_id', toSectionId);

    const newSortOrder = targetItems?.length || 0;

    const { error } = await supabase
      .from('course_content')
      .update({ 
        section_id: toSectionId,
        sort_order: newSortOrder 
      })
      .eq('id', contentId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to move content',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Content moved to new section',
      });
    }
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
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => navigate(isAdminRoute ? '/admin/courses' : '/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {isAdminRoute ? 'Back to Courses' : 'Back to Dashboard'}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Course
          </Button>
        </div>

        {showEditingTip && (
          <Alert className="mb-6 bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                <strong>Tip:</strong> Click directly on titles and descriptions to edit them. Look for the <Pencil className="h-3 w-3 inline mx-1" /> icon on hover.
              </span>
              <Button variant="ghost" size="sm" onClick={dismissEditingTip} className="ml-4 h-6 px-2">
                Got it
              </Button>
            </AlertDescription>
          </Alert>
        )}

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

          {/* Thumbnail Upload */}
          <div className="mt-6">
            <label className="text-sm font-medium mb-3 block">Course Thumbnail</label>
            <div className="max-w-md">
              <ThumbnailDropzone
                currentThumbnail={course?.thumbnail_url}
                onUpload={handleThumbnailUpload}
                uploading={uploadingThumbnail}
                courseTitle={course?.title}
              />
            </div>
          </div>
        </div>

        {/* Course Settings Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Prerequisites */}
          {course && user && (
            <CoursePrerequisites courseId={course.id} mentorId={course.mentor_id} />
          )}

          {/* Certificate Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5" />
                Completion Certificate
              </CardTitle>
              <CardDescription>
                Issue certificates to students who complete this course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="certificate-toggle">Enable certificates</Label>
                  <p className="text-sm text-muted-foreground">
                    Students will receive a certificate upon completing all lessons
                  </p>
                </div>
                <Switch
                  id="certificate-toggle"
                  checked={certificateEnabled}
                  onCheckedChange={handleCertificateToggle}
                />
              </div>
            </CardContent>
          </Card>
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
                    onUpdate={handleSectionUpdate}
                    onDuplicate={() => handleDuplicateSection(section.id)}
                    allSections={sections}
                    onMoveContent={handleMoveContent}
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
