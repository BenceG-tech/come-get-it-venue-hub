-- Add public read access to venue_drinks for active venues
CREATE POLICY "Public can view drinks of active venues" ON public.venue_drinks
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM venues v 
    WHERE v.id = venue_drinks.venue_id 
    AND v.is_paused = false
  )
);

-- Add public read access to free_drink_windows for active venues  
CREATE POLICY "Public can view windows of active venues" ON public.free_drink_windows
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM venues v 
    WHERE v.id = free_drink_windows.venue_id 
    AND v.is_paused = false
  )
);