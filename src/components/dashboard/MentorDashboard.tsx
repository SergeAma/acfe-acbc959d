import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMentorContract } from '@/hooks/useMentorContract';
import { usePrivateMessages } from '@/hooks/usePrivateMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MySubmissions } from '@/components/dashboard/MySubmissions';
import { MentorOnboardingChecklist } from '@/components/dashboard/MentorOnboardingChecklist';
import { MentorVideoResources } from '@/components/dashboard/MentorVideoResources';
import { SubmissionsReview } from '@/components/mentor/SubmissionsReview';
import { InstitutionPartnersSection } from '@/components/dashboard/InstitutionPartnersSection';
import { MentorAgreementCard } from '@/components/mentor/MentorAgreementCard';
import { MentorMessagesTab } from '@/components/messaging/MentorMessagesTab';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, Users, PlusCircle, TrendingUp, UsersRound, Video, MessageCircle, ChevronDown, X, HelpCircle, Edit } from 'lucide-react';
import { stripHtml } from '@/lib/html-utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const { profile, user } = useAuth();
  const { t } = useLanguage();
  const { contractData } = useMentorContract(user?.id);
  const { totalUnread } = usePrivateMessages();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [onboardingMinimized, setOnboardingMinimized] = useState(false);
  const [videoResourcesOpen, setVideoResourcesOpen] = useState(false);
  
  const activeTab = searchParams.get('tab') || 'overview';

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

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const totalStudents = courses.reduce((acc, course) => {
    return acc + (course.enrollments[0]?.count || 0);
  }, 0);

  const publishedCourses = courses.filter(c => c.is_published);
  const draftCourses = courses.filter(c => !c.is_published);

  // Overview content as a separate component for tabs
  const OverviewContent = () => (
    <div className="space-y-6">
      {/* Stats Cards - Priority 1 */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('mentorDashboard.totalCourses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl sm:text-3xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {publishedCourses.length} {t('mentorDashboard.published')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('mentorDashboard.totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl sm:text-3xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('studentDashboard.acrossAllCourses')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-6">
            <CardTitle className="text-xs sm:text-sm font-medium">{t('mentorDashboard.engagement')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-2xl sm:text-3xl font-bold">
              {courses.length > 0 ? Math.round(totalStudents / courses.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{t('mentorDashboard.avgStudentsPerCourse')}</p>
          </CardContent>
        </Card>
      </div>

      {/* My Courses - Priority 2 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {t('mentorDashboard.myCourses')}
          </h2>
          <div className="flex gap-2">
            <Link to="/mentor/courses">
              <Button variant="outline" size="sm">{t('mentorDashboard.viewAllCourses')}</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
        ) : courses.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="py-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">{t('mentorDashboard.noCoursesYet')}</h3>
              <p className="text-muted-foreground mb-4">{t('mentorDashboard.createFirstCourse')}</p>
              <Link to="/mentor/courses/new">
                <Button size="lg">
                  <PlusCircle className="h-5 w-5 mr-2" />
                  {t('mentorDashboard.createCourse')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 flex-1 text-base">{course.title}</CardTitle>
                    {course.is_published ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0">
                        {t('mentorDashboard.published')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        {t('mentorDashboard.draft')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-primary">{course.category}</span>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {stripHtml(course.description)}
                  </p>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-1" />
                      {course.enrollments[0]?.count || 0} {t('courses.students')}
                    </div>
                  </div>
                  <Link to={`/mentor/courses/${course.id}/build`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      {t('mentorDashboard.buildCourse')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
            {/* Create new course card */}
            <Link to="/mentor/courses/new">
              <Card className="h-full border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]">
                <CardContent className="text-center py-8">
                  <PlusCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium">{t('mentorDashboard.createCourse')}</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>

      {/* Student Submissions Review - Priority 3 */}
      <SubmissionsReview />

      {/* Institution Partners Section */}
      <InstitutionPartnersSection />

      {/* Video Resources - Collapsible */}
      <Collapsible open={isMobile ? videoResourcesOpen : true} onOpenChange={setVideoResourcesOpen}>
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild disabled={!isMobile}>
              <div className={`flex items-center justify-between ${isMobile ? 'cursor-pointer' : ''}`}>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Video className="h-5 w-5 text-primary" />
                  {t('mentorDashboard.videoResources') || 'Mentor Video Resources'}
                </CardTitle>
                {isMobile && (
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${videoResourcesOpen ? 'rotate-180' : ''}`} />
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <MentorVideoResources />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Mentor Agreement Section - Compact */}
      {contractData && (
        <MentorAgreementCard
          signatureName={contractData.signature_name}
          signatureDate={contractData.signature_date}
        />
      )}

      {/* My Startup Ideas Submissions - Lower priority */}
      <MySubmissions />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold mb-1">{t('mentorDashboard.title')}</h1>
          <p className="text-muted-foreground text-sm sm:text-lg">{t('mentorDashboard.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/mentor/sessions">
            <Button size="sm" variant="outline" className="h-9">
              <Video className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('mentorDashboard.sessions')}</span>
              <span className="sm:hidden">Sessions</span>
            </Button>
          </Link>
          <Link to="/mentor/cohort">
            <Button size="sm" variant="outline" className="relative h-9">
              <UsersRound className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('mentorDashboard.myCohort')}</span>
              <span className="sm:hidden">Cohort</span>
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
            <Button size="sm" className="h-9">
              <PlusCircle className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{t('mentorDashboard.createCourse')}</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Floating Onboarding Checklist - Minimizable */}
      {!onboardingMinimized ? (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-6 w-6"
            onClick={() => setOnboardingMinimized(true)}
          >
            <X className="h-4 w-4" />
          </Button>
          <MentorOnboardingChecklist />
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOnboardingMinimized(false)}
          className="flex items-center gap-2"
        >
          <HelpCircle className="h-4 w-4" />
          Show onboarding checklist
        </Button>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="messages" className="relative">
            <MessageCircle className="h-4 w-4 mr-2" />
            Messages
            {totalUnread > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
              >
                {totalUnread > 9 ? '9+' : totalUnread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <OverviewContent />
        </TabsContent>
        
        <TabsContent value="messages" className="mt-6">
          <MentorMessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
