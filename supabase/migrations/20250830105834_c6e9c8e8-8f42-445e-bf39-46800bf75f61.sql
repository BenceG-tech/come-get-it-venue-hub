
-- Create linked_cards table to store user card tokens from Fidel
CREATE TABLE public.linked_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fidel_card_id TEXT NOT NULL UNIQUE,
  program_id TEXT NOT NULL,
  last_four TEXT,
  scheme TEXT, -- visa, mastercard, amex
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create fidel_transactions table for raw transaction data from Fidel webhooks
CREATE TABLE public.fidel_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fidel_transaction_id TEXT NOT NULL UNIQUE,
  fidel_card_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  fidel_location_id TEXT,
  amount INTEGER NOT NULL, -- amount in cents
  currency TEXT NOT NULL DEFAULT 'HUF',
  auth_code TEXT,
  cleared BOOLEAN NOT NULL DEFAULT false,
  transaction_date TIMESTAMPTZ NOT NULL,
  merchant_name TEXT,
  raw_payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create venue_locations table to map your venues to Fidel location IDs  
CREATE TABLE public.venue_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  fidel_location_id TEXT NOT NULL UNIQUE,
  fidel_brand_id TEXT,
  scheme TEXT NOT NULL, -- visa, mastercard, amex
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, failed, inactive
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add fidel_transaction_id to existing transactions table for linking
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS fidel_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'manual'; -- manual, pending, confirmed

-- Create unique index for fidel_transaction_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_fidel_id 
ON public.transactions(fidel_transaction_id) 
WHERE fidel_transaction_id IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE public.linked_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fidel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for linked_cards
CREATE POLICY "Users can view their own linked cards" 
ON public.linked_cards FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linked cards" 
ON public.linked_cards FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linked cards" 
ON public.linked_cards FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all linked cards" 
ON public.linked_cards FOR SELECT 
USING (is_admin());

-- RLS policies for fidel_transactions
CREATE POLICY "Users can view their own fidel transactions" 
ON public.fidel_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fidel transactions" 
ON public.fidel_transactions FOR SELECT 
USING (is_admin());

CREATE POLICY "Venue owners can view their venue fidel transactions" 
ON public.fidel_transactions FOR SELECT 
USING (venue_id = ANY (get_user_venue_ids()));

-- RLS policies for venue_locations
CREATE POLICY "Admins can manage all venue locations" 
ON public.venue_locations FOR ALL 
USING (is_admin());

CREATE POLICY "Venue owners can view their venue locations" 
ON public.venue_locations FOR SELECT 
USING (venue_id = ANY (get_user_venue_ids()));

CREATE POLICY "Venue owners can manage their venue locations" 
ON public.venue_locations FOR ALL 
USING (venue_id = ANY (get_user_venue_ids()));

-- Create indexes for performance
CREATE INDEX idx_linked_cards_user_id ON public.linked_cards(user_id);
CREATE INDEX idx_linked_cards_fidel_card_id ON public.linked_cards(fidel_card_id);
CREATE INDEX idx_fidel_transactions_user_id ON public.fidel_transactions(user_id);
CREATE INDEX idx_fidel_transactions_venue_id ON public.fidel_transactions(venue_id);
CREATE INDEX idx_fidel_transactions_fidel_card_id ON public.fidel_transactions(fidel_card_id);
CREATE INDEX idx_venue_locations_venue_id ON public.venue_locations(venue_id);
CREATE INDEX idx_venue_locations_fidel_location_id ON public.venue_locations(fidel_location_id);
