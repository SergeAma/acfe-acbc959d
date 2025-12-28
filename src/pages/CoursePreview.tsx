import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { 
  BookOpen, 
  Clock, 
  BarChart, 
  User, 
  ChevronRight, 
  CheckCircle2,
  FileText,
  Video,
  File,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Link2
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { stripHtml } from '@/lib/html-utils';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration_weeks: number;
  is_published: boolean;
  mentor_id: string;
  thumbnail_url: string | null;
  mentor?: {
    full_name: string;
    bio: string | null;
  };
}

interface ContentItem {
  id: string;
  title: string;
  content_type: string;
  duration_minutes: number | null;
  sort_order: number;
}

interface Section {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  content: ContentItem[];
}

interface PrerequisiteCourse {
  id: string;
  title: string;
  completed: boolean;
}

export const CoursePreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentProgress, setEnrollmentProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [prerequisites, setPrerequisites] = useState<PrerequisiteCourse[]>([]);
  const [prerequisitesMet, setPrerequisitesMet] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCourseData();
      fetchPrerequisites();
      if (user) {
        checkEnrollment();
      }
    }
  }, [id, user]);

  const fetchPrerequisites = async () => {
    if (!id) return;

    // Get prerequisites for this course
    const { data: prereqData } = await supabase
      .from('course_prerequisites')
      .select('prerequisite_course_id')
      .eq('course_id', id);

    if (!prereqData || prereqData.length === 0) {
      setPrerequisites([]);
      setPrerequisitesMet(true);
      return;
    }

    const prereqIds = prereqData.map(p => p.prerequisite_course_id);

    // Fetch prerequisite course details
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', prereqIds);

    if (!user) {
      // Not logged in - show prerequisites but can't check completion
      const prereqs = coursesData?.map(c => ({
        id: c.id,
        title: c.title,
        completed: false
      })) || [];
      setPrerequisites(prereqs);
      setPrerequisitesMet(prereqs.length === 0);
      return;
    }

    // Check which prerequisites are completed (100% progress)
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id, progress')
      .eq('student_id', user.id)
      .in('course_id', prereqIds);

    const completedCourses = new Set(
      enrollments?.filter(e => e.progress === 100).map(e => e.course_id) || []
    );

    const prereqs = coursesData?.map(c => ({
      id: c.id,
      title: c.title,
      completed: completedCourses.has(c.id)
    })) || [];

    setPrerequisites(prereqs);
    setPrerequisitesMet(prereqs.every(p => p.completed));
  };

  const fetchCourseData = async () => {
    try {
      // Fetch course details with mentor info
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          mentor:profiles!courses_mentor_id_fkey(full_name, bio)
        `)
        .eq('id', id)
        .single();

      if (courseError) throw courseError;

      setCourse(courseData);

      // Fetch sections with content items
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
            duration_minutes,
            sort_order
          )
        `)
        .eq('course_id', id)
        .order('sort_order', { ascending: true });

      if (sectionsError) throw sectionsError;

      // Sort content items within each section
      const sortedSections = sectionsData.map(section => ({
        ...section,
        content: (section.content as any[]).sort((a, b) => a.sort_order - b.sort_order)
      }));

      setSections(sortedSections as Section[]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load course details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    const { data } = await supabase
      .from('enrollments')
      .select('id, progress')
      .eq('course_id', id)
      .eq('student_id', user?.id)
      .maybeSingle();

    setIsEnrolled(!!data);
    setEnrollmentProgress(data?.progress || 0);
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check prerequisites before enrollment
    if (!prerequisitesMet) {
      toast({
        title: 'Prerequisites Required',
        description: 'You must complete all prerequisite courses before enrolling',
        variant: 'destructive',
      });
      return;
    }

    setEnrolling(true);

    const { error } = await supabase
      .from('enrollments')
      .insert({
        course_id: id!,
        student_id: user.id,
        progress: 0,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to enroll in course',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success!',
        description: 'You have enrolled in this course',
      });
      setIsEnrolled(true);
    }

    setEnrolling(false);
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'file':
        return <File className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTotalContent = () => {
    let totalLessons = 0;
    let totalDuration = 0;

    sections.forEach(section => {
      totalLessons += section.content.length;
      section.content.forEach(item => {
        if (item.duration_minutes) {
          totalDuration += item.duration_minutes;
        }
      });
    });

    return { totalLessons, totalDuration };
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

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Course not found</p>
        </div>
      </div>
    );
  }

  const { totalLessons, totalDuration } = getTotalContent();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/courses')} 
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Badge className="mb-3">{course.category}</Badge>
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{stripHtml(course.description)}</p>
            </div>
          </div>

          {/* Course Stats */}
          <div className="flex flex-wrap gap-6 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <BarChart className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{course.level}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{course.duration_weeks} weeks</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{sections.length} sections</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>{totalLessons} lessons</span>
            </div>
            {totalDuration > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span>{Math.round(totalDuration / 60)} hours of content</span>
              </div>
            )}
          </div>

          {/* Mentor Info */}
          {course.mentor && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Taught by {course.mentor.full_name}</CardTitle>
                    {course.mentor.bio && (
                      <p className="text-sm text-muted-foreground mt-1">{course.mentor.bio}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Prerequisites Warning */}
          {prerequisites.length > 0 && (
            <Alert className={`mb-6 ${prerequisitesMet ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'}`}>
              <Link2 className={`h-4 w-4 ${prerequisitesMet ? 'text-green-600' : 'text-yellow-600'}`} />
              <AlertTitle className={prerequisitesMet ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}>
                {prerequisitesMet ? 'Prerequisites Completed' : 'Prerequisites Required'}
              </AlertTitle>
              <AlertDescription>
                <p className="text-sm mb-2">
                  {prerequisitesMet 
                    ? 'You have completed all required courses.'
                    : 'Complete these courses before enrolling:'}
                </p>
                <ul className="space-y-1">
                  {prerequisites.map((prereq) => (
                    <li key={prereq.id} className="flex items-center gap-2 text-sm">
                      {prereq.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                      <Link 
                        to={`/courses/${prereq.id}/preview`} 
                        className="hover:underline"
                      >
                        {prereq.title}
                      </Link>
                      {prereq.completed && <span className="text-xs text-green-600">(Completed)</span>}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Enrollment Button */}
          {user ? (
            isEnrolled ? (
              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  onClick={() => navigate(`/courses/${id}/learn`)}
                  className="flex-1"
                >
                  <ChevronRight className="h-5 w-5 mr-2" />
                  {enrollmentProgress === 0 ? 'Start Learning' : 'Continue Learning'}
                </Button>
              </div>
            ) : (
              <Button 
                size="lg" 
                onClick={handleEnroll} 
                disabled={enrolling || !prerequisitesMet} 
                className="w-full md:w-auto"
              >
                {enrolling ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="h-5 w-5 mr-2" />
                )}
                {prerequisitesMet ? 'Enroll in Course' : 'Complete Prerequisites First'}
              </Button>
            )
          ) : (
            <Button size="lg" onClick={() => navigate('/auth')} className="w-full md:w-auto">
              <ChevronRight className="h-5 w-5 mr-2" />
              Sign In to Enroll
            </Button>
          )}
        </div>

        <Separator className="my-8" />

        {/* Course Content */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Course Content</h2>
          
          {sections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Course content is being prepared</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {sections.map((section, index) => (
                <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-6">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{section.title}</h3>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {section.content.length} {section.content.length === 1 ? 'lesson' : 'lessons'}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-4">
                      {section.content.map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            {getContentIcon(item.content_type)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="capitalize">{item.content_type}</span>
                              {item.duration_minutes && (
                                <>
                                  <span>•</span>
                                  <span>{item.duration_minutes} min</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
};
