import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Loader2,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Maximize2,
  Minimize2,
  X,
  Eye,
  Music
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CourseCertificate } from '@/components/CourseCertificate';
import { SecureVideoContent, SecureFileContent } from '@/components/learning/SecureContent';
import { SecureAudioContent } from '@/components/learning/SecureAudioContent';
import { NotesPanel } from '@/components/learning/NotesPanel';
import { BookmarksPanel, useBookmarks } from '@/components/learning/BookmarksPanel';
import { createSafeHtml } from '@/lib/sanitize-html';

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  text_content: string | null;
  video_url: string | null;
  audio_url: string | null;
  file_url: string | null;
  file_name: string | null;
  duration_minutes: number | null;
  sort_order: number;
  drip_delay_days: number | null;
  completed?: boolean;
  available?: boolean;
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
  drip_enabled: boolean;
  certificate_enabled: boolean;
  mentor_name: string;
}

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
}

// Calculate reading time based on word count (average 200 words per minute)
const calculateReadingTime = (htmlContent: string): number => {
  const text = htmlContent.replace(/<[^>]*>/g, '').trim();
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};

export const CourseLearn = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isPreviewMode = searchParams.get('preview') === 'true';
  
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isMentorPreview, setIsMentorPreview] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    try {
      // First fetch course to check if user is the mentor (for preview mode)
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id, 
          title, 
          description, 
          drip_enabled, 
          certificate_enabled,
          mentor_id
        `)
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      
      const isCourseMentor = courseData.mentor_id === user?.id;
      
      // Allow preview mode only for course mentor
      if (isPreviewMode && isCourseMentor) {
        setIsMentorPreview(true);
        // Create a mock enrollment for preview purposes
        setEnrollmentId('preview-mode');
        setEnrolledAt(new Date().toISOString());
      } else {
        // Check enrollment for regular users
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id, enrolled_at')
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
        setEnrolledAt(enrollmentData.enrolled_at);
        
        // Check for existing certificate (only for actual enrollments)
        const { data: certData } = await supabase
          .from('course_certificates')
          .select('id, certificate_number, issued_at')
          .eq('enrollment_id', enrollmentData.id)
          .maybeSingle();
        
        if (certData) {
          setCertificate(certData);
        }
      }

      // Fetch student profile for certificate
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      if (profileData?.full_name) {
        setStudentName(profileData.full_name);
      }
      
      // Fetch mentor name using public profiles view to bypass RLS
      let mentorName = 'Instructor';
      if (courseData.mentor_id) {
        const { data: mentorData } = await supabase
          .from('profiles_public')
          .select('full_name')
          .eq('id', courseData.mentor_id)
          .single();
        
        if (mentorData?.full_name) {
          mentorName = mentorData.full_name;
        }
      }
      
      setCourse({
        ...courseData,
        mentor_name: mentorName
      });

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
            audio_url,
            file_url,
            file_name,
            duration_minutes,
            drip_delay_days,
            sort_order
          )
        `)
        .eq('course_id', id)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      // Fetch lesson progress (skip for mentor preview mode)
      let progressMap = new Map<string, boolean>();
      if (enrollmentId && enrollmentId !== 'preview-mode') {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('content_id, completed')
          .eq('enrollment_id', enrollmentId);
        progressMap = new Map(progressData?.map(p => [p.content_id, p.completed]) || []);
      }

      // Calculate drip availability - in preview mode, all content is available
      const daysSinceEnrollment = enrolledAt 
        ? Math.floor((Date.now() - new Date(enrolledAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Sort content and mark completion/availability
      // In mentor preview mode, all content is available
      const sortedSections = sectionsData.map(section => ({
        ...section,
        content: (section.content as any[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(item => {
            const dripDelay = item.drip_delay_days || 0;
            const isAvailable = isPreviewMode || !courseData.drip_enabled || daysSinceEnrollment >= dripDelay;
            return {
              ...item,
              completed: progressMap.get(item.id) || false,
              available: isAvailable
            };
          })
      }));

      setSections(sortedSections as Section[]);

      // Calculate overall progress
      const allContent = sortedSections.flatMap(s => s.content);
      const completedCount = allContent.filter(c => c.completed).length;
      const progress = allContent.length > 0 ? Math.round((completedCount / allContent.length) * 100) : 0;
      setOverallProgress(progress);

      // Set first incomplete available lesson or first available lesson
      const firstIncomplete = allContent.find(c => !c.completed && c.available);
      const firstAvailable = allContent.find(c => c.available);
      setCurrentContent(firstIncomplete || firstAvailable || allContent[0] || null);

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
    if (!enrollmentId || isMentorPreview) return;

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

    // Check if course is now 100% complete
    if (newProgress === 100 && user && course) {
      // Notify mentors about course completion for pending mentorship requests
      try {
        await supabase.functions.invoke('send-course-completion-notification', {
          body: {
            studentId: user.id,
            courseId: course.id,
            courseTitle: course.title,
          },
        });
      } catch (notifyError) {
        console.error('Failed to send course completion notification:', notifyError);
      }

      // Issue certificate if enabled
      if (course.certificate_enabled && !certificate) {
        const certNumber = `ACFE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        
        const { data: certData, error: certError } = await supabase
          .from('course_certificates')
          .insert({
            enrollment_id: enrollmentId,
            student_id: user.id,
            course_id: course.id,
            certificate_number: certNumber,
          })
          .select()
          .single();

        if (!certError && certData) {
          setCertificate(certData);
          setShowCertificateDialog(true);
          toast({
            title: 'Congratulations!',
            description: 'You earned a certificate!',
          });

          // Send certificate email notification
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', user.id)
              .single();

            if (profileData?.email) {
              await supabase.functions.invoke('send-certificate-email', {
                body: {
                  student_email: profileData.email,
                  student_name: profileData.full_name || 'Student',
                  course_name: course.title,
                  course_id: course.id,
                  certificate_number: certNumber,
                  issued_at: certData.issued_at,
                },
              });
            }
          } catch (emailError) {
            console.error('Failed to send certificate email:', emailError);
          }
        }
      }
    }
  };

  const navigateToContent = (contentId: string) => {
    const allContent = sections.flatMap(s => s.content);
    const content = allContent.find(c => c.id === contentId);
    if (content && content.available) {
      setCurrentContent(content);
    } else if (content && !content.available) {
      toast({
        title: 'Content locked',
        description: 'This content will be available in a few days',
        variant: 'destructive',
      });
    }
  };

  const navigateNext = () => {
    const allContent = sections.flatMap(s => s.content).filter(c => c.available);
    const currentIndex = allContent.findIndex(c => c.id === currentContent?.id);
    if (currentIndex < allContent.length - 1) {
      setCurrentContent(allContent[currentIndex + 1]);
    }
  };

  const navigatePrevious = () => {
    const allContent = sections.flatMap(s => s.content).filter(c => c.available);
    const currentIndex = allContent.findIndex(c => c.id === currentContent?.id);
    if (currentIndex > 0) {
      setCurrentContent(allContent[currentIndex - 1]);
    }
  };

  // Handle video completion - mark lesson complete and auto-advance
  const handleVideoComplete = async () => {
    if (!currentContent || currentContent.completed) return;
    
    await markAsComplete(currentContent.id);
    
    // Auto-advance to next lesson after a short delay
    setTimeout(() => {
      navigateNext();
    }, 1500);
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

    if (!currentContent.available) {
      const dripDelay = currentContent.drip_delay_days || 0;
      const daysSinceEnrollment = enrolledAt 
        ? Math.floor((Date.now() - new Date(enrolledAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const daysRemaining = dripDelay - daysSinceEnrollment;

      return (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Circle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Content Locked</h3>
          <p className="text-muted-foreground">
            This lesson will be available in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Title and Metadata - Always at Top */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {(currentContent.content_type === 'video' || currentContent.content_type === 'audio') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFocusMode(!isFocusMode)}
                title={isFocusMode ? 'Exit focus mode' : 'Enter focus mode'}
              >
                {isFocusMode ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            {!currentContent.completed && (
              <Button onClick={() => markAsComplete(currentContent.id)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Lesson Description - Show BEFORE media content */}
        {(() => {
          // First check if lesson has its own text_content
          if (currentContent.text_content) {
            return (
              <Card>
                <CardHeader className="pb-2">
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                  >
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lesson Description
                    </CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {calculateReadingTime(currentContent.text_content)} min read
                      </span>
                      {isDescriptionExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </button>
                </CardHeader>
                {isDescriptionExpanded && (
                  <CardContent>
                    <div 
                      className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground"
                      dangerouslySetInnerHTML={createSafeHtml(currentContent.text_content)}
                    />
                  </CardContent>
                )}
              </Card>
            );
          }
          
          // Fall back to the section description if no text_content
          const currentSection = sections.find(s => s.content.some(c => c.id === currentContent.id));
          if (currentSection?.description) {
            return (
              <Card>
                <CardHeader className="pb-2">
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                  >
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lesson Description
                    </CardTitle>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {calculateReadingTime(currentSection.description)} min read
                      </span>
                      {isDescriptionExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </button>
                </CardHeader>
                {isDescriptionExpanded && (
                  <CardContent>
                    <div 
                      className="prose prose-sm md:prose-base lg:prose-lg max-w-none text-foreground prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-ul:text-foreground prose-ol:text-foreground"
                      dangerouslySetInnerHTML={createSafeHtml(currentSection.description)}
                    />
                  </CardContent>
                )}
              </Card>
            );
          }
          
          return null;
        })()}

        {/* Video Content - Now Below Description */}
        {currentContent.content_type === 'video' && currentContent.video_url && enrollmentId && (
          <Card>
            <CardContent className="pt-6">
              <SecureVideoContent
                contentId={currentContent.id}
                videoUrl={currentContent.video_url}
                enrollmentId={enrollmentId}
                onBookmark={(timestamp) => {
                  if ((window as any).__addBookmark) {
                    (window as any).__addBookmark(timestamp);
                  }
                }}
                onVideoComplete={handleVideoComplete}
              />
            </CardContent>
          </Card>
        )}

        {/* Audio Content */}
        {currentContent.content_type === 'audio' && currentContent.audio_url && (
          <Card>
            <CardContent className="pt-6">
              <SecureAudioContent
                audioUrl={currentContent.audio_url}
              />
            </CardContent>
          </Card>
        )}

        {/* File Content */}
        {currentContent.content_type === 'file' && currentContent.file_url && (
          <Card>
            <CardContent className="pt-6">
              <SecureFileContent
                contentId={currentContent.id}
                fileUrl={currentContent.file_url}
                fileName={currentContent.file_name}
              />
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

  // Focus mode - fullscreen video experience
  if (isFocusMode && currentContent?.content_type === 'video') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Focus mode header */}
        <div className="flex items-center justify-between p-4 bg-black/80">
          <div className="text-white">
            <h2 className="text-lg font-semibold">{currentContent.title}</h2>
            <p className="text-sm text-white/60">{course?.title}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFocusMode(false)}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Video content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl">
            {enrollmentId && currentContent.video_url && (
              <SecureVideoContent
                contentId={currentContent.id}
                videoUrl={currentContent.video_url}
                enrollmentId={enrollmentId}
                onBookmark={(timestamp) => {
                  if ((window as any).__addBookmark) {
                    (window as any).__addBookmark(timestamp);
                  }
                }}
                onVideoComplete={handleVideoComplete}
              />
            )}
          </div>
        </div>

        {/* Focus mode footer */}
        <div className="flex items-center justify-between p-4 bg-black/80">
          <Button
            variant="ghost"
            onClick={navigatePrevious}
            disabled={sections.flatMap(s => s.content).findIndex(c => c.id === currentContent.id) === 0}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div className="flex items-center gap-4">
            {!currentContent.completed && (
              <Button
                variant="secondary"
                onClick={() => markAsComplete(currentContent.id)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Complete
              </Button>
            )}
            {currentContent.completed && (
              <span className="text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={navigateNext}
            disabled={
              sections.flatMap(s => s.content).findIndex(c => c.id === currentContent.id) === 
              sections.flatMap(s => s.content).length - 1
            }
            className="text-white hover:bg-white/20"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Mentor Preview Mode Banner */}
      {isMentorPreview && (
        <div className="bg-amber-500 text-amber-950 py-2 px-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="font-medium">Preview Mode</span>
              <span className="text-sm">— You're viewing this course as a learner would see it</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-amber-950 hover:bg-amber-600/20"
            >
              Exit Preview
            </Button>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => isMentorPreview ? navigate(-1) : navigate('/dashboard')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isMentorPreview ? 'Back to Course Builder' : 'Back to Dashboard'}
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
                  {certificate && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => setShowCertificateDialog(true)}
                    >
                      <Award className="h-4 w-4 mr-2" />
                      View Certificate
                    </Button>
                  )}
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
                              disabled={!item.available}
                              className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                                currentContent?.id === item.id
                                  ? 'bg-primary/10 text-primary'
                                  : item.available
                                  ? 'hover:bg-muted'
                                  : 'opacity-50 cursor-not-allowed'
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
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardContent className="pt-6">
                {renderContent()}
              </CardContent>
            </Card>
            
            {/* Notes and Bookmarks Panels */}
            {currentContent && (
              <div className="grid md:grid-cols-2 gap-4">
                <NotesPanel 
                  contentId={currentContent.id} 
                  currentTime={0}
                />
                <BookmarksPanel 
                  contentId={currentContent.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Dialog */}
      <Dialog open={showCertificateDialog} onOpenChange={setShowCertificateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Your Certificate</DialogTitle>
          </DialogHeader>
          {certificate && course && (
            <CourseCertificate
              studentName={studentName || 'Student'}
              courseName={course.title}
              mentorName={course.mentor_name}
              completionDate={certificate.issued_at}
              certificateNumber={certificate.certificate_number}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
