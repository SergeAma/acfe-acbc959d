-- Add requires_resign flag to mentor_contracts
ALTER TABLE public.mentor_contracts 
ADD COLUMN IF NOT EXISTS requires_resign boolean DEFAULT false;

-- Flag the specific user to re-sign
UPDATE public.mentor_contracts 
SET requires_resign = true 
WHERE mentor_id = '1ed8ca8a-79b5-4ffb-974c-06cb50948723';