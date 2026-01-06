import { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Calendar, Award, 
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
import { InstitutionAuthGate } from '@/components/institution/InstitutionAuthGate';
import { InstitutionMembershipGate } from '@/components/institution/InstitutionMembershipGate';

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
  const [isCreatingSpectrogram, setIsCreatingSpectrogram] = useState(false);

  const { data: institution, isLoading: institutionLoading } = useInstitutionBySlug(slug);
  
  // Auto-claim pending invitation when user visits
  const claimInvitation = useClaimInstitutionInvitation(institution?.id);
  
  const { data: membership, isLoading: membershipLoading, refetch: refetchMembership } = useInstitutionMembership(institution?.id);
  const { data: events = [] } = useInstitutionEvents(institution?.id);
  const { data: announcements = [] } = useInstitutionAnnouncements(institution?.id);
  const { data: careerReadiness } = useCareerReadiness();

  // If user has pending invitation, trigger claim to activate it
  useEffect(() => {
    if (membership?.status === 'pending' && user?.id && institution?.id && !claimInvitation.isPending) {
      claimInvitation.mutate({ userId: user.id, instId: institution.id });
    }
  }, [membership?.status, user?.id, institution?.id, claimInvitation.isPending]);

  // Refetch membership after claim attempt completes (success or not)
  useEffect(() => {
    if (claimInvitation.isSuccess) {
      refetchMembership();
    }
  }, [claimInvitation.isSuccess, refetchMembership]);

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

  // Fetch institution-exclusive courses
  const { data: exclusiveCourses = [] } = useQuery({
    queryKey: ['institution-exclusive-courses', institution?.id],
    queryFn: async () => {
      if (!institution?.id) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, category, level, is_live, live_date')
        .eq('institution_id', institution.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!institution?.id,
  });

  // Fetch all published courses for general ACFE courses (excluding institution-specific ones)
  const { data: allCourses = [] } = useQuery({
    queryKey: ['published-courses-general'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, category, level, is_live, live_date')
        .eq('is_published', true)
        .is('institution_id', null)
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

  // Generate institution acronym for display
  const getAcronym = (name: string) => {
    return name
      .split(' ')
      .filter(word => !['of', 'and', 'for'].includes(word.toLowerCase()))
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
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

  const currentPath = `/career-centre/${slug}`;
  const acronym = getAcronym(institution.name);

  // Auth gate - must be logged in (branded experience)
  if (!user) {
    return (
      <>
        <Navbar />
        <InstitutionAuthGate institution={institution} currentPath={currentPath} />
        <Footer />
      </>
    );
  }

  // Membership gate - must be verified member (admins bypass this check)
  const isAdmin = profile?.role === 'admin';
  if (!membershipLoading && !membership && !isAdmin) {
    return (
      <>
        <Navbar />
        <InstitutionMembershipGate institution={institution} />
        <Footer />
      </>
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

      {/* Branded Header Section with institution colors */}
      <section className="relative border-b border-border py-8 bg-gradient-to-br from-primary/5 via-background to-muted/30 overflow-hidden">
        {/* Decorative accent using institution branding */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-6">
              {/* Institution logo with accent ring */}
              <div className="relative">
                {institution.logo_url ? (
                  <div className="relative">
                    <img 
                      src={institution.logo_url} 
                      alt={institution.name}
                      className="h-20 w-20 sm:h-24 sm:w-24 object-contain rounded-2xl bg-white p-2 border-2 border-primary/20 shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  </div>
                ) : (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/20 shadow-lg">
                    <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    <Shield className="h-3 w-3 mr-1" />
                    {acronym} Partner
                  </Badge>
                  {membership?.status === 'active' ? (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified Student
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Clock className="h-3 w-3 mr-1" />
                      Invitation Pending
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                  Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'}!
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="font-medium text-primary">{institution.name}</span>
                  <span>Career Development Centre</span>
                </p>
                {institution.description && (
                  <p className="text-sm text-muted-foreground mt-2 max-w-2xl line-clamp-2">
                    {institution.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Stats Cards with institution-themed accents */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{inProgressEnrollments.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Currently learning</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{avgProgress}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all courses</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Certificates</CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-500">{careerReadiness?.certificates || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Earned</p>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{acronym} Events</CardTitle>
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-500">{upcomingEvents.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Upcoming</p>
                </CardContent>
              </Card>
            </div>

            {/* Institution Announcements with branded styling */}
            {announcements.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <span>{acronym} Announcements</span>
                  </h2>
                </div>
                <div className="space-y-3">
                  {announcements.slice(0, 3).map(announcement => (
                    <Card key={announcement.id} className={`transition-all hover:shadow-md ${announcement.is_pinned ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-transparent' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {announcement.is_pinned && (
                            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                              {announcement.is_pinned && (
                                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Pinned</Badge>
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

            {/* Section: Exclusive to Institution - enhanced styling */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {institution.logo_url && (
                    <img 
                      src={institution.logo_url} 
                      alt="" 
                      className="h-8 w-8 object-contain rounded-lg bg-white p-0.5 border"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      Exclusive to {acronym}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Content available through your institution's partnership with ACFE
                    </p>
                  </div>
                </div>
              </div>

              {/* Exclusive Courses with branded cards */}
              {exclusiveCourses.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
                    Exclusive Courses
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {exclusiveCourses.map(course => (
                      <Card key={course.id} className="hover:shadow-lg transition-all border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent group">
                        <CardContent className="p-4">
                          <div className="aspect-video rounded-lg bg-muted mb-3 overflow-hidden relative">
                            {course.thumbnail_url ? (
                              <img 
                                src={course.thumbnail_url} 
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              <Badge className="text-xs bg-primary shadow-sm">
                                {acronym} EXCLUSIVE
                              </Badge>
                            </div>
                          </div>
                          <h4 className="font-semibold text-foreground line-clamp-1 mb-1">{course.title}</h4>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {stripHtml(course.description).substring(0, 100)}...
                            </p>
                          )}
                          <Button variant="default" size="sm" asChild className="w-full">
                            <Link to={`/courses/${course.id}`}>
                              View Course
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Exclusive Events */}
              {upcomingEvents.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wide mb-3">
                    Upcoming {acronym} Events
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {upcomingEvents.map(event => (
                      <Card key={event.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex flex-col items-center justify-center shrink-0 border border-blue-500/20">
                              <span className="text-xl font-bold text-blue-500 leading-none">
                                {format(new Date(event.event_date!), 'd')}
                              </span>
                              <span className="text-xs text-blue-500 uppercase font-medium">
                                {format(new Date(event.event_date!), 'MMM')}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground truncate">{event.title}</h4>
                              <Badge variant="outline" className="text-xs mt-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
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
                </div>
              )}

              {/* Empty state if no exclusive content */}
              {exclusiveCourses.length === 0 && upcomingEvents.length === 0 && (
                <Card className="border-dashed border-2 border-primary/20">
                  <CardContent className="p-8 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">No exclusive content yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Check back soon for {acronym} courses and events!</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section: General ACFE Courses & Events */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-muted-foreground" />
                    ACFE Course Catalog
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
                  <h3 className="text-sm font-semibold text-green-500 uppercase tracking-wide mb-3">
                    Continue Learning
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgressEnrollments.slice(0, 3).map(enrollment => (
                      <Card key={enrollment.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
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
                            <span className="text-xs font-medium text-green-500">{enrollment.progress}%</span>
                          </div>
                          <Button size="sm" asChild className="w-full bg-green-500 hover:bg-green-600">
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

            {/* Talent Network CTA with institution branding */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
              <CardContent className="p-6 relative">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-foreground">Join the Talent Network</h3>
                      {institution.logo_url && (
                        <img src={institution.logo_url} alt="" className="h-5 w-5 object-contain rounded" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your Spectrogram Consulting talent profile to be discovered by employers. 
                      As a {acronym} student, you'll have priority access to exclusive opportunities.
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
