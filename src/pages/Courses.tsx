import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navbar } from '@/components/Navbar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, BookOpen, X, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CourseBadge } from '@/components/CourseBadge';
import { stripHtml } from '@/lib/html-utils';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration_weeks: number;
  thumbnail_url: string;
  mentor_id: string;
  is_paid: boolean;
  institution_id: string | null;
  institution?: {
    id: string;
    name: string;
  } | null;
  mentor: {
    full_name: string;
  };
}

export const Courses = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const mentorFilter = searchParams.get('mentor');
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [mentorName, setMentorName] = useState<string | null>(null);
  const [subscribedCourseIds, setSubscribedCourseIds] = useState<string[]>([]);
  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          mentor:profiles!courses_mentor_id_fkey (
            full_name
          ),
          institution:institutions (
            id,
            name
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCourses(data as any);
        setFilteredCourses(data as any);
        
        // If filtering by mentor, get mentor name
        if (mentorFilter && data.length > 0) {
          const mentorCourse = data.find((c: any) => c.mentor_id === mentorFilter);
          if (mentorCourse) {
            setMentorName((mentorCourse as any).mentor?.full_name || 'Mentor');
          }
        }
      }
      setLoading(false);
    };

    const fetchSubscribedCourses = async () => {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from('course_purchases')
        .select('course_id')
        .eq('student_id', profile.id)
        .eq('status', 'completed');
      
      if (data) {
        setSubscribedCourseIds(data.map(p => p.course_id));
      }
    };

    const fetchCompletedAndEnrolledCourses = async () => {
      if (!profile?.id) return;
      
      // Fetch completed courses (those with certificates)
      const { data: certificates } = await supabase
        .from('course_certificates')
        .select('course_id')
        .eq('student_id', profile.id);
      
      if (certificates) {
        setCompletedCourseIds(certificates.map(c => c.course_id));
      }

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile.id);
      
      if (enrollments) {
        setEnrolledCourseIds(enrollments.map(e => e.course_id));
      }
    };

    fetchCourses();
    fetchSubscribedCourses();
    fetchCompletedAndEnrolledCourses();
  }, [mentorFilter, profile?.id]);

  useEffect(() => {
    let filtered = courses;

    // Filter by mentor if specified in URL
    if (mentorFilter) {
      filtered = filtered.filter((course) => course.mentor_id === mentorFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((course) => course.category === categoryFilter);
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter((course) => course.level === levelFilter);
    }

    setFilteredCourses(filtered);
  }, [searchTerm, categoryFilter, levelFilter, courses, mentorFilter]);

  const clearMentorFilter = () => {
    searchParams.delete('mentor');
    setSearchParams(searchParams);
    setMentorName(null);
  };

  const categories = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
  const levels = Array.from(new Set(courses.map((c) => c.level).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: t('nav.courses') }]} />
      
      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-4 relative">
        {/* Auth Gate Overlay for non-authenticated users */}
        {!user && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Card className="max-w-md mx-4 border border-border shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t('courses.title')}</h2>
                <p className="text-muted-foreground text-sm">
                  {t('courses.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button asChild className="rounded-full">
                    <Link to="/auth">{t('auth.signUp')}</Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-full">
                    <Link to="/auth">{t('auth.signIn')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Blurred content for non-authenticated users */}
        <div className={!user ? 'blur-sm pointer-events-none select-none' : ''}>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t('courses.title')}</h1>
          <p className="text-muted-foreground text-base sm:text-lg">{t('courses.subtitle')}</p>
        </div>

        {/* Mentor Filter Banner */}
        {mentorFilter && mentorName && (
          <div className="mb-6 p-4 bg-primary/10 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('courses.mentorBy')}:</span>
              <Badge variant="secondary" className="text-base">
                {mentorName}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={clearMentorFilter}>
              <X className="h-4 w-4 mr-1" />
              {t('courses.filter')}
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('courses.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('courses.filterByCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('courses.allCategories')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('courses.filterByLevel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('courses.allLevels')}</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
        ) : filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">{t('courses.noCourses')}</h3>
              <p className="text-muted-foreground">
                {mentorFilter ? t('courses.noCoursesDesc') : t('courses.noCoursesDesc')}
              </p>
              {mentorFilter && (
                <Button variant="outline" className="mt-4" onClick={clearMentorFilter}>
                  {t('common.viewAll')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCourses.map((course) => {
              const isSubscribed = subscribedCourseIds.includes(course.id);
              const isCompleted = completedCourseIds.includes(course.id);
              const isEnrolled = enrolledCourseIds.includes(course.id);
              return (
              <Card key={course.id} className={`hover:shadow-lg transition-shadow relative ${isCompleted ? 'ring-2 ring-emerald-600' : isEnrolled ? 'ring-2 ring-blue-600' : isSubscribed ? 'ring-2 ring-primary' : ''}`}>
                <div className="absolute top-2 right-2 z-10">
                  <CourseBadge
                    isPaid={course.is_paid}
                    isSubscribed={isSubscribed}
                    isCompleted={isCompleted}
                    isEnrolled={isEnrolled}
                    institutionId={course.institution_id}
                    institutionName={course.institution?.name}
                  />
                </div>
                {course.thumbnail_url && (
                  <div className="relative h-40 overflow-hidden rounded-t-lg">
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
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {course.category}
                    </span>
                    <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">
                      {course.level}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {stripHtml(course.description)}
                  </p>
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground">{t('courses.mentorBy')} {course.mentor?.full_name}</span>
                    <span className="text-muted-foreground">{course.duration_weeks} {t('courses.weeks')}</span>
                  </div>
                  <Link to={`/courses/${course.id}`}>
                    <Button className="w-full">{t('courses.viewDetails')}</Button>
                  </Link>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
