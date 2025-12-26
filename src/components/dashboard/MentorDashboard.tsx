import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MySubmissions } from '@/components/dashboard/MySubmissions';
import { MentorOnboardingChecklist } from '@/components/dashboard/MentorOnboardingChecklist';
import { BookOpen, Users, PlusCircle, TrendingUp, UsersRound } from 'lucide-react';
import { stripHtml } from '@/lib/html-utils';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  is_published: boolean;
  created_at: string;
  enrollments: { count: number }[];
}

export const MentorDashboard = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments:enrollments(count)
        `)
        .eq('mentor_id', profile?.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCourses(data as any);
      }
      setLoading(false);
    };

    if (profile) {
      fetchCourses();
    }
  }, [profile]);

  const totalStudents = courses.reduce((acc, course) => {
    return acc + (course.enrollments[0]?.count || 0);
  }, 0);

  return (
    <div className="space-y-8">
      {/* Onboarding Checklist */}
      <MentorOnboardingChecklist />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Mentor Dashboard</h1>
          <p className="text-muted-foreground text-lg">Manage your courses and students</p>
        </div>
        <div className="flex gap-3">
          <Link to="/mentor/cohort">
            <Button size="lg" variant="outline">
              <UsersRound className="h-5 w-5 mr-2" />
              My Cohort
            </Button>
          </Link>
          <Link to="/mentor/courses/new">
            <Button size="lg">
              <PlusCircle className="h-5 w-5 mr-2" />
              Create New Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {courses.filter(c => c.is_published).length} published
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {courses.length > 0 ? Math.round(totalStudents / courses.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg students per course</p>
          </CardContent>
        </Card>
      </div>

      {/* My Startup Ideas Submissions */}
      <MySubmissions />

      {/* My Courses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">My Courses</h2>
          <Link to="/mentor/courses">
            <Button variant="outline">View All Courses</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading your courses...</div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Create your first course to start teaching</p>
              <Link to="/mentor/courses/new">
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2 flex-1">{course.title}</CardTitle>
                    {course.is_published ? (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                        Published
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded ml-2">
                        Draft
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-primary">{course.category}</span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {stripHtml(course.description)}
                  </p>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      {course.enrollments[0]?.count || 0} students
                    </div>
                  </div>
                  <Link to={`/mentor/courses/${course.id}/build`}>
                    <Button variant="outline" className="w-full">
                      Build Course
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