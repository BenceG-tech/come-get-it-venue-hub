-- Real scheduler. No legacy campaign is approved by this migration.
-- Configure endpoint_url after deploying the Edge Functions; NULL is deliberate
-- so development/staging clones can never call the production project accidentally.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.notification_scheduler_credentials (
  id text PRIMARY KEY CHECK (id = 'primary'),
  secret_hash text NOT NULL,
  endpoint_url text CHECK (endpoint_url IS NULL OR endpoint_url ~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/process-scheduled-notifications$'),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_scheduler_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_scheduler_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notification_scheduler_credentials TO service_role;

DO $setup$
DECLARE scheduler_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.notification_scheduler_credentials WHERE id = 'primary') THEN
    scheduler_secret := encode(extensions.gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(scheduler_secret, 'notification_scheduler_key', 'Dedicated key for the notification cron job');
    INSERT INTO public.notification_scheduler_credentials(id, secret_hash)
      VALUES('primary', encode(extensions.digest(scheduler_secret, 'sha256'), 'hex'));
  END IF;
END;
$setup$;

-- No service-role JWT is stored in cron commands or passed over the wire.
SELECT cron.schedule('cgi-notification-dispatch', '*/5 * * * *', $cron$
  SELECT net.http_post(
    url := credentials.endpoint_url,
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-scheduler-key', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notification_scheduler_key')),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  FROM public.notification_scheduler_credentials AS credentials
  WHERE credentials.id = 'primary' AND credentials.enabled AND credentials.endpoint_url IS NOT NULL;
$cron$);
