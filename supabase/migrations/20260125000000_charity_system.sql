-- =============================================
-- COME GET IT - CHARITY/CSR SYSTEM
-- Created: 2026-01-25
-- Purpose: Track charitable donations and social impact
-- =============================================

-- 1. CHARITY_PARTNERS - Nonprofit organizations we support
CREATE TABLE public.charity_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  logo_url text,
  website_url text,
  impact_unit text NOT NULL, -- "meal", "vaccination", "tree", "hour of care"
  huf_per_unit integer NOT NULL, -- e.g., 100 HUF = 1 meal
  is_active boolean NOT NULL DEFAULT true,
  priority integer DEFAULT 0, -- for rotation/selection logic
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for active charity lookup
CREATE INDEX idx_charity_partners_active ON public.charity_partners(is_active, priority DESC);

-- RLS for charity_partners
ALTER TABLE public.charity_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active charities" ON public.charity_partners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all charities" ON public.charity_partners
  FOR ALL USING (is_admin());

-- 2. CHARITY_DONATIONS - Individual donation records
CREATE TABLE public.charity_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source of donation (one of these will be set)
  redemption_id uuid REFERENCES public.redemptions(id) ON DELETE SET NULL,
  pos_transaction_id uuid REFERENCES public.pos_transactions(id) ON DELETE SET NULL,

  -- Who benefited
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Where it happened
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,

  -- Who funded it
  sponsor_brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  platform_contribution_huf integer DEFAULT 0, -- Platform's share
  sponsor_contribution_huf integer DEFAULT 0, -- Brand's share
  venue_contribution_huf integer DEFAULT 0, -- Venue's share (optional)
  total_donation_huf integer NOT NULL,

  -- Which charity
  charity_partner_id uuid REFERENCES public.charity_partners(id) ON DELETE SET NULL,
  charity_name text NOT NULL, -- Denormalized for history preservation

  -- Impact calculation
  impact_units integer NOT NULL, -- Number of meals, vaccines, etc.
  impact_description text NOT NULL, -- "2 meals", "1 vaccination"

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_charity_donations_user_id ON public.charity_donations(user_id, created_at DESC);
CREATE INDEX idx_charity_donations_venue_id ON public.charity_donations(venue_id, created_at DESC);
CREATE INDEX idx_charity_donations_brand ON public.charity_donations(sponsor_brand_id, created_at DESC);
CREATE INDEX idx_charity_donations_charity ON public.charity_donations(charity_partner_id, created_at DESC);
CREATE INDEX idx_charity_donations_created_at ON public.charity_donations(created_at DESC);

-- RLS for charity_donations
ALTER TABLE public.charity_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own donations" ON public.charity_donations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all donations" ON public.charity_donations
  FOR SELECT USING (is_admin());

CREATE POLICY "Venue owners can view their donations" ON public.charity_donations
  FOR SELECT USING (venue_id = ANY(get_user_venue_ids()));

CREATE POLICY "Brand partners can view their donations" ON public.charity_donations
  FOR SELECT USING (
    sponsor_brand_id IN (
      SELECT id FROM public.brands
      WHERE contact_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Service role full access on charity_donations" ON public.charity_donations
  FOR ALL USING (true) WITH CHECK (true);

-- 3. USER_CSR_STATS - Denormalized user impact statistics
CREATE TABLE public.user_csr_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Totals
  total_donations_huf integer NOT NULL DEFAULT 0,
  total_impact_units integer NOT NULL DEFAULT 0, -- Total meals, vaccines, etc.
  total_redemptions_with_charity integer NOT NULL DEFAULT 0,

  -- Streaks and engagement
  current_streak_days integer NOT NULL DEFAULT 0,
  longest_streak_days integer NOT NULL DEFAULT 0,
  last_donation_date date,

  -- Leaderboard position (updated periodically)
  global_rank integer,
  city_rank integer,

  -- Timestamps
  first_donation_at timestamptz,
  last_donation_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for leaderboards
CREATE INDEX idx_user_csr_stats_global_rank ON public.user_csr_stats(global_rank) WHERE global_rank IS NOT NULL;
CREATE INDEX idx_user_csr_stats_impact ON public.user_csr_stats(total_impact_units DESC);

-- RLS for user_csr_stats
ALTER TABLE public.user_csr_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CSR stats" ON public.user_csr_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all CSR stats" ON public.user_csr_stats
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role full access on user_csr_stats" ON public.user_csr_stats
  FOR ALL USING (true) WITH CHECK (true);

-- 4. UPDATE_USER_CSR_STATS function - Update user impact statistics
CREATE OR REPLACE FUNCTION public.update_user_csr_stats(
  p_user_id uuid,
  p_donation_amount integer,
  p_impact_units integer,
  p_donation_date date DEFAULT CURRENT_DATE
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_donation_date date;
  v_current_streak integer;
  v_longest_streak integer;
BEGIN
  -- Ensure user_csr_stats row exists
  INSERT INTO public.user_csr_stats (user_id, total_donations_huf, total_impact_units, total_redemptions_with_charity)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current stats
  SELECT last_donation_date, current_streak_days, longest_streak_days
  INTO v_last_donation_date, v_current_streak, v_longest_streak
  FROM public.user_csr_stats
  WHERE user_id = p_user_id;

  -- Calculate streak
  IF v_last_donation_date IS NULL THEN
    -- First donation ever
    v_current_streak := 1;
  ELSIF p_donation_date = v_last_donation_date THEN
    -- Same day, no change to streak
    v_current_streak := COALESCE(v_current_streak, 1);
  ELSIF p_donation_date = v_last_donation_date + 1 THEN
    -- Consecutive day
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSIF p_donation_date > v_last_donation_date + 1 THEN
    -- Streak broken
    v_current_streak := 1;
  END IF;

  -- Update longest streak
  v_longest_streak := GREATEST(COALESCE(v_longest_streak, 0), v_current_streak);

  -- Update stats
  UPDATE public.user_csr_stats
  SET
    total_donations_huf = total_donations_huf + p_donation_amount,
    total_impact_units = total_impact_units + p_impact_units,
    total_redemptions_with_charity = total_redemptions_with_charity + 1,
    current_streak_days = v_current_streak,
    longest_streak_days = v_longest_streak,
    last_donation_date = p_donation_date,
    last_donation_at = now(),
    first_donation_at = COALESCE(first_donation_at, now()),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 5. CALCULATE_CSR_LEADERBOARD function - Update global/city ranks
CREATE OR REPLACE FUNCTION public.calculate_csr_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update global ranks based on total impact units
  WITH ranked_users AS (
    SELECT
      user_id,
      ROW_NUMBER() OVER (ORDER BY total_impact_units DESC, last_donation_at DESC) as rank
    FROM public.user_csr_stats
    WHERE total_impact_units > 0
  )
  UPDATE public.user_csr_stats
  SET global_rank = ranked_users.rank
  FROM ranked_users
  WHERE user_csr_stats.user_id = ranked_users.user_id;

  -- City-level ranking would require user location data
  -- Placeholder for future enhancement
END;
$$;

-- 6. Triggers for updated_at
CREATE TRIGGER update_charity_partners_updated_at
  BEFORE UPDATE ON public.charity_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_csr_stats_updated_at
  BEFORE UPDATE ON public.user_csr_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Insert default charity partners
INSERT INTO public.charity_partners (name, description, impact_unit, huf_per_unit, logo_url, website_url, priority) VALUES
(
  'Magyar Ebmentők Egyesülete',
  'Kóbor és sérült kutyák mentése, gondozása és újrahelyezése.',
  'adag kutyaeledel',
  100,
  'https://example.com/logos/ebmentok.png',
  'https://www.ebmentok.hu',
  100
),
(
  'Magyar Élelmiszerbank Egyesület',
  'Élelmiszer-pazarlás csökkentése és rászorulók segítése.',
  'adag étel',
  100,
  'https://example.com/logos/elelmiszerbank.png',
  'https://www.elelmiszerbank.hu',
  90
),
(
  'Utcáról Lakásba! Egyesület',
  'Hajléktalan emberek támogatása és újrakezdésük segítése.',
  'meleg étkezés',
  150,
  'https://example.com/logos/utcarol-lakasba.png',
  'https://www.utcarollakasba.hu',
  80
),
(
  'SOS Gyermekfalvak',
  'Veszélyeztetett gyermekek gondozása és nevelése.',
  'nap ellátás',
  200,
  'https://example.com/logos/sos-gyermekfalvak.png',
  'https://www.sos-gyermekfalvak.hu',
  70
);

-- 8. Create view for donation analytics
CREATE OR REPLACE VIEW public.charity_impact_summary AS
SELECT
  cp.name as charity_name,
  cp.impact_unit,
  COUNT(cd.id) as total_donations,
  SUM(cd.total_donation_huf) as total_huf,
  SUM(cd.impact_units) as total_impact_units,
  SUM(cd.platform_contribution_huf) as platform_contribution,
  SUM(cd.sponsor_contribution_huf) as sponsor_contribution,
  SUM(cd.venue_contribution_huf) as venue_contribution
FROM public.charity_partners cp
LEFT JOIN public.charity_donations cd ON cd.charity_partner_id = cp.id
WHERE cp.is_active = true
GROUP BY cp.id, cp.name, cp.impact_unit
ORDER BY total_impact_units DESC NULLS LAST;

-- Grant view access
GRANT SELECT ON public.charity_impact_summary TO authenticated;
GRANT SELECT ON public.charity_impact_summary TO service_role;

COMMENT ON TABLE public.charity_partners IS 'Nonprofit organizations supported by the Come Get It platform';
COMMENT ON TABLE public.charity_donations IS 'Individual charitable donations triggered by user activity';
COMMENT ON TABLE public.user_csr_stats IS 'Denormalized user CSR statistics for fast leaderboard and profile display';
COMMENT ON FUNCTION public.update_user_csr_stats IS 'Updates user CSR stats including streaks and totals';
COMMENT ON FUNCTION public.calculate_csr_leaderboard IS 'Recalculates global and city-level CSR leaderboards';
