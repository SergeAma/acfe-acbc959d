-- Create function for admins to reinstate revoked mentors
CREATE OR REPLACE FUNCTION public.reinstate_mentor(_admin_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reinstate mentors';
  END IF;
  
  -- Insert mentor role if not exists
  INSERT INTO public.user_roles (user_id, role, approved_at, approved_by)
  VALUES (_user_id, 'mentor'::app_role, now(), _admin_id)
  ON CONFLICT (user_id, role) DO UPDATE
  SET approved_at = now(), approved_by = _admin_id;
  
  -- Update profile role for backward compatibility
  UPDATE public.profiles
  SET role = 'mentor'::user_role,
      account_status = 'active'
  WHERE id = _user_id;
  
  RETURN TRUE;
END;
$$;