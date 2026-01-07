import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileCheck, AlertCircle } from 'lucide-react';

interface Enrollment {
  id: string;
  course: {
    id: string;
    title: string;
  };
}

interface PendingSubmission {
  id: string;
  status: string;
  submitted_at: string;
  course_id: string;
  course_title: string;
  enrollment_id: string;
}

interface PendingAssignmentsProps {
  enrollments: Enrollment[];
}

export const PendingAssignments = ({ enrollments }: PendingAssignmentsProps) => {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingSubmissions = async () => {
      if (!profile?.id || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      const enrollmentIds = enrollments.map(e => e.id);

      const { data, error } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          status,
          submitted_at,
          enrollment_id,
          assignment:course_assignments(
            course_id,
            course:courses(id, title)
          )
        `)
        .eq('student_id', profile.id)
        .in('enrollment_id', enrollmentIds)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false });

      if (!error && data) {
        const submissions: PendingSubmission[] = data.map((s: any) => ({
          id: s.id,
          status: s.status,
          submitted_at: s.submitted_at,
          course_id: s.assignment?.course?.id || '',
          course_title: s.assignment?.course?.title || 'Unknown Course',
          enrollment_id: s.enrollment_id,
        }));
        setPendingSubmissions(submissions);
      }

      setLoading(false);
    };

    fetchPendingSubmissions();
  }, [profile?.id, enrollments]);

  if (loading || pendingSubmissions.length === 0) {
    return null;
  }

  const isEnglish = language === 'en';

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {isEnglish ? 'Assignments Under Review' : 'Devoirs en Cours d\'Examen'}
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                {pendingSubmissions.length}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isEnglish 
                ? 'Your mentor is reviewing your submissions. Expect a response within 48 hours.' 
                : 'Votre mentor examine vos soumissions. Attendez une réponse dans 48 heures.'}
            </p>
            <div className="mt-3 space-y-2">
              {pendingSubmissions.slice(0, 3).map((submission) => (
                <div 
                  key={submission.id} 
                  className="flex items-center justify-between gap-2 p-2 bg-background rounded-lg border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{submission.course_title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {isEnglish ? 'Pending' : 'En attente'}
                    </Badge>
                    <Link to={`/courses/${submission.course_id}/learn?tab=assessments`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        {isEnglish ? 'View' : 'Voir'}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {pendingSubmissions.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  {isEnglish 
                    ? `+ ${pendingSubmissions.length - 3} more pending` 
                    : `+ ${pendingSubmissions.length - 3} autres en attente`}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
