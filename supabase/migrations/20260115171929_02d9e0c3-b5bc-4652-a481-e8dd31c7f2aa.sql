-- Add new columns to rewards table
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.venues(id);
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS terms_conditions text;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS max_redemptions integer;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS current_redemptions integer DEFAULT 0;

-- Create reward_redemptions table for tracking redemption history
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  redeemed_at timestamp with time zone DEFAULT now() NOT NULL,
  staff_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on reward_redemptions
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for reward_redemptions
CREATE POLICY "Admins can manage all reward redemptions"
  ON public.reward_redemptions FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view their own redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Venue owners can view their venue redemptions"
  ON public.reward_redemptions FOR SELECT
  USING (venue_id = ANY(get_user_venue_ids()));

CREATE POLICY "Venue members can insert redemptions"
  ON public.reward_redemptions FOR INSERT
  WITH CHECK (venue_id = ANY(get_user_venue_ids()));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON public.reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON public.reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_venue_id ON public.reward_redemptions(venue_id);
CREATE INDEX IF NOT EXISTS idx_rewards_venue_id ON public.rewards(venue_id);
CREATE INDEX IF NOT EXISTS idx_rewards_is_global ON public.rewards(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_rewards_partner_id ON public.rewards(partner_id) WHERE partner_id IS NOT NULL;