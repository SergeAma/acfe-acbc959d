import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RequestMentorRole } from '@/components/RequestMentorRole';
import { MySubmissions } from '@/components/dashboard/MySubmissions';
import { SubscriptionStatus } from '@/components/dashboard/SubscriptionStatus';
import { PendingAssignments } from '@/components/dashboard/PendingAssignments';
import { StudentVideoResources } from '@/components/dashboard/StudentVideoResources';
import { BookOpen, Library, Award, TrendingUp, UserCheck, Clock, BookOpenCheck, MessageSquare, CreditCard, Building2 } from 'lucide-react';
import { stripHtml } from '@/lib/html-utils';
import { useUserInstitutions } from '@/hooks/useInstitution';

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

interface MentorshipRequest {
  id: string;
  status: string;
  mentor_response: string | null;
  created_at: string;
  mentor_id: string;
  course_to_complete_id: string | null;
  course_to_complete?: {
    id: string;
    title: string;
  } | null;
}

export const StudentDashboard = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [mentorProfiles, setMentorProfiles] = useState<Record<string, { full_name: string; avatar_url: string }>>({});
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: userInstitutions = [] } = useUserInstitutions();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;

      // Fetch enrollments
      const { data: enrollmentData } = await supabase
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
        .eq('student_id', profile.id)
        .order('enrolled_at', { ascending: false });

      if (enrollmentData) {
        setEnrollments(enrollmentData as any);
      }

      // Fetch mentorship requests
      const { data: requestData } = await supabase
        .from('mentorship_requests')
        .select(`
          id,
          status,
          mentor_response,
          created_at,
          mentor_id,
          course_to_complete_id,
          course_to_complete:courses!mentorship_requests_course_to_complete_id_fkey (
            id,
            title
          )
        `)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (requestData) {
        setMentorshipRequests(requestData as any);
        
        // Fetch mentor profiles
        const mentorIds = [...new Set(requestData.map(r => r.mentor_id))];
        if (mentorIds.length > 0) {
          const { data: profiles } = await supabase
            .rpc('get_public_mentor_profiles');
          
          if (profiles) {
            const profileMap: Record<string, { full_name: string; avatar_url: string }> = {};
            profiles.forEach((p: any) => {
              if (mentorIds.includes(p.id)) {
                profileMap[p.id] = { full_name: p.full_name, avatar_url: p.avatar_url };
              }
            });
            setMentorProfiles(profileMap);
          }
        }
      }

      // Fetch subscribed courses
      const { data: purchaseData } = await supabase
        .from('course_purchases')
        .select('course_id')
        .eq('student_id', profile.id)
        .eq('status', 'completed');

      if (purchaseData) {
        setSubscribedCourseIds(purchaseData.map(p => p.course_id));
      }

      setLoading(false);
    };

    fetchData();
  }, [profile]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">{t('dashboard.welcome')}, {profile?.full_name}!</h1>
        <p className="text-muted-foreground text-lg">{t('studentDashboard.continueJourney')}</p>
      </div>

      {/* Video Resources - Top priority visibility */}
      <StudentVideoResources />
      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('studentDashboard.activeCourses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('studentDashboard.enrolledLearning')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('studentDashboard.avgProgress')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {enrollments.length > 0
                ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('studentDashboard.acrossAllCourses')}</p>
          </CardContent>
        </Card>

        <Link to="/certificates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.certificates')}</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {enrollments.filter(e => e.progress === 100).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('studentDashboard.coursesCompleted')}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Institution Career Centre */}
      {userInstitutions.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('studentDashboard.careerCentre')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('studentDashboard.accessOpportunities')} {userInstitutions[0].institution_name}
                  </p>
                </div>
              </div>
              <Link to={`/career-centre/${userInstitutions[0].institution_slug}`}>
                <Button variant="outline" size="sm" className="rounded-full">
                  {t('studentDashboard.accessCentre')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Status */}
      <div className="flex items-center justify-between">
        <SubscriptionStatus />
        <Link to="/subscriptions">
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            {t('studentDashboard.manageSubscriptions')}
          </Button>
        </Link>
      </div>

      {/* Pending Assignments Alert */}
      <PendingAssignments enrollments={enrollments} />

      {/* In Progress Courses - Priority visibility */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('dashboard.inProgress')}</h2>
          <Link to="/courses">
            <Button variant="outline">
              <Library className="h-4 w-4 mr-2" />
              {t('studentDashboard.browseMoreCourses')}
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
        ) : enrollments.filter(e => e.progress > 0 && e.progress < 100).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('studentDashboard.noCoursesInProgress')}</h3>
              <p className="text-muted-foreground mb-4">{t('studentDashboard.startCourseToSeeProgress')}</p>
              <Link to="/courses">
                <Button>{t('features.courses.title')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {enrollments.filter(e => e.progress > 0 && e.progress < 100).map((enrollment) => {
              const isSubscribed = subscribedCourseIds.includes(enrollment.course.id);
              return (
              <Card key={enrollment.id} className={`hover:shadow-lg transition-shadow relative ${isSubscribed ? 'ring-2 ring-primary' : ''}`}>
                {isSubscribed && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-primary text-primary-foreground">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {t('studentDashboard.subscribed')}
                    </Badge>
                  </div>
                )}
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
                      <span className="text-muted-foreground">{t('studentDashboard.progress')}</span>
                      <span className="font-medium">{enrollment.progress}%</span>
                    </div>
                    <Progress value={enrollment.progress} className="h-2" />
                  </div>
                  <Link to={`/courses/${enrollment.course.id}/learn`}>
                    <Button className="w-full mt-4">
                      {t('courses.continue')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Not Started Courses - Second priority */}
      {enrollments.filter(e => e.progress === 0).length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Not Started</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {enrollments.filter(e => e.progress === 0).map((enrollment) => {
              const isSubscribed = subscribedCourseIds.includes(enrollment.course.id);
              return (
              <Card key={enrollment.id} className={`hover:shadow-lg transition-shadow relative ${isSubscribed ? 'ring-2 ring-primary' : ''}`}>
                {isSubscribed && (
                  <div className="absolute top-2 right-2 z-10">
                    <Badge className="bg-primary text-primary-foreground">
                      <CreditCard className="h-3 w-3 mr-1" />
                      Subscribed
                    </Badge>
                  </div>
                )}
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
                  <Link to={`/courses/${enrollment.course.id}/learn`}>
                    <Button className="w-full">
                      Start Learning
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Courses */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('dashboard.completedCourses')}</h2>
          <Link to="/certificates">
            <Button variant="outline">
              <Award className="h-4 w-4 mr-2" />
              {t('studentDashboard.viewCertificates')}
            </Button>
          </Link>
        </div>

        {enrollments.filter(e => e.progress === 100).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('studentDashboard.noCompletedCourses')}</h3>
              <p className="text-muted-foreground">{t('studentDashboard.completeCourseForCertificate')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {enrollments.filter(e => e.progress === 100).map((enrollment) => (
              <Card key={enrollment.id} className="hover:shadow-lg transition-shadow border-green-200 dark:border-green-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="line-clamp-1">{enrollment.course.title}</CardTitle>
                    <Badge variant="default" className="bg-green-500">
                      <Award className="h-3 w-3 mr-1" />
                      {t('studentDashboard.completed')}
                    </Badge>
                  </div>
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
                  <div className="flex gap-2">
                    <Link to={`/courses/${enrollment.course.id}/learn`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Review Course
                      </Button>
                    </Link>
                    <Link to="/certificates">
                      <Button>
                        <Award className="h-4 w-4 mr-2" />
                        Certificate
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mentorship Requests Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{t('studentDashboard.myMentorshipRequests')}</h2>
          <Link to="/mentors">
            <Button variant="outline">
              <UserCheck className="h-4 w-4 mr-2" />
              {t('studentDashboard.findMentor')}
            </Button>
          </Link>
        </div>

        {mentorshipRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('studentDashboard.noMentorshipRequests')}</h3>
              <p className="text-muted-foreground mb-4">{t('studentDashboard.connectWithMentor')}</p>
              <Link to="/mentors">
                <Button>{t('studentDashboard.browseMentors')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {mentorshipRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {mentorProfiles[request.mentor_id]?.full_name || 'Mentor'}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {t('studentDashboard.requested')} {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        request.status === 'accepted' ? 'default' :
                        request.status === 'course_required' ? 'secondary' : 'outline'
                      }
                    >
                      {request.status === 'accepted' && <UserCheck className="h-3 w-3 mr-1" />}
                      {request.status === 'course_required' && <BookOpenCheck className="h-3 w-3 mr-1" />}
                      {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {request.status === 'accepted' ? t('studentDashboard.accepted') : 
                       request.status === 'course_required' ? t('studentDashboard.courseRequired') : t('studentDashboard.pending')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {request.status === 'accepted' && (
                    <div className="space-y-3">
                      {request.mentor_response && (
                        <p className="text-sm text-muted-foreground">{request.mentor_response}</p>
                      )}
                      <Link to={`/cohort/community?mentor=${request.mentor_id}`}>
                        <Button size="sm" className="w-full">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          {t('studentDashboard.joinCohort')}
                        </Button>
                      </Link>
                    </div>
                  )}
                  {request.status === 'course_required' && request.course_to_complete && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {t('studentDashboard.completeCourseToJoin')}
                      </p>
                      <Link to={`/courses/${request.course_to_complete.id}`}>
                        <Button size="sm" variant="outline" className="w-full">
                          <BookOpen className="h-4 w-4 mr-2" />
                          {request.course_to_complete.title}
                        </Button>
                      </Link>
                    </div>
                  )}
                  {request.status === 'pending' && (
                    <p className="text-sm text-muted-foreground">
                      {t('studentDashboard.waitingForResponse')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mentor Role Request - Only shown to students */}
      <RequestMentorRole />

      {/* My Startup Ideas Submissions */}
      <MySubmissions />
    </div>
  );
};
