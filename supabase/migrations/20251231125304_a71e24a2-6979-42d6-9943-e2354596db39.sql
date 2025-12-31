-- Make course storage buckets private
UPDATE storage.buckets SET public = false WHERE id = 'course-videos';
UPDATE storage.buckets SET public = false WHERE id = 'course-files';

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view course videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view course files" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can upload course videos" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete their course videos" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can delete their course files" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update their course videos" ON storage.objects;
DROP POLICY IF EXISTS "Mentors can update their course files" ON storage.objects;

-- Create enrollment verification function for storage access
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course_content(file_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  content_course_id uuid;
BEGIN
  -- Extract course content from file path and check enrollment
  -- File names typically follow pattern: course_id/filename or just filename
  
  -- Check if user is enrolled in any course that has this file
  RETURN EXISTS (
    SELECT 1 
    FROM course_content cc
    JOIN course_sections cs ON cs.id = cc.section_id
    JOIN enrollments e ON e.course_id = cs.course_id
    WHERE e.student_id = auth.uid()
    AND (
      cc.video_url ILIKE '%' || file_name || '%'
      OR cc.file_url ILIKE '%' || file_name || '%'
    )
  );
END;
$$;

-- Create mentor ownership check function
CREATE OR REPLACE FUNCTION public.is_course_mentor_for_content(file_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a mentor who owns a course with this content
  RETURN EXISTS (
    SELECT 1 
    FROM course_content cc
    JOIN course_sections cs ON cs.id = cc.section_id
    JOIN courses c ON c.id = cs.course_id
    WHERE c.mentor_id = auth.uid()
    AND (
      cc.video_url ILIKE '%' || file_name || '%'
      OR cc.file_url ILIKE '%' || file_name || '%'
    )
  );
END;
$$;

-- Enrolled students can view course videos
CREATE POLICY "Enrolled students can view course videos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-videos' 
  AND (
    public.is_enrolled_in_course_content(name)
    OR public.is_course_mentor_for_content(name)
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Enrolled students can view course files
CREATE POLICY "Enrolled students can view course files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'course-files' 
  AND (
    public.is_enrolled_in_course_content(name)
    OR public.is_course_mentor_for_content(name)
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Mentors can upload to course-videos
CREATE POLICY "Mentors can upload course videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-videos'
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'mentor')
);

-- Mentors can upload to course-files
CREATE POLICY "Mentors can upload course files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-files'
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'mentor')
);

-- Mentors can update their course videos
CREATE POLICY "Mentors can update course videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-videos'
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'mentor')
);

-- Mentors can update their course files
CREATE POLICY "Mentors can update course files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-files'
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'mentor')
);

-- Mentors can delete their course videos
CREATE POLICY "Mentors can delete course videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-videos'
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'mentor')
);

-- Mentors can delete their course files
CREATE POLICY "Mentors can delete course files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-files'
  AND auth.uid() IS NOT NULL
  AND public.has_role(auth.uid(), 'mentor')
);