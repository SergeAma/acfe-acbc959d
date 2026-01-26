import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface InternalPrerequisite {
  id: string;
  title: string;
}

interface ExternalPrerequisite {
  id: string;
  title: string;
  url: string;
}

interface CoursePrerequisitesDisplayProps {
  courseId: string;
}

export const CoursePrerequisitesDisplay = ({ courseId }: CoursePrerequisitesDisplayProps) => {
  const { profile } = useAuth();
  const [internalPrereqs, setInternalPrereqs] = useState<InternalPrerequisite[]>([]);
  const [externalPrereqs, setExternalPrereqs] = useState<ExternalPrerequisite[]>([]);
  const [completedCourseIds, setCompletedCourseIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        // Fetch internal prerequisites
        const { data: internalData, error: internalError } = await supabase
          .from('course_prerequisites')
          .select(`
            prerequisite_course_id,
            prerequisite_course:courses!course_prerequisites_prerequisite_course_id_fkey (
              id,
              title
            )
          `)
          .eq('course_id', courseId);

        if (internalError) {
          console.error('Error fetching internal prerequisites:', internalError);
        } else if (internalData) {
          const prereqs = internalData
            .filter(p => p.prerequisite_course)
            .map(p => ({
              id: p.prerequisite_course.id,
              title: p.prerequisite_course.title
            }));
          setInternalPrereqs(prereqs);
        }

        // Fetch external prerequisites
        const { data: externalData, error: externalError } = await supabase
          .from('external_course_prerequisites')
          .select('id, title, url')
          .eq('course_id', courseId);

        if (externalError) {
          console.error('Error fetching external prerequisites:', externalError);
        } else if (externalData) {
          setExternalPrereqs(externalData);
        }

        // If user is logged in, check which internal prereqs they've completed
        if (profile?.id && internalData && internalData.length > 0) {
          const prereqIds = internalData
            .filter(p => p.prerequisite_course)
            .map(p => p.prerequisite_course.id);

          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id, progress')
            .eq('student_id', profile.id)
            .in('course_id', prereqIds)
            .eq('progress', 100);

          if (enrollments) {
            setCompletedCourseIds(new Set(enrollments.map(e => e.course_id)));
          }
        }
      } catch (error) {
        console.error('Error fetching prerequisites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrerequisites();
  }, [courseId, profile?.id]);

  if (loading) {
    return null;
  }

  const totalPrereqs = internalPrereqs.length + externalPrereqs.length;
  
  if (totalPrereqs === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Prerequisites
          <Badge variant="secondary" className="ml-auto">{totalPrereqs}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete these courses before starting:
        </p>
        
        {/* Internal Prerequisites */}
        {internalPrereqs.length > 0 && (
          <div className="space-y-2">
            {internalPrereqs.map((prereq) => {
              const isCompleted = completedCourseIds.has(prereq.id);
              return (
                <div
                  key={prereq.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    isCompleted 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className={`font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {prereq.title}
                      </p>
                      {isCompleted && (
                        <p className="text-xs text-green-600">Completed</p>
                      )}
                    </div>
                  </div>
                  {!isCompleted && (
                    <Link to={`/courses/${prereq.id}`}>
                      <Button size="sm" variant="outline">
                        View Course
                      </Button>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* External Prerequisites */}
        {externalPrereqs.length > 0 && (
          <div className="space-y-2">
            {internalPrereqs.length > 0 && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">
                External Resources
              </p>
            )}
            {externalPrereqs.map((prereq) => (
              <div
                key={prereq.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-background"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium text-sm">{prereq.title}</p>
                </div>
                <a href={prereq.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
