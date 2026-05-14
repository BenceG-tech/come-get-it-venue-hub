
-- 1. Drop overly permissive "Service role full access" policies that targeted public role.
-- The service_role key bypasses RLS automatically, so no replacement is needed.
DROP POLICY IF EXISTS "Service role full access on ai_suggestions" ON public.ai_notification_suggestions;
DROP POLICY IF EXISTS "Service role full access on loyalty_milestones" ON public.loyalty_milestones;
DROP POLICY IF EXISTS "Service role full access on notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Service role full access on notification_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Service role full access on points_transactions" ON public.points_transactions;
DROP POLICY IF EXISTS "Service role full access on pos_transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Service role full access on matches" ON public.redemption_transaction_matches;
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.saltedge_transactions;
DROP POLICY IF EXISTS "Service role full access on achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Service role full access on user_activity_logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Service role full access on behavior patterns" ON public.user_behavior_patterns;
DROP POLICY IF EXISTS "Service role full access on user_points" ON public.user_points;
DROP POLICY IF EXISTS "Service role full access on predictions" ON public.user_predictions;
DROP POLICY IF EXISTS "Service role full access on user_qr_tokens" ON public.user_qr_tokens;
DROP POLICY IF EXISTS "Service role full access on user_tags" ON public.user_tags;

-- 2. Prevent privilege escalation on profiles.is_admin
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND (is_admin IS NULL OR is_admin = false));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()));

-- 3. Brands: hide contact info from anon/authenticated public readers.
-- Admin policy still grants full access; revoke sensitive columns from anon/authenticated.
REVOKE SELECT (contact_email, contact_phone, contact_name, monthly_budget, spent_this_month, contract_start, contract_end, notes)
  ON public.brands FROM anon, authenticated;

-- 4. Venues: hide internal operational columns from anonymous public readers.
REVOKE SELECT (merchant_match_rules, saltedge_connection_id, points_rules)
  ON public.venues FROM anon;

-- 5. Storage: restrict venue-images writes to venue owners/admins.
-- Convention: files are stored at "<venue_id>/<filename>".
DROP POLICY IF EXISTS "Authenticated users can upload venue images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can delete their images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can manage their images" ON storage.objects;
DROP POLICY IF EXISTS "Venue owners can update their images" ON storage.objects;

CREATE POLICY "Venue owners or admins can upload venue images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[1]
          AND v.owner_profile_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.venue_memberships m
        WHERE m.venue_id::text = (storage.foldername(name))[1]
          AND m.profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Venue owners or admins can update venue images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[1]
          AND v.owner_profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Venue owners or admins can delete venue images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.venues v
        WHERE v.id::text = (storage.foldername(name))[1]
          AND v.owner_profile_id = auth.uid()
      )
    )
  );
