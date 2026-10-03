-- Admin-side state for landing-page sign-ups and partner applications.
-- The submissions themselves stay in the marketing (CRM) Supabase project;
-- this table only stores how the admin handled each one.
CREATE TABLE IF NOT EXISTS public.applicant_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('waitlist', 'venue_application')),
  external_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'uj'
    CHECK (status IN ('uj', 'kapcsolatban', 'felvett', 'elutasitva')),
  note text,
  offer_status text CHECK (offer_status IN ('kert', 'kesz')),
  offer_url text,
  offer_requested_at timestamptz,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);

ALTER TABLE public.applicant_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage applicant reviews"
  ON public.applicant_reviews
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- The browser never reads this table directly; the authenticated admin Edge
-- Function owns all access. Keep the Data API grant surface minimal.
REVOKE ALL ON public.applicant_reviews FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.applicant_reviews TO service_role;
