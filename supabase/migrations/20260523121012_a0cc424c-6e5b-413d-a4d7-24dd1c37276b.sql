
-- 1. Drop broad public SELECT policies
DROP POLICY IF EXISTS "Public can view active brands" ON public.brands;
DROP POLICY IF EXISTS "Public can view active venues" ON public.venues;

-- 2. Create SECURITY DEFINER helper used by free_drink_windows policy
CREATE OR REPLACE FUNCTION public.is_venue_publicly_active(_venue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = _venue_id AND v.is_paused = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_venue_publicly_active(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_venue_publicly_active(uuid) TO anon, authenticated;

-- 3. Replace free_drink_windows public policy to not depend on venues SELECT
DROP POLICY IF EXISTS "Public can view windows of active venues" ON public.free_drink_windows;
CREATE POLICY "Public can view windows of active venues"
ON public.free_drink_windows
FOR SELECT
TO anon, authenticated
USING (public.is_venue_publicly_active(venue_id));

-- 4. Create safe public views with only non-sensitive columns
CREATE OR REPLACE VIEW public.public_brands_safe
WITH (security_invoker = true) AS
SELECT id, name, logo_url, is_active, product_keywords, product_categories
FROM public.brands
WHERE is_active = true;

CREATE OR REPLACE VIEW public.public_venues_safe
WITH (security_invoker = true) AS
SELECT
  id, name, address, description, image_url, hero_image_url,
  opening_hours, coordinates, tags, category, google_maps_url,
  website_url, phone_number, rating, price_tier, is_paused, display_order
FROM public.venues
WHERE is_paused = false;

-- Views need their own policies via underlying tables, but since the table policies
-- no longer allow anon, add minimal anon SELECT policies guarded by the active flag
-- only for the views to function. Use restricted policies on the base tables for anon.
CREATE POLICY "Anon can view active brands base row"
ON public.brands
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Anon can view active venues base row"
ON public.venues
FOR SELECT
TO anon
USING (is_paused = false);

-- Revoke direct column access for anon on sensitive columns
REVOKE SELECT ON public.brands FROM anon;
GRANT SELECT (id, name, logo_url, is_active, product_keywords, product_categories)
  ON public.brands TO anon;

REVOKE SELECT ON public.venues FROM anon;
GRANT SELECT (
  id, name, address, description, image_url, hero_image_url,
  opening_hours, coordinates, tags, category, google_maps_url,
  website_url, phone_number, rating, price_tier, is_paused, display_order
) ON public.venues TO anon;

GRANT SELECT ON public.public_brands_safe TO anon, authenticated;
GRANT SELECT ON public.public_venues_safe TO anon, authenticated;
