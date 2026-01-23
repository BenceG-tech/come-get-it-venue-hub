-- Create notification_templates table
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_hu TEXT NOT NULL,
  title_en TEXT,
  body_hu TEXT NOT NULL,
  body_en TEXT,
  icon TEXT,
  image_url TEXT,
  deep_link TEXT,
  targeting JSONB DEFAULT '{}',
  send_mode TEXT NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMPTZ,
  event_type TEXT,
  frequency_limit JSONB DEFAULT '{"max_per_day": null, "cooldown_hours": null}',
  quiet_hours JSONB DEFAULT '{"start": null, "end": null}',
  ttl_hours INTEGER,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create notification_logs table for tracking sent notifications
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES notification_templates(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued',
  platform TEXT,
  device_token TEXT,
  error_message TEXT,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- Create ai_notification_suggestions for audit/history
CREATE TABLE public.ai_notification_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  suggestions JSONB NOT NULL,
  context JSONB DEFAULT '{}',
  action_taken TEXT,
  sent_notification_id UUID REFERENCES notification_logs(id),
  created_by UUID REFERENCES profiles(id)
);

-- Enable RLS on all new tables
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_notification_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_templates
CREATE POLICY "Admins can manage all notification templates"
  ON public.notification_templates FOR ALL
  USING (is_admin());

CREATE POLICY "Service role full access on notification_templates"
  ON public.notification_templates FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for notification_logs
CREATE POLICY "Admins can view all notification logs"
  ON public.notification_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Service role full access on notification_logs"
  ON public.notification_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for ai_notification_suggestions
CREATE POLICY "Admins can manage all AI suggestions"
  ON public.ai_notification_suggestions FOR ALL
  USING (is_admin());

CREATE POLICY "Service role full access on ai_suggestions"
  ON public.ai_notification_suggestions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_ai_suggestions_user_id ON public.ai_notification_suggestions(user_id);
CREATE INDEX idx_notification_templates_category ON public.notification_templates(category);
CREATE INDEX idx_notification_templates_is_active ON public.notification_templates(is_active);

-- Add updated_at trigger for notification_templates
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();