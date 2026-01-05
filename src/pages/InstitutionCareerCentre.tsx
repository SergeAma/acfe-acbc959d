import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Calendar, Briefcase, Award, 
  ExternalLink, Loader2, Shield, GraduationCap, 
  CheckCircle2, Users, Sparkles, ArrowRight, BookOpen,
  TrendingUp, Megaphone, Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useInstitutionBySlug, 
  useInstitutionMembership,
  useInstitutionEvents,
  useInstitutionAnnouncements
} from '@/hooks/useInstitution';
import { useClaimInstitutionInvitation } from '@/hooks/useClaimInstitutionInvitation';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import { stripHtml } from '@/lib/html-utils';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string | null;
  level: string | null;
  is_live: boolean | null;
  live_date: string | null;
}

interface Enrollment {
  id: string;
  progress: number;
  course: Course;
}

export const InstitutionCareerCentre = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isCreatingSpectrogram, setIsCreatingSpectrogram] = useState(false);

  const { data: institution, isLoading: institutionLoading } = useInstitutionBySlug(slug);
  
  // Auto-claim pending invitation when user visits
  const claimInvitation = useClaimInstitutionInvitation(institution?.id);
  
  const { data: membership, isLoading: membershipLoading } = useInstitutionMembership(institution?.id);
  const { data: events = [] } = useInstitutionEvents(institution?.id);
  const { data: announcements = [] } = useInstitutionAnnouncements(institution?.id);
  const { data: careerReadiness } = useCareerReadiness();

  // Fetch user's enrollments
  const { data: enrollments = [] } = useQuery({
    queryKey: ['user-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          progress,
          course:courses (
            id, title, description, thumbnail_url, category, level, is_live, live_date
          )
        `)
        .eq('student_id', user.id)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return data as Enrollment[];
    },
    enabled: !!user,
  });

  // Fetch all published courses for general ACFE courses
  const { data: allCourses = [] } = useQuery({
    queryKey: ['published-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, category, level, is_live, live_date')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as Course[];
    },
  });

  const handleCreateSpectrogram = async () => {
    setIsCreatingSpectrogram(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-spectrogram-token', {});
      if (error) throw error;
      if (data?.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        toast.success('Redirecting to Spectrogram...');
      }
    } catch (error) {
      toast.error('Failed to create Spectrogram profile');
    } finally {
      setIsCreatingSpectrogram(false);
    }
  };

  // Loading states - include claim attempt in loading
  const isClaimingInvitation = claimInvitation.isPending;
  
  if (authLoading || institutionLoading || isClaimingInvitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found
  if (!institution) {
    return <Navigate to="/not-found" replace />;
  }

  // Auth gate - must be logged in
  const currentPath = `/career-centre/${slug}`;
  
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Access Restricted</h2>
              <p className="text-muted-foreground text-sm">
                Sign in to access the {institution.name} Career Centre.
              </p>
              <p className="text-muted-foreground text-xs">
                Use the same email address that received your invitation.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button asChild className="rounded-full">
                  <Link to={`/auth?redirect=${encodeURIComponent(currentPath)}`}>Sign In</Link>
                </Button>
                <Button variant="outline" asChild className="rounded-full">
                  <Link to={`/auth?mode=signup&redirect=${encodeURIComponent(currentPath)}`}>Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Membership gate - must be verified member (admins bypass this check)
  const isAdmin = profile?.role === 'admin';
  if (!membershipLoading && !membership && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold">Membership Required</h2>
              <p className="text-muted-foreground text-sm">
                This Career Centre is exclusively for verified students of <strong>{institution.name}</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                If you're a student, please contact your institution to request access using your institutional email address.
              </p>
              <Button variant="outline" asChild className="rounded-full">
                <Link to="/dashboard">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const upcomingEvents = events.filter(e => e.event_date && !isPast(new Date(e.event_date)));
  const inProgressEnrollments = enrollments.filter(e => e.progress < 100);
  const completedEnrollments = enrollments.filter(e => e.progress >= 100);
  const avgProgress = enrollments.length > 0 
    ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
    : 0;

  // Filter courses user is not enrolled in
  const enrolledCourseIds = new Set(enrollments.map(e => e.course.id));
  const availableCourses = allCourses.filter(c => !enrolledCourseIds.has(c.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[
        { label: "Career Centre", href: "/career-centre" },
        { label: institution.name }
      ]} />

      {/* Branded Header Section */}
      <section className="border-b border-border py-8 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-6">
              {institution.logo_url ? (
                <img 
                  src={institution.logo_url} 
                  alt={institution.name}
                  className="h-16 w-16 sm:h-20 sm:w-20 object-contain rounded-xl bg-background p-2 border shadow-sm"
                />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-primary/10 flex items-center justify-center border">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified Student
                  </Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!
                </h1>
                <p className="text-muted-foreground mt-1">
                  {institution.name} Career Development Centre
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{inProgressEnrollments.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Currently learning</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{avgProgress}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Certificates</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{careerReadiness?.certificates || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Earned</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Institution Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{upcomingEvents.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
                </CardContent>
              </Card>
            </div>

            {/* Institution Announcements */}
            {announcements.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-primary" />
                    {institution.name} Announcements
                  </h2>
                </div>
                <div className="space-y-3">
                  {announcements.slice(0, 3).map(announcement => (
                    <Card key={announcement.id} className={announcement.is_pinned ? 'border-primary/30 bg-primary/5' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {announcement.is_pinned && (
                            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                              {announcement.is_pinned && (
                                <Badge variant="outline" className="text-xs">Pinned</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{announcement.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(announcement.created_at!), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Section: Exclusive to Institution */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Exclusive to {institution.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Events and opportunities available through your institution's partnership with ACFE
                  </p>
                </div>
              </div>
              
              {upcomingEvents.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingEvents.map(event => (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                            <span className="text-lg font-bold text-primary leading-none">
                              {format(new Date(event.event_date!), 'd')}
                            </span>
                            <span className="text-xs text-primary uppercase">
                              {format(new Date(event.event_date!), 'MMM')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{event.title}</h4>
                            <Badge variant="outline" className="text-xs mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(event.event_date!), 'h:mm a')}
                            </Badge>
                          </div>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{event.description}</p>
                        )}
                        {event.event_url && (
                          <Button variant="outline" size="sm" asChild className="w-full">
                            <a href={event.event_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Event
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No exclusive events scheduled yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back soon for upcoming events!</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section: General ACFE Courses & Events */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Courses Available to All ACFE Learners
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Continue your learning journey with our full catalog
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/courses">Browse All Courses</Link>
                </Button>
              </div>

              {/* In Progress Courses */}
              {inProgressEnrollments.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Continue Learning
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgressEnrollments.slice(0, 3).map(enrollment => (
                      <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="aspect-video rounded-lg bg-muted mb-3 overflow-hidden">
                            {enrollment.course.thumbnail_url ? (
                              <img 
                                src={enrollment.course.thumbnail_url} 
                                alt={enrollment.course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <h4 className="font-semibold text-foreground line-clamp-1 mb-1">
                            {enrollment.course.title}
                          </h4>
                          <div className="flex items-center gap-2 mb-3">
                            <Progress value={enrollment.progress} className="flex-1 h-2" />
                            <span className="text-xs text-muted-foreground">{enrollment.progress}%</span>
                          </div>
                          <Button size="sm" asChild className="w-full">
                            <Link to={`/courses/${enrollment.course.id}/learn`}>
                              Continue Learning
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Courses */}
              {availableCourses.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Explore New Courses
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableCourses.slice(0, 3).map(course => (
                      <Card key={course.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="aspect-video rounded-lg bg-muted mb-3 overflow-hidden">
                            {course.thumbnail_url ? (
                              <img 
                                src={course.thumbnail_url} 
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {course.category && (
                              <Badge variant="secondary" className="text-xs">{course.category}</Badge>
                            )}
                            {course.is_live && (
                              <Badge className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Live</Badge>
                            )}
                          </div>
                          <h4 className="font-semibold text-foreground line-clamp-1 mb-1">
                            {course.title}
                          </h4>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {stripHtml(course.description)}
                            </p>
                          )}
                          <Button variant="outline" size="sm" asChild className="w-full">
                            <Link to={`/courses/${course.id}`}>
                              View Course
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {inProgressEnrollments.length === 0 && availableCourses.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No courses available at the moment.</p>
                    <Button variant="outline" asChild className="mt-4">
                      <Link to="/courses">Browse Course Catalog</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Talent Network CTA */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground">Join the Talent Network</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your Spectrogram Consulting talent profile to be discovered by employers and access exclusive job opportunities.
                    </p>
                    <div className="mt-4">
                      {careerReadiness?.spectrogramProfileCreated ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Profile Created
                        </Badge>
                      ) : (
                        <>
                          <Button 
                            className="rounded-full"
                            onClick={handleCreateSpectrogram}
                            disabled={isCreatingSpectrogram || !careerReadiness?.isCareerReady}
                          >
                            {isCreatingSpectrogram ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ArrowRight className="h-4 w-4 mr-2" />
                            )}
                            Create Talent Profile
                          </Button>
                          {!careerReadiness?.isCareerReady && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Complete at least 1 course and earn a certificate to unlock.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
