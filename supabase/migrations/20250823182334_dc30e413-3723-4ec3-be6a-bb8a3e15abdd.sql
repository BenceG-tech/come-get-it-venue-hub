
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.venue_role AS ENUM ('venue_owner', 'venue_staff');
CREATE TYPE public.venue_plan AS ENUM ('basic', 'standard', 'premium');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create venues table
CREATE TABLE public.venues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  plan public.venue_plan NOT NULL DEFAULT 'basic',
  owner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  phone_number TEXT,
  website_url TEXT,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create venue_memberships table
CREATE TABLE public.venue_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  role public.venue_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, venue_id)
);

-- Create redemptions table
CREATE TABLE public.redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- anonymous user ID, not referencing auth.users
  drink TEXT NOT NULL,
  value INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- in cents
  points INTEGER NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rewards table
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  valid_until DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create free_drink_windows table
CREATE TABLE public.free_drink_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  days INTEGER[] NOT NULL, -- 1-7 for Monday-Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Budapest',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create caps table
CREATE TABLE public.caps (
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE PRIMARY KEY,
  daily INTEGER,
  hourly INTEGER,
  monthly INTEGER,
  per_user_daily INTEGER,
  on_exhaust TEXT DEFAULT 'close',
  alt_offer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_drink_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caps ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = user_id), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.get_user_venue_ids(user_id UUID DEFAULT auth.uid())
RETURNS UUID[]
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT venue_id 
      FROM public.venue_memberships 
      WHERE profile_id = user_id
    ), 
    ARRAY[]::UUID[]
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- RLS Policies for venues
CREATE POLICY "Admins can view all venues" ON public.venues
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can view their venues" ON public.venues
  FOR SELECT USING (id = ANY(public.get_user_venue_ids()));

CREATE POLICY "Admins can insert venues" ON public.venues
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all venues" ON public.venues
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Venue owners can update their venues" ON public.venues
  FOR UPDATE USING (id = ANY(public.get_user_venue_ids()));

-- RLS Policies for venue_memberships
CREATE POLICY "Admins can view all memberships" ON public.venue_memberships
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can view their own memberships" ON public.venue_memberships
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Admins can manage all memberships" ON public.venue_memberships
  FOR ALL USING (public.is_admin());

-- RLS Policies for redemptions
CREATE POLICY "Admins can view all redemptions" ON public.redemptions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can view their venue redemptions" ON public.redemptions
  FOR SELECT USING (venue_id = ANY(public.get_user_venue_ids()));

CREATE POLICY "Venue members can insert redemptions" ON public.redemptions
  FOR INSERT WITH CHECK (venue_id = ANY(public.get_user_venue_ids()));

-- RLS Policies for transactions
CREATE POLICY "Admins can view all transactions" ON public.transactions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can view their venue transactions" ON public.transactions
  FOR SELECT USING (venue_id = ANY(public.get_user_venue_ids()));

CREATE POLICY "Venue members can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (venue_id = ANY(public.get_user_venue_ids()));

-- RLS Policies for rewards
CREATE POLICY "Admins can manage all rewards" ON public.rewards
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their venue rewards" ON public.rewards
  FOR SELECT USING (venue_id = ANY(public.get_user_venue_ids()));

CREATE POLICY "Venue owners can manage their venue rewards" ON public.rewards
  FOR ALL USING (venue_id = ANY(public.get_user_venue_ids()));

-- RLS Policies for free_drink_windows
CREATE POLICY "Admins can manage all windows" ON public.free_drink_windows
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their venue windows" ON public.free_drink_windows
  FOR SELECT USING (venue_id = ANY(public.get_user_venue_ids()));

CREATE POLICY "Venue owners can manage their venue windows" ON public.free_drink_windows
  FOR ALL USING (venue_id = ANY(public.get_user_venue_ids()));

-- RLS Policies for caps
CREATE POLICY "Admins can manage all caps" ON public.caps
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view their venue caps" ON public.caps
  FOR SELECT USING (venue_id = ANY(public.get_user_venue_ids()));

CREATE POLICY "Venue owners can manage their venue caps" ON public.caps
  FOR ALL USING (venue_id = ANY(public.get_user_venue_ids()));

-- Create trigger function for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    FALSE
  );
  RETURN NEW;
END;
$$;

-- Create trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for performance
CREATE INDEX idx_venues_owner_profile_id ON public.venues(owner_profile_id);
CREATE INDEX idx_venue_memberships_profile_id ON public.venue_memberships(profile_id);
CREATE INDEX idx_venue_memberships_venue_id ON public.venue_memberships(venue_id);
CREATE INDEX idx_redemptions_venue_id ON public.redemptions(venue_id);
CREATE INDEX idx_redemptions_redeemed_at ON public.redemptions(redeemed_at);
CREATE INDEX idx_transactions_venue_id ON public.transactions(venue_id);
CREATE INDEX idx_transactions_timestamp ON public.transactions(timestamp);
CREATE INDEX idx_rewards_venue_id ON public.rewards(venue_id);
CREATE INDEX idx_free_drink_windows_venue_id ON public.free_drink_windows(venue_id);
