
-- Phase 1: Database Migration
-- Update venues table to populate image_url and hero_image_url from venue_images
UPDATE public.venues 
SET 
  image_url = (
    SELECT url 
    FROM public.venue_images 
    WHERE venue_id = venues.id 
    AND is_cover = true 
    LIMIT 1
  ),
  hero_image_url = (
    SELECT url 
    FROM public.venue_images 
    WHERE venue_id = venues.id 
    AND is_cover = true 
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 
  FROM public.venue_images 
  WHERE venue_id = venues.id 
  AND is_cover = true
);

-- For venues without a cover image, use the first available image
UPDATE public.venues 
SET 
  image_url = (
    SELECT url 
    FROM public.venue_images 
    WHERE venue_id = venues.id 
    ORDER BY created_at ASC 
    LIMIT 1
  ),
  hero_image_url = (
    SELECT url 
    FROM public.venue_images 
    WHERE venue_id = venues.id 
    ORDER BY created_at ASC 
    LIMIT 1
  )
WHERE image_url IS NULL 
AND EXISTS (
  SELECT 1 
  FROM public.venue_images 
  WHERE venue_id = venues.id
);

-- Create a function to automatically sync image URLs when venue_images are modified
CREATE OR REPLACE FUNCTION public.sync_venue_image_urls()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the venue's image URLs when venue_images change
  UPDATE public.venues 
  SET 
    image_url = (
      SELECT url 
      FROM public.venue_images 
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
      AND is_cover = true 
      LIMIT 1
    ),
    hero_image_url = (
      SELECT url 
      FROM public.venue_images 
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
      AND is_cover = true 
      LIMIT 1
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.venue_id, OLD.venue_id);

  -- If no cover image, use the first available image
  UPDATE public.venues 
  SET 
    image_url = (
      SELECT url 
      FROM public.venue_images 
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
      ORDER BY created_at ASC 
      LIMIT 1
    ),
    hero_image_url = (
      SELECT url 
      FROM public.venue_images 
      WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
      ORDER BY created_at ASC 
      LIMIT 1
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.venue_id, OLD.venue_id)
  AND image_url IS NULL;

  -- Clear URLs if no images exist
  UPDATE public.venues 
  SET 
    image_url = NULL,
    hero_image_url = NULL,
    updated_at = now()
  WHERE id = COALESCE(NEW.venue_id, OLD.venue_id)
  AND NOT EXISTS (
    SELECT 1 
    FROM public.venue_images 
    WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically sync image URLs
DROP TRIGGER IF EXISTS sync_venue_images_on_insert ON public.venue_images;
CREATE TRIGGER sync_venue_images_on_insert
  AFTER INSERT ON public.venue_images
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_image_urls();

DROP TRIGGER IF EXISTS sync_venue_images_on_update ON public.venue_images;
CREATE TRIGGER sync_venue_images_on_update
  AFTER UPDATE ON public.venue_images
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_image_urls();

DROP TRIGGER IF EXISTS sync_venue_images_on_delete ON public.venue_images;
CREATE TRIGGER sync_venue_images_on_delete
  AFTER DELETE ON public.venue_images
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_venue_image_urls();
