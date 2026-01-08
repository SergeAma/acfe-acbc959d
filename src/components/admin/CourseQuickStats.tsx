import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, FileText, GraduationCap, ClipboardList, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface CourseQuickStatsProps {
  courseId: string;
}

interface QuickStats {
  completions: number;
  quizzesPassed: number;
  assignmentsSubmitted: number;
}

interface QuizAttempt {
  id: string;
  student_id: string;
  passed: boolean;
  score: number;
  total_questions: number;
  completed_at: string;
  student_name: string;
  student_email: string;
}

interface AssignmentSubmission {
  id: string;
  student_id: string;
  status: string;
  submitted_at: string;
  student_name: string;
  student_email: string;
  mentor_feedback: string | null;
}

export const CourseQuickStats = ({ courseId }: CourseQuickStatsProps) => {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogType, setDialogType] = useState<'completions' | 'quizzes' | 'assignments' | null>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [courseId]);

  const fetchStats = async () => {
    try {
      // First get the quiz ID for this course
      const { data: quizData } = await supabase
        .from('course_quizzes')
        .select('id')
        .eq('course_id', courseId)
        .maybeSingle();

      const quizId = quizData?.id;

      // Parallel fetch: completions, quiz passes, assignment submissions
      const [completionsRes, quizRes, assignmentRes] = await Promise.all([
        // Completions: enrollments with progress >= 100
        supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .gte('progress', 100),
        // Quiz passes (only if quiz exists)
        quizId
          ? supabase
              .from('quiz_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('quiz_id', quizId)
              .eq('passed', true)
          : Promise.resolve({ count: 0 }),
        // Assignment submissions
        supabase
          .from('assignment_submissions')
          .select('id, course_assignments!inner(course_id)', { count: 'exact', head: true })
          .eq('course_assignments.course_id', courseId)
      ]);

      setStats({
        completions: completionsRes.count || 0,
        quizzesPassed: quizRes.count || 0,
        assignmentsSubmitted: assignmentRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCompletionsDialog = async () => {
    setDialogType('completions');
    setDetailLoading(true);
    
    const { data } = await supabase
      .from('enrollments')
      .select(`
        id,
        progress,
        enrolled_at,
        student:profiles!enrollments_student_id_fkey(full_name, email)
      `)
      .eq('course_id', courseId)
      .gte('progress', 100)
      .order('enrolled_at', { ascending: false });

    setDetailData(data?.map(d => ({
      id: d.id,
      student_name: d.student?.full_name || 'Unknown',
      student_email: d.student?.email || '',
      progress: d.progress,
      enrolled_at: d.enrolled_at
    })) || []);
    setDetailLoading(false);
  };

  const openQuizzesDialog = async () => {
    setDialogType('quizzes');
    setDetailLoading(true);

    // First get the quiz ID for this course
    const { data: quizData } = await supabase
      .from('course_quizzes')
      .select('id')
      .eq('course_id', courseId)
      .maybeSingle();

    if (!quizData?.id) {
      setDetailData([]);
      setDetailLoading(false);
      return;
    }
    
    const { data } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        passed,
        score_percentage,
        completed_at,
        student:profiles!quiz_attempts_student_id_fkey(full_name, email)
      `)
      .eq('quiz_id', quizData.id)
      .order('completed_at', { ascending: false });

    setDetailData(data?.map((d: any) => ({
      id: d.id,
      student_name: d.student?.full_name || 'Unknown',
      student_email: d.student?.email || '',
      passed: d.passed,
      score_percentage: d.score_percentage,
      completed_at: d.completed_at
    })) || []);
    setDetailLoading(false);
  };

  const openAssignmentsDialog = async () => {
    setDialogType('assignments');
    setDetailLoading(true);
    
    const { data } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        status,
        submitted_at,
        mentor_feedback,
        text_content,
        file_url,
        student:profiles!assignment_submissions_student_id_fkey(full_name, email),
        course_assignments!inner(course_id, title)
      `)
      .eq('course_assignments.course_id', courseId)
      .order('submitted_at', { ascending: false });

    setDetailData(data?.map(d => ({
      id: d.id,
      student_name: d.student?.full_name || 'Unknown',
      student_email: d.student?.email || '',
      status: d.status,
      submitted_at: d.submitted_at,
      mentor_feedback: d.mentor_feedback,
      text_content: d.text_content,
      file_url: d.file_url,
      assignment_title: d.course_assignments?.title || 'Assignment'
    })) || []);
    setDetailLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground py-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading stats...
      </div>
    );
  }

  if (!stats) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-secondary/20 text-secondary border-0 text-xs">Approved</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">Pending</Badge>;
      case 'revision_requested':
        return <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">Revision</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 text-xs border-t pt-3 mt-3">
        <button 
          onClick={openCompletionsDialog}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          <span className="font-medium">{stats.completions}</span>
          <span>completed</span>
        </button>
        <button 
          onClick={openQuizzesDialog}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span className="font-medium">{stats.quizzesPassed}</span>
          <span>quizzes passed</span>
        </button>
        <button 
          onClick={openAssignmentsDialog}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="font-medium">{stats.assignmentsSubmitted}</span>
          <span>submissions</span>
        </button>
      </div>

      {/* Completions Dialog */}
      <Dialog open={dialogType === 'completions'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Course Completions ({detailData.length})
            </DialogTitle>
            <DialogDescription>Students who have completed this course</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No completions yet</p>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.student_name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.student_email}</TableCell>
                      <TableCell>
                        <Badge className="bg-secondary/20 text-secondary border-0">{item.progress}%</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Quizzes Dialog */}
      <Dialog open={dialogType === 'quizzes'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Quiz Attempts ({detailData.length})
            </DialogTitle>
            <DialogDescription>All quiz attempts for this course</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No quiz attempts yet</p>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.student_name}</p>
                          <p className="text-xs text-muted-foreground">{item.student_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.score_percentage}%</TableCell>
                      <TableCell>
                        {item.passed ? (
                          <span className="flex items-center gap-1 text-secondary">
                            <CheckCircle className="h-4 w-4" />
                            Passed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            Failed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(item.completed_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Assignments Dialog */}
      <Dialog open={dialogType === 'assignments'} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assignment Submissions ({detailData.length})
            </DialogTitle>
            <DialogDescription>All assignment submissions for this course</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No submissions yet</p>
          ) : (
            <ScrollArea className="max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.student_name}</p>
                          <p className="text-xs text-muted-foreground">{item.student_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(item.submitted_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {item.mentor_feedback ? (
                          <p className="text-sm text-muted-foreground truncate">{item.mentor_feedback}</p>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Pending review
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
