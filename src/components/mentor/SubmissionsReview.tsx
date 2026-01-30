import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageSquare, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';

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

const GOOGLE_FORM_RESPONSES_URL = 'https://docs.google.com/forms/d/1UNC2B8aRJzQX2xOZmeEsGiwmq7o2viwgL-ALx01ZYLs/edit#responses';

export const SubmissionsReview = () => {
  const { profile } = useAuth();
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<QuizAnswer | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [profile]);

  const fetchSubmissions = async () => {
    if (!profile?.id) return;

    setLoading(true);

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

  const pendingQuizAnswersCount = quizAnswers.length;

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
        {pendingQuizAnswersCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            {pendingQuizAnswersCount} pending review
          </Badge>
        )}
      </div>

      {/* Google Form Responses Link */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Assignment Submissions</p>
              <p className="text-xs text-muted-foreground">
                View and manage assignment submissions in Google Forms
              </p>
            </div>
            <a
              href={GOOGLE_FORM_RESPONSES_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Responses
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {pendingQuizAnswersCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No quiz answers need grading right now.</p>
          </CardContent>
        </Card>
      ) : (
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
