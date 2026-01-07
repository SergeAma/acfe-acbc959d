-- Add foreign key constraint for student_id to enable Supabase relationship queries
ALTER TABLE public.assignment_submissions 
ADD CONSTRAINT assignment_submissions_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint for reviewed_by to enable proper mentor tracking
ALTER TABLE public.assignment_submissions 
ADD CONSTRAINT assignment_submissions_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;