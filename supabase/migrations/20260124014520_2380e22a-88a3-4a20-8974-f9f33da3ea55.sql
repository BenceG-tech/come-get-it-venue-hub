-- Phase 1: Venue Integration Type Support
-- Add integration type and config columns to venues table

-- 1. Add integration_type column with validation
ALTER TABLE public.venues 
  ADD COLUMN IF NOT EXISTS integration_type TEXT DEFAULT 'none'
    CHECK (integration_type IN ('goorderz', 'saltedge', 'manual', 'none'));

-- 2. Add Goorderz external venue ID for POS mapping
ALTER TABLE public.venues 
  ADD COLUMN IF NOT EXISTS goorderz_external_id TEXT;

-- 3. Add Salt Edge connection ID for bank integration
ALTER TABLE public.venues 
  ADD COLUMN IF NOT EXISTS saltedge_connection_id TEXT;

-- 4. Create index for faster lookups by integration type
CREATE INDEX IF NOT EXISTS idx_venues_integration_type ON public.venues(integration_type);

-- 5. Create index for Goorderz external ID lookups (used in webhook)
CREATE INDEX IF NOT EXISTS idx_venues_goorderz_external_id ON public.venues(goorderz_external_id) 
  WHERE goorderz_external_id IS NOT NULL;

-- Phase 2: Redemption-Transaction Matching Table
-- Links QR redemptions to subsequent POS/Bank transactions

CREATE TABLE IF NOT EXISTS public.redemption_transaction_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID NOT NULL REFERENCES public.redemptions(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.pos_transactions(id) ON DELETE SET NULL,
  saltedge_transaction_id UUID REFERENCES public.fidel_transactions(id) ON DELETE SET NULL,
  match_confidence NUMERIC(3,2) DEFAULT 0 CHECK (match_confidence >= 0 AND match_confidence <= 1),
  match_method TEXT CHECK (match_method IN ('time_window', 'qr_token', 'user_id', 'manual')),
  time_delta_seconds INTEGER,
  matched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rtm_redemption_id ON public.redemption_transaction_matches(redemption_id);
CREATE INDEX IF NOT EXISTS idx_rtm_transaction_id ON public.redemption_transaction_matches(transaction_id);
CREATE INDEX IF NOT EXISTS idx_rtm_matched_at ON public.redemption_transaction_matches(matched_at);

-- Enable RLS
ALTER TABLE public.redemption_transaction_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for redemption_transaction_matches
CREATE POLICY "Admins can manage all matches"
  ON public.redemption_transaction_matches
  FOR ALL
  USING (is_admin());

CREATE POLICY "Venue owners can view their venue matches"
  ON public.redemption_transaction_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.redemptions r
      WHERE r.id = redemption_transaction_matches.redemption_id
      AND r.venue_id = ANY(get_user_venue_ids())
    )
  );

CREATE POLICY "Service role full access on matches"
  ON public.redemption_transaction_matches
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.redemption_transaction_matches IS 'Links QR redemptions to subsequent POS/Bank transactions for First Glass analytics';
COMMENT ON COLUMN public.redemption_transaction_matches.match_confidence IS 'Confidence score 0-1 based on time delta: 1.0=<15min, 0.8=<30min, 0.6=<60min, 0.4=<120min';
COMMENT ON COLUMN public.venues.integration_type IS 'Partner integration type: goorderz=deep POS, saltedge=open banking, manual=staff entry, none=no integration';