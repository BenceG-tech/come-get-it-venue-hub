-- Salt Edge AIS Integration Tables

-- 1) Felhasználó ↔ Salt Edge ügyfél kapcsolat
CREATE TABLE IF NOT EXISTS public.saltedge_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  se_customer_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Banki kapcsolatok
CREATE TABLE IF NOT EXISTS public.saltedge_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  se_connection_id TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.saltedge_customers(id) ON DELETE CASCADE,
  provider_name TEXT,
  status TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) Minimális tranzakció tárolás (GDPR-friendly)
CREATE TABLE IF NOT EXISTS public.saltedge_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  se_transaction_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.saltedge_connections(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'HUF',
  made_on DATE NOT NULL,
  merchant_name TEXT,
  merchant_code TEXT,
  mcc TEXT,
  description TEXT,
  matched_venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  points_awarded INTEGER DEFAULT 0,
  match_status TEXT DEFAULT 'pending',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) Extend venues table with merchant matching rules
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS merchant_match_rules JSONB DEFAULT '{
    "names": [],
    "mcc": [],
    "ibans": [],
    "terminals": [],
    "contains": []
  }'::JSONB;

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS points_rules JSONB DEFAULT '{
    "per_huf": 1,
    "min_amount_huf": 0
  }'::JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saltedge_customers_user_id ON public.saltedge_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_saltedge_connections_customer_id ON public.saltedge_connections(customer_id);
CREATE INDEX IF NOT EXISTS idx_saltedge_transactions_user_id ON public.saltedge_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_saltedge_transactions_made_on ON public.saltedge_transactions(made_on);
CREATE INDEX IF NOT EXISTS idx_saltedge_transactions_match_status ON public.saltedge_transactions(match_status);
CREATE INDEX IF NOT EXISTS idx_saltedge_transactions_matched_venue_id ON public.saltedge_transactions(matched_venue_id);

-- RLS Policies

-- saltedge_customers
ALTER TABLE public.saltedge_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Salt Edge customer data"
  ON public.saltedge_customers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Salt Edge customer data"
  ON public.saltedge_customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all Salt Edge customers"
  ON public.saltedge_customers
  FOR SELECT
  USING (is_admin());

-- saltedge_connections
ALTER TABLE public.saltedge_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON public.saltedge_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saltedge_customers sc
      WHERE sc.id = saltedge_connections.customer_id
      AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own connections"
  ON public.saltedge_connections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.saltedge_customers sc
      WHERE sc.id = saltedge_connections.customer_id
      AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all connections"
  ON public.saltedge_connections
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage all connections"
  ON public.saltedge_connections
  FOR ALL
  USING (is_admin());

-- saltedge_transactions
ALTER TABLE public.saltedge_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.saltedge_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all Salt Edge transactions"
  ON public.saltedge_transactions
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Venue owners can view transactions matched to their venues"
  ON public.saltedge_transactions
  FOR SELECT
  USING (matched_venue_id = ANY(get_user_venue_ids()));

-- Service role can insert/update transactions (from edge functions)
CREATE POLICY "Service role can manage transactions"
  ON public.saltedge_transactions
  FOR ALL
  USING (true);