import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Circle,
  FileText,
  Video,
  File,
  Download,
  Loader2
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  video_url: string | null;
  file_url: string | null;
  file_name: string | null;
  duration_minutes: number | null;
  sort_order: number;
  completed?: boolean;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  content: ContentItem[];
}

interface Course {
  id: string;
  title: string;
  description: string;
}

export const CourseLearn = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (id && user) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    try {
      // Check enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', id)
        .eq('student_id', user?.id)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;

      if (!enrollmentData) {
        toast({
          title: 'Not enrolled',
          description: 'You need to enroll in this course first',
          variant: 'destructive',
        });
        navigate(`/courses/${id}/preview`);
        return;
      }

      setEnrollmentId(enrollmentData.id);

      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, description')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch sections and content
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('course_sections')
        .select(`
          id,
          title,
          description,
          sort_order,
          content:course_content(
            id,
            title,
            content_type,
            text_content,
            video_url,
            file_url,
            file_name,
            duration_minutes,
            sort_order
          )
        `)
        .eq('course_id', id)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch lesson progress
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('content_id, completed')
        .eq('enrollment_id', enrollmentData.id);

      const progressMap = new Map(progressData?.map(p => [p.content_id, p.completed]) || []);

      // Sort content and mark completion
      const sortedSections = sectionsData.map(section => ({
        ...section,
        content: (section.content as any[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(item => ({
            ...item,
            completed: progressMap.get(item.id) || false
          }))
      }));

      setSections(sortedSections as Section[]);

      // Calculate overall progress
      const allContent = sortedSections.flatMap(s => s.content);
      const completedCount = allContent.filter(c => c.completed).length;
      const progress = allContent.length > 0 ? Math.round((completedCount / allContent.length) * 100) : 0;
      setOverallProgress(progress);

      // Set first incomplete lesson or first lesson
      const firstIncomplete = allContent.find(c => !c.completed);
      setCurrentContent(firstIncomplete || allContent[0] || null);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load course content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsComplete = async (contentId: string) => {
    if (!enrollmentId) return;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        enrollment_id: enrollmentId,
        content_id: contentId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'enrollment_id,content_id'
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save progress',
        variant: 'destructive',
      });
      return;
    }

    // Update local state
    setSections(sections.map(section => ({
      ...section,
      content: section.content.map(item =>
        item.id === contentId ? { ...item, completed: true } : item
      )
    })));

    // Recalculate progress
    const allContent = sections.flatMap(s => s.content);
    const completedCount = allContent.filter(c => c.id === contentId || c.completed).length;
    const newProgress = Math.round((completedCount / allContent.length) * 100);
    setOverallProgress(newProgress);

    // Update enrollment progress
    await supabase
      .from('enrollments')
      .update({ progress: newProgress })
      .eq('id', enrollmentId);

    toast({
      title: 'Progress saved',
      description: 'Lesson marked as complete',
    });
  };

  const navigateToContent = (contentId: string) => {
    const allContent = sections.flatMap(s => s.content);
    const content = allContent.find(c => c.id === contentId);
    if (content) {
      setCurrentContent(content);
    }
  };

  const navigateNext = () => {
    const allContent = sections.flatMap(s => s.content);
    const currentIndex = allContent.findIndex(c => c.id === currentContent?.id);
    if (currentIndex < allContent.length - 1) {
      setCurrentContent(allContent[currentIndex + 1]);
    }
  };

  const navigatePrevious = () => {
    const allContent = sections.flatMap(s => s.content);
    const currentIndex = allContent.findIndex(c => c.id === currentContent?.id);
    if (currentIndex > 0) {
      setCurrentContent(allContent[currentIndex - 1]);
    }
  };

  const getContentIcon = (type: string, completed: boolean) => {
    const IconComponent = type === 'video' ? Video : type === 'file' ? File : FileText;
    return completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Circle className="h-4 w-4" />;
  };

  const renderContent = () => {
    if (!currentContent) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No content available
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-2">{currentContent.title}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="capitalize">{currentContent.content_type}</span>
              {currentContent.duration_minutes && (
                <>
                  <span>•</span>
                  <span>{currentContent.duration_minutes} minutes</span>
                </>
              )}
            </div>
          </div>
          {!currentContent.completed && (
            <Button onClick={() => markAsComplete(currentContent.id)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
        </div>

        <Separator />

        {/* Content Display */}
        {currentContent.content_type === 'text' && currentContent.text_content && (
          <Card>
            <CardContent className="pt-6">
              <div className="prose max-w-none">
                {currentContent.text_content.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {currentContent.content_type === 'video' && currentContent.video_url && (
          <Card>
            <CardContent className="pt-6">
              <video 
                controls 
                className="w-full rounded-lg"
                src={currentContent.video_url}
              >
                Your browser does not support the video tag.
              </video>
            </CardContent>
          </Card>
        )}

        {currentContent.content_type === 'file' && currentContent.file_url && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{currentContent.file_name}</p>
                    <p className="text-sm text-muted-foreground">Downloadable file</p>
                  </div>
                </div>
                <Button asChild>
                  <a href={currentContent.file_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={navigatePrevious}
            disabled={sections.flatMap(s => s.content).findIndex(c => c.id === currentContent.id) === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={navigateNext}
            disabled={
              sections.flatMap(s => s.content).findIndex(c => c.id === currentContent.id) === 
              sections.flatMap(s => s.content).length - 1
            }
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - Course Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-lg">{course?.title}</CardTitle>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="px-4 pb-4">
                  {sections.map((section, sectionIdx) => (
                    <AccordionItem key={section.id} value={section.id} className="border-b-0">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-xs font-semibold text-muted-foreground">{sectionIdx + 1}</span>
                          <span className="text-sm font-medium line-clamp-2">{section.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1 pl-4">
                          {section.content.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => navigateToContent(item.id)}
                              className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                                currentContent?.id === item.id
                                  ? 'bg-primary/10 text-primary'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              {getContentIcon(item.content_type, item.completed || false)}
                              <span className="text-sm flex-1 line-clamp-2">{item.title}</span>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="pt-6">
                {renderContent()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
