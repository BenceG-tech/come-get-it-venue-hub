-- Lojalitás mérföldkövek táblája
CREATE TABLE public.loyalty_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  venue_id UUID NOT NULL,
  milestone_type TEXT NOT NULL, -- 'first_visit', 'returning', 'weekly_regular', 'monthly_vip', 'platinum', 'legendary'
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visit_count INTEGER NOT NULL,
  total_spend INTEGER DEFAULT 0, -- Ft
  reward_sent BOOLEAN DEFAULT false,
  reward_type TEXT,
  reward_sent_at TIMESTAMPTZ,
  reward_message TEXT,
  admin_notified BOOLEAN DEFAULT false,
  admin_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexek
CREATE INDEX idx_loyalty_milestones_user_venue ON public.loyalty_milestones(user_id, venue_id);
CREATE INDEX idx_loyalty_milestones_pending ON public.loyalty_milestones(admin_notified, reward_sent);
CREATE INDEX idx_loyalty_milestones_type ON public.loyalty_milestones(milestone_type);
CREATE INDEX idx_loyalty_milestones_achieved ON public.loyalty_milestones(achieved_at DESC);

-- Enable RLS
ALTER TABLE public.loyalty_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all loyalty milestones"
ON public.loyalty_milestones FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Service role full access on loyalty_milestones"
ON public.loyalty_milestones FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Venue owners can view their venue milestones"
ON public.loyalty_milestones FOR SELECT
USING (venue_id = ANY(get_user_venue_ids()));