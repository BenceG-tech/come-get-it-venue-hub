-- Update the get_public_venues function to include image fields
CREATE OR REPLACE FUNCTION public.get_public_venues(search_term text DEFAULT NULL::text, limit_count integer DEFAULT 50)
 RETURNS TABLE(id uuid, name text, address text, description text, plan venue_plan, phone_number text, website_url text, is_paused boolean, created_at timestamp with time zone, image_url text, hero_image_url text)
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
    v.hero_image_url
  FROM public.venues v
  WHERE v.is_paused = false
    AND (
      search_term IS NULL
      OR search_term = ''
      OR v.name ILIKE '%' || search_term || '%'
      OR v.address ILIKE '%' || search_term || '%'
    )
  ORDER BY v.created_at DESC
  LIMIT COALESCE(limit_count, 50);
$function$