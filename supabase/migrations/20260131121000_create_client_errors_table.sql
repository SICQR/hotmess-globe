-- Client-side error logging table
-- Alternative to Sentry for basic error tracking

CREATE TABLE IF NOT EXISTS public.client_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Error info
    message TEXT NOT NULL,
    stack TEXT,
    component_stack TEXT,
    
    -- Context
    url TEXT,
    user_agent TEXT,
    user_email TEXT,
    
    -- Metadata
    environment TEXT DEFAULT 'production',
    release_version TEXT,
    tags JSONB DEFAULT '{}'::JSONB,
    extra JSONB DEFAULT '{}'::JSONB,
    
    -- Deduplication
    fingerprint TEXT,
    occurrence_count INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON public.client_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_fingerprint ON public.client_errors (fingerprint);
CREATE INDEX IF NOT EXISTS idx_client_errors_user_email ON public.client_errors (user_email);

-- RLS
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert errors
CREATE POLICY "Users can log errors" 
ON public.client_errors
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow admins to read all errors
CREATE POLICY "Admins can view errors" 
ON public.client_errors
FOR SELECT 
TO authenticated 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow anon to insert (for pre-auth errors)
CREATE POLICY "Anon can log errors" 
ON public.client_errors
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Cleanup old errors (keep 30 days)
-- Run via cron: DELETE FROM public.client_errors WHERE created_at < NOW() - INTERVAL '30 days';
