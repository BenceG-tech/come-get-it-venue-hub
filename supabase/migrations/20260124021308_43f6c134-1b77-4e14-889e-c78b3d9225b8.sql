-- 1. Jótékonysági szervezetek táblája
CREATE TABLE IF NOT EXISTS public.charities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  total_received_huf BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CSR Adományok táblája
CREATE TABLE IF NOT EXISTS public.csr_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID UNIQUE REFERENCES public.redemptions(id),
  user_id UUID REFERENCES auth.users(id),
  venue_id UUID REFERENCES public.venues(id),
  charity_id UUID REFERENCES public.charities(id),
  amount_huf INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Salt Edge tranzakciók módosítás (amount mező hozzáadása ha nincs)
ALTER TABLE public.saltedge_transactions 
  ADD COLUMN IF NOT EXISTS amount INTEGER DEFAULT 0;

-- 4. Venues CSR mezők hozzáadása
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS csr_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_charity_id UUID REFERENCES public.charities(id),
  ADD COLUMN IF NOT EXISTS donation_per_redemption INTEGER DEFAULT 100;

-- RLS for charities
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active charities" ON public.charities
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage charities" ON public.charities
  FOR ALL USING (is_admin());

-- RLS for csr_donations
ALTER TABLE public.csr_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all donations" ON public.csr_donations
  FOR SELECT USING (is_admin());

CREATE POLICY "Venue owners can view their donations" ON public.csr_donations
  FOR SELECT USING (venue_id = ANY(get_user_venue_ids()));

CREATE POLICY "Service role can insert donations" ON public.csr_donations
  FOR INSERT WITH CHECK (true);

-- Seed a default charity
INSERT INTO public.charities (name, description, is_active)
VALUES ('Magyar Vöröskereszt', 'A Magyar Vöröskereszt a legnagyobb humanitárius szervezet Magyarországon.', true)
ON CONFLICT DO NOTHING;