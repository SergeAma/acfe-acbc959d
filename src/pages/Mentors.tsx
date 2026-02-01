import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MentorCard } from '@/components/MentorCard';
import { MentorRecommendationForm } from '@/components/MentorRecommendationForm';
import { UserPlus, LogIn, X, Filter, Search, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
  const { t } = useLanguage();
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillPopoverOpen, setSkillPopoverOpen] = useState(false);

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

  // Extract all unique skills from mentors
  const allSkills = useMemo(() => {
    if (!mentors) return [];
    const skillSet = new Set<string>();
    mentors.forEach(mentor => {
      mentor.skills?.forEach(skill => skillSet.add(skill));
    });
    return Array.from(skillSet).sort();
  }, [mentors]);

  // Filter mentors based on selected skills and search query
  const filteredMentors = useMemo(() => {
    if (!mentors) return [];
    return mentors.filter(mentor => {
      const matchesSkills = selectedSkills.length === 0 || 
        selectedSkills.some(skill => mentor.skills?.includes(skill));
      const matchesSearch = !searchQuery || 
        mentor.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSkills && matchesSearch;
    });
  }, [mentors, selectedSkills, searchQuery]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
    setSkillSearchQuery('');
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  };

  const clearFilters = () => {
    setSelectedSkills([]);
    setSearchQuery('');
    setSkillSearchQuery('');
  };

  // Filter skills based on search query for the dropdown
  const filteredSkillOptions = useMemo(() => {
    if (!skillSearchQuery) return allSkills.filter(s => !selectedSkills.includes(s));
    return allSkills
      .filter(s => !selectedSkills.includes(s))
      .filter(s => s.toLowerCase().includes(skillSearchQuery.toLowerCase()));
  }, [allSkills, skillSearchQuery, selectedSkills]);

  const hasFilters = selectedSkills.length > 0 || searchQuery.length > 0;

  const handleMentorClick = (mentorId: string) => {
    navigate(`/mentors/${mentorId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: t('nav.mentors') }]} />
      
      <main className="container mx-auto px-4 py-12">
        {/* Auth prompt banner for unauthenticated users */}
        {!user && (
          <div className="mb-8 p-4 sm:p-6 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                  {t('hero.startLearning')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('mentors.subtitle')}
                </p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Link to="/auth?mode=login" className="flex-1 sm:flex-initial">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    <LogIn className="h-4 w-4 mr-2" />
                    {t('auth.signIn')}
                  </Button>
                </Link>
                <Link to="/auth?mode=signup&role=student" className="flex-1 sm:flex-initial">
                  <Button size="sm" className="w-full sm:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('auth.signUp')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">{t('mentors.title')}</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            {t('mentors.subtitle')}
          </p>
        </div>

        {/* Search and Skill Filters - Clean Horizontal Layout */}
        <div className="mb-8 space-y-3">
          {/* Search Input + Skill Filter in one row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('mentors.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Skill Filter Dropdown */}
            {allSkills.length > 0 && (
              <Popover open={skillPopoverOpen} onOpenChange={setSkillPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="justify-between min-w-[200px] sm:w-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span>{t('mentors.filter')}</span>
                      {selectedSkills.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          {selectedSkills.length}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0 bg-popover border shadow-lg z-50" align="start">
                  <div className="p-3 border-b">
                    <Input
                      placeholder="Search skills..."
                      value={skillSearchQuery}
                      onChange={(e) => setSkillSearchQuery(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {filteredSkillOptions.length > 0 ? (
                      filteredSkillOptions.map(skill => (
                        <button
                          key={skill}
                          onClick={() => toggleSkill(skill)}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          {skill}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {skillSearchQuery ? 'No matching skills' : 'All skills selected'}
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Clear Filters Button */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>

          {/* Selected Skills as Badges */}
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Skills:</span>
              {selectedSkills.map(skill => (
                <Badge
                  key={skill}
                  variant="default"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer gap-1"
                  onClick={() => removeSkill(skill)}
                >
                  {skill}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}

          {/* Filter Results Count */}
          {hasFilters && (
            <p className="text-sm text-muted-foreground">
              {t('news.showing')} {filteredMentors.length} {filteredMentors.length !== 1 ? t('nav.mentors').toLowerCase() : t('nav.mentors').toLowerCase().slice(0, -1)}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
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
        ) : filteredMentors && filteredMentors.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 auto-rows-fr">
            {filteredMentors.map((mentor, index) => (
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                index={index}
                onClick={() => handleMentorClick(mentor.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {selectedSkills.length > 0 
                ? t('mentors.noMentorsDesc')
                : t('mentors.noMentors')}
            </p>
            {selectedSkills.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                {t('common.close')}
              </Button>
            )}
          </div>
        )}

        {/* Mentor Recommendation Form */}
        <div className="mt-16">
          <MentorRecommendationForm />
        </div>
      </main>

      <Footer />
    </div>
  );
};
