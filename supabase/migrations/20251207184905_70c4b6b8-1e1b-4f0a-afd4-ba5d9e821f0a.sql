-- Fix 1: Add submitter_id to idea_submissions for proper user ownership
ALTER TABLE public.idea_submissions 
ADD COLUMN IF NOT EXISTS submitter_id uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_idea_submissions_submitter_id ON public.idea_submissions(submitter_id);

-- Update existing submissions to link submitter_id based on email matching (for data migration)
UPDATE public.idea_submissions s
SET submitter_id = p.id
FROM public.profiles p
WHERE s.submitter_id IS NULL AND s.email = p.email;

-- Drop the old RLS policy FIRST (before dropping function it depends on)
DROP POLICY IF EXISTS "Users can view own submissions" ON public.idea_submissions;

-- Now we can drop the old email-based function
DROP FUNCTION IF EXISTS public.user_owns_idea_submission(uuid, text);

-- Create new policy using submitter_id instead of email matching
CREATE POLICY "Users can view own submissions"
ON public.idea_submissions
FOR SELECT
USING (
  auth.uid() = submitter_id
);

-- Update the INSERT policy to set submitter_id
DROP POLICY IF EXISTS "Authenticated users can submit ideas" ON public.idea_submissions;

CREATE POLICY "Authenticated users can submit ideas"
ON public.idea_submissions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  submitter_id = auth.uid()
);

-- Fix 2: For contacts table, allow users to view their own contact record if they have one
-- This adds an additional layer beyond just admin access
CREATE POLICY "Users can view own contact record"
ON public.contacts
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);