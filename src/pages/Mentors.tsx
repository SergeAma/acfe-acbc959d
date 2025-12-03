import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Linkedin, Twitter, Instagram, Github, Globe } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
}

interface Course {
  id: string;
  title: string;
  category: string | null;
  thumbnail_url: string | null;
}

interface MentorWithCourses extends MentorProfile {
  courses: Course[];
}

export const Mentors = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; title: string } | null>(null);

  const handleCourseClick = (e: React.MouseEvent, course: { id: string; title: string }) => {
    e.stopPropagation();
    if (user) {
      navigate(`/courses/${course.id}`);
    } else {
      setSelectedCourse(course);
      setShowAuthDialog(true);
    }
  };

  const { data: mentors, isLoading } = useQuery({
    queryKey: ['mentors-with-courses'],
    queryFn: async () => {
      // Get mentor profiles from the public view (now includes avatar, bio, etc.)
      const { data: mentorProfiles, error: profilesError } = await supabase
        .from('profiles_public')
        .select('*');

      if (profilesError) throw profilesError;

      const mentorIds = mentorProfiles?.map(m => m.id).filter(Boolean) || [];
      
      // Fetch courses for all mentors
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, category, thumbnail_url, mentor_id')
        .eq('is_published', true)
        .in('mentor_id', mentorIds);

      if (coursesError) throw coursesError;

      // Combine mentor profiles with their courses
      const mentorsWithCourses: MentorWithCourses[] = (mentorProfiles || []).map(mentor => ({
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
        courses: (courses || []).filter(c => c.mentor_id === mentor.id).map(c => ({
          id: c.id,
          title: c.title,
          category: c.category,
          thumbnail_url: c.thumbnail_url
        }))
      }));

      return mentorsWithCourses;
    }
  });

  const handleMentorClick = (mentorId: string) => {
    // Navigate to mentor profile page
    navigate(`/mentors/${mentorId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Mentors" }]} />
      
      <main className="container mx-auto px-4 py-12">
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
                    <Skeleton className="h-20 w-full" />
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
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
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
                    
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {mentor.full_name || 'Anonymous Mentor'}
                    </h3>
                    
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

                    {/* Published Courses */}
                    {mentor.courses.length > 0 && (
                      <div className="w-full border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
                          <BookOpen className="h-4 w-4" />
                          <span>{mentor.courses.length} Course{mentor.courses.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {mentor.courses.slice(0, 3).map((course) => (
                            <Badge 
                              key={course.id} 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-secondary/80"
                              onClick={(e) => handleCourseClick(e, course)}
                            >
                              {course.title}
                            </Badge>
                          ))}
                          {mentor.courses.length > 3 && (
                            <Badge variant="outline">+{mentor.courses.length - 3} more</Badge>
                          )}
                        </div>
                      </div>
                    )}
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

      {/* Sign up prompt dialog for unauthenticated users */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign up to enroll</DialogTitle>
            <DialogDescription>
              Create a free account to enroll in "{selectedCourse?.title}" and start learning today.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setShowAuthDialog(false)}>
              Maybe later
            </Button>
            <Button variant="outline" onClick={() => navigate('/auth?mode=login')}>
              Log in
            </Button>
            <Button onClick={() => navigate('/auth?mode=signup&role=student')}>
              Sign up for free
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
