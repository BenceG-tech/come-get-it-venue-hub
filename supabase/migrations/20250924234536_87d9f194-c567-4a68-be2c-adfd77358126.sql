-- Step 1: Add triggers to ensure data integrity

-- Add trigger to set owner_profile_id on venue creation
CREATE TRIGGER set_venue_owner_trigger
  BEFORE INSERT ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_owner_on_venue();

-- Add trigger to sync venue image URLs when venue_images change
CREATE TRIGGER sync_venue_image_urls_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.venue_images
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_image_urls();

-- Step 2: Backfill owner_profile_id for existing venues
UPDATE public.venues 
SET owner_profile_id = (
  SELECT profile_id 
  FROM public.venue_memberships 
  WHERE venue_id = venues.id 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE owner_profile_id IS NULL
AND EXISTS (
  SELECT 1 
  FROM public.venue_memberships 
  WHERE venue_id = venues.id
);