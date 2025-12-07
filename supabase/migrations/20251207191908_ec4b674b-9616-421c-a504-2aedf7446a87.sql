-- Create mentor invitations table
CREATE TABLE public.mentor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage invitations
CREATE POLICY "Admins can manage mentor_invitations"
ON public.mentor_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Security definer function to accept invitation and grant mentor role
CREATE OR REPLACE FUNCTION public.accept_mentor_invitation(_token UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
BEGIN
  -- Find valid invitation
  SELECT * INTO _invitation
  FROM public.mentor_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();
  
  IF _invitation IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Grant mentor role
  INSERT INTO public.user_roles (user_id, role, approved_at, approved_by)
  VALUES (_user_id, 'mentor'::app_role, now(), _invitation.invited_by)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update profile role for backward compatibility
  UPDATE public.profiles
  SET role = 'mentor'::user_role
  WHERE id = _user_id;
  
  -- Mark invitation as accepted
  UPDATE public.mentor_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation.id;
  
  RETURN TRUE;
END;
$$;

-- Allow anyone to call accept function (token validates access)
CREATE POLICY "Anyone can check invitations by token"
ON public.mentor_invitations
FOR SELECT
USING (true);