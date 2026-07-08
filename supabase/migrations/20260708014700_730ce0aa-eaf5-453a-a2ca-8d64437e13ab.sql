
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS redemption_radius_m integer;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings readable by everyone" ON public.platform_settings;
CREATE POLICY "platform_settings readable by everyone"
  ON public.platform_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "platform_settings writable by admins" ON public.platform_settings;
CREATE POLICY "platform_settings writable by admins"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

INSERT INTO public.platform_settings(key, value)
VALUES ('enforce_redemption_radius', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_settings(key, value)
VALUES ('default_redemption_radius_m', '100'::jsonb)
ON CONFLICT (key) DO NOTHING;
