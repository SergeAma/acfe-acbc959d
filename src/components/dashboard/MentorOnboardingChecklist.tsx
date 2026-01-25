import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, Circle, User, BookOpen, Image, FileText, ArrowRight, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface CourseTopicItem {
  key: string;
  label: string;
  completed: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  link: string;
  icon: React.ReactNode;
  courseTopics?: CourseTopicItem[];
}

const COURSE_TOPICS = [
  { key: 'industry_entry', label: 'How you broke into your industry' },
  { key: 'getting_started', label: 'How to get into your industry' },
  { key: 'continuous_learning', label: 'Continuous learning to stay ahead in your industry' },
  { key: 'career_journey', label: 'How to become you (your career journey)' }
];

export const MentorOnboardingChecklist = () => {
  const { profile, user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [courseTopics, setCourseTopics] = useState<CourseTopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!profile || !user) return;

      // Fetch full profile data including skills
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch course topic progress
      const { data: topicProgress } = await supabase
        .from('mentor_course_topics')
        .select('topic_key, completed')
        .eq('mentor_id', user.id);

      const completedTopics = new Set(
        topicProgress?.filter(t => t.completed).map(t => t.topic_key) || []
      );

      const topicsWithStatus = COURSE_TOPICS.map(topic => ({
        ...topic,
        completed: completedTopics.has(topic.key)
      }));
      setCourseTopics(topicsWithStatus);

      // Check profile completion
      const hasFullName = !!fullProfile?.full_name && fullProfile.full_name.trim() !== '';
      const hasBio = !!fullProfile?.bio && fullProfile.bio.trim() !== '';
      const hasAvatar = !!fullProfile?.avatar_url;
      const hasSkills = fullProfile?.skills && fullProfile.skills.length > 0;
      
      // Check if mentor has created any courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id, is_published')
        .eq('mentor_id', user.id);

      const hasPublishedCourse = courses?.some(c => c.is_published) || false;
      const allTopicsCompleted = topicsWithStatus.every(t => t.completed);

      const items: ChecklistItem[] = [
        {
          id: 'name',
          label: 'Add your full name',
          description: 'Let students know who you are',
          completed: hasFullName,
          link: '/profile',
          icon: <User className="h-5 w-5" />
        },
        {
          id: 'avatar',
          label: 'Upload a profile photo',
          description: 'Add a professional photo to build trust',
          completed: hasAvatar,
          link: '/profile',
          icon: <Image className="h-5 w-5" />
        },
        {
          id: 'bio',
          label: 'Write your bio',
          description: 'Tell students about your experience',
          completed: hasBio,
          link: '/profile',
          icon: <FileText className="h-5 w-5" />
        },
        {
          id: 'skills',
          label: 'Add your skills',
          description: 'Showcase your areas of expertise',
          completed: hasSkills,
          link: '/profile',
          icon: <CheckCircle2 className="h-5 w-5" />
        },
        {
          id: 'course',
          label: 'Build your courses',
          description: 'Share your knowledge with the next generation by building 4 short (30 mins max) courses covering the following topics:',
          completed: allTopicsCompleted,
          link: '/mentor/courses/new',
          icon: <BookOpen className="h-5 w-5" />,
          courseTopics: topicsWithStatus
        },
        {
          id: 'publish',
          label: 'Publish a course',
          description: 'Make your course available to students',
          completed: hasPublishedCourse,
          link: courses && courses.length > 0 ? `/mentor/courses/${courses[0].id}/build` : '/mentor/courses/new',
          icon: <ArrowRight className="h-5 w-5" />
        }
      ];

      setChecklist(items);
      setLoading(false);
    };

    checkOnboardingStatus();
  }, [profile, user]);

  const handleTopicToggle = async (topicKey: string, currentStatus: boolean) => {
    if (!user) return;

    const newStatus = !currentStatus;

    // Optimistically update UI
    setCourseTopics(prev => 
      prev.map(t => t.key === topicKey ? { ...t, completed: newStatus } : t)
    );

    // Update in database
    const { error } = await supabase
      .from('mentor_course_topics')
      .upsert({
        mentor_id: user.id,
        topic_key: topicKey,
        completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null
      }, {
        onConflict: 'mentor_id,topic_key'
      });

    if (error) {
      console.error('Failed to update topic progress:', error);
      // Revert on error
      setCourseTopics(prev => 
        prev.map(t => t.key === topicKey ? { ...t, completed: currentStatus } : t)
      );
    } else {
      // Update checklist completion status
      setChecklist(prev => prev.map(item => {
        if (item.id === 'course') {
          const updatedTopics = courseTopics.map(t => 
            t.key === topicKey ? { ...t, completed: newStatus } : t
          );
          return {
            ...item,
            completed: updatedTopics.every(t => t.completed),
            courseTopics: updatedTopics
          };
        }
        return item;
      }));
    }
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Don't show checklist if all items are complete
  if (!loading && completedCount === totalCount) {
    return null;
  }

  if (loading) {
    return null;
  }

  // On mobile, start collapsed. On desktop, always show content.
  const shouldCollapse = isMobile;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <Collapsible open={shouldCollapse ? isOpen : true} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild disabled={!shouldCollapse}>
            <div className={`flex items-center justify-between ${shouldCollapse ? 'cursor-pointer' : ''}`}>
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl">Welcome to A Cloud for Everyone!</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete these steps to get started as a mentor
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-bold text-primary">{completedCount}/{totalCount}</span>
                  <p className="text-xs text-muted-foreground">completed</p>
                </div>
                {shouldCollapse && (
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <Progress value={progressPercentage} className="h-2 mt-3" />
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid gap-2 sm:gap-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-lg transition-colors ${
                    item.completed 
                      ? 'bg-green-50 dark:bg-green-950/20' 
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className={`flex-shrink-0 mt-0.5 ${item.completed ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    ) : (
                      <Circle className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm sm:text-base ${item.completed ? 'text-green-700 dark:text-green-400 line-through' : ''}`}>
                      {item.label}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                    {item.courseTopics && item.courseTopics.length > 0 && (
                      <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                        {item.courseTopics.map((topic) => (
                          <li key={topic.key} className="flex items-center gap-2 sm:gap-3">
                            <Checkbox
                              id={topic.key}
                              checked={topic.completed}
                              onCheckedChange={() => handleTopicToggle(topic.key, topic.completed)}
                              className="h-4 w-4"
                            />
                            <label 
                              htmlFor={topic.key}
                              className={`text-xs sm:text-sm cursor-pointer ${topic.completed ? 'text-green-600 line-through' : 'text-muted-foreground'}`}
                            >
                              {topic.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {!item.completed && !item.courseTopics && (
                    <Link to={item.link}>
                      <Button size="sm" variant="outline" className="text-xs h-8 px-2 sm:px-3">
                        Start
                      </Button>
                    </Link>
                  )}
                  {item.courseTopics && !item.completed && (
                    <Link to={item.link}>
                      <Button size="sm" variant="outline" className="text-xs h-8 px-2 sm:px-3">
                        Create
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
