-- Create storage buckets for course content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('course-videos', 'course-videos', true, 524288000, ARRAY['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']),
  ('course-files', 'course-files', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'text/plain']);

-- Create course sections table (flexible sections within a course)
CREATE TABLE public.course_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create course content table (content items within sections)
CREATE TABLE public.course_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('text', 'video', 'file')),
  text_content text,
  video_url text,
  file_url text,
  file_name text,
  sort_order integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_sections
CREATE POLICY "Anyone can view sections of published courses" ON public.course_sections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_sections.course_id 
    AND (courses.is_published = true OR courses.mentor_id = auth.uid())
  )
);

CREATE POLICY "Admins and mentors can manage sections" ON public.course_sections
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_sections.course_id 
    AND courses.mentor_id = auth.uid()
  )
);

-- RLS Policies for course_content
CREATE POLICY "Anyone can view content of published courses" ON public.course_content
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = course_content.section_id 
    AND (c.is_published = true OR c.mentor_id = auth.uid())
  )
);

CREATE POLICY "Admins and mentors can manage content" ON public.course_content
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.course_sections cs
    JOIN public.courses c ON c.id = cs.course_id
    WHERE cs.id = course_content.section_id 
    AND c.mentor_id = auth.uid()
  )
);

-- Storage policies for course videos
CREATE POLICY "Anyone can view course videos" ON storage.objects
FOR SELECT USING (bucket_id = 'course-videos');

CREATE POLICY "Admins and mentors can upload videos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-videos' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role))
);

CREATE POLICY "Admins and mentors can update videos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-videos' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role))
);

CREATE POLICY "Admins and mentors can delete videos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-videos' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role))
);

-- Storage policies for course files
CREATE POLICY "Anyone can view course files" ON storage.objects
FOR SELECT USING (bucket_id = 'course-files');

CREATE POLICY "Admins and mentors can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-files' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role))
);

CREATE POLICY "Admins and mentors can update files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'course-files' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role))
);

CREATE POLICY "Admins and mentors can delete files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'course-files' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'mentor'::app_role))
);

-- Add indexes for performance
CREATE INDEX idx_course_sections_course_id ON public.course_sections(course_id);
CREATE INDEX idx_course_sections_sort_order ON public.course_sections(sort_order);
CREATE INDEX idx_course_content_section_id ON public.course_content(section_id);
CREATE INDEX idx_course_content_sort_order ON public.course_content(sort_order);

-- Add triggers for updated_at
CREATE TRIGGER update_course_sections_updated_at
BEFORE UPDATE ON public.course_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_content_updated_at
BEFORE UPDATE ON public.course_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();