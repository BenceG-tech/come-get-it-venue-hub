-- Create venue_drinks table to move drinks from JSON to proper database table
CREATE TABLE public.venue_drinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  drink_name TEXT NOT NULL,
  category TEXT,
  abv NUMERIC,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  brand_id TEXT,
  is_free_drink BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  ingredients TEXT[],
  preparation_instructions TEXT,
  image_url TEXT,
  serving_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on venue_drinks
ALTER TABLE public.venue_drinks ENABLE ROW LEVEL SECURITY;

-- Create policies for venue_drinks
CREATE POLICY "Admins can manage all venue drinks" 
ON public.venue_drinks 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view their venue drinks" 
ON public.venue_drinks 
FOR SELECT 
USING (venue_id = ANY (get_user_venue_ids()));

CREATE POLICY "Venue owners can manage their venue drinks" 
ON public.venue_drinks 
FOR ALL 
USING (venue_id = ANY (get_user_venue_ids()));

-- Add drink_id column to free_drink_windows to link windows to specific drinks
ALTER TABLE public.free_drink_windows 
ADD COLUMN drink_id UUID REFERENCES public.venue_drinks(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_venue_drinks_venue_id ON public.venue_drinks(venue_id);
CREATE INDEX idx_venue_drinks_is_free ON public.venue_drinks(is_free_drink);
CREATE INDEX idx_free_drink_windows_drink_id ON public.free_drink_windows(drink_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_venue_drinks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_venue_drinks_updated_at
BEFORE UPDATE ON public.venue_drinks
FOR EACH ROW
EXECUTE FUNCTION public.update_venue_drinks_updated_at();