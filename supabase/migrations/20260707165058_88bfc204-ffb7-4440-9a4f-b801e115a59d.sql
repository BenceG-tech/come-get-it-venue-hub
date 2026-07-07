-- 1) BRANDS: Remove anonymous SELECT that exposed sensitive contact/contract data.
DROP POLICY IF EXISTS "Anon can view active brands base row" ON public.brands;

-- 2) VENUES: Remove permissive SELECT policies that exposed integration secrets
--    (merchant_match_rules, saltedge_connection_id, goorderz_external_id,
--    points_rules, caps, owner_profile_id, integration_type, notifications) to
--    anon/authenticated. Admin/owner/staff SELECT policies remain. Mobile access
--    goes through service-role edge functions that project only safe columns.
DROP POLICY IF EXISTS "Public read venues" ON public.venues;
DROP POLICY IF EXISTS "Anon can view active venues base row" ON public.venues;

-- 3) SECURITY DEFINER functions: revoke EXECUTE from roles that shouldn't call them.
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_venues(text, integer) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_venue_publicly_active(uuid) FROM anon, authenticated, PUBLIC;

-- Re-grant what's still needed (idempotent).
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_venues(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_venue_publicly_active(uuid) TO service_role;
