-- Create mentorship_requests table
CREATE TABLE public.mentorship_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_bio TEXT NOT NULL,
  career_ambitions TEXT NOT NULL,
  reason_for_mentor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'course_required')),
  mentor_response TEXT,
  course_to_complete_id UUID REFERENCES public.courses(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(student_id, mentor_id)
);

-- Create cohort_messages table for the message board
CREATE TABLE public.cohort_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentorship_requests
-- Students can view their own requests
CREATE POLICY "Students can view own requests"
ON public.mentorship_requests
FOR SELECT
USING (auth.uid() = student_id);

-- Students can create requests
CREATE POLICY "Students can create requests"
ON public.mentorship_requests
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Mentors can view requests sent to them
CREATE POLICY "Mentors can view their requests"
ON public.mentorship_requests
FOR SELECT
USING (auth.uid() = mentor_id);

-- Mentors can update requests sent to them (to respond)
CREATE POLICY "Mentors can respond to requests"
ON public.mentorship_requests
FOR UPDATE
USING (auth.uid() = mentor_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.mentorship_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for cohort_messages
-- Members of a cohort can view messages (mentor + accepted mentees)
CREATE POLICY "Cohort members can view messages"
ON public.cohort_messages
FOR SELECT
USING (
  auth.uid() = mentor_id OR
  EXISTS (
    SELECT 1 FROM public.mentorship_requests
    WHERE mentorship_requests.mentor_id = cohort_messages.mentor_id
    AND mentorship_requests.student_id = auth.uid()
    AND mentorship_requests.status = 'accepted'
  )
);

-- Cohort members can post messages
CREATE POLICY "Cohort members can post messages"
ON public.cohort_messages
FOR INSERT
WITH CHECK (
  auth.uid() = mentor_id OR
  EXISTS (
    SELECT 1 FROM public.mentorship_requests
    WHERE mentorship_requests.mentor_id = cohort_messages.mentor_id
    AND mentorship_requests.student_id = auth.uid()
    AND mentorship_requests.status = 'accepted'
  )
);

-- Authors can update their own messages
CREATE POLICY "Authors can update own messages"
ON public.cohort_messages
FOR UPDATE
USING (auth.uid() = author_id);

-- Authors can delete their own messages
CREATE POLICY "Authors can delete own messages"
ON public.cohort_messages
FOR DELETE
USING (auth.uid() = author_id);

-- Create updated_at trigger for mentorship_requests
CREATE TRIGGER update_mentorship_requests_updated_at
BEFORE UPDATE ON public.mentorship_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for cohort_messages
CREATE TRIGGER update_cohort_messages_updated_at
BEFORE UPDATE ON public.cohort_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for cohort_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.cohort_messages;