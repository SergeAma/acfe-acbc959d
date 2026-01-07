import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompanyLogos } from '@/components/CompanyLogos';
import { MentorshipRequestDialog } from '@/components/mentorship/MentorshipRequestDialog';
import { MentorSessionBooking } from '@/components/mentorship/MentorSessionBooking';
import { CourseBadge } from '@/components/CourseBadge';
import { BookOpen, Linkedin, Twitter, Instagram, Github, Globe, ArrowLeft, Clock, BarChart, User, ChevronDown, Building2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { stripHtml } from '@/lib/html-utils';

// Component to show institutions where mentor has approved cohort partnerships
const ExclusiveMentorSection = ({ mentorId }: { mentorId: string }) => {
  const { data: institutions, isLoading } = useQuery({
    queryKey: ['mentor-exclusive-institutions', mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_cohorts')
        .select(`
          id,
          institution_id,
          institutions!inner (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq('mentor_id', mentorId)
        .eq('is_active', true);
      
      if (error) throw error;
      return (data || []).map(cohort => ({
        id: (cohort.institutions as any).id,
        name: (cohort.institutions as any).name,
        slug: (cohort.institutions as any).slug,
        logo_url: (cohort.institutions as any).logo_url,
      }));
    },
    enabled: !!mentorId,
  });

  if (isLoading || !institutions || institutions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 rounded-lg bg-accent/50 border border-accent">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        Exclusive Mentor to
      </h3>
      <div className="flex flex-wrap gap-3">
        {institutions.map((institution) => (
          <Link
            key={institution.id}
            to={`/institutions/${institution.slug}`}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-background hover:bg-primary/5 border border-border hover:border-primary/30 transition-colors"
          >
            {institution.logo_url ? (
              <img 
                src={institution.logo_url} 
                alt={institution.name}
                className="h-6 w-6 rounded object-contain"
              />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{institution.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

interface MentorProfile {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  profile_frame: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  github_url: string | null;
  website_url: string | null;
  companies_worked_for: string[] | null;
  skills: string[] | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  duration_weeks: number | null;
  thumbnail_url: string | null;
  is_paid: boolean;
  institution_id: string | null;
  institution?: {
    id: string;
    name: string;
  } | null;
}

export const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: mentor, isLoading: mentorLoading } = useQuery({
    queryKey: ['mentor-profile', id],
    queryFn: async () => {
      // Use the secure RPC function that excludes email
      const { data, error } = await supabase
        .rpc('get_public_mentor_profile', { mentor_id: id });

      if (error) throw error;
      // RPC returns an array, get the first item
      return (data && data.length > 0 ? data[0] : null) as MentorProfile | null;
    },
    enabled: !!id,
  });

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['mentor-courses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id, title, description, category, level, duration_weeks, thumbnail_url, is_paid, institution_id,
          institution:institutions (id, name)
        `)
        .eq('mentor_id', id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Course[];
    },
    enabled: !!id,
  });

  const handleCourseClick = (courseId: string) => {
    if (user) {
      navigate(`/courses/${courseId}/preview`);
    } else {
      navigate(`/auth?redirect=/courses/${courseId}/preview`);
    }
  };

  const isLoading = mentorLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PageBreadcrumb items={[{ label: "Mentors", href: "/mentors" }, { label: "Profile" }]} />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-8 mb-12">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <PageBreadcrumb items={[{ label: "Mentors", href: "/mentors" }, { label: "Not Found" }]} />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Mentor Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The mentor you're looking for doesn't exist or is no longer available.
            </p>
            <Link to="/mentors">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Mentors
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb 
        items={[
          { label: "Mentors", href: "/mentors" }, 
          { label: mentor.full_name || "Profile" }
        ]} 
      />
      
      <main className="container mx-auto px-4 py-12 relative">
        {/* Auth Gate Overlay for non-authenticated users */}
        {!user && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Card className="max-w-md mx-4 border border-border shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">View Mentor Profile</h2>
                <p className="text-muted-foreground text-sm">
                  Sign up to view full mentor profiles, explore their courses, and start your learning journey.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild className="rounded-full">
                    <Link to="/auth">Sign Up</Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-full">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={!user ? 'blur-sm pointer-events-none select-none' : ''}>
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link 
            to="/mentors" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to all mentors
          </Link>

          {/* Profile Header */}
          <div className="flex flex-col md:flex-row gap-8 mb-12">
            <ProfileAvatar
              src={mentor.avatar_url || undefined}
              name={mentor.full_name || undefined}
              frame={(mentor.profile_frame as 'none' | 'hiring' | 'open_to_work' | 'looking_for_cofounder') || 'none'}
              size="xl"
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold text-foreground">
                  {mentor.full_name || 'Anonymous Mentor'}
                </h1>
                
                {/* Social Links - Next to name */}
                <TooltipProvider>
                  <div className="flex gap-2">
                    {mentor.linkedin_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a 
                            href={mentor.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label="LinkedIn"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>LinkedIn</TooltipContent>
                      </Tooltip>
                    )}
                    {mentor.twitter_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a 
                            href={mentor.twitter_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label="Twitter"
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Twitter</TooltipContent>
                      </Tooltip>
                    )}
                    {mentor.instagram_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a 
                            href={mentor.instagram_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label="Instagram"
                          >
                            <Instagram className="h-5 w-5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Instagram</TooltipContent>
                      </Tooltip>
                    )}
                    {mentor.github_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a 
                            href={mentor.github_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label="GitHub"
                          >
                            <Github className="h-5 w-5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>GitHub</TooltipContent>
                      </Tooltip>
                    )}
                    {mentor.website_url && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a 
                            href={mentor.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            aria-label="Website"
                          >
                            <Globe className="h-5 w-5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>Website</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
              </div>
              
              {mentor.companies_worked_for && mentor.companies_worked_for.length > 0 && (
                <CompanyLogos 
                  companies={mentor.companies_worked_for} 
                  maxDisplay={6}
                  showNames={true}
                  className="mb-4"
                />
              )}
              
              <Badge variant="secondary" className="mb-4">
                <BookOpen className="h-3 w-3 mr-1" />
                {courses?.length || 0} Course{(courses?.length || 0) !== 1 ? 's' : ''}
              </Badge>

              {/* Mentorship Request Button */}
              {user && id && (
                <div className="mb-6">
                  <MentorshipRequestDialog mentorId={id} mentorName={mentor.full_name || 'this mentor'} />
                </div>
              )}

              {mentor.bio && (
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {mentor.bio}
                </p>
              )}

              {mentor.skills && mentor.skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {mentor.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="bg-primary/5">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Exclusive Mentor To Section */}
              <ExclusiveMentorSection mentorId={id!} />
            </div>
          </div>

          {/* Courses Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Courses by {mentor.full_name?.split(' ')[0] || 'this mentor'}</h2>
            
            {courses && courses.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <Card 
                    key={course.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer relative"
                    onClick={() => handleCourseClick(course.id)}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      <CourseBadge
                        isPaid={course.is_paid}
                        institutionId={course.institution_id}
                        institutionName={course.institution?.name}
                      />
                    </div>
                    {course.thumbnail_url && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                        <img 
                          src={course.thumbnail_url} 
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        {course.category && (
                          <Badge variant="outline" className="text-xs">
                            {course.category}
                          </Badge>
                        )}
                        {course.level && (
                          <Badge variant="secondary" className="text-xs">
                            <BarChart className="h-3 w-3 mr-1" />
                            {course.level}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {stripHtml(course.description)}
                        </p>
                      )}
                      {course.duration_weeks && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 mr-1" />
                          {course.duration_weeks} week{course.duration_weeks !== 1 ? 's' : ''}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground">
                    This mentor hasn't published any courses yet. Check back soon!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 1:1 Session Booking - Collapsible */}
          {user && id && (
            <Collapsible defaultOpen={false} className="mb-8">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-3 cursor-pointer hover:bg-primary/5 transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Book a 1:1 Session
                      </CardTitle>
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </div>
                    <p className="text-sm text-muted-foreground text-left">
                      Get personalized guidance with a private mentorship session
                    </p>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <MentorSessionBooking mentorId={id} mentorName={mentor.full_name || 'Mentor'} isEmbedded />
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
