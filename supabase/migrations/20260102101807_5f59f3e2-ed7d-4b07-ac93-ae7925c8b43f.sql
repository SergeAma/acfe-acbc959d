-- Drop existing check constraint and add a new one that includes 'audio'
ALTER TABLE public.course_content 
DROP CONSTRAINT IF EXISTS course_content_content_type_check;

ALTER TABLE public.course_content
ADD CONSTRAINT course_content_content_type_check 
CHECK (content_type IN ('text', 'video', 'file', 'audio'));