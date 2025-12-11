import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompanyLogos } from '@/components/CompanyLogos';
import { BookOpen, Linkedin, Twitter, Instagram, Github, Globe, UserPlus, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
  courseCount: number;
}

export const Mentors = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: mentors, isLoading } = useQuery({
    queryKey: ['mentors-list'],
    queryFn: async () => {
      // Use the secure RPC function that excludes email
      const { data: mentorProfiles, error: profilesError } = await supabase
        .rpc('get_public_mentor_profiles');

      if (profilesError) throw profilesError;

      const mentorIds = mentorProfiles?.map(m => m.id).filter(Boolean) || [];
      
      // Fetch course counts for all mentors
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('mentor_id')
        .eq('is_published', true)
        .in('mentor_id', mentorIds);

      if (coursesError) throw coursesError;

      // Count courses per mentor
      const courseCounts: Record<string, number> = {};
      courses?.forEach(c => {
        if (c.mentor_id) {
          courseCounts[c.mentor_id] = (courseCounts[c.mentor_id] || 0) + 1;
        }
      });

      // Combine mentor profiles with course counts
      const mentorsWithCounts: MentorProfile[] = (mentorProfiles || []).map(mentor => ({
        id: mentor.id!,
        full_name: mentor.full_name,
        bio: mentor.bio,
        avatar_url: mentor.avatar_url,
        profile_frame: mentor.profile_frame,
        linkedin_url: mentor.linkedin_url,
        twitter_url: mentor.twitter_url,
        instagram_url: mentor.instagram_url,
        github_url: mentor.github_url,
        website_url: mentor.website_url,
        companies_worked_for: mentor.companies_worked_for,
        skills: mentor.skills,
        courseCount: courseCounts[mentor.id!] || 0
      }));

      return mentorsWithCounts;
    }
  });

  const handleMentorClick = (mentorId: string) => {
    navigate(`/mentors/${mentorId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Mentors" }]} />
      
      <main className="container mx-auto px-4 py-12">
        {/* Auth prompt banner for unauthenticated users */}
        {!user && (
          <div className="mb-8 p-6 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  Ready to start learning?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Create a free account to enroll in courses and connect with mentors.
                </p>
              </div>
              <div className="flex gap-3">
                <Link to="/auth?mode=login">
                  <Button variant="outline" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Log in
                  </Button>
                </Link>
                <Link to="/auth?mode=signup&role=student">
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign up free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Our Mentors</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Learn from experienced professionals who are passionate about sharing their knowledge and empowering the next generation of African tech talent.
          </p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <Skeleton className="h-24 w-24 rounded-full mb-4" />
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48 mb-4" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mentors && mentors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mentors.map((mentor) => (
              <Card 
                key={mentor.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => handleMentorClick(mentor.id)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <ProfileAvatar
                      src={mentor.avatar_url || undefined}
                      name={mentor.full_name || undefined}
                      frame={(mentor.profile_frame as 'none' | 'hiring' | 'open_to_work' | 'looking_for_cofounder') || 'none'}
                      size="lg"
                      className="mb-4"
                    />
                    
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {mentor.full_name || 'Anonymous Mentor'}
                    </h3>
                    
                    {mentor.companies_worked_for && mentor.companies_worked_for.length > 0 && (
                      <CompanyLogos 
                        companies={mentor.companies_worked_for} 
                        maxDisplay={3}
                        className="mb-3 justify-center"
                      />
                    )}
                    
                    {mentor.courseCount > 0 && (
                      <Badge variant="secondary" className="mb-3">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {mentor.courseCount} Course{mentor.courseCount !== 1 ? 's' : ''}
                      </Badge>
                    )}

                    {mentor.skills && mentor.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3 justify-center">
                        {mentor.skills.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-primary/5">
                            {skill}
                          </Badge>
                        ))}
                        {mentor.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{mentor.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {mentor.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {mentor.bio}
                      </p>
                    )}

                    {/* Social Links */}
                    <div className="flex gap-3 mb-4" onClick={(e) => e.stopPropagation()}>
                      {mentor.linkedin_url && (
                        <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <Linkedin className="h-5 w-5" />
                        </a>
                      )}
                      {mentor.twitter_url && (
                        <a href={mentor.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {mentor.instagram_url && (
                        <a href={mentor.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                      {mentor.github_url && (
                        <a href={mentor.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <Github className="h-5 w-5" />
                        </a>
                      )}
                      {mentor.website_url && (
                        <a href={mentor.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                          <Globe className="h-5 w-5" />
                        </a>
                      )}
                    </div>

                    <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      View Profile & Courses
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No mentors available yet. Check back soon!</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
