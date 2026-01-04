import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Pencil, Save, X, Upload, Image, Eye, Award, Info, DollarSign, Globe, EyeOff, Users, CheckCircle, BarChart3, Clock, Zap, Radio, Video, Link2, Calendar, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionEditor } from '@/components/admin/SectionEditor';
import { ThumbnailDropzone } from '@/components/admin/ThumbnailDropzone';
import { CoursePrerequisites } from '@/components/admin/CoursePrerequisites';
import { QuizBuilder } from '@/components/admin/QuizBuilder';
import { AssignmentBuilder } from '@/components/admin/AssignmentBuilder';
import { CourseDescriptionMedia } from '@/components/admin/CourseDescriptionMedia';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createSafeHtml } from '@/lib/sanitize-html';

interface Course {
  id: string;
  title: string;
  description: string;
  description_video_url: string | null;
  description_audio_url: string | null;
  thumbnail_url: string | null;
  mentor_id: string;
  certificate_enabled: boolean;
  is_paid: boolean;
  price_cents: number;
  is_published: boolean;
  drip_enabled: boolean;
  duration_weeks: number | null;
  category: string | null;
  level: string | null;
  is_live: boolean;
  live_date: string | null;
  live_platform: string | null;
  live_url: string | null;
  registration_deadline: string | null;
  recording_url: string | null;
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
  const [isPaid, setIsPaid] = useState(false);
  const [dripEnabled, setDripEnabled] = useState(false);
  const [durationWeeks, setDurationWeeks] = useState<number | null>(null);
  const [savingDuration, setSavingDuration] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [level, setLevel] = useState<string>('');
  const [savingLevel, setSavingLevel] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  // Live course settings
  const [isLive, setIsLive] = useState(false);
  const [liveDate, setLiveDate] = useState('');
  const [livePlatform, setLivePlatform] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
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
      fetchAnalytics();
    }
  }, [courseId]);

  const fetchAnalytics = async () => {
    if (!courseId) return;
    
    // Fetch enrollment count
    const { count: enrolled } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    setEnrolledCount(enrolled || 0);
    
    // Fetch completed enrollments (progress = 100)
    const { count: completed } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('progress', 100);
    setCompletedCount(completed || 0);
    
    // Fetch total lessons count - count all course_content items that have a title
    const { data: courseSections } = await supabase
      .from('course_sections')
      .select('id')
      .eq('course_id', courseId);
    
    if (courseSections && courseSections.length > 0) {
      const sectionIds = courseSections.map(s => s.id);
      const { count: lessons } = await supabase
        .from('course_content')
        .select('*', { count: 'exact', head: true })
        .in('section_id', sectionIds)
        .not('title', 'is', null);
      setTotalLessons(lessons || 0);
    } else {
      setTotalLessons(0);
    }
  };

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
    setIsPaid(courseData?.is_paid ?? false);
    setDripEnabled(courseData?.drip_enabled ?? false);
    setDurationWeeks(courseData?.duration_weeks ?? null);
    setCategory(courseData?.category || '');
    setLevel(courseData?.level || '');
    setIsPublished(courseData?.is_published ?? false);
    // Live course settings
    setIsLive(courseData?.is_live ?? false);
    setLiveDate(courseData?.live_date ? new Date(courseData.live_date).toISOString().slice(0, 16) : '');
    setLivePlatform(courseData?.live_platform || '');
    setLiveUrl(courseData?.live_url || '');
    setRegistrationDeadline(courseData?.registration_deadline ? new Date(courseData.registration_deadline).toISOString().slice(0, 16) : '');
    setRecordingUrl(courseData?.recording_url || '');
    setSections(sectionsData || []);
    setLoading(false);
  };

  const handleUnpublishClick = () => {
    if (enrolledCount > 0) {
      setShowUnpublishDialog(true);
    } else {
      handleTogglePublish();
    }
  };

  const handleTogglePublish = async () => {
    if (!courseId) return;
    
    setTogglingPublish(true);
    setShowUnpublishDialog(false);
    const newStatus = !isPublished;
    
    const { error } = await supabase
      .from('courses')
      .update({ is_published: newStatus })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: `Failed to ${newStatus ? 'publish' : 'unpublish'} course`,
        variant: 'destructive',
      });
    } else {
      setIsPublished(newStatus);
      setCourse(prev => prev ? { ...prev, is_published: newStatus } : null);
      toast({
        title: 'Success',
        description: newStatus ? 'Course published' : 'Course moved to draft',
      });
    }
    setTogglingPublish(false);
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

  const handlePricingToggle = async (paid: boolean) => {
    if (!courseId) return;
    
    setIsPaid(paid);
    const { error } = await supabase
      .from('courses')
      .update({ is_paid: paid })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update pricing',
        variant: 'destructive',
      });
      setIsPaid(!paid);
    } else {
      setCourse(prev => prev ? { ...prev, is_paid: paid } : null);
      toast({
        title: 'Success',
        description: paid ? 'Course set to $10' : 'Course set to free',
      });
    }
  };

  const handleDripToggle = async (enabled: boolean) => {
    if (!courseId) return;
    
    setDripEnabled(enabled);
    const { error } = await supabase
      .from('courses')
      .update({ drip_enabled: enabled })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update delivery mode',
        variant: 'destructive',
      });
      setDripEnabled(!enabled);
    } else {
      setCourse(prev => prev ? { ...prev, drip_enabled: enabled } : null);
      toast({
        title: 'Success',
        description: enabled ? 'Drip content enabled' : 'On-demand mode enabled',
      });
    }
  };

  const handleDurationChange = async () => {
    if (!courseId) return;
    
    setSavingDuration(true);
    const { error } = await supabase
      .from('courses')
      .update({ duration_weeks: durationWeeks })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update duration',
        variant: 'destructive',
      });
    } else {
      setCourse(prev => prev ? { ...prev, duration_weeks: durationWeeks } : null);
      toast({
        title: 'Success',
        description: 'Course duration updated',
      });
    }
    setSavingDuration(false);
  };

  const handleSaveCategory = async () => {
    if (!courseId) return;
    
    setSavingCategory(true);
    const { error } = await supabase
      .from('courses')
      .update({ category: category || null })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
    } else {
      setCourse(prev => prev ? { ...prev, category: category || null } : null);
      toast({
        title: 'Success',
        description: 'Course category updated',
      });
    }
    setSavingCategory(false);
  };

  const handleSaveLevel = async () => {
    if (!courseId) return;
    
    setSavingLevel(true);
    const { error } = await supabase
      .from('courses')
      .update({ level: level || null })
      .eq('id', courseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update level',
        variant: 'destructive',
      });
    } else {
      setCourse(prev => prev ? { ...prev, level: level || null } : null);
      toast({
        title: 'Success',
        description: 'Course level updated',
      });
    }
    setSavingLevel(false);
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

  const handleLiveSettingsUpdate = async (field: string, value: any) => {
    if (!courseId) return;
    
    const updateData: any = { [field]: value };
    
    // If turning off live mode, clear related fields
    if (field === 'is_live' && !value) {
      updateData.live_date = null;
      updateData.live_platform = null;
      updateData.live_url = null;
      updateData.registration_deadline = null;
    }
    
    const { error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update live settings',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Live course settings updated',
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview Course
            </Button>
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}/learn?preview=true`)}>
              <Play className="h-4 w-4 mr-2" />
              Test as Learner
            </Button>
            <Button 
              variant={isPublished ? "outline" : "default"}
              onClick={isPublished ? handleUnpublishClick : handleTogglePublish}
              disabled={togglingPublish}
            >
              {isPublished ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  {togglingPublish ? 'Unpublishing...' : 'Unpublish'}
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  {togglingPublish ? 'Publishing...' : 'Publish'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Unpublish Confirmation Dialog */}
        <Dialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unpublish Course?</DialogTitle>
              <DialogDescription>
                This course has <strong>{enrolledCount}</strong> enrolled student{enrolledCount !== 1 ? 's' : ''}. 
                Unpublishing will hide the course from new students, but enrolled students will retain access.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUnpublishDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleTogglePublish} disabled={togglingPublish}>
                {togglingPublish ? 'Unpublishing...' : 'Unpublish Course'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            <div className="flex items-center gap-3 mb-4 group">
              <h1 className="text-4xl font-bold">{course?.title}</h1>
              <Badge variant={isPublished ? "default" : "secondary"} className="text-sm">
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
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
                dangerouslySetInnerHTML={createSafeHtml(course?.description || '<p>No description</p>')}
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

          {/* Course Description Media (Video/Audio) */}
          {course && (
            <CourseDescriptionMedia
              courseId={course.id}
              videoUrl={course.description_video_url}
              audioUrl={course.description_audio_url}
              onUpdate={(videoUrl, audioUrl) => {
                setCourse(prev => prev ? { 
                  ...prev, 
                  description_video_url: videoUrl,
                  description_audio_url: audioUrl 
                } : null);
              }}
            />
          )}

          {/* Quick Analytics Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{enrolledCount}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLessons}</p>
                  <p className="text-xs text-muted-foreground">Lessons</p>
                </div>
              </CardContent>
            </Card>
          </div>

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

          {/* Pricing Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Course Pricing
              </CardTitle>
              <CardDescription>
                Set whether this course is free or paid ($10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="pricing-toggle">Paid course ($10)</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPaid ? 'Students pay $10 for access' : 'Students can enroll for free'}
                  </p>
                </div>
                <Switch
                  id="pricing-toggle"
                  checked={isPaid}
                  onCheckedChange={handlePricingToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Course Delivery Mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Course Delivery
              </CardTitle>
              <CardDescription>
                Control how students access content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="drip-toggle">Drip Content</Label>
                  <p className="text-sm text-muted-foreground">
                    {dripEnabled ? 'Content released progressively' : 'All content available immediately'}
                  </p>
                </div>
                <Switch
                  id="drip-toggle"
                  checked={dripEnabled}
                  onCheckedChange={handleDripToggle}
                />
              </div>
            </CardContent>
          </Card>

          {/* Course Duration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Estimated Duration
              </CardTitle>
              <CardDescription>
                How long should it take to complete this course?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={durationWeeks || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    setDurationWeeks(value);
                  }}
                  placeholder="e.g., 4"
                  className="w-24"
                />
                <Select defaultValue="weeks">
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mins">minutes</SelectItem>
                    <SelectItem value="days">days</SelectItem>
                    <SelectItem value="weeks">weeks</SelectItem>
                    <SelectItem value="months">months</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleDurationChange}
                  disabled={savingDuration || durationWeeks === course?.duration_weeks}
                >
                  {savingDuration ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Leave blank if self-paced with no estimated time
              </p>
            </CardContent>
          </Card>

          {/* Course Category */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Course Category
              </CardTitle>
              <CardDescription>
                Help students find your course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Tech Jobs">Tech Jobs</SelectItem>
                    <SelectItem value="Software Development">Software Development</SelectItem>
                    <SelectItem value="Data Science">Data Science</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Leadership">Leadership</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleSaveCategory}
                  disabled={savingCategory || category === (course?.category || '')}
                >
                  {savingCategory ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Course Level */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Difficulty Level
              </CardTitle>
              <CardDescription>
                Set the expected skill level for this course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleSaveLevel}
                  disabled={savingLevel || level === (course?.level || '')}
                >
                  {savingLevel ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Live Course Settings */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Live Course Settings
              </CardTitle>
              <CardDescription>
                Configure this as a live session with external meeting platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="live-toggle">Live Course</Label>
                  <p className="text-sm text-muted-foreground">
                    {isLive ? 'Requires registration for scheduled live session' : 'Standard on-demand course'}
                  </p>
                </div>
                <Switch
                  id="live-toggle"
                  checked={isLive}
                  onCheckedChange={(checked) => {
                    setIsLive(checked);
                    handleLiveSettingsUpdate('is_live', checked);
                  }}
                />
              </div>
              
              {isLive && (
                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="live-platform">Platform</Label>
                    <select
                      id="live-platform"
                      value={livePlatform}
                      onChange={(e) => {
                        setLivePlatform(e.target.value);
                        handleLiveSettingsUpdate('live_platform', e.target.value);
                      }}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Select platform</option>
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                      <option value="webex">Webex</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="live-date">Live Session Date & Time</Label>
                    <Input
                      id="live-date"
                      type="datetime-local"
                      value={liveDate}
                      onChange={(e) => {
                        setLiveDate(e.target.value);
                        handleLiveSettingsUpdate('live_date', e.target.value ? new Date(e.target.value).toISOString() : null);
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="live-url">Meeting URL</Label>
                    <Input
                      id="live-url"
                      type="url"
                      placeholder="https://zoom.us/j/..."
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      onBlur={() => handleLiveSettingsUpdate('live_url', liveUrl || null)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="registration-deadline">Registration Deadline</Label>
                    <Input
                      id="registration-deadline"
                      type="datetime-local"
                      value={registrationDeadline}
                      onChange={(e) => {
                        setRegistrationDeadline(e.target.value);
                        handleLiveSettingsUpdate('registration_deadline', e.target.value ? new Date(e.target.value).toISOString() : null);
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="recording-url">Recording URL (after session)</Label>
                    <Input
                      id="recording-url"
                      type="url"
                      placeholder="Add recording URL after the live session"
                      value={recordingUrl}
                      onChange={(e) => setRecordingUrl(e.target.value)}
                      onBlur={() => handleLiveSettingsUpdate('recording_url', recordingUrl || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload your recording and add the URL here for on-demand viewing
                    </p>
                  </div>
                </div>
              )}
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

        {/* Quiz & Assignment Section - shown after course content is built */}
        <div className="mt-8 space-y-6">
          <QuizBuilder courseId={courseId!} />
          <AssignmentBuilder courseId={courseId!} />
        </div>
      </div>
    </div>
  );
};
