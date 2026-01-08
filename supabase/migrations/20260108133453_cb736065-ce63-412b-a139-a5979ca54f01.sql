-- Token status enum
CREATE TYPE public.redemption_token_status AS ENUM (
  'issued',
  'consumed',
  'expired',
  'revoked'
);

-- Redemption tokens table
CREATE TABLE public.redemption_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  drink_id UUID NOT NULL REFERENCES public.venue_drinks(id) ON DELETE CASCADE,
  device_fingerprint TEXT,
  
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  consumed_by_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  status public.redemption_token_status NOT NULL DEFAULT 'issued',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_redemption_tokens_hash ON public.redemption_tokens(token_hash);
CREATE INDEX idx_redemption_tokens_venue ON public.redemption_tokens(venue_id);
CREATE INDEX idx_redemption_tokens_status ON public.redemption_tokens(status);
CREATE INDEX idx_redemption_tokens_expires ON public.redemption_tokens(expires_at) WHERE status = 'issued';
CREATE INDEX idx_redemption_tokens_user_device ON public.redemption_tokens(user_id, device_fingerprint, issued_at);

-- Token rate limits table
CREATE TABLE public.token_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('user', 'device')),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup ON public.token_rate_limits(identifier, identifier_type, venue_id, issued_at DESC);

-- Extend redemptions table
ALTER TABLE public.redemptions 
  ADD COLUMN IF NOT EXISTS token_id UUID REFERENCES public.redemption_tokens(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS drink_id UUID REFERENCES public.venue_drinks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_redemptions_token ON public.redemptions(token_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_staff ON public.redemptions(staff_id);

-- RLS for redemption_tokens
ALTER TABLE public.redemption_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on redemption_tokens"
ON public.redemption_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Staff can view venue tokens"
ON public.redemption_tokens
FOR SELECT
TO authenticated
USING (
  venue_id IN (
    SELECT venue_id FROM public.venue_memberships 
    WHERE profile_id = auth.uid()
  )
  OR public.is_admin()
);

CREATE POLICY "Staff can update venue tokens"
ON public.redemption_tokens
FOR UPDATE
TO authenticated
USING (
  venue_id IN (
    SELECT venue_id FROM public.venue_memberships 
    WHERE profile_id = auth.uid()
  )
  OR public.is_admin()
);

-- RLS for token_rate_limits
ALTER TABLE public.token_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only on rate_limits"
ON public.token_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update trigger for redemption_tokens
CREATE OR REPLACE FUNCTION public.update_redemption_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_redemption_tokens_updated_at
BEFORE UPDATE ON public.redemption_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_redemption_tokens_updated_at();