-- Phase 1 Tables: Audit Logging and User Tags

-- 1.1 Audit Logs Table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Service role can insert
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- 1.2 User Tags Table
CREATE TABLE public.user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tag TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag)
);

-- Enable RLS
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;

-- Only admins can manage user tags
CREATE POLICY "Admins can manage user tags"
ON public.user_tags
FOR ALL
USING (is_admin(auth.uid()));

-- Service role can manage tags
CREATE POLICY "Service role full access on user_tags"
ON public.user_tags
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX idx_user_tags_user ON public.user_tags(user_id);
CREATE INDEX idx_user_tags_tag ON public.user_tags(tag);

-- 1.4 Report Schedules Tables
CREATE TABLE public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  recipient_emails TEXT[] NOT NULL,
  venue_ids UUID[],
  schedule_cron TEXT NOT NULL,
  timezone TEXT DEFAULT 'Europe/Budapest',
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage report schedules"
ON public.report_schedules
FOR ALL
USING (is_admin(auth.uid()));

CREATE TABLE public.report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.report_schedules(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_count INTEGER,
  status TEXT NOT NULL,
  error_message TEXT
);

ALTER TABLE public.report_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view report logs"
ON public.report_logs
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Service role can insert report logs"
ON public.report_logs
FOR INSERT
WITH CHECK (true);

-- Performance indexes for existing tables (Phase 4 quick win)
CREATE INDEX IF NOT EXISTS idx_redemptions_user_venue ON public.redemptions(user_id, venue_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_redeemed_at ON public.redemptions(redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_type ON public.user_activity_logs(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON public.points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(user_id, sent_at DESC);