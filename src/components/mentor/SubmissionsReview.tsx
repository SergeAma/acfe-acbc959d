import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, MessageSquare, CheckCircle, XCircle, Clock, ExternalLink, Download } from 'lucide-react';

interface AssignmentSubmission {
  id: string;
  text_content: string | null;
  video_url: string | null;
  file_url: string | null;
  file_name: string | null;
  status: string;
  submitted_at: string;
  student_id: string;
  enrollment_id: string;
  assignment_id: string;
  student: {
    full_name: string | null;
    email: string;
  };
  assignment: {
    title: string;
    course: {
      title: string;
    };
  };
}

interface QuizAnswer {
  id: string;
  text_answer: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  attempt_id: string;
  question_id: string;
  question: {
    question_text: string;
    points: number;
    quiz: {
      title: string;
      course: {
        title: string;
      };
    };
  };
  attempt: {
    student_id: string;
    student: {
      full_name: string | null;
      email: string;
    };
  };
}

export const SubmissionsReview = () => {
  const { profile } = useAuth();
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentSubmission | null>(null);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<QuizAnswer | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [profile]);

  const fetchSubmissions = async () => {
    if (!profile?.id) return;

    setLoading(true);

    // Fetch pending assignment submissions for mentor's courses
    const { data: assignments } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        student:profiles!assignment_submissions_student_id_fkey(full_name, email),
        assignment:course_assignments!assignment_submissions_assignment_id_fkey(
          title,
          course:courses!course_assignments_course_id_fkey(title, mentor_id)
        )
      `)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true });

    // Filter to only mentor's courses
    const mentorAssignments = (assignments || []).filter(
      (sub: any) => sub.assignment?.course?.mentor_id === profile.id
    );
    setAssignmentSubmissions(mentorAssignments as any);

    // Fetch ungraded short-answer quiz responses for mentor's courses
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select(`
        *,
        question:quiz_questions!quiz_answers_question_id_fkey(
          question_text,
          points,
          question_type,
          quiz:course_quizzes!quiz_questions_quiz_id_fkey(
            title,
            course:courses!course_quizzes_course_id_fkey(title, mentor_id)
          )
        ),
        attempt:quiz_attempts!quiz_answers_attempt_id_fkey(
          student_id,
          student:profiles!quiz_attempts_student_id_fkey(full_name, email)
        )
      `)
      .is('graded_at', null)
      .not('text_answer', 'is', null);

    // Filter to only mentor's courses and short_answer questions
    const mentorQuizAnswers = (answers || []).filter(
      (ans: any) => 
        ans.question?.quiz?.course?.mentor_id === profile.id &&
        ans.question?.question_type === 'short_answer'
    );
    setQuizAnswers(mentorQuizAnswers as any);

    setLoading(false);
  };

  const handleAssignmentReview = async (status: 'approved' | 'revision_needed') => {
    if (!selectedAssignment || !profile?.id) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        status,
        mentor_feedback: feedback,
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id,
      })
      .eq('id', selectedAssignment.id);

    if (error) {
      toast.error('Failed to submit review');
    } else {
      toast.success(`Assignment ${status === 'approved' ? 'approved' : 'sent back for revision'}`);
      
      // Send notification email to student
      try {
        await supabase.functions.invoke('send-assignment-graded-notification', {
          body: {
            studentId: selectedAssignment.student_id,
            mentorName: profile.full_name || 'Your Mentor',
            courseTitle: selectedAssignment.assignment?.course?.title || 'Course',
            assignmentTitle: selectedAssignment.assignment?.title || 'Assignment',
            status: status === 'revision_needed' ? 'revision_requested' : status,
            feedback: feedback || null,
          }
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }
      
      setSelectedAssignment(null);
      setFeedback('');
      fetchSubmissions();
    }

    setSubmitting(false);
  };

  const handleQuizAnswerGrade = async () => {
    if (!selectedQuizAnswer || !profile?.id || isCorrect === null) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('quiz_answers')
      .update({
        is_correct: isCorrect,
        points_earned: isCorrect ? pointsEarned : 0,
        graded_at: new Date().toISOString(),
        graded_by: profile.id,
      })
      .eq('id', selectedQuizAnswer.id);

    if (error) {
      toast.error('Failed to grade answer');
    } else {
      toast.success('Answer graded successfully');

      // Check if all answers for this attempt are graded
      await updateAttemptScore(selectedQuizAnswer.attempt_id);

      setSelectedQuizAnswer(null);
      setIsCorrect(null);
      setPointsEarned(0);
      fetchSubmissions();
    }

    setSubmitting(false);
  };

  const updateAttemptScore = async (attemptId: string) => {
    // Get all answers for this attempt
    const { data: allAnswers } = await supabase
      .from('quiz_answers')
      .select('is_correct, points_earned, question:quiz_questions!quiz_answers_question_id_fkey(points)')
      .eq('attempt_id', attemptId);

    if (!allAnswers) return;

    // Check if all are graded
    const allGraded = allAnswers.every((a: any) => a.is_correct !== null);
    if (!allGraded) return;

    // Calculate score
    const totalPoints = allAnswers.reduce((sum: number, a: any) => sum + (a.question?.points || 0), 0);
    const earnedPoints = allAnswers.reduce((sum: number, a: any) => sum + (a.points_earned || 0), 0);
    const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // Get quiz passing percentage
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('quiz:course_quizzes!quiz_attempts_quiz_id_fkey(passing_percentage)')
      .eq('id', attemptId)
      .single();

    const passingPercentage = attempt?.quiz?.passing_percentage || 70;
    const passed = scorePercentage >= passingPercentage;

    // Update attempt
    await supabase
      .from('quiz_attempts')
      .update({
        score_percentage: scorePercentage,
        passed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attemptId);
  };

  const pendingAssignmentsCount = assignmentSubmissions.length;
  const pendingQuizAnswersCount = quizAnswers.length;
  const totalPending = pendingAssignmentsCount + pendingQuizAnswersCount;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading submissions...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Student Submissions</h2>
        {totalPending > 0 && (
          <Badge variant="secondary" className="text-sm">
            {totalPending} pending review
          </Badge>
        )}
      </div>

      {totalPending === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No submissions need your review right now.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList>
            <TabsTrigger value="assignments" className="relative">
              Assignments
              {pendingAssignmentsCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] flex items-center justify-center">
                  {pendingAssignmentsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="relative">
              Quiz Answers
              {pendingQuizAnswersCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] flex items-center justify-center">
                  {pendingQuizAnswersCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-4">
            <div className="space-y-4">
              {assignmentSubmissions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No pending assignment submissions
                  </CardContent>
                </Card>
              ) : (
                assignmentSubmissions.map((submission) => (
                  <Card key={submission.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{submission.assignment?.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {submission.assignment?.course?.title}
                          </p>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">{submission.student?.full_name || 'Unknown'}</span>
                          <span className="text-muted-foreground ml-2">
                            submitted {new Date(submission.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <Button onClick={() => setSelectedAssignment(submission)}>
                          Review Submission
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="quizzes" className="mt-4">
            <div className="space-y-4">
              {quizAnswers.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No pending quiz answers to grade
                  </CardContent>
                </Card>
              ) : (
                quizAnswers.map((answer) => (
                  <Card key={answer.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{answer.question?.quiz?.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {answer.question?.quiz?.course?.title}
                          </p>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Needs Grading
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Question:</p>
                        <p className="text-sm">{answer.question?.question_text}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="font-medium">
                            {answer.attempt?.student?.full_name || 'Unknown'}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({answer.question?.points} points)
                          </span>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedQuizAnswer(answer);
                            setPointsEarned(answer.question?.points || 0);
                          }}
                        >
                          Grade Answer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Assignment Review Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Assignment Submission</DialogTitle>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Assignment</Label>
                <p className="font-medium">{selectedAssignment.assignment?.title}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAssignment.assignment?.course?.title}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Student</Label>
                <p className="font-medium">{selectedAssignment.student?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedAssignment.student?.email}</p>
              </div>

              {selectedAssignment.text_content && (
                <div>
                  <Label className="text-muted-foreground">Text Submission</Label>
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap break-words text-sm overflow-hidden">
                    {selectedAssignment.text_content}
                  </div>
                </div>
              )}

              {selectedAssignment.video_url && (
                <div>
                  <Label className="text-muted-foreground">Video Submission</Label>
                  <a
                    href={selectedAssignment.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mt-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Video
                  </a>
                </div>
              )}

              {selectedAssignment.file_url && (
                <div>
                  <Label className="text-muted-foreground">File Submission</Label>
                  <a
                    href={selectedAssignment.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mt-1 text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    {selectedAssignment.file_name || 'Download File'}
                  </a>
                </div>
              )}

              <div>
                <Label htmlFor="feedback">Feedback (optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the student..."
                  className="mt-1"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleAssignmentReview('revision_needed')}
              disabled={submitting}
              className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Request Revision
            </Button>
            <Button
              onClick={() => handleAssignmentReview('approved')}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Answer Grading Dialog */}
      <Dialog open={!!selectedQuizAnswer} onOpenChange={() => setSelectedQuizAnswer(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Grade Quiz Answer</DialogTitle>
          </DialogHeader>

          {selectedQuizAnswer && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Student</Label>
                <p className="font-medium">
                  {selectedQuizAnswer.attempt?.student?.full_name || 'Unknown'}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Question</Label>
                <p className="mt-1 p-3 bg-muted/50 rounded-lg">
                  {selectedQuizAnswer.question?.question_text}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Student's Answer</Label>
                <p className="mt-1 p-3 bg-primary/10 rounded-lg">
                  {selectedQuizAnswer.text_answer}
                </p>
              </div>

              <div>
                <Label className="mb-2 block">Is the answer correct?</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={isCorrect === true ? 'default' : 'outline'}
                    onClick={() => {
                      setIsCorrect(true);
                      setPointsEarned(selectedQuizAnswer.question?.points || 0);
                    }}
                    className={isCorrect === true ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Correct
                  </Button>
                  <Button
                    type="button"
                    variant={isCorrect === false ? 'default' : 'outline'}
                    onClick={() => {
                      setIsCorrect(false);
                      setPointsEarned(0);
                    }}
                    className={isCorrect === false ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Incorrect
                  </Button>
                </div>
              </div>

              {isCorrect === true && (
                <div>
                  <Label htmlFor="points">Points Earned (max: {selectedQuizAnswer.question?.points})</Label>
                  <input
                    id="points"
                    type="number"
                    min={0}
                    max={selectedQuizAnswer.question?.points || 0}
                    value={pointsEarned}
                    onChange={(e) => setPointsEarned(Math.min(
                      parseInt(e.target.value) || 0,
                      selectedQuizAnswer.question?.points || 0
                    ))}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuizAnswer(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuizAnswerGrade}
              disabled={submitting || isCorrect === null}
            >
              Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
