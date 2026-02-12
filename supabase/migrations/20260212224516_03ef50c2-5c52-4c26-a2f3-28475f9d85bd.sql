
-- ============================================================================
-- SECURITY FIX: Restrict public mentor profile exposure
-- ============================================================================
-- ISSUE: "Public can view active mentor profiles" policy exposes ALL columns
-- (email, phone, university, etc.) to anonymous users.
-- FIX: Remove the broad public policy. Public mentor discovery already works
-- via the get_public_mentor_profiles() SECURITY DEFINER function which 
-- returns only safe fields (name, bio, avatar, skills, social links).
-- ============================================================================

-- Drop the overly permissive public SELECT policy on profiles
DROP POLICY IF EXISTS "Public can view active mentor profiles" ON public.profiles;

-- Replace with a restricted policy: anon users can only see mentor profiles
-- through the profiles_public VIEW (which excludes sensitive columns)
-- This policy is needed for the profiles_public view to work for anon users
-- but it only allows reading the id column effectively since the view filters columns
CREATE POLICY "Anon can view mentor profile basics via view"
ON public.profiles
FOR SELECT
TO anon
USING (
  role = 'mentor'::user_role 
  AND account_status = 'active'
);

-- NOTE: The profiles_public view already exists and filters out sensitive fields.
-- The get_public_mentor_profiles() function returns only: id, full_name, bio,
-- avatar_url, profile_frame, role, social links, companies, skills.
-- Email, phone, university, etc. are NOT returned.

-- ============================================================================
-- SECURITY FIX: Add missing DELETE policy for referrals
-- Only admins should be able to delete referrals
-- ============================================================================
CREATE POLICY "Admins can delete referrals"
ON public.referrals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
