import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  MessageSquare, CheckCircle, XCircle, Clock, ExternalLink, 
  Youtube, FolderOpen, Send, RotateCcw
} from 'lucide-react';

interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  enrollment_id: string;
  video_url: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  mentor_feedback: string | null;
  student: {
    full_name: string | null;
    email: string;
  } | null;
  assignment: {
    title: string;
    course: {
      id: string;
      title: string;
    };
  } | null;
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
  
  // Quiz grading state
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<QuizAnswer | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  
  // Assignment review state
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [profile]);

  const fetchSubmissions = async () => {
    if (!profile?.id) return;

    setLoading(true);

    // Fetch assignment submissions for mentor's courses
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select(`
        id,
        assignment_id,
        student_id,
        enrollment_id,
        video_url,
        status,
        submitted_at,
        reviewed_at,
        mentor_feedback,
        student:profiles!assignment_submissions_student_id_fkey(full_name, email),
        assignment:course_assignments!assignment_submissions_assignment_id_fkey(
          title,
          course:courses!course_assignments_course_id_fkey(id, title, mentor_id)
        )
      `)
      .order('submitted_at', { ascending: false });

    // Filter to only mentor's courses
    const mentorSubmissions = (submissions || []).filter(
      (sub: any) => sub.assignment?.course?.mentor_id === profile.id
    );
    setAssignmentSubmissions(mentorSubmissions as AssignmentSubmission[]);

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

  const handleApproveSubmission = async (submission: AssignmentSubmission) => {
    setSubmitting(true);
    try {
      // Update submission status to approved
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', submission.id);

      if (error) throw error;

      // Create in-app notification for student (approval)
      const courseName = submission.assignment?.course?.title || 'your course';
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: submission.student_id,
          message: `Congratulations! Your assignment for "${courseName}" has been approved.`,
          link: '/my-certificates',
          action_type: 'info',
          action_reference_id: submission.id,
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
      }

      // Send approval email to student via service-role wrapper
      try {
        console.log('[SubmissionsReview] Sending assignment-approved email to:', submission.student?.email);
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-assignment-notification', {
          body: {
            type: 'assignment-approved',
            studentEmail: submission.student?.email,
            studentName: submission.student?.full_name || 'Learner',
            studentId: submission.student_id,
            courseName: submission.assignment?.course?.title,
            mentorName: profile?.full_name,
          }
        });
        if (emailError) {
          console.error('Failed to send approval email:', emailError);
        } else {
          console.log('[SubmissionsReview] Approval email sent:', emailResult);
        }
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Continue - email failure shouldn't block the workflow
      }

      // Trigger certificate generation via edge function
      const { error: certError } = await supabase.functions.invoke('send-course-completion-notification', {
        body: {
          enrollmentId: submission.enrollment_id,
          courseId: submission.assignment?.course?.id,
          studentId: submission.student_id,
        }
      });

      if (certError) {
        console.error('Certificate trigger error:', certError);
      }

      toast.success('Assignment approved! Certificate generation triggered.');
      fetchSubmissions();
    } catch (error: any) {
      toast.error('Failed to approve: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNeedsRevision = async () => {
    if (!selectedSubmission || !feedbackText.trim()) {
      toast.error('Please provide feedback for the student');
      return;
    }

    setSubmitting(true);
    try {
      // Update submission with feedback - use 'revision_requested' to match DB constraint
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          status: 'revision_requested',
          mentor_feedback: feedbackText,
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      // Create in-app notification for student (uses existing notification infrastructure)
      const courseName = selectedSubmission.assignment?.course?.title || 'your course';
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedSubmission.student_id,
          message: `Your assignment for "${courseName}" needs revision. Your mentor has provided feedback.`,
          link: '/dashboard',
          action_type: 'revise_assignment',
          action_reference_id: selectedSubmission.id,
        });

      if (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Continue - notification failure shouldn't block the workflow
      }

      // Send feedback email to student via service-role wrapper
      console.log('[SubmissionsReview] Sending assignment-feedback email to:', selectedSubmission.student?.email);
      const { data: feedbackEmailResult, error: feedbackEmailError } = await supabase.functions.invoke('send-assignment-notification', {
        body: {
          type: 'assignment-feedback',
          studentEmail: selectedSubmission.student?.email,
          studentName: selectedSubmission.student?.full_name || 'Learner',
          studentId: selectedSubmission.student_id,
          courseName: selectedSubmission.assignment?.course?.title,
          mentorName: profile?.full_name,
          feedback: feedbackText,
        }
      });
      if (feedbackEmailError) {
        console.error('Failed to send feedback email:', feedbackEmailError);
      } else {
        console.log('[SubmissionsReview] Feedback email sent:', feedbackEmailResult);
      }

      toast.success('Feedback sent to student');
      setSelectedSubmission(null);
      setFeedbackText('');
      fetchSubmissions();
    } catch (error: any) {
      toast.error('Failed to send feedback: ' + error.message);
    } finally {
      setSubmitting(false);
    }
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
      await updateAttemptScore(selectedQuizAnswer.attempt_id);
      setSelectedQuizAnswer(null);
      setIsCorrect(null);
      setPointsEarned(0);
      fetchSubmissions();
    }

    setSubmitting(false);
  };

  const updateAttemptScore = async (attemptId: string) => {
    const { data: allAnswers } = await supabase
      .from('quiz_answers')
      .select('is_correct, points_earned, question:quiz_questions!quiz_answers_question_id_fkey(points)')
      .eq('attempt_id', attemptId);

    if (!allAnswers) return;

    const allGraded = allAnswers.every((a: any) => a.is_correct !== null);
    if (!allGraded) return;

    const totalPoints = allAnswers.reduce((sum: number, a: any) => sum + (a.question?.points || 0), 0);
    const earnedPoints = allAnswers.reduce((sum: number, a: any) => sum + (a.points_earned || 0), 0);
    const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('quiz:course_quizzes!quiz_attempts_quiz_id_fkey(passing_percentage)')
      .eq('id', attemptId)
      .single();

    const passingPercentage = attempt?.quiz?.passing_percentage || 70;
    const passed = scorePercentage >= passingPercentage;

    await supabase
      .from('quiz_attempts')
      .update({
        score_percentage: scorePercentage,
        passed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attemptId);
  };

  const getVideoIcon = (url: string | null) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return <Youtube className="h-4 w-4 text-red-500" />;
    }
    return <FolderOpen className="h-4 w-4 text-blue-500" />;
  };

  const pendingAssignments = assignmentSubmissions.filter(s => s.status === 'pending');
  const reviewedAssignments = assignmentSubmissions.filter(s => s.status !== 'pending');
  const pendingQuizAnswersCount = quizAnswers.length;
  const totalPending = pendingAssignments.length + pendingQuizAnswersCount;

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
            <p className="text-muted-foreground">No submissions need review right now.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Assignment Submissions Section */}
          {pendingAssignments.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Assignment Submissions
                <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center">
                  {pendingAssignments.length}
                </Badge>
              </h3>
              
              {pendingAssignments.map((submission) => (
                <Card key={submission.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{submission.assignment?.course?.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {submission.assignment?.title}
                        </p>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending Review
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {submission.student?.full_name || 'Unknown Student'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {submission.student?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {new Date(submission.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2">
                        {submission.video_url && (
                          <a
                            href={submission.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
                              {getVideoIcon(submission.video_url)}
                              <ExternalLink className="h-3 w-3" />
                              View Submission
                            </Button>
                          </a>
                        )}
                        <Button 
                          size="sm" 
                          className="gap-2 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveSubmission(submission)}
                          disabled={submitting}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark as Passed
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setFeedbackText('');
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Needs Revision
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quiz Answers Section */}
          {quizAnswers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Quiz Answers
                <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center">
                  {pendingQuizAnswersCount}
                </Badge>
              </h3>
              
              {quizAnswers.map((answer) => (
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
              ))}
            </div>
          )}
        </>
      )}

      {/* Reviewed Assignments History */}
      {reviewedAssignments.length > 0 && (
        <div className="space-y-4 mt-8">
          <h3 className="text-lg font-semibold text-muted-foreground">
            Reviewed Submissions ({reviewedAssignments.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="border p-2 text-left text-sm">Student</th>
                  <th className="border p-2 text-left text-sm">Course</th>
                  <th className="border p-2 text-left text-sm">Submission</th>
                  <th className="border p-2 text-left text-sm">Status</th>
                  <th className="border p-2 text-left text-sm">Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {reviewedAssignments.slice(0, 10).map((submission) => (
                  <tr key={submission.id} className="hover:bg-muted/50">
                    <td className="border p-2 text-sm">{submission.student?.full_name || 'Unknown'}</td>
                    <td className="border p-2 text-sm">{submission.assignment?.course?.title}</td>
                    <td className="border p-2">
                      {submission.video_url && (
                        <a
                          href={submission.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          {getVideoIcon(submission.video_url)}
                          View
                        </a>
                      )}
                    </td>
                    <td className="border p-2">
                      <Badge 
                        variant={submission.status === 'approved' ? 'default' : 'outline'}
                        className={submission.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {submission.status === 'approved' ? 'Passed' : 
                         submission.status === 'revision_requested' ? 'Revision Requested' : 
                         'Pending Review'}
                      </Badge>
                    </td>
                    <td className="border p-2 text-sm text-muted-foreground">
                      {submission.reviewed_at 
                        ? new Date(submission.reviewed_at).toLocaleDateString()
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feedback Dialog for Needs Revision */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Student</Label>
                <p className="font-medium">
                  {selectedSubmission.student?.full_name || 'Unknown'}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Course</Label>
                <p className="font-medium">
                  {selectedSubmission.assignment?.course?.title}
                </p>
              </div>

              {selectedSubmission.video_url && (
                <div>
                  <Label className="text-muted-foreground">Submission</Label>
                  <a
                    href={selectedSubmission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline mt-1"
                  >
                    {getVideoIcon(selectedSubmission.video_url)}
                    <ExternalLink className="h-3 w-3" />
                    View Submission
                  </a>
                </div>
              )}

              <div>
                <Label htmlFor="feedback" className="text-muted-foreground">
                  Feedback for Student *
                </Label>
                <Textarea
                  id="feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Explain what needs to be improved..."
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This feedback will be emailed to the student
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleNeedsRevision}
              disabled={submitting || !feedbackText.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send Feedback
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
