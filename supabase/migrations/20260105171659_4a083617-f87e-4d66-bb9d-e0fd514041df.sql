-- Fix security vulnerability: Remove permissive RLS policies that expose mentor email addresses
-- The application already uses secure RPC functions (get_public_mentor_profiles, get_public_mentor_profile)
-- that properly exclude email addresses from public access

DROP POLICY IF EXISTS "Anyone can view mentor profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view course mentor profiles" ON public.profiles;