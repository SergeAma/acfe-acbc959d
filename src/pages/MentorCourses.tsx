import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, BarChart3, LayoutGrid, Loader2, Eye, ExternalLink, FileText, ArrowLeft } from 'lucide-react';
import { CourseAnalytics } from '@/components/mentor/CourseAnalytics';
import { CourseQuickStats } from '@/components/admin/CourseQuickStats';
import { useMentorContract } from '@/hooks/useMentorContract';
import { ContentSubmissionCard } from '@/components/mentor/ContentSubmissionCard';

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_published: boolean;
  created_at: string;
  thumbnail_url: string | null;
  sections: { count: number }[];
  enrollments: { count: number }[];
}

export const MentorCourses = () => {
  const { user, profile, isActualAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { hasSignedContract, loading: contractLoading } = useMentorContract(user?.id);
  
  const isAdmin = profile?.role === 'admin';

  // Redirect mentors who haven't signed contract
  useEffect(() => {
    if (!contractLoading && profile?.role === 'mentor' && !isActualAdmin && hasSignedContract === false) {
      navigate('/mentor-contract');
    }
  }, [contractLoading, profile, isActualAdmin, hasSignedContract, navigate]);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          sections:course_sections(count),
          enrollments(count)
        `)
        .eq('mentor_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (contractLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Courses</h1>
            <p className="text-muted-foreground mt-1">View your published courses and submit new content</p>
          </div>
        </div>

        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses">
              <LayoutGrid className="h-4 w-4 mr-2" />
              My Courses
            </TabsTrigger>
            <TabsTrigger value="submit">
              <FileText className="h-4 w-4 mr-2" />
              Submit Content
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-40 bg-muted rounded-t-lg" />
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : courses.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses published yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Submit your course content through our Google Form and our admin team will review and publish it for you.
                  </p>
                  <ContentSubmissionCard />
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative h-40 bg-muted">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <Badge
                        className="absolute top-2 right-2"
                        variant={course.is_published ? "default" : "secondary"}
                      >
                        {course.is_published ? "Published" : "Under Review"}
                      </Badge>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {course.sections[0]?.count || 0} sections
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {course.enrollments[0]?.count || 0} students
                        </div>
                      </div>
                      <CourseQuickStats courseId={course.id} />
                      <div className="flex gap-2 mt-3">
                        <Link to={`/courses/${course.id}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            <Eye className="h-4 w-4 mr-2" />
                            View Course
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submit">
            <div className="max-w-2xl mx-auto">
              <ContentSubmissionCard />
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">What happens after submission?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Review</h4>
                      <p className="text-sm text-muted-foreground">Our team reviews your submission for quality and completeness</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Processing</h4>
                      <p className="text-sm text-muted-foreground">We create the course structure and upload your YouTube videos</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 text-primary rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Publishing</h4>
                      <p className="text-sm text-muted-foreground">Your course goes live and students can start learning!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <CourseAnalytics mentorId={user?.id} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MentorCourses;
