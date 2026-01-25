import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Eye, Play, Info, Pencil, Users, CheckCircle, BarChart3, Award } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AutosaveIndicator } from '@/components/admin/AutosaveIndicator';
import { CourseBuilderProgress, type BuilderStep } from '@/components/admin/CourseBuilderProgress';
import { CourseBasicsTab } from '@/components/admin/course-builder/CourseBasicsTab';
import { LessonsTab } from '@/components/admin/course-builder/LessonsTab';
import { PublishingTab } from '@/components/admin/course-builder/PublishingTab';
import { QuizBuilder } from '@/components/admin/QuizBuilder';
import { AssignmentBuilder } from '@/components/admin/AssignmentBuilder';
import { CoursePrerequisites } from '@/components/admin/CoursePrerequisites';
import { useAutosave } from '@/hooks/useAutosave';

/**
 * Simplified 3-Tab Course Builder
 * 
 * TAB 1: Basics - Title, Description, Thumbnail, Category, Level
 * TAB 2: Lessons - Sections & Lessons with drag-and-drop
 * TAB 3: Publishing - Price, Certificates, Availability, Duration, Intro Media
 * 
 * Design Principles:
 * - Lesson-first workflow
 * - No technical choices exposed to mentors
 * - Media handled via unified component
 * - Business settings isolated from content
 */

interface Course {
  id: string;
  title: string;
  description: string | null;
  description_video_url: string | null;
  description_audio_url: string | null;
  thumbnail_url: string | null;
  mentor_id: string;
  certificate_enabled: boolean;
  is_paid: boolean;
  price_cents: number;
  is_published: boolean;
  drip_enabled: boolean;
  drip_schedule_type: string | null;
  drip_release_day: number | null;
  duration_weeks: number | null;
  category: string | null;
  level: string | null;
  institution_id: string | null;
}

interface Institution {
  id: string;
  name: string;
  slug: string;
}

export const AdminCourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  const [course, setCourse] = useState<Course | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basics');
  
  // Analytics
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [sectionsCount, setSectionsCount] = useState(0);
  
  // UI state
  const [showEditingTip, setShowEditingTip] = useState(() => {
    return localStorage.getItem('courseBuilderTipDismissed') !== 'true';
  });

  const dismissEditingTip = () => {
    localStorage.setItem('courseBuilderTipDismissed', 'true');
    setShowEditingTip(false);
  };

  // Autosave data
  const autosaveData = useMemo(() => ({
    title: course?.title || '',
    description: course?.description || '',
    category: course?.category || '',
    level: course?.level || '',
  }), [course?.title, course?.description, course?.category, course?.level]);

  // Autosave handler
  const handleAutosave = useCallback(async (data: typeof autosaveData) => {
    if (!courseId || !course) return;
    // Autosave handled by individual tab components
  }, [courseId, course]);

  const { status: autosaveStatus, lastSaved } = useAutosave({
    data: autosaveData,
    onSave: handleAutosave,
    debounceMs: 2000,
    enabled: false, // Tabs handle their own saves
  });

  // Builder progress steps
  const builderSteps: BuilderStep[] = useMemo(() => [
    {
      id: 'title',
      label: 'Title',
      isComplete: !!course?.title && course.title.length >= 5,
      isRequired: true,
      description: 'Course title (min 5 characters)',
    },
    {
      id: 'description',
      label: 'Description',
      isComplete: !!course?.description && course.description.length >= 20,
      isRequired: true,
      description: 'Course description (min 20 characters)',
    },
    {
      id: 'thumbnail',
      label: 'Thumbnail',
      isComplete: !!course?.thumbnail_url,
      isRequired: true,
      description: 'Upload a course thumbnail image',
    },
    {
      id: 'category',
      label: 'Category',
      isComplete: !!course?.category,
      isRequired: true,
      description: 'Select a course category',
    },
    {
      id: 'level',
      label: 'Level',
      isComplete: !!course?.level,
      isRequired: true,
      description: 'Set difficulty level',
    },
    {
      id: 'content',
      label: 'Content',
      isComplete: sectionsCount > 0 && totalLessons > 0,
      isRequired: true,
      description: 'Add at least one section with content',
    },
    {
      id: 'duration',
      label: 'Duration',
      isComplete: !!course?.duration_weeks,
      isRequired: false,
      description: 'Estimated completion time',
    },
    {
      id: 'media',
      label: 'Intro Media',
      isComplete: !!course?.description_video_url || !!course?.description_audio_url,
      isRequired: false,
      description: 'Video or audio introduction',
    },
  ], [course, sectionsCount, totalLessons]);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
      fetchAnalytics();
      fetchInstitutions();
    }
  }, [courseId]);

  const fetchInstitutions = async () => {
    const { data } = await supabase
      .from('institutions')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name');
    if (data) setInstitutions(data);
  };

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
    
    // Fetch sections and lessons count
    const { data: courseSections } = await supabase
      .from('course_sections')
      .select('id')
      .eq('course_id', courseId);
    
    setSectionsCount(courseSections?.length || 0);
    
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

    setCourse(courseData);
    setLoading(false);
  };

  // Handle updates from child components
  const handleCourseUpdate = (updates: Partial<Course>) => {
    setCourse(prev => prev ? { ...prev, ...updates } : null);
    // Refresh analytics if content-related changes
    if ('is_published' in updates) {
      fetchAnalytics();
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

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Course not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Builder Progress Indicator */}
        <div className="mb-6">
          <CourseBuilderProgress steps={builderSteps} />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(isAdminRoute ? '/admin/courses' : '/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {isAdminRoute ? 'Back to Courses' : 'Back to Dashboard'}
            </Button>
            <AutosaveIndicator status={autosaveStatus} lastSaved={lastSaved} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" onClick={() => navigate(`/courses/${courseId}/learn?preview=true`)}>
              <Play className="h-4 w-4 mr-2" />
              Test
            </Button>
          </div>
        </div>

        {/* Course Title & Status */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <Badge variant={course.is_published ? "default" : "secondary"}>
            {course.is_published ? 'Published' : 'Draft'}
          </Badge>
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

        {/* Quick Analytics Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

        {/* 3-Tab Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basics">Course Basics</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="publishing">Publishing</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6">
            <CourseBasicsTab
              course={{
                id: course.id,
                title: course.title,
                description: course.description,
                thumbnail_url: course.thumbnail_url,
                category: course.category,
                level: course.level,
              }}
              onUpdate={handleCourseUpdate}
            />
            
            {/* Prerequisites under Basics tab */}
            {user && (
              <CoursePrerequisites courseId={course.id} mentorId={course.mentor_id} />
            )}
          </TabsContent>

          <TabsContent value="lessons" className="space-y-6">
            <LessonsTab courseId={courseId!} />
            
            {/* Quiz & Assignment Section */}
            <div className="space-y-6 pt-6 border-t">
              <h2 className="text-xl font-semibold">Assessments</h2>
              <QuizBuilder courseId={courseId!} />
              <AssignmentBuilder courseId={courseId!} />
            </div>
          </TabsContent>

          <TabsContent value="publishing">
            <PublishingTab
              course={{
                id: course.id,
                is_published: course.is_published,
                certificate_enabled: course.certificate_enabled,
                is_paid: course.is_paid,
                price_cents: course.price_cents,
                duration_weeks: course.duration_weeks,
                drip_enabled: course.drip_enabled,
                drip_schedule_type: course.drip_schedule_type,
                drip_release_day: course.drip_release_day,
                institution_id: course.institution_id,
                description_video_url: course.description_video_url,
                description_audio_url: course.description_audio_url,
              }}
              institutions={institutions}
              onUpdate={handleCourseUpdate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
