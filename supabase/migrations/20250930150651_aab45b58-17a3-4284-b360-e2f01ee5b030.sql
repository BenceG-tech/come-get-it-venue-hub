-- Add formatted_address column to venues table
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS formatted_address TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN public.venues.formatted_address IS 'Formatted address returned from geocoding service';