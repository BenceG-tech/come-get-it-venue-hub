-- Add coordinates JSON column
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS coordinates JSONB DEFAULT '{"lat": 0, "lng": 0}';

-- Add caps JSON column  
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS caps JSONB DEFAULT '{"onExhaust": "close"}';

-- Add notifications JSON column
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"email": true, "push": false, "weekly_reports": true}';