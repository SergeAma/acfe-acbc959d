import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, User, Clock, BarChart, Loader2, CheckCircle } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration_weeks: number;
  mentor: {
    full_name: string;
    bio: string;
  };
}

export const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`
          *,
          mentor:profiles!courses_mentor_id_fkey (
            full_name,
            bio
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Course not found",
          variant: "destructive",
        });
        navigate('/courses');
        return;
      }

      setCourse(courseData as any);

      if (profile) {
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', id)
          .eq('student_id', profile.id)
          .single();

        setIsEnrolled(!!enrollmentData);
      }

      setLoading(false);
    };

    fetchCourse();
  }, [id, profile, navigate, toast]);

  const handleEnroll = async () => {
    if (!profile) {
      navigate('/auth');
      return;
    }

    if (profile.role !== 'student') {
      toast({
        title: "Not available",
        description: "Only students can enroll in courses",
        variant: "destructive",
      });
      return;
    }

    setEnrolling(true);

    const { error } = await supabase
      .from('enrollments')
      .insert({
        student_id: profile.id,
        course_id: id,
      });

    if (error) {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setIsEnrolled(true);
      toast({
        title: "Success!",
        description: "You're now enrolled in this course",
      });
    }

    setEnrolling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex gap-2 mb-4">
                <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded">
                  {course.category}
                </span>
                <span className="text-sm bg-secondary/10 text-secondary px-3 py-1 rounded">
                  {course.level}
                </span>
              </div>
              <h1 className="text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground">{course.description}</p>
            </div>

            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">What you'll learn</h2>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span>Comprehensive understanding of core concepts and practical applications</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span>Hands-on projects to build your portfolio and gain real experience</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span>Direct mentorship and guidance from experienced professionals</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <span>Industry-relevant skills that will boost your career prospects</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {isEnrolled ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-900">You're enrolled!</p>
                    </div>
                    <Button onClick={() => navigate('/dashboard')} className="w-full">
                      Go to Dashboard
                    </Button>
                  </div>
                ) : (
                  <Button onClick={handleEnroll} disabled={enrolling} className="w-full" size="lg">
                    {enrolling ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Enroll Now
                  </Button>
                )}

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <span>{course.duration_weeks} weeks duration</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <BarChart className="h-5 w-5 text-muted-foreground" />
                    <span>{course.level} level</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your Mentor</h3>
                    <p className="text-sm text-muted-foreground">{course.mentor?.full_name}</p>
                  </div>
                </div>
                {course.mentor?.bio && (
                  <p className="text-sm text-muted-foreground">{course.mentor.bio}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};