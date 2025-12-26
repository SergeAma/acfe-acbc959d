import { Card, CardContent } from '@/components/ui/card';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompanyLogos } from '@/components/CompanyLogos';
import { BookOpen, Linkedin, Twitter, Instagram, Github, Globe } from 'lucide-react';
import { useInView } from '@/hooks/use-in-view';

interface MentorCardProps {
  mentor: {
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
  };
  index: number;
  onClick: () => void;
}

export function MentorCard({ mentor, index, onClick }: MentorCardProps) {
  const { ref, isInView } = useInView<HTMLDivElement>({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        isInView 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <Card 
        className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group h-full flex flex-col"
        onClick={onClick}
      >
        <CardContent className="p-6 flex flex-col h-full">
          {/* Avatar + Name - fixed height */}
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
          </div>

          {/* Companies section - fixed min-height */}
          <div className="min-h-[32px] flex items-center justify-center mb-2">
            {mentor.companies_worked_for && mentor.companies_worked_for.length > 0 && (
              <CompanyLogos 
                companies={mentor.companies_worked_for} 
                maxDisplay={2}
                className="justify-center flex-nowrap"
              />
            )}
          </div>

          {/* Badges section - fixed min-height */}
          <div className="min-h-[28px] flex flex-wrap gap-1 justify-center items-center mb-2">
            {mentor.courseCount > 0 && (
              <Badge variant="secondary">
                <BookOpen className="h-3 w-3 mr-1" />
                {mentor.courseCount} Course{mentor.courseCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {mentor.skills && mentor.skills.length > 0 && (
              <>
                {mentor.skills.slice(0, 2).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-primary/5">
                    {skill}
                  </Badge>
                ))}
                {mentor.skills.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{mentor.skills.length - 2}
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Bio section - flex grow with min-height */}
          <div className="flex-1 min-h-[72px] flex items-start justify-center text-center mb-4">
            {mentor.bio && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {mentor.bio}
              </p>
            )}
          </div>

          {/* Social Links - fixed */}
          <div className="flex gap-3 justify-center mb-4 min-h-[20px]" onClick={(e) => e.stopPropagation()}>
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

          {/* Button - fixed */}
          <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            View Profile & Courses
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
