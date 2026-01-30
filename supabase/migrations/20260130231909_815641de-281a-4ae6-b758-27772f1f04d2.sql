-- Add complimentary access toggle to institutions table
ALTER TABLE public.institutions
ADD COLUMN complimentary_access_enabled boolean NOT NULL DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.institutions.complimentary_access_enabled IS 'When enabled, institution members get free course access. When disabled, members must subscribe like regular users.';