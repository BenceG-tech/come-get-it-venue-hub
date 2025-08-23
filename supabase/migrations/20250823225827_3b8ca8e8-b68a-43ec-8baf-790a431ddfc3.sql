
-- Add a public (anon + authenticated) SELECT policy for venue_images,
-- restricted to images whose venue is active (is_paused = false).
-- Safe to re-run: drops if exists, then recreates.

DROP POLICY IF EXISTS "Public can view images of active venues" ON public.venue_images;

CREATE POLICY "Public can view images of active venues"
ON public.venue_images
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.venues v
    WHERE v.id = venue_images.venue_id
      AND v.is_paused = false
  )
);
