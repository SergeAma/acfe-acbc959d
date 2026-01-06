-- Create a table to track individual course topic completion for mentors
CREATE TABLE public.mentor_course_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL,
  topic_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, topic_key)
);

-- Enable RLS
ALTER TABLE public.mentor_course_topics ENABLE ROW LEVEL SECURITY;

-- Mentors can view and manage their own topic progress
CREATE POLICY "Mentors can view their own topics"
  ON public.mentor_course_topics
  FOR SELECT
  USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can insert their own topics"
  ON public.mentor_course_topics
  FOR INSERT
  WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update their own topics"
  ON public.mentor_course_topics
  FOR UPDATE
  USING (auth.uid() = mentor_id);

-- Create trigger for updated_at
CREATE TRIGGER update_mentor_course_topics_updated_at
  BEFORE UPDATE ON public.mentor_course_topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();