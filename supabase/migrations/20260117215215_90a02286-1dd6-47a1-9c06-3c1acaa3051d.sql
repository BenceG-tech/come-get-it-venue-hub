-- Extend profiles table with additional fields for mobile app users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_source text DEFAULT 'mobile_app';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_info jsonb;

-- Create user_activity_logs table
CREATE TABLE public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  device_info text,
  app_version text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX idx_user_activity_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_event_type ON public.user_activity_logs(event_type);
CREATE INDEX idx_user_activity_venue_id ON public.user_activity_logs(venue_id);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can view all activity logs"
  ON public.user_activity_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role full access on user_activity_logs"
  ON public.user_activity_logs FOR ALL
  USING (true)
  WITH CHECK (true);