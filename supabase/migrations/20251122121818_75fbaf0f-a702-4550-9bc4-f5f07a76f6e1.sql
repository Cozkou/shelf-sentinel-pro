-- Fix security warning: set search_path for handle_updated_at function
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_inventory_photos_updated_at
  BEFORE UPDATE ON public.inventory_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();