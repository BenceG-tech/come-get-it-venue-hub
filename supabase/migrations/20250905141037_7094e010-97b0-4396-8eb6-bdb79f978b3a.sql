-- Hotfix: add a nullable distance column to venues to satisfy clients expecting this field
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS distance double precision NULL;