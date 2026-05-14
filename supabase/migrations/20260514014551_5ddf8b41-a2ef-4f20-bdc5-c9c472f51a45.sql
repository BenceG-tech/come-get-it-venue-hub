ALTER TABLE public.venue_images ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_venue_images_sort ON public.venue_images(venue_id, sort_order);
DELETE FROM public.venue_images WHERE url IS NULL OR btrim(url) = '';