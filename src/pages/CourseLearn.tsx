import { useEffect, useState, useRef } from 'react';
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
  Loader2,
  Award
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
import { SecureVideoPlayer } from '@/components/learning/SecureVideoPlayer';
import { ExternalVideoPlayer } from '@/components/learning/ExternalVideoPlayer';
import { NotesPanel } from '@/components/learning/NotesPanel';
import { BookmarksPanel, useBookmarks } from '@/components/learning/BookmarksPanel';
import { getVideoEmbedInfo } from '@/lib/video-utils';

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

export const CourseLearn = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
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

      // Fetch student profile for certificate
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();
      
      if (profileData?.full_name) {
        setStudentName(profileData.full_name);
      }

      // Fetch course details with mentor name
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          id, 
          title, 
          description, 
          drip_enabled, 
          certificate_enabled,
          profiles!courses_mentor_id_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      
      const mentorProfile = courseData.profiles as any;
      setCourse({
        ...courseData,
        mentor_name: mentorProfile?.full_name || 'Instructor'
      });

      // Check for existing certificate
      const { data: certData } = await supabase
        .from('course_certificates')
        .select('id, certificate_number, issued_at')
        .eq('enrollment_id', enrollmentData.id)
        .maybeSingle();
      
      if (certData) {
        setCertificate(certData);
      }

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
            drip_delay_days,
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

      // Calculate drip availability
      const daysSinceEnrollment = enrollmentData.enrolled_at 
        ? Math.floor((Date.now() - new Date(enrollmentData.enrolled_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Sort content and mark completion/availability
      const sortedSections = sectionsData.map(section => ({
        ...section,
        content: (section.content as any[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(item => {
            const dripDelay = item.drip_delay_days || 0;
            const isAvailable = !courseData.drip_enabled || daysSinceEnrollment >= dripDelay;
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
                  mentor_name: course.mentor_name,
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

        {/* Video Content */}
        {currentContent.content_type === 'video' && currentContent.video_url && enrollmentId && (
          <Card>
            <CardContent className="pt-6">
              {(() => {
                const embedInfo = getVideoEmbedInfo(currentContent.video_url);
                if (embedInfo.isExternal) {
                  return (
                    <ExternalVideoPlayer 
                      videoUrl={currentContent.video_url} 
                      contentId={currentContent.id}
                      enrollmentId={enrollmentId}
                    />
                  );
                }
                return (
                  <SecureVideoPlayer
                    videoUrl={currentContent.video_url}
                    contentId={currentContent.id}
                    enrollmentId={enrollmentId}
                    onBookmark={(timestamp) => {
                      if ((window as any).__addBookmark) {
                        (window as any).__addBookmark(timestamp);
                      }
                    }}
                  />
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* File Content */}
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

        {/* Text Content - Always show when available */}
        {currentContent.text_content && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lesson Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none text-foreground"
                dangerouslySetInnerHTML={{ __html: currentContent.text_content }}
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
