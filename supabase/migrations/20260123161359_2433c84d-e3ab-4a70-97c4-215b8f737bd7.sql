-- Anomaly logs for detecting unusual patterns
CREATE TABLE public.anomaly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'venue', 'platform')),
  entity_id UUID,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anomaly_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all anomalies
CREATE POLICY "Admins can view anomalies"
  ON public.anomaly_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can insert anomalies
CREATE POLICY "Admins can insert anomalies"
  ON public.anomaly_logs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update anomalies (resolve them)
CREATE POLICY "Admins can update anomalies"
  ON public.anomaly_logs FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_anomaly_logs_entity ON public.anomaly_logs(entity_type, entity_id);
CREATE INDEX idx_anomaly_logs_severity ON public.anomaly_logs(severity);
CREATE INDEX idx_anomaly_logs_detected_at ON public.anomaly_logs(detected_at DESC);
CREATE INDEX idx_anomaly_logs_unresolved ON public.anomaly_logs(resolved_at) WHERE resolved_at IS NULL;

-- Autopilot rules for automated campaigns
CREATE TABLE public.autopilot_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_condition JSONB NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('push_notification', 'email', 'points_bonus', 'promotion')),
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  cooldown_hours INTEGER DEFAULT 24,
  stats JSONB DEFAULT '{"sent_count": 0, "conversions": 0, "last_run": null}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.autopilot_rules ENABLE ROW LEVEL SECURITY;

-- Admins can manage autopilot rules
CREATE POLICY "Admins can view autopilot rules"
  ON public.autopilot_rules FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert autopilot rules"
  ON public.autopilot_rules FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update autopilot rules"
  ON public.autopilot_rules FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete autopilot rules"
  ON public.autopilot_rules FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_autopilot_rules_updated_at
  BEFORE UPDATE ON public.autopilot_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign ROI tracking
CREATE TABLE public.campaign_roi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  cost_estimate NUMERIC DEFAULT 0,
  attributed_revenue NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.campaign_roi ENABLE ROW LEVEL SECURITY;

-- Admins can manage campaign ROI
CREATE POLICY "Admins can view campaign ROI"
  ON public.campaign_roi FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert campaign ROI"
  ON public.campaign_roi FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_campaign_roi_period ON public.campaign_roi(period_start, period_end);
CREATE INDEX idx_campaign_roi_type ON public.campaign_roi(campaign_type);

-- Platform activity snapshot for live dashboard
CREATE TABLE public.platform_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_users INTEGER DEFAULT 0,
  redemptions_last_hour INTEGER DEFAULT 0,
  redemptions_last_5min INTEGER DEFAULT 0,
  hottest_venue_id UUID REFERENCES public.venues(id),
  hottest_venue_count INTEGER DEFAULT 0,
  venue_activity JSONB DEFAULT '{}'::jsonb,
  alerts JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.platform_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can view snapshots
CREATE POLICY "Admins can view platform snapshots"
  ON public.platform_snapshots FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert snapshots"
  ON public.platform_snapshots FOR INSERT
  WITH CHECK (true);

-- Index for latest snapshot
CREATE INDEX idx_platform_snapshots_time ON public.platform_snapshots(snapshot_time DESC);

-- Clean up old snapshots (keep last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.platform_snapshots
  WHERE snapshot_time < now() - INTERVAL '24 hours';
END;
$$;