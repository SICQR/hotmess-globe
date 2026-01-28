-- Create venues table for business venue management
CREATE TABLE IF NOT EXISTS public.venues (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    address text,
    city text,
    country text,
    latitude double precision,
    longitude double precision,
    capacity integer,
    phone text,
    website text,
    image_url text,
    operating_hours text,
    owner_email text NOT NULL REFERENCES public."User"(email),
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create index for owner lookups
CREATE INDEX IF NOT EXISTS idx_venues_owner_email ON public.venues(owner_email);

-- Create index for location queries
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);

-- Enable RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all venues
CREATE POLICY "Anyone can view venues" 
    ON public.venues 
    FOR SELECT 
    USING (true);

-- Users can only insert their own venues
CREATE POLICY "Users can create their own venues" 
    ON public.venues 
    FOR INSERT 
    WITH CHECK (owner_email = (SELECT email FROM public."User" WHERE auth_user_id = auth.uid()));

-- Users can only update their own venues
CREATE POLICY "Users can update their own venues" 
    ON public.venues 
    FOR UPDATE 
    USING (owner_email = (SELECT email FROM public."User" WHERE auth_user_id = auth.uid()));

-- Users can only delete their own venues
CREATE POLICY "Users can delete their own venues" 
    ON public.venues 
    FOR DELETE 
    USING (owner_email = (SELECT email FROM public."User" WHERE auth_user_id = auth.uid()));

-- Add venue_id to Beacon table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Beacon' AND column_name = 'venue_id'
    ) THEN
        ALTER TABLE public."Beacon" ADD COLUMN venue_id uuid REFERENCES public.venues(id);
        CREATE INDEX idx_beacon_venue_id ON public."Beacon"(venue_id);
    END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.venues IS 'Business venues for event hosting';
