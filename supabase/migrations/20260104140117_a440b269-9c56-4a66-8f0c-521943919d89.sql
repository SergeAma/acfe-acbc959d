-- Table for mentor available time slots
CREATE TABLE public.mentor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Table for booked 1:1 sessions
CREATE TABLE public.mentorship_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount_cents INTEGER NOT NULL,
  notes TEXT,
  meeting_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_sessions ENABLE ROW LEVEL SECURITY;

-- Mentor availability policies
CREATE POLICY "Mentors can manage their own availability"
  ON public.mentor_availability
  FOR ALL
  USING (auth.uid() = mentor_id);

CREATE POLICY "Anyone can view active mentor availability"
  ON public.mentor_availability
  FOR SELECT
  USING (is_active = true);

-- Mentorship sessions policies
CREATE POLICY "Mentors can view their sessions"
  ON public.mentorship_sessions
  FOR SELECT
  USING (auth.uid() = mentor_id);

CREATE POLICY "Students can view their own sessions"
  ON public.mentorship_sessions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create sessions"
  ON public.mentorship_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mentors can update their sessions"
  ON public.mentorship_sessions
  FOR UPDATE
  USING (auth.uid() = mentor_id);

-- Create indexes
CREATE INDEX idx_mentor_availability_mentor_id ON public.mentor_availability(mentor_id);
CREATE INDEX idx_mentor_availability_day ON public.mentor_availability(day_of_week);
CREATE INDEX idx_mentorship_sessions_mentor_id ON public.mentorship_sessions(mentor_id);
CREATE INDEX idx_mentorship_sessions_student_id ON public.mentorship_sessions(student_id);
CREATE INDEX idx_mentorship_sessions_date ON public.mentorship_sessions(scheduled_date);

-- Enable realtime for sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentorship_sessions;