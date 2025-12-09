-- Table for tracking video watch progress (resume, analytics)
CREATE TABLE public.video_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.course_content(id) ON DELETE CASCADE,
  current_time_seconds integer NOT NULL DEFAULT 0,
  total_duration_seconds integer DEFAULT NULL,
  playback_speed numeric(3,2) DEFAULT 1.0,
  watch_percentage integer DEFAULT 0,
  last_watched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(enrollment_id, content_id)
);

-- Table for user bookmarks on content
CREATE TABLE public.user_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.course_content(id) ON DELETE CASCADE,
  timestamp_seconds integer DEFAULT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, content_id, timestamp_seconds)
);

-- Table for user notes on content
CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.course_content(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  timestamp_seconds integer DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table for detailed learner analytics (aggregated per-section stats)
CREATE TABLE public.learner_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.course_content(id) ON DELETE CASCADE,
  total_time_spent_seconds integer DEFAULT 0,
  view_count integer DEFAULT 1,
  last_position_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  drop_off_point_seconds integer DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(enrollment_id, content_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_progress
CREATE POLICY "Students can manage own video progress"
ON public.video_progress
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = video_progress.enrollment_id
    AND enrollments.student_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = video_progress.enrollment_id
    AND enrollments.student_id = auth.uid()
  )
);

CREATE POLICY "Mentors can view video progress for their courses"
ON public.video_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = video_progress.enrollment_id
    AND c.mentor_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all video progress"
ON public.video_progress
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_bookmarks
CREATE POLICY "Users can manage own bookmarks"
ON public.user_bookmarks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mentors can view bookmarks for their course content"
ON public.user_bookmarks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_content cc
    JOIN public.course_sections cs ON cs.id = cc.section_id
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cc.id = user_bookmarks.content_id
    AND c.mentor_id = auth.uid()
  )
);

-- RLS Policies for user_notes
CREATE POLICY "Users can manage own notes"
ON public.user_notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mentors can view notes for their course content"
ON public.user_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.course_content cc
    JOIN public.course_sections cs ON cs.id = cc.section_id
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cc.id = user_notes.content_id
    AND c.mentor_id = auth.uid()
  )
);

-- RLS Policies for learner_analytics
CREATE POLICY "Students can manage own analytics"
ON public.learner_analytics
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = learner_analytics.enrollment_id
    AND enrollments.student_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.id = learner_analytics.enrollment_id
    AND enrollments.student_id = auth.uid()
  )
);

CREATE POLICY "Mentors can view analytics for their courses"
ON public.learner_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = learner_analytics.enrollment_id
    AND c.mentor_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all analytics"
ON public.learner_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_video_progress_enrollment ON public.video_progress(enrollment_id);
CREATE INDEX idx_video_progress_content ON public.video_progress(content_id);
CREATE INDEX idx_user_bookmarks_user ON public.user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_content ON public.user_bookmarks(content_id);
CREATE INDEX idx_user_notes_user ON public.user_notes(user_id);
CREATE INDEX idx_user_notes_content ON public.user_notes(content_id);
CREATE INDEX idx_learner_analytics_enrollment ON public.learner_analytics(enrollment_id);
CREATE INDEX idx_learner_analytics_content ON public.learner_analytics(content_id);