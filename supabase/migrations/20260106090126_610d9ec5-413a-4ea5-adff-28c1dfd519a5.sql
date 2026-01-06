-- Add admin access to cohort_messages for complete visibility
-- Admins can view all cohort messages across all mentors
CREATE POLICY "Admins can view all cohort messages"
  ON public.cohort_messages
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can post in any cohort (for ACFE team)
CREATE POLICY "Admins can post in any cohort"
  ON public.cohort_messages
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update any message (moderation)
CREATE POLICY "Admins can update any cohort message"
  ON public.cohort_messages
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any message (moderation)
CREATE POLICY "Admins can delete any cohort message"
  ON public.cohort_messages
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));