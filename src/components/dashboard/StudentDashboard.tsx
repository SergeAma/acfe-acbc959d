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
import { UpcomingEventsSection } from '@/components/dashboard/UpcomingEventsSection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, Library, Award, TrendingUp, UserCheck, Clock, BookOpenCheck, MessageSquare, CreditCard, Building2, ChevronDown } from 'lucide-react';
import { stripHtml } from '@/lib/html-utils';
import { useUserInstitutions } from '@/hooks/useInstitution';
import { useIsMobile } from '@/hooks/use-mobile';

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
    mentor_id: string;
    mentor: {
      full_name: string;
      avatar_url: string | null;
    } | null;
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
  const isMobile = useIsMobile();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    thumbnail_url: string;
    mentor_id: string;
    mentor: { full_name: string; avatar_url: string | null } | null;
  }>>([]);
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>([]);
  const [mentorProfiles, setMentorProfiles] = useState<Record<string, { full_name: string; avatar_url: string }>>({});
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoResourcesOpen, setVideoResourcesOpen] = useState(false);
  const [mentorshipOpen, setMentorshipOpen] = useState(false);
  const { data: userInstitutions = [] } = useUserInstitutions();

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return;

      // Fetch enrollments without mentor join (RLS may block it)
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
            thumbnail_url,
            mentor_id
          )
        `)
        .eq('student_id', profile.id)
        .order('enrolled_at', { ascending: false });

      // Collect all mentor IDs from enrollments
      const enrollmentMentorIds = enrollmentData
        ?.map(e => (e as any).course?.mentor_id)
        .filter(Boolean) || [];

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

      const requestMentorIds = requestData?.map(r => r.mentor_id) || [];

      // Get enrolled course IDs for filtering available courses
      const enrolledCourseIds = enrollmentData?.map(e => (e as any).course?.id).filter(Boolean) || [];

      // Fetch available published courses (not enrolled) for empty state
      const { data: publishedCourses } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          category,
          level,
          thumbnail_url,
          mentor_id
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6);

      const publishedMentorIds = publishedCourses?.map(c => c.mentor_id).filter(Boolean) || [];

      // Collect ALL unique mentor IDs and batch fetch their profiles
      const allMentorIds = [...new Set([...enrollmentMentorIds, ...requestMentorIds, ...publishedMentorIds])];
      const mentorDataMap: Record<string, { full_name: string; avatar_url: string }> = {};

      if (allMentorIds.length > 0) {
        await Promise.all(
          allMentorIds.map(async (mentorId) => {
            const { data: mentorData } = await supabase
              .rpc('get_course_mentor_profile', { course_mentor_id: mentorId });
            if (mentorData && mentorData.length > 0) {
              mentorDataMap[mentorId] = {
                full_name: mentorData[0].full_name,
                avatar_url: mentorData[0].avatar_url
              };
            }
          })
        );
      }

      // Hydrate enrollments with mentor data
      if (enrollmentData) {
        const hydratedEnrollments = enrollmentData.map(e => ({
          ...e,
          course: {
            ...(e as any).course,
            mentor: mentorDataMap[(e as any).course?.mentor_id] || null
          }
        }));
        setEnrollments(hydratedEnrollments as any);
      }

      if (requestData) {
        setMentorshipRequests(requestData as any);
        setMentorProfiles(mentorDataMap);
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

      if (publishedCourses) {
        // Filter out already enrolled courses and hydrate with mentor data
        const available = publishedCourses
          .filter((c: any) => !enrolledCourseIds.includes(c.id))
          .map(course => ({
            ...course,
            mentor: mentorDataMap[course.mentor_id] || null
          }));
        setAvailableCourses(available as any);
      }

      setLoading(false);
    };

    fetchData();
  }, [profile]);

  // Course sections
  const inProgressCourses = enrollments.filter(e => e.progress > 0 && e.progress < 100);
  const notStartedCourses = enrollments.filter(e => e.progress === 0);
  const completedCourses = enrollments.filter(e => e.progress === 100);

  const CourseCard = ({ enrollment, showProgress = true }: { enrollment: Enrollment; showProgress?: boolean }) => {
    const isSubscribed = subscribedCourseIds.includes(enrollment.course.id);
    const isCompleted = enrollment.progress === 100;
    const mentorName = enrollment.course.mentor?.full_name;
    const mentorAvatar = enrollment.course.mentor?.avatar_url;
    
    return (
      <Card className={`hover:shadow-lg transition-shadow relative flex flex-col ${isSubscribed ? 'ring-2 ring-primary' : ''} ${isCompleted ? 'border-green-200 dark:border-green-800' : ''}`}>
        {isSubscribed && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-primary text-primary-foreground">
              <CreditCard className="h-3 w-3 mr-1" />
              {t('studentDashboard.subscribed')}
            </Badge>
          </div>
        )}
        {isCompleted && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="default" className="bg-green-500">
              <Award className="h-3 w-3 mr-1" />
              {t('studentDashboard.completed')}
            </Badge>
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-1 text-base sm:text-lg">{enrollment.course.title}</CardTitle>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {enrollment.course.category}
            </span>
            <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">
              {enrollment.course.level}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Mentor Info */}
          {mentorName && (
            <Link 
              to={`/mentors/${enrollment.course.mentor_id}`}
              className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
            >
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {mentorAvatar ? (
                  <img src={mentorAvatar} alt={mentorName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-medium text-primary">{mentorName[0]?.toUpperCase()}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate">by {mentorName}</span>
            </Link>
          )}
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {stripHtml(enrollment.course.description)}
          </p>
          {showProgress && enrollment.progress > 0 && enrollment.progress < 100 && (
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('studentDashboard.progress')}</span>
                <span className="font-medium">{enrollment.progress}%</span>
              </div>
              <Progress value={enrollment.progress} className="h-2" />
            </div>
          )}
          <div className="mt-auto">
            <Link to={`/courses/${enrollment.course.id}/learn`}>
              <Button className={`w-full ${isCompleted ? 'bg-green-600 hover:bg-green-700' : ''}`} size="sm">
                {isCompleted ? t('courses.reviewCourse') : enrollment.progress > 0 ? t('courses.continue') : t('courses.startLearning')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-bold mb-1">{t('dashboard.welcome')}, {profile?.full_name}!</h1>
        <p className="text-muted-foreground text-sm sm:text-lg">{t('studentDashboard.continueJourney')}</p>
      </div>

      {/* Subscription Status - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
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

      {/* Upcoming Events - High Visibility */}
      <UpcomingEventsSection />

      {/* PRIMARY: In Progress Courses */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
      ) : (
        <>
          {inProgressCourses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {t('dashboard.inProgress')}
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} />
                ))}
              </div>
            </div>
          )}

          {/* Not Started Courses */}
          {notStartedCourses.length > 0 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                {t('studentDashboard.notStarted')}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notStartedCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} showProgress={false} />
                ))}
              </div>
            </div>
          )}

          {/* No Enrollments - Show Available Courses Directly */}
          {enrollments.length === 0 && availableCourses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Library className="h-5 w-5 text-primary" />
                  {t('courses.title')}
                </h2>
                <Link to="/courses">
                  <Button variant="outline" size="sm">
                    {t('common.viewAll')}
                  </Button>
                </Link>
              </div>
              <p className="text-muted-foreground mb-4">{t('studentDashboard.startLearningPrompt')}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableCourses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow flex flex-col">
                    {course.thumbnail_url && (
                      <div className="relative h-32 overflow-hidden rounded-t-lg">
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-1 text-base sm:text-lg">{course.title}</CardTitle>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {course.category}
                        </span>
                        <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">
                          {course.level}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      {course.mentor?.full_name && (
                        <Link 
                          to={`/mentors/${course.mentor_id}`}
                          className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {course.mentor.avatar_url ? (
                              <img src={course.mentor.avatar_url} alt={course.mentor.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-medium text-primary">{course.mentor.full_name[0]?.toUpperCase()}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">by {course.mentor.full_name}</span>
                        </Link>
                      )}
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {stripHtml(course.description)}
                      </p>
                      <div className="mt-auto">
                        <Link to={`/courses/${course.id}`}>
                          <Button className="w-full" size="sm">
                            {t('courses.viewDetails')}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Fallback if no courses exist at all */}
          {enrollments.length === 0 && availableCourses.length === 0 && (
            <Card className="border-dashed border-2">
              <CardContent className="py-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">{t('studentDashboard.noEnrollments')}</h3>
                <p className="text-muted-foreground mb-4">{t('studentDashboard.startLearningPrompt')}</p>
                <Link to="/courses">
                  <Button size="lg">
                    <Library className="h-5 w-5 mr-2" />
                    {t('studentDashboard.browseMoreCourses')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Completed Courses */}
          {completedCourses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-500" />
                  {t('dashboard.completedCourses')}
                </h2>
                <Link to="/certificates">
                  <Button variant="outline" size="sm">
                    <Award className="h-4 w-4 mr-2" />
                    {t('studentDashboard.viewCertificates')}
                  </Button>
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedCourses.map((enrollment) => (
                  <CourseCard key={enrollment.id} enrollment={enrollment} showProgress={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Browse More Courses Link */}
      {enrollments.length > 0 && (
        <div className="flex justify-center">
          <Link to="/courses">
            <Button variant="outline" size="lg">
              <Library className="h-5 w-5 mr-2" />
              {t('studentDashboard.browseMoreCourses')}
            </Button>
          </Link>
        </div>
      )}

      {/* SECONDARY CONTENT - Collapsible on mobile */}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('studentDashboard.activeCourses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl sm:text-3xl font-bold">{enrollments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('studentDashboard.avgProgress')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl sm:text-3xl font-bold">
              {enrollments.length > 0
                ? Math.round(enrollments.reduce((acc, e) => acc + e.progress, 0) / enrollments.length)
                : 0}%
            </div>
          </CardContent>
        </Card>

        <Link to="/certificates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('dashboard.certificates')}</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-2xl sm:text-3xl font-bold">{completedCourses.length}</div>
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

      {/* Video Resources - Collapsible */}
      <Collapsible open={isMobile ? videoResourcesOpen : true} onOpenChange={setVideoResourcesOpen}>
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild disabled={!isMobile}>
              <div className={`flex items-center justify-between ${isMobile ? 'cursor-pointer' : ''}`}>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BookOpenCheck className="h-5 w-5 text-primary" />
                  {t('studentDashboard.videoResources')}
                </CardTitle>
                {isMobile && (
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${videoResourcesOpen ? 'rotate-180' : ''}`} />
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <StudentVideoResources />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Mentorship Requests Section - Collapsible */}
      <Collapsible open={isMobile ? mentorshipOpen : true} onOpenChange={setMentorshipOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild disabled={!isMobile}>
              <div className={`flex items-center justify-between ${isMobile ? 'cursor-pointer' : ''}`}>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <UserCheck className="h-5 w-5 text-muted-foreground" />
                  {t('studentDashboard.myMentorshipRequests')}
                  {mentorshipRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{mentorshipRequests.length}</Badge>
                  )}
                </CardTitle>
                {isMobile && (
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${mentorshipOpen ? 'rotate-180' : ''}`} />
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {mentorshipRequests.length === 0 ? (
                <div className="text-center py-6">
                  <UserCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">{t('studentDashboard.noMentorshipRequests')}</h3>
                  <p className="text-muted-foreground mb-4">{t('studentDashboard.connectWithMentor')}</p>
                  <Link to="/mentors">
                    <Button variant="outline">
                      <UserCheck className="h-4 w-4 mr-2" />
                      {t('studentDashboard.findMentor')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {mentorshipRequests.slice(0, 3).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-sm">{mentorProfiles[request.mentor_id]?.full_name || 'Mentor'}</p>
                        <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'} className="mt-1">
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {mentorshipRequests.length > 3 && (
                    <Link to="/mentors">
                      <Button variant="ghost" size="sm" className="w-full">
                        View all {mentorshipRequests.length} requests
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* My Startup Submissions - Compact */}
      <MySubmissions />

      {/* Request Mentor Role */}
      <RequestMentorRole />
    </div>
  );
};
