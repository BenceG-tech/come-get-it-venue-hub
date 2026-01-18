-- Add status column with default 'success'
ALTER TABLE public.redemptions 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'success';

-- Add check constraint for status values
ALTER TABLE public.redemptions 
ADD CONSTRAINT redemptions_status_check 
CHECK (status IN ('success', 'void', 'cancelled'));

-- Add metadata JSONB for audit info
ALTER TABLE public.redemptions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON public.redemptions(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed_at ON public.redemptions(redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_venue_id ON public.redemptions(venue_id);

-- Add RLS policy for admin/staff to UPDATE redemptions (for void)
CREATE POLICY "Admins can update redemptions" ON public.redemptions
  FOR UPDATE USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Staff can update their venue redemptions" ON public.redemptions
  FOR UPDATE USING (venue_id = ANY (get_user_venue_ids()))
  WITH CHECK (venue_id = ANY (get_user_venue_ids()));