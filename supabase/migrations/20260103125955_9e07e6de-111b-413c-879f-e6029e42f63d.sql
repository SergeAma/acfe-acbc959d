-- Add video and audio URL fields for course descriptions
-- This allows learners to consume course intro via text, video, or audio

ALTER TABLE public.courses
ADD COLUMN description_video_url text,
ADD COLUMN description_audio_url text;