
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_venues_display_order
  ON public.venues (display_order ASC, created_at DESC);

-- Backfill: assign 10, 20, 30... based on existing created_at desc ordering
WITH ordered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at DESC)) * 10 AS new_order
  FROM public.venues
)
UPDATE public.venues v
SET display_order = ordered.new_order
FROM ordered
WHERE v.id = ordered.id
  AND v.display_order = 0;

-- Update public venues function to respect admin order
CREATE OR REPLACE FUNCTION public.get_public_venues(search_term text DEFAULT NULL::text, limit_count integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, address text, description text, plan venue_plan, phone_number text, website_url text, is_paused boolean, created_at timestamp with time zone, image_url text, hero_image_url text, participates_in_points boolean, points_per_visit integer, distance double precision, google_maps_url text, category text, price_tier integer, rating numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    v.id,
    v.name,
    v.address,
    v.description,
    v.plan,
    v.phone_number,
    v.website_url,
    v.is_paused,
    v.created_at,
    v.image_url,
    v.hero_image_url,
    v.participates_in_points,
    v.points_per_visit,
    v.distance,
    v.google_maps_url,
    v.category,
    v.price_tier,
    v.rating
  FROM public.venues v
  WHERE v.is_paused = false
    AND (
      search_term IS NULL
      OR search_term = ''
      OR v.name ILIKE '%' || search_term || '%'
      OR v.address ILIKE '%' || search_term || '%'
    )
  ORDER BY v.display_order ASC, v.created_at DESC
  LIMIT COALESCE(limit_count, 50);
$function$;
