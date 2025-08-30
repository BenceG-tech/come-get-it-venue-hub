
-- Add missing image URL columns to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS hero_image_url text;

-- Add image_url column to rewards table
ALTER TABLE public.rewards 
ADD COLUMN IF NOT EXISTS image_url text;

-- Ensure public read policy exists for venues (may already exist)
DROP POLICY IF EXISTS "Public read venues" ON public.venues;
CREATE POLICY "Public read venues"
ON public.venues FOR SELECT
USING (is_paused = false);

-- Create venue-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-images', 
  'venue-images', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for venue-images bucket
DROP POLICY IF EXISTS "Public can view venue images" ON storage.objects;
CREATE POLICY "Public can view venue images"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-images');

DROP POLICY IF EXISTS "Authenticated users can upload venue images" ON storage.objects;
CREATE POLICY "Authenticated users can upload venue images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'venue-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Venue owners can manage their images" ON storage.objects;
CREATE POLICY "Venue owners can manage their images"
ON storage.objects FOR ALL
USING (bucket_id = 'venue-images' AND auth.role() = 'authenticated');
