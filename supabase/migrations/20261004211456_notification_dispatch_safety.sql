ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;

-- Prepared locally; apply before the notification Edge Functions. No automatic retries
-- after an ambiguous provider response: a processing log remains for operator review.
ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS dispatch_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dispatch_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_summary jsonb;

CREATE OR REPLACE FUNCTION public.reserve_notification_delivery(
  p_id uuid, p_user_id uuid, p_template_id uuid, p_title text, p_body text,
  p_max_per_day integer DEFAULT 2, p_cooldown_hours integer DEFAULT 6,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE existing_status text;
BEGIN
  -- The RPC is service-role-only. This lock serializes reservations across ALL
  -- campaigns for a recipient, so concurrent campaigns cannot bypass frequency caps.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 419));
  SELECT status INTO existing_status FROM public.notification_logs WHERE id = p_id;
  IF FOUND THEN
    RETURN jsonb_build_object('reserved', false, 'status', 'duplicate', 'previous_status', existing_status);
  END IF;
  IF (SELECT count(*) FROM public.notification_logs WHERE user_id = p_user_id
      AND status IN ('processing', 'sent', 'unknown') AND sent_at > now() - interval '24 hours')
      >= least(greatest(coalesce(p_max_per_day, 2), 1), 2)
    OR EXISTS (SELECT 1 FROM public.notification_logs WHERE user_id = p_user_id
      AND status IN ('processing', 'sent', 'unknown')
      AND sent_at > now() - make_interval(hours => greatest(coalesce(p_cooldown_hours, 6), 6))) THEN
    RETURN jsonb_build_object('reserved', false, 'status', 'frequency_limited');
  END IF;
  INSERT INTO public.notification_logs(id, user_id, template_id, title, body, status, metadata)
    VALUES(p_id, p_user_id, p_template_id, p_title, p_body, 'processing', p_metadata);
  RETURN jsonb_build_object('reserved', true, 'status', 'processing');
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_notification_delivery(uuid, uuid, uuid, text, text, integer, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_notification_delivery(uuid, uuid, uuid, text, text, integer, integer, jsonb) TO service_role;

CREATE INDEX IF NOT EXISTS notification_logs_recipient_dispatch_idx
  ON public.notification_logs(user_id, sent_at DESC) WHERE status IN ('processing', 'sent', 'unknown');
