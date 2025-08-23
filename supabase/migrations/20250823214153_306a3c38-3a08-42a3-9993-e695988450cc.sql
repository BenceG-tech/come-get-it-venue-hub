
-- 1) Allow public (anon) read access to active venues via RLS
-- Enable SELECT for everyone, but only when is_paused = false
CREATE POLICY "Public can view active venues"
  ON public.venues
  FOR SELECT
  TO public
  USING (is_paused = false);

-- Ensure anon can call PostgREST on this table
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.venues TO anon, authenticated;

-- 2) Create RPC that returns only public-safe venue fields and bypasses RLS safely
CREATE OR REPLACE FUNCTION public.get_public_venues(
  search_term text DEFAULT NULL,
  limit_count integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  description text,
  plan venue_plan,
  phone_number text,
  website_url text,
  is_paused boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
  SELECT
    v.id,
    v.name,
    v.address,
    v.description,
    v.plan,
    v.phone_number,
    v.website_url,
    v.is_paused,
    v.created_at
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
$func$;

-- Let clients call the function
GRANT EXECUTE ON FUNCTION public.get_public_venues(text, integer) TO anon, authenticated;
