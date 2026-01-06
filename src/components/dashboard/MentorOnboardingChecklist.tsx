import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, User, BookOpen, Image, FileText, ArrowRight } from 'lucide-react';

interface SubChecklistItem {
  label: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  link: string;
  icon: React.ReactNode;
  subItems?: SubChecklistItem[];
}

export const MentorOnboardingChecklist = () => {
  const { profile, user } = useAuth();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!profile || !user) return;

      // Fetch full profile data including skills
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

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

      const hasCourse = courses && courses.length > 0;
      const hasPublishedCourse = courses?.some(c => c.is_published) || false;

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
          description: 'Share your knowledge with the next generation',
          completed: hasCourse,
          link: '/mentor/courses/new',
          icon: <BookOpen className="h-5 w-5" />,
          subItems: [
            { label: 'How you broke into your industry' },
            { label: 'How to get into your industry' },
            { label: 'Continuous learning to stay ahead in your industry' },
            { label: 'How to become you (your career journey)' }
          ]
        },
        {
          id: 'publish',
          label: 'Publish a course',
          description: 'Make your course available to students',
          completed: hasPublishedCourse,
          link: hasCourse ? `/mentor/courses/${courses?.[0]?.id}/build` : '/mentor/courses/new',
          icon: <ArrowRight className="h-5 w-5" />
        }
      ];

      setChecklist(items);
      setLoading(false);
    };

    checkOnboardingStatus();
  }, [profile, user]);

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

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Welcome to A Cloud for Everyone!</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these steps to get started as a mentor
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{completedCount}/{totalCount}</span>
            <p className="text-xs text-muted-foreground">completed</p>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2 mt-3" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                item.completed 
                  ? 'bg-green-50 dark:bg-green-950/20' 
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              <div className={`flex-shrink-0 ${item.completed ? 'text-green-600' : 'text-muted-foreground'}`}>
                {item.completed ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <Circle className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${item.completed ? 'text-green-700 dark:text-green-400 line-through' : ''}`}>
                  {item.label}
                </p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                {item.subItems && item.subItems.length > 0 && (
                  <ul className="mt-2 ml-4 space-y-1">
                    {item.subItems.map((subItem, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{subItem.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!item.completed && (
                <Link to={item.link}>
                  <Button size="sm" variant="outline">
                    Start
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
