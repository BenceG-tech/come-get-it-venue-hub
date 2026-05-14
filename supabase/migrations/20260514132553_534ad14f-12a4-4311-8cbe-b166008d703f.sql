
-- 1. Venues: hide sensitive columns from anon + authenticated
REVOKE SELECT (merchant_match_rules, saltedge_connection_id, points_rules, notifications, goorderz_external_id, caps, owner_profile_id, integration_type)
  ON public.venues FROM anon, authenticated;

-- 2. Brands: hide sensitive columns from anon + authenticated
REVOKE SELECT (contact_email, contact_phone, contact_name, monthly_budget, spent_this_month, contract_start, contract_end, notes)
  ON public.brands FROM anon, authenticated;

-- 3. Lock service-role-only INSERT policies to service_role (replace USING/CHECK true on public role)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert donations" ON public.csr_donations;
CREATE POLICY "Service role can insert donations" ON public.csr_donations
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert snapshots" ON public.platform_snapshots;
CREATE POLICY "Service role can insert snapshots" ON public.platform_snapshots
  FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert report logs" ON public.report_logs;
CREATE POLICY "Service role can insert report logs" ON public.report_logs
  FOR INSERT TO service_role WITH CHECK (true);

-- 4. Storage: drop broad public listing on venue-images. Public bucket files still load via direct URL.
DROP POLICY IF EXISTS "Public can view venue images" ON storage.objects;

-- 5. Fix function search_path on remaining functions
ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_venue_ids(uuid) SET search_path = public;
ALTER FUNCTION public.set_owner_on_venue() SET search_path = public;
ALTER FUNCTION public.sync_venue_image_urls() SET search_path = public;
ALTER FUNCTION public.validate_opening_hours(jsonb) SET search_path = public;

-- 6. Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated/public.
-- They are still callable from RLS policies (run as definer) and from edge functions (service role).
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_venue_ids(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_snapshots() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_profile_points() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_venue_image_urls() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.modify_user_points(uuid, integer, text, text, uuid, uuid, text, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_owner_on_venue() FROM anon, authenticated, public;
-- get_public_venues stays callable by anon/authenticated (it is the public discovery RPC).
