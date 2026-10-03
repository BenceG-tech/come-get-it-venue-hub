-- Partner acquisition pipeline (moved from the Vezérlőpult): venue leads with
-- grade, proposed pilot offer, generated offer page and outreach stage.
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id text PRIMARY KEY,
  name text NOT NULL,
  venue_type text,
  description text,
  intro text,
  address text,
  district text,
  opening_hours text,
  drinks text[],
  website text,
  instagram text,
  instagram_handle text,
  facebook text,
  email text,
  phone text,
  photo_url text,
  gmaps_url text,
  place_id text,
  lat double precision,
  lon double precision,
  rating numeric(2,1),
  rating_count integer,
  grade text CHECK (grade IN ('A', 'B', 'C', 'D')),
  score integer,
  -- 0 Kiválasztva, 1 Üzenet kész, 2 Elküldve, 3 Követő üzenet, 4 Válaszolt,
  -- 5 Hívás egyeztetve, 6 Partner lett, 7 Most nem
  stage smallint NOT NULL DEFAULT 0 CHECK (stage BETWEEN 0 AND 7),
  stage_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  quiet_hours jsonb,
  proposal jsonb NOT NULL DEFAULT '{}'::jsonb,
  offer_url text,
  offer_info text,
  -- {requested_at, drink, slot: "14-17", daily_cap} while an offer page is being generated
  offer_request jsonb,
  media jsonb,
  note text,
  source text,
  applicant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_leads_stage_idx ON public.partner_leads (stage);
CREATE INDEX IF NOT EXISTS partner_leads_offer_request_idx
  ON public.partner_leads ((offer_request IS NOT NULL)) WHERE offer_request IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS partner_leads_applicant_idx
  ON public.partner_leads (applicant_id) WHERE applicant_id IS NOT NULL;

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage partner leads"
  ON public.partner_leads
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- The admin UI only lists and edits existing leads. Inserts are performed by
-- the service-role Edge Function/import. RLS still limits browser access to
-- authenticated admins.
REVOKE ALL ON public.partner_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;
