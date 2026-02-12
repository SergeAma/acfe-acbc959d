-- Trigger: auto-sync price_cents to 0 when is_paid is set to false
CREATE OR REPLACE FUNCTION public.sync_course_pricing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_paid = false THEN
    NEW.price_cents := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_course_pricing_trigger
BEFORE INSERT OR UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.sync_course_pricing();