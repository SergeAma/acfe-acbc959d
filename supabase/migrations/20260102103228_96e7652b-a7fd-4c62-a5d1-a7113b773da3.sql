-- Create course_quizzes table
CREATE TABLE public.course_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Course Quiz',
  description TEXT,
  passing_percentage INTEGER NOT NULL DEFAULT 70,
  time_limit_minutes INTEGER,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

-- Create quiz_questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT quiz_questions_type_check CHECK (question_type IN ('multiple_choice', 'short_answer'))
);

-- Create quiz_options table (for multiple choice)
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.course_quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  score_percentage INTEGER,
  passed BOOLEAN,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(enrollment_id)
);

-- Create quiz_answers table
CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.quiz_options(id),
  text_answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID
);

-- Create course_assignments table
CREATE TABLE public.course_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Course Assignment',
  description TEXT,
  instructions TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  allow_video BOOLEAN NOT NULL DEFAULT true,
  allow_file BOOLEAN NOT NULL DEFAULT true,
  allow_text BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.course_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  text_content TEXT,
  video_url TEXT,
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  mentor_feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  CONSTRAINT submission_status_check CHECK (status IN ('pending', 'approved', 'revision_requested')),
  UNIQUE(enrollment_id)
);

-- Enable RLS
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS for course_quizzes
CREATE POLICY "Mentors can manage quizzes for own courses" ON public.course_quizzes
FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_quizzes.course_id AND courses.mentor_id = auth.uid()));

CREATE POLICY "Anyone can view quizzes of published courses" ON public.course_quizzes
FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_quizzes.course_id AND (courses.is_published = true OR courses.mentor_id = auth.uid())));

-- RLS for quiz_questions
CREATE POLICY "Mentors can manage questions" ON public.quiz_questions
FOR ALL USING (EXISTS (SELECT 1 FROM course_quizzes cq JOIN courses c ON c.id = cq.course_id WHERE cq.id = quiz_questions.quiz_id AND c.mentor_id = auth.uid()));

CREATE POLICY "Anyone can view questions of published courses" ON public.quiz_questions
FOR SELECT USING (EXISTS (SELECT 1 FROM course_quizzes cq JOIN courses c ON c.id = cq.course_id WHERE cq.id = quiz_questions.quiz_id AND (c.is_published = true OR c.mentor_id = auth.uid())));

-- RLS for quiz_options
CREATE POLICY "Mentors can manage options" ON public.quiz_options
FOR ALL USING (EXISTS (SELECT 1 FROM quiz_questions qq JOIN course_quizzes cq ON cq.id = qq.quiz_id JOIN courses c ON c.id = cq.course_id WHERE qq.id = quiz_options.question_id AND c.mentor_id = auth.uid()));

CREATE POLICY "Anyone can view options of published courses" ON public.quiz_options
FOR SELECT USING (EXISTS (SELECT 1 FROM quiz_questions qq JOIN course_quizzes cq ON cq.id = qq.quiz_id JOIN courses c ON c.id = cq.course_id WHERE qq.id = quiz_options.question_id AND (c.is_published = true OR c.mentor_id = auth.uid())));

-- RLS for quiz_attempts
CREATE POLICY "Students can manage own attempts" ON public.quiz_attempts
FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mentors can view attempts for their courses" ON public.quiz_attempts
FOR SELECT USING (EXISTS (SELECT 1 FROM course_quizzes cq JOIN courses c ON c.id = cq.course_id WHERE cq.id = quiz_attempts.quiz_id AND c.mentor_id = auth.uid()));

-- RLS for quiz_answers
CREATE POLICY "Students can manage own answers" ON public.quiz_answers
FOR ALL USING (EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.student_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.student_id = auth.uid()));

CREATE POLICY "Mentors can view and grade answers" ON public.quiz_answers
FOR ALL USING (EXISTS (SELECT 1 FROM quiz_attempts qa JOIN course_quizzes cq ON cq.id = qa.quiz_id JOIN courses c ON c.id = cq.course_id WHERE qa.id = quiz_answers.attempt_id AND c.mentor_id = auth.uid()));

-- RLS for course_assignments
CREATE POLICY "Mentors can manage assignments for own courses" ON public.course_assignments
FOR ALL USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_assignments.course_id AND courses.mentor_id = auth.uid()));

CREATE POLICY "Anyone can view assignments of published courses" ON public.course_assignments
FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_assignments.course_id AND (courses.is_published = true OR courses.mentor_id = auth.uid())));

-- RLS for assignment_submissions
CREATE POLICY "Students can manage own submissions" ON public.assignment_submissions
FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mentors can view and review submissions" ON public.assignment_submissions
FOR ALL USING (EXISTS (SELECT 1 FROM course_assignments ca JOIN courses c ON c.id = ca.course_id WHERE ca.id = assignment_submissions.assignment_id AND c.mentor_id = auth.uid()));