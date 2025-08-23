
-- Create storage bucket for venue images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('venue-images', 'venue-images', true);

-- Create RLS policy for venue images - allow authenticated users to upload
CREATE POLICY "Authenticated users can upload venue images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'venue-images' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to venue images
CREATE POLICY "Public can view venue images" ON storage.objects
FOR SELECT USING (bucket_id = 'venue-images');

-- Allow venue owners to update their venue images
CREATE POLICY "Venue owners can update their images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'venue-images' 
  AND auth.role() = 'authenticated'
);

-- Allow venue owners to delete their venue images
CREATE POLICY "Venue owners can delete their images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'venue-images' 
  AND auth.role() = 'authenticated'
);
