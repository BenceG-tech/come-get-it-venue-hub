
-- Add points column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0;

-- Sync existing data from user_points
UPDATE public.profiles p
SET points = COALESCE(up.balance, 0)
FROM public.user_points up
WHERE p.id = up.user_id;

-- Create trigger function to auto-sync points
CREATE OR REPLACE FUNCTION public.sync_profile_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET points = NEW.balance, updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger on user_points table
CREATE TRIGGER sync_profile_points_trigger
AFTER INSERT OR UPDATE OF balance ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_points();
