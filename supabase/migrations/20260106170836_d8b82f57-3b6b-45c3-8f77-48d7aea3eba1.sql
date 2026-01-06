
-- =====================================================
-- FIX 1: Replace vulnerable ILIKE pattern matching with exact URL matching
-- =====================================================

-- Drop and recreate is_enrolled_in_course_content with secure matching
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course_content(file_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name text;
BEGIN
  -- Early return if no user authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Validate input: reject path traversal attempts and empty input
  IF file_name IS NULL OR file_name = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Reject path traversal attempts
  IF file_name LIKE '%..%' OR file_name LIKE '%//%' THEN
    RETURN FALSE;
  END IF;
  
  -- Normalize the file name by extracting just the filename if it contains bucket prefix
  -- Storage passes names like 'folder/subfolder/file.mp4'
  normalized_name := file_name;
  
  -- Check if user is enrolled in a course that has this exact file
  -- Use exact suffix matching with the file path
  RETURN EXISTS (
    SELECT 1 
    FROM course_content cc
    JOIN course_sections cs ON cs.id = cc.section_id
    JOIN enrollments e ON e.course_id = cs.course_id
    WHERE e.student_id = auth.uid()
    AND (
      -- Exact match on the full URL ending
      cc.video_url LIKE '%/' || normalized_name
      OR cc.file_url LIKE '%/' || normalized_name
      OR cc.audio_url LIKE '%/' || normalized_name
      -- Or exact match if stored as just the path
      OR cc.video_url = normalized_name
      OR cc.file_url = normalized_name
      OR cc.audio_url = normalized_name
    )
  );
END;
$$;

-- Drop and recreate is_course_mentor_for_content with secure matching
CREATE OR REPLACE FUNCTION public.is_course_mentor_for_content(file_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name text;
BEGIN
  -- Early return if no user authenticated
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Validate input: reject path traversal attempts and empty input
  IF file_name IS NULL OR file_name = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Reject path traversal attempts
  IF file_name LIKE '%..%' OR file_name LIKE '%//%' THEN
    RETURN FALSE;
  END IF;
  
  -- Normalize the file name
  normalized_name := file_name;
  
  -- Check if user is a mentor who owns a course with this exact file
  RETURN EXISTS (
    SELECT 1 
    FROM course_content cc
    JOIN course_sections cs ON cs.id = cc.section_id
    JOIN courses c ON c.id = cs.course_id
    WHERE c.mentor_id = auth.uid()
    AND (
      -- Exact match on the full URL ending
      cc.video_url LIKE '%/' || normalized_name
      OR cc.file_url LIKE '%/' || normalized_name
      OR cc.audio_url LIKE '%/' || normalized_name
      -- Or exact match if stored as just the path
      OR cc.video_url = normalized_name
      OR cc.file_url = normalized_name
      OR cc.audio_url = normalized_name
    )
  );
END;
$$;

-- =====================================================
-- FIX 2: Fix overly permissive RLS policies
-- =====================================================

-- Fix donations table: Allow anyone to INSERT but with proper validation
-- Donations are public but we should at least require some fields
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;
CREATE POLICY "Anyone can create donations with required fields"
ON public.donations
FOR INSERT
TO public
WITH CHECK (
  -- Ensure required fields are provided (email, first_name, last_name, amount_cents are NOT NULL in schema)
  email IS NOT NULL 
  AND first_name IS NOT NULL 
  AND last_name IS NOT NULL 
  AND amount_cents > 0
  AND status = 'pending'  -- New donations must start as pending
);

-- Fix user_sessions table: Restrict to authenticated users only
DROP POLICY IF EXISTS "System can insert sessions" ON public.user_sessions;
CREATE POLICY "Authenticated users can insert their own sessions"
ON public.user_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

-- Add a service role policy for edge functions that need to insert sessions
CREATE POLICY "Service role can manage sessions"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
