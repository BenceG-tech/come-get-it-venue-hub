-- Add owner_profile_id-based policies to complement membership-based access

-- Venues: allow owners to view and update their own venues using owner_profile_id
CREATE POLICY "Owners can view their venues by owner_profile_id"
  ON public.venues
  FOR SELECT
  USING (owner_profile_id = auth.uid());

CREATE POLICY "Owners can update their venues by owner_profile_id"
  ON public.venues
  FOR UPDATE
  USING (owner_profile_id = auth.uid());

-- Venue drinks: allow owners to manage their venue drinks based on owner_profile_id
CREATE POLICY "Owners can manage venue drinks by owner_profile_id"
  ON public.venue_drinks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_drinks.venue_id
        AND v.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_drinks.venue_id
        AND v.owner_profile_id = auth.uid()
    )
  );

-- Free drink windows: allow owners to manage their venue windows based on owner_profile_id
CREATE POLICY "Owners can manage venue windows by owner_profile_id"
  ON public.free_drink_windows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = free_drink_windows.venue_id
        AND v.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = free_drink_windows.venue_id
        AND v.owner_profile_id = auth.uid()
    )
  );

-- Venue images: allow owners to manage their venue images based on owner_profile_id
CREATE POLICY "Owners can manage venue images by owner_profile_id"
  ON public.venue_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_images.venue_id
        AND v.owner_profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_images.venue_id
        AND v.owner_profile_id = auth.uid()
    )
  );