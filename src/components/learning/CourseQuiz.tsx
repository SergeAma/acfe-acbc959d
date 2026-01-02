import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, HelpCircle, Clock, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

interface CourseQuizProps {
  courseId: string;
  enrollmentId: string;
  onComplete: (passed: boolean) => void;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_percentage: number;
  time_limit_minutes: number | null;
  is_required: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer';
  points: number;
  sort_order: number;
  options?: Option[];
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface Answer {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
}

interface Attempt {
  id: string;
  score_percentage: number | null;
  passed: boolean | null;
  completed_at: string | null;
}

export const CourseQuiz = ({ courseId, enrollmentId, onComplete }: CourseQuizProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [courseId, enrollmentId]);

  const fetchQuiz = async () => {
    setLoading(true);

    // Fetch quiz
    const { data: quizData, error: quizError } = await supabase
      .from('course_quizzes')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle();

    if (quizError || !quizData) {
      setLoading(false);
      return;
    }

    setQuiz(quizData);

    // Check for existing attempt
    const { data: attemptData } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .maybeSingle();

    if (attemptData?.completed_at) {
      setAttempt(attemptData);
      setShowResults(true);
      setLoading(false);
      return;
    }

    // Fetch questions
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizData.id)
      .order('sort_order', { ascending: true });

    if (questionsData) {
      // Fetch options for each question
      const questionsWithOptions = await Promise.all(
        questionsData.map(async (q) => {
          const questionType = q.question_type as 'multiple_choice' | 'short_answer';
          if (questionType === 'multiple_choice') {
            const { data: optionsData } = await supabase
              .from('quiz_options')
              .select('id, option_text, is_correct')
              .eq('question_id', q.id)
              .order('sort_order', { ascending: true });
            return { ...q, question_type: questionType, options: optionsData || [] };
          }
          return { ...q, question_type: questionType, options: [] };
        })
      );
      setQuestions(questionsWithOptions);
      setAnswers(questionsWithOptions.map(q => ({ questionId: q.id })));
    }

    setLoading(false);
  };

  const startQuiz = async () => {
    if (!quiz || !user) return;

    // Create attempt record
    const { data: attemptData, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quiz.id,
        student_id: user.id,
        enrollment_id: enrollmentId,
      })
      .select()
      .single();

    if (error) {
      // Check if attempt already exists
      if (error.code === '23505') {
        const { data: existingAttempt } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('enrollment_id', enrollmentId)
          .single();
        
        if (existingAttempt) {
          setAttempt(existingAttempt);
        }
      } else {
        toast({ title: 'Error', description: 'Failed to start quiz', variant: 'destructive' });
        return;
      }
    } else {
      setAttempt(attemptData);
    }

    setQuizStarted(true);
  };

  const selectAnswer = (questionId: string, optionId?: string, textAnswer?: string) => {
    setAnswers(answers.map(a => 
      a.questionId === questionId 
        ? { ...a, selectedOptionId: optionId, textAnswer }
        : a
    ));
  };

  const submitQuiz = async () => {
    if (!attempt || !quiz) return;
    
    setSubmitting(true);

    let totalPoints = 0;
    let earnedPoints = 0;

    // Save answers and calculate score
    for (const question of questions) {
      const answer = answers.find(a => a.questionId === question.id);
      totalPoints += question.points;

      if (question.question_type === 'multiple_choice') {
        const selectedOption = question.options?.find(o => o.id === answer?.selectedOptionId);
        const isCorrect = selectedOption?.is_correct || false;
        if (isCorrect) earnedPoints += question.points;

        await supabase.from('quiz_answers').insert({
          attempt_id: attempt.id,
          question_id: question.id,
          selected_option_id: answer?.selectedOptionId,
          is_correct: isCorrect,
          points_earned: isCorrect ? question.points : 0,
          graded_at: new Date().toISOString(),
        });
      } else {
        // Short answer - needs manual grading
        await supabase.from('quiz_answers').insert({
          attempt_id: attempt.id,
          question_id: question.id,
          text_answer: answer?.textAnswer,
          is_correct: null, // Needs grading
          points_earned: 0,
        });
      }
    }

    // Check if there are any short answer questions
    const hasShortAnswer = questions.some(q => q.question_type === 'short_answer');
    
    // Calculate percentage (only from auto-graded questions if there are short answers)
    const mcqQuestions = questions.filter(q => q.question_type === 'multiple_choice');
    const mcqPoints = mcqQuestions.reduce((sum, q) => sum + q.points, 0);
    const scorePercentage = mcqPoints > 0 ? Math.round((earnedPoints / mcqPoints) * 100) : 0;
    const passed = !hasShortAnswer && scorePercentage >= quiz.passing_percentage;

    // Update attempt
    await supabase
      .from('quiz_attempts')
      .update({
        score_percentage: hasShortAnswer ? null : scorePercentage,
        passed: hasShortAnswer ? null : passed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', attempt.id);

    setAttempt({
      ...attempt,
      score_percentage: hasShortAnswer ? null : scorePercentage,
      passed: hasShortAnswer ? null : passed,
      completed_at: new Date().toISOString(),
    });

    setShowResults(true);
    setSubmitting(false);

    if (!hasShortAnswer) {
      onComplete(passed);
    }
  };

  const retakeQuiz = async () => {
    if (!attempt) return;

    // Delete old answers
    await supabase.from('quiz_answers').delete().eq('attempt_id', attempt.id);
    
    // Reset attempt
    await supabase
      .from('quiz_attempts')
      .update({
        score_percentage: null,
        passed: null,
        completed_at: null,
        started_at: new Date().toISOString(),
      })
      .eq('id', attempt.id);

    setShowResults(false);
    setQuizStarted(true);
    setCurrentQuestion(0);
    setAnswers(questions.map(q => ({ questionId: q.id })));
    setAttempt({ ...attempt, score_percentage: null, passed: null, completed_at: null });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading quiz...
        </CardContent>
      </Card>
    );
  }

  if (!quiz || questions.length === 0) {
    return null;
  }

  // Show results
  if (showResults && attempt?.completed_at) {
    const hasShortAnswer = questions.some(q => q.question_type === 'short_answer');
    
    return (
      <Card>
        <CardHeader className="text-center">
          {attempt.passed === null ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle>Quiz Submitted - Pending Review</CardTitle>
              <CardDescription>
                Your short answer responses need to be reviewed by your mentor.
                You'll be notified once grading is complete.
              </CardDescription>
            </div>
          ) : attempt.passed ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Congratulations! You Passed!</CardTitle>
              <CardDescription>
                You scored {attempt.score_percentage}% (passing: {quiz.passing_percentage}%)
              </CardDescription>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle>Not Quite There Yet</CardTitle>
              <CardDescription>
                You scored {attempt.score_percentage}% (need {quiz.passing_percentage}% to pass)
              </CardDescription>
            </div>
          )}
        </CardHeader>
        {!attempt.passed && attempt.passed !== null && (
          <CardFooter className="justify-center">
            <Button onClick={retakeQuiz}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  // Quiz intro
  if (!quizStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {quiz.title}
          </CardTitle>
          <CardDescription>{quiz.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Questions</p>
              <p className="font-semibold">{questions.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Passing Score</p>
              <p className="font-semibold">{quiz.passing_percentage}%</p>
            </div>
            {quiz.time_limit_minutes && (
              <div className="p-3 bg-muted rounded-lg col-span-2">
                <p className="text-muted-foreground">Time Limit</p>
                <p className="font-semibold">{quiz.time_limit_minutes} minutes</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={startQuiz} className="w-full">
            Start Quiz
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Quiz in progress
  const question = questions[currentQuestion];
  const currentAnswer = answers.find(a => a.questionId === question.id);
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">
            Question {currentQuestion + 1} of {questions.length}
          </Badge>
          <Badge variant="outline">{question.points} point{question.points !== 1 ? 's' : ''}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-lg font-medium">{question.question_text}</p>

        {question.question_type === 'multiple_choice' && question.options && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <button
                key={option.id}
                onClick={() => selectAnswer(question.id, option.id)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  currentAnswer?.selectedOptionId === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer?.selectedOptionId === option.id
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50'
                  }`}>
                    {currentAnswer?.selectedOptionId === option.id && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span>{option.option_text}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {question.question_type === 'short_answer' && (
          <Textarea
            value={currentAnswer?.textAnswer || ''}
            onChange={(e) => selectAnswer(question.id, undefined, e.target.value)}
            placeholder="Write your answer here..."
            rows={5}
          />
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(currentQuestion - 1)}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>
        {currentQuestion === questions.length - 1 ? (
          <Button onClick={submitQuiz} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
