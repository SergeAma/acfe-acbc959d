import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, CheckCircle, HelpCircle, FileText, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface QuizBuilderProps {
  courseId: string;
}

interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  passing_percentage: number;
  time_limit_minutes: number | null;
  is_required: boolean;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'short_answer';
  points: number;
  sort_order: number;
  options?: QuizOption[];
}

interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export const QuizBuilder = ({ courseId }: QuizBuilderProps) => {
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, [courseId]);

  const fetchQuiz = async () => {
    setLoading(true);
    
    const { data: quizData, error: quizError } = await supabase
      .from('course_quizzes')
      .select('*')
      .eq('course_id', courseId)
      .maybeSingle();

    if (quizError) {
      console.error('Error fetching quiz:', quizError);
      setLoading(false);
      return;
    }

    if (quizData) {
      setQuiz(quizData);
      
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
            const { data: optionsData } = await supabase
              .from('quiz_options')
              .select('*')
              .eq('question_id', q.id)
              .order('sort_order', { ascending: true });
            return { ...q, question_type: q.question_type as 'multiple_choice' | 'short_answer', options: optionsData || [] };
          })
        );
        setQuestions(questionsWithOptions);
      }
    }
    
    setLoading(false);
  };

  const createQuiz = async () => {
    setSaving(true);
    
    const { data, error } = await supabase
      .from('course_quizzes')
      .insert({
        course_id: courseId,
        title: 'Course Quiz',
        passing_percentage: 70,
        is_required: true,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create quiz', variant: 'destructive' });
    } else {
      setQuiz(data);
      toast({ title: 'Success', description: 'Quiz created' });
    }
    
    setSaving(false);
  };

  const updateQuiz = async (updates: Partial<Quiz>) => {
    if (!quiz) return;
    
    const { error } = await supabase
      .from('course_quizzes')
      .update(updates)
      .eq('id', quiz.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update quiz', variant: 'destructive' });
    } else {
      setQuiz({ ...quiz, ...updates });
    }
  };

  const addQuestion = async (type: 'multiple_choice' | 'short_answer') => {
    if (!quiz) return;
    
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quiz.id,
        question_text: '',
        question_type: type,
        points: 1,
        sort_order: questions.length,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to add question', variant: 'destructive' });
    } else {
      // Add default options for multiple choice
      const newQuestion: QuizQuestion = { ...data, question_type: type, options: [] };
      if (type === 'multiple_choice') {
        const defaultOptions = [
          { question_id: data.id, option_text: '', is_correct: true, sort_order: 0 },
          { question_id: data.id, option_text: '', is_correct: false, sort_order: 1 },
        ];
        
        const { data: optionsData } = await supabase
          .from('quiz_options')
          .insert(defaultOptions)
          .select();
        
        setQuestions([...questions, { ...newQuestion, options: optionsData || [] }]);
      } else {
        setQuestions([...questions, newQuestion]);
      }
    }
  };

  const updateQuestion = async (questionId: string, updates: Partial<QuizQuestion>) => {
    const { error } = await supabase
      .from('quiz_questions')
      .update(updates)
      .eq('id', questionId);

    if (!error) {
      setQuestions(questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      ));
    }
  };

  const deleteQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete question', variant: 'destructive' });
    } else {
      setQuestions(questions.filter(q => q.id !== questionId));
    }
  };

  const addOption = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    const { data, error } = await supabase
      .from('quiz_options')
      .insert({
        question_id: questionId,
        option_text: '',
        is_correct: false,
        sort_order: question.options?.length || 0,
      })
      .select()
      .single();

    if (!error && data) {
      setQuestions(questions.map(q => 
        q.id === questionId 
          ? { ...q, options: [...(q.options || []), data] }
          : q
      ));
    }
  };

  const updateOption = async (optionId: string, questionId: string, updates: Partial<QuizOption>) => {
    const { error } = await supabase
      .from('quiz_options')
      .update(updates)
      .eq('id', optionId);

    if (!error) {
      setQuestions(questions.map(q => 
        q.id === questionId 
          ? { ...q, options: q.options?.map(o => o.id === optionId ? { ...o, ...updates } : o) }
          : q
      ));
    }
  };

  const setCorrectOption = async (optionId: string, questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question?.options) return;

    // Update all options - set the selected one as correct, others as incorrect
    for (const option of question.options) {
      await supabase
        .from('quiz_options')
        .update({ is_correct: option.id === optionId })
        .eq('id', option.id);
    }

    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, options: q.options?.map(o => ({ ...o, is_correct: o.id === optionId })) }
        : q
    ));
  };

  const deleteOption = async (optionId: string, questionId: string) => {
    const { error } = await supabase
      .from('quiz_options')
      .delete()
      .eq('id', optionId);

    if (!error) {
      setQuestions(questions.map(q => 
        q.id === questionId 
          ? { ...q, options: q.options?.filter(o => o.id !== optionId) }
          : q
      ));
    }
  };

  const moveOption = async (questionId: string, optionIndex: number, direction: 'up' | 'down') => {
    const question = questions.find(q => q.id === questionId);
    if (!question?.options) return;

    const newIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1;
    if (newIndex < 0 || newIndex >= question.options.length) return;

    const reorderedOptions = [...question.options];
    const [movedOption] = reorderedOptions.splice(optionIndex, 1);
    reorderedOptions.splice(newIndex, 0, movedOption);

    // Update sort_order for affected options
    const updatedOptions = reorderedOptions.map((o, i) => ({ ...o, sort_order: i }));
    
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, options: updatedOptions } : q
    ));

    // Save to database
    for (const o of updatedOptions) {
      await supabase
        .from('quiz_options')
        .update({ sort_order: o.sort_order })
        .eq('id', o.id);
    }
  };

  const moveQuestion = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const reorderedQuestions = [...questions];
    const [movedQuestion] = reorderedQuestions.splice(index, 1);
    reorderedQuestions.splice(newIndex, 0, movedQuestion);

    // Update sort_order for affected questions
    const updatedQuestions = reorderedQuestions.map((q, i) => ({ ...q, sort_order: i }));
    setQuestions(updatedQuestions);

    // Save to database
    for (const q of updatedQuestions) {
      await supabase
        .from('quiz_questions')
        .update({ sort_order: q.sort_order })
        .eq('id', q.id);
    }
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

  if (!quiz) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Course Quiz
          </CardTitle>
          <CardDescription>
            Create a quiz that students must pass before receiving their certificate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createQuiz} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Course Quiz
        </CardTitle>
        <CardDescription>
          Students must pass this quiz to complete the course
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quiz Settings */}
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label>Quiz Title</Label>
              <Input
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                placeholder="Quiz title"
              />
            </div>
            <div className="space-y-2">
              <Label>Passing Score (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={quiz.passing_percentage}
                onChange={(e) => setQuiz({ ...quiz, passing_percentage: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Time Limit (minutes, optional)</Label>
              <Input
                type="number"
                min="1"
                value={quiz.time_limit_minutes || ''}
                onChange={(e) => setQuiz({ ...quiz, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="No limit"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={quiz.is_required}
                onCheckedChange={(checked) => setQuiz({ ...quiz, is_required: checked })}
              />
              <Label>Required for certificate</Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={() => updateQuiz({ 
                title: quiz.title, 
                passing_percentage: quiz.passing_percentage,
                time_limit_minutes: quiz.time_limit_minutes,
                is_required: quiz.is_required
              })}
              disabled={saving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Quiz Settings
            </Button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Questions ({questions.length})</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addQuestion('multiple_choice')}>
                <Plus className="h-4 w-4 mr-1" />
                Multiple Choice
              </Button>
              <Button variant="outline" size="sm" onClick={() => addQuestion('short_answer')}>
                <Plus className="h-4 w-4 mr-1" />
                Short Answer
              </Button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No questions yet. Add your first question above.</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <Card key={question.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveQuestion(index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <span className="font-bold text-muted-foreground">Q{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveQuestion(index, 'down')}
                        disabled={index === questions.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {question.question_type === 'multiple_choice' ? 'MCQ' : 'Short Answer'}
                    </Badge>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        value={question.question_text}
                        onChange={(e) => setQuestions(questions.map(q => 
                          q.id === question.id ? { ...q, question_text: e.target.value } : q
                        ))}
                        onBlur={() => updateQuestion(question.id, { question_text: question.question_text })}
                        placeholder="Enter your question..."
                        rows={2}
                      />
                      
                      {/* Options for MCQ */}
                      {question.question_type === 'multiple_choice' && (
                        <div className="space-y-2">
                          {question.options?.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => moveOption(question.id, optIndex, 'up')}
                                  disabled={optIndex === 0}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => moveOption(question.id, optIndex, 'down')}
                                  disabled={optIndex === (question.options?.length || 0) - 1}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCorrectOption(option.id, question.id)}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  option.is_correct 
                                    ? 'bg-green-500 border-green-500 text-white' 
                                    : 'border-muted-foreground/50 hover:border-green-500'
                                }`}
                              >
                                {option.is_correct && <CheckCircle className="h-4 w-4" />}
                              </button>
                              <Input
                                value={option.option_text}
                                onChange={(e) => setQuestions(questions.map(q => 
                                  q.id === question.id 
                                    ? { ...q, options: q.options?.map(o => o.id === option.id ? { ...o, option_text: e.target.value } : o) }
                                    : q
                                ))}
                                onBlur={() => updateOption(option.id, question.id, { option_text: option.option_text })}
                                placeholder={`Option ${optIndex + 1}`}
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteOption(option.id, question.id)}
                                disabled={question.options?.length === 2}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(question.id)}
                            className="text-muted-foreground"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Option
                          </Button>
                        </div>
                      )}

                      {question.question_type === 'short_answer' && (
                        <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">
                          <FileText className="h-4 w-4 inline mr-1" />
                          Students will write a text response. You'll need to grade manually.
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={question.points}
                        onChange={(e) => setQuestions(questions.map(q => 
                          q.id === question.id ? { ...q, points: parseInt(e.target.value) || 1 } : q
                        ))}
                        onBlur={() => updateQuestion(question.id, { points: question.points })}
                        className="w-16"
                      />
                      <span className="text-sm text-muted-foreground">pts</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuestion(question.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {questions.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">
              Total: {questions.reduce((sum, q) => sum + q.points, 0)} points
            </span>
            <span className="text-sm">
              Passing: {Math.ceil(questions.reduce((sum, q) => sum + q.points, 0) * quiz.passing_percentage / 100)} points needed
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
