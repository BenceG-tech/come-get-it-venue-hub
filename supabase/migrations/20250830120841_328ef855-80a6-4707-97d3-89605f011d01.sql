
-- Add missing opening_hours column to venues table
ALTER TABLE public.venues 
ADD COLUMN opening_hours JSONB DEFAULT NULL;

-- Add tags column to venues table (currently missing but referenced in code)
ALTER TABLE public.venues 
ADD COLUMN tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update VENUE_COLUMNS to include new fields in supabaseProvider
-- This will be handled in the code changes

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_venues_opening_hours ON public.venues USING GIN (opening_hours);
CREATE INDEX IF NOT EXISTS idx_venues_tags ON public.venues USING GIN (tags);

-- Add a function to validate opening hours JSON structure
CREATE OR REPLACE FUNCTION validate_opening_hours(hours JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Basic validation: check if it's a valid JSON structure
  -- More detailed validation can be added later
  RETURN hours IS NULL OR jsonb_typeof(hours) = 'object';
END;
$$ LANGUAGE plpgsql;

-- Add constraint to ensure opening_hours has valid structure
ALTER TABLE public.venues 
ADD CONSTRAINT check_opening_hours_structure 
CHECK (validate_opening_hours(opening_hours));
