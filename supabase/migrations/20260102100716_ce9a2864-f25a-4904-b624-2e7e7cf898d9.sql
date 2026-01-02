-- Add audio_url column to course_content table for audio content
ALTER TABLE public.course_content 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Update comment to reflect new content types
COMMENT ON TABLE public.course_content IS 'Course content items including text, video, audio, and file content types';