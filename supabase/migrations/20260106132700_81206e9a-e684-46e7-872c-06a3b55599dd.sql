-- Add preferred language column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en' CHECK (preferred_language IN ('en', 'fr'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language ON public.profiles(preferred_language);

-- Create translations table for admin-editable translations
CREATE TABLE IF NOT EXISTS public.translation_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language text NOT NULL CHECK (language IN ('en', 'fr')),
  translation_key text NOT NULL,
  translation_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(language, translation_key)
);

-- Enable RLS
ALTER TABLE public.translation_overrides ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read translations
CREATE POLICY "Anyone can read translations" 
ON public.translation_overrides 
FOR SELECT 
USING (true);

-- Only admins can modify translations (using user_roles with app_role)
CREATE POLICY "Admins can manage translations" 
ON public.translation_overrides 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_translation_overrides_updated_at
BEFORE UPDATE ON public.translation_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add French translation columns to courses for auto-translation
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS title_fr text,
ADD COLUMN IF NOT EXISTS description_fr text;

-- Add French content to course_content
ALTER TABLE public.course_content
ADD COLUMN IF NOT EXISTS title_fr text,
ADD COLUMN IF NOT EXISTS text_content_fr text;

-- Add transcription columns for video content
ALTER TABLE public.course_content
ADD COLUMN IF NOT EXISTS transcription text,
ADD COLUMN IF NOT EXISTS transcription_fr text,
ADD COLUMN IF NOT EXISTS transcription_status text DEFAULT 'none' CHECK (transcription_status IN ('none', 'pending', 'completed', 'failed'));