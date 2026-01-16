-- =============================================
-- COME GET IT - POINTS & PROMOTIONS SYSTEM
-- Phase 1: Core Tables
-- =============================================

-- 1. USER_POINTS - Felhasználói pont egyenlegek
CREATE TABLE public.user_points (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_earned integer NOT NULL DEFAULT 0,
  lifetime_spent integer NOT NULL DEFAULT 0,
  total_spend integer NOT NULL DEFAULT 0,
  last_transaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for user_points
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own points" ON public.user_points
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all points" ON public.user_points
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role full access on user_points" ON public.user_points
  FOR ALL USING (true) WITH CHECK (true);

-- 2. POINTS_TRANSACTIONS - Pont mozgások naplója
CREATE TABLE public.points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  type text NOT NULL,
  reference_type text,
  reference_id uuid,
  venue_id uuid REFERENCES public.venues(id),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_points_transactions_user_id ON public.points_transactions(user_id);
CREATE INDEX idx_points_transactions_created_at ON public.points_transactions(created_at DESC);

-- RLS for points_transactions
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point transactions" ON public.points_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all point transactions" ON public.points_transactions
  FOR SELECT USING (is_admin());

CREATE POLICY "Service role full access on points_transactions" ON public.points_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- 3. BRANDS - Márkák/Szponzorok (Supabase verzió)
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  contact_name text,
  contact_email text,
  contact_phone text,
  product_categories text[] DEFAULT '{}',
  product_keywords text[] DEFAULT '{}',
  contract_start date,
  contract_end date,
  monthly_budget integer,
  spent_this_month integer DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active brands" ON public.brands
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all brands" ON public.brands
  FOR ALL USING (is_admin());

-- 4. PROMOTIONS - Promóciós szabályok
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rule_type text NOT NULL,
  rule_config jsonb NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  active_days integer[] DEFAULT '{1,2,3,4,5,6,7}',
  active_hours jsonb DEFAULT '{"start":"00:00","end":"23:59"}',
  scope_type text DEFAULT 'global',
  venue_ids uuid[],
  sponsor_brand_id uuid REFERENCES public.brands(id),
  sponsor_covers_discount boolean DEFAULT false,
  max_uses_total integer,
  max_uses_per_user integer,
  current_uses integer DEFAULT 0,
  priority integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for promotions
CREATE INDEX idx_promotions_active ON public.promotions(is_active, starts_at, ends_at);
CREATE INDEX idx_promotions_sponsor ON public.promotions(sponsor_brand_id);

-- RLS for promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active promotions" ON public.promotions
  FOR SELECT USING (is_active = true AND now() BETWEEN starts_at AND ends_at);

CREATE POLICY "Admins can manage all promotions" ON public.promotions
  FOR ALL USING (is_admin());

CREATE POLICY "Venue owners can view their promotions" ON public.promotions
  FOR SELECT USING (
    scope_type = 'venue_list' 
    AND venue_ids && get_user_venue_ids()
  );

-- 5. POS_TRANSACTIONS - Goorderz tranzakciók
CREATE TABLE public.pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_order_id text NOT NULL UNIQUE,
  venue_id uuid NOT NULL REFERENCES public.venues(id),
  user_id uuid REFERENCES auth.users(id),
  items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL,
  discount_amount integer DEFAULT 0,
  total_amount integer NOT NULL,
  currency text DEFAULT 'HUF',
  base_points integer DEFAULT 0,
  bonus_points integer DEFAULT 0,
  total_points integer DEFAULT 0,
  applied_promotions jsonb DEFAULT '[]',
  payment_method text,
  staff_id text,
  table_number text,
  transaction_time timestamptz NOT NULL,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for pos_transactions
CREATE INDEX idx_pos_transactions_venue_id ON public.pos_transactions(venue_id);
CREATE INDEX idx_pos_transactions_user_id ON public.pos_transactions(user_id);
CREATE INDEX idx_pos_transactions_time ON public.pos_transactions(transaction_time DESC);

-- RLS for pos_transactions
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pos transactions" ON public.pos_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pos transactions" ON public.pos_transactions
  FOR SELECT USING (is_admin());

CREATE POLICY "Venue owners can view their pos transactions" ON public.pos_transactions
  FOR SELECT USING (venue_id = ANY(get_user_venue_ids()));

CREATE POLICY "Service role full access on pos_transactions" ON public.pos_transactions
  FOR ALL USING (true) WITH CHECK (true);

-- 6. USER_QR_TOKENS - QR azonosító tokenek
CREATE TABLE public.user_qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for token lookup
CREATE INDEX idx_user_qr_tokens_hash ON public.user_qr_tokens(token_hash);
CREATE INDEX idx_user_qr_tokens_expires ON public.user_qr_tokens(expires_at);

-- RLS for user_qr_tokens
ALTER TABLE public.user_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_qr_tokens" ON public.user_qr_tokens
  FOR ALL USING (true) WITH CHECK (true);

-- 7. MODIFY_USER_POINTS function - Pont módosítás
CREATE OR REPLACE FUNCTION public.modify_user_points(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_venue_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_spend_amount integer DEFAULT 0
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  -- Ensure user_points row exists
  INSERT INTO public.user_points (user_id, balance, lifetime_earned, lifetime_spent, total_spend)
  VALUES (p_user_id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Update balance and lifetime counters
  UPDATE public.user_points
  SET 
    balance = balance + p_amount,
    lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN p_amount < 0 THEN lifetime_spent + ABS(p_amount) ELSE lifetime_spent END,
    total_spend = total_spend + COALESCE(p_spend_amount, 0),
    last_transaction_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO new_balance;
  
  -- Log the transaction
  INSERT INTO public.points_transactions (user_id, amount, type, reference_type, reference_id, venue_id, description)
  VALUES (p_user_id, p_amount, p_type, p_reference_type, p_reference_id, p_venue_id, p_description);
  
  RETURN new_balance;
END;
$$;

-- 8. Updated_at trigger function (reusable)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();