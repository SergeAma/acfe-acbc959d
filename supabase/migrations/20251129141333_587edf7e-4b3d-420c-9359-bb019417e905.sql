-- Create enum for roles (includes admin for future use)
CREATE TYPE public.app_role AS ENUM ('admin', 'mentor', 'student');

-- Create user_roles table with proper RLS
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at timestamptz DEFAULT now(),
    approved_at timestamptz,
    approved_by uuid REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'mentor' THEN 2
      WHEN 'student' THEN 3
    END
  LIMIT 1
$$;

-- RLS Policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users cannot insert their own roles (only triggers can)
CREATE POLICY "Only system can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Users cannot update roles
CREATE POLICY "Only system can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false);

-- Users cannot delete roles
CREATE POLICY "Only system can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can approve/update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing roles from profiles to user_roles
-- Cast through text to convert between enum types
INSERT INTO public.user_roles (user_id, role, approved_at)
SELECT id, (role::text)::app_role, now()
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user trigger to use user_roles
-- Always assigns 'student' role by default, ignoring user input
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'student'::user_role  -- Always default to student in profiles for backward compatibility
  );
  
  -- Insert student role in user_roles (secure table)
  -- This is the source of truth for roles
  INSERT INTO user_roles (user_id, role, approved_at)
  VALUES (NEW.id, 'student'::app_role, now());
  
  RETURN NEW;
END;
$$;

-- Create table for mentor role requests
CREATE TABLE public.mentor_role_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    reviewed_by uuid REFERENCES auth.users(id),
    reviewed_at timestamptz,
    UNIQUE (user_id)
);

-- Enable RLS on mentor_role_requests
ALTER TABLE public.mentor_role_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.mentor_role_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own requests"
ON public.mentor_role_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.mentor_role_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
ON public.mentor_role_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to approve mentor role request
CREATE OR REPLACE FUNCTION public.approve_mentor_request(_request_id uuid, _admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve mentor requests';
  END IF;
  
  -- Get user_id from request
  SELECT user_id INTO _user_id
  FROM public.mentor_role_requests
  WHERE id = _request_id AND status = 'pending';
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  -- Insert mentor role
  INSERT INTO public.user_roles (user_id, role, approved_at, approved_by)
  VALUES (_user_id, 'mentor'::app_role, now(), _admin_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update profile role for backward compatibility
  UPDATE public.profiles
  SET role = 'mentor'::user_role
  WHERE id = _user_id;
  
  -- Update request status
  UPDATE public.mentor_role_requests
  SET status = 'approved',
      reviewed_by = _admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _request_id;
END;
$$;

-- Create function to reject mentor role request
CREATE OR REPLACE FUNCTION public.reject_mentor_request(_request_id uuid, _admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject mentor requests';
  END IF;
  
  -- Update request status
  UPDATE public.mentor_role_requests
  SET status = 'rejected',
      reviewed_by = _admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _request_id AND status = 'pending';
END;
$$;