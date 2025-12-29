-- Add Spectrogram tracking column to course_certificates
ALTER TABLE public.course_certificates
ADD COLUMN IF NOT EXISTS spectrogram_profile_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spectrogram_profile_created_at TIMESTAMP WITH TIME ZONE;