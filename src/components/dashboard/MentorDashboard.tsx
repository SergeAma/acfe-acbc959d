import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MySubmissions } from '@/components/dashboard/MySubmissions';
import { MentorOnboardingChecklist } from '@/components/dashboard/MentorOnboardingChecklist';
import { SubmissionsReview } from '@/components/mentor/SubmissionsReview';
import { InstitutionPartnersSection } from '@/components/dashboard/InstitutionPartnersSection';
import { BookOpen, Users, PlusCircle, TrendingUp, UsersRound, Video } from 'lucide-react';
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
  const { t } = useLanguage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;

      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments:enrollments(count)
        `)
        .eq('mentor_id', profile.id)
        .order('created_at', { ascending: false });

      if (coursesData) {
        setCourses(coursesData as any);
      }

      // Fetch pending mentorship request count
      const { count } = await supabase
        .from('mentorship_requests')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', profile.id)
        .eq('status', 'pending');

      setPendingRequestCount(count || 0);
      setLoading(false);
    };

    fetchData();
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
          <h1 className="text-4xl font-bold mb-2">{t('mentorDashboard.title')}</h1>
          <p className="text-muted-foreground text-lg">{t('mentorDashboard.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/mentor/sessions">
            <Button size="lg" variant="outline">
              <Video className="h-5 w-5 mr-2" />
              {t('mentorDashboard.sessions')}
            </Button>
          </Link>
          <Link to="/mentor/cohort">
            <Button size="lg" variant="outline" className="relative">
              <UsersRound className="h-5 w-5 mr-2" />
              {t('mentorDashboard.myCohort')}
              {pendingRequestCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {pendingRequestCount}
                </Badge>
              )}
            </Button>
          </Link>
          <Link to="/mentor/courses/new">
            <Button size="lg">
              <PlusCircle className="h-5 w-5 mr-2" />
              {t('mentorDashboard.createCourse')}
            </Button>
        </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('mentorDashboard.totalCourses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {courses.filter(c => c.is_published).length} {t('mentorDashboard.published')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('mentorDashboard.totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('studentDashboard.acrossAllCourses')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('mentorDashboard.engagement')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {courses.length > 0 ? Math.round(totalStudents / courses.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('mentorDashboard.avgStudentsPerCourse')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Institution Partners Section */}
      <InstitutionPartnersSection />

      {/* Student Submissions Review */}
      <SubmissionsReview />

      {/* My Startup Ideas Submissions */}
      <MySubmissions />

      {/* My Courses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('mentorDashboard.myCourses')}</h2>
          <Link to="/mentor/courses">
            <Button variant="outline">{t('mentorDashboard.viewAllCourses')}</Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">{t('mentorDashboard.noCoursesYet')}</h3>
              <p className="text-muted-foreground mb-4">{t('mentorDashboard.createFirstCourse')}</p>
              <Link to="/mentor/courses/new">
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  {t('mentorDashboard.createCourse')}
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
                        {t('mentorDashboard.published')}
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded ml-2">
                        {t('mentorDashboard.draft')}
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
                      {course.enrollments[0]?.count || 0} {t('courses.students')}
                    </div>
                  </div>
                  <Link to={`/mentor/courses/${course.id}/build`}>
                    <Button variant="outline" className="w-full">
                      {t('mentorDashboard.buildCourse')}
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