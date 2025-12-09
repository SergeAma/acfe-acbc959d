import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RequestMentorRole } from '@/components/RequestMentorRole';
import { MySubmissions } from '@/components/dashboard/MySubmissions';
import { BookOpen, Library, Award, TrendingUp } from 'lucide-react';

// Helper to strip HTML tags for plain text display
const stripHtml = (html: string | null) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

interface Enrollment {
  id: string;
  progress: number;
  enrolled_at: string;
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    thumbnail_url: string;
  };
}

export const StudentDashboard = () => {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses (
            id,
            title,
            description,
            category,
            level,
            thumbnail_url
          )
        `)
        .eq('student_id', profile?.id)
        .order('enrolled_at', { ascending: false });

      if (!error && data) {
        setEnrollments(data as any);
      }
      setLoading(false);
    };

    if (profile) {
      fetchEnrollments();
    }
  }, [profile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome back, {profile?.full_name}!</h1>
        <p className="text-muted-foreground text-lg">Continue your learning journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Enrolled and learning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {enrollments.length > 0
                ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
          </CardContent>
        </Card>

        <Link to="/certificates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Certificates</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {enrollments.filter(e => e.progress === 100).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Courses completed</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Mentor Role Request - Only shown to students */}
      <RequestMentorRole />

      {/* My Startup Ideas Submissions */}
      <MySubmissions />

      {/* My Courses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Courses</h2>
          <Link to="/courses">
            <Button variant="outline">
              <Library className="h-4 w-4 mr-2" />
              Browse More Courses
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading your courses...</div>
        ) : enrollments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course</p>
              <Link to="/courses">
                <Button>Explore Courses</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {enrollments.map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{enrollment.course.title}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {enrollment.course.category}
                    </span>
                    <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">
                      {enrollment.course.level}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {stripHtml(enrollment.course.description)}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{enrollment.progress}%</span>
                    </div>
                    <Progress value={enrollment.progress} className="h-2" />
                  </div>
                  <Link to={`/courses/${enrollment.course.id}/learn`}>
                    <Button className="w-full mt-4">
                      {enrollment.progress === 0 ? 'Start Learning' : 'Continue Learning'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
