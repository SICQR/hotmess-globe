-- Migration: Event Scraper Tables
-- Date: 2026-01-31
-- Description: Adds audit logs for scraper runs and configurable sources table

-- 1. Table for tracking scraper execution history (auditing)
CREATE TABLE IF NOT EXISTS public.event_scraper_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
    
    -- Execution parameters
    mode TEXT NOT NULL CHECK (mode IN ('sources', 'llm', 'manual', 'mixed')),
    target_cities TEXT[], -- JSON array or PG array of cities targeted
    
    -- Stats
    events_found INTEGER DEFAULT 0,
    events_created INTEGER DEFAULT 0,
    events_updated INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    
    -- Diagnostics
    logs JSONB DEFAULT '[]'::JSONB, -- Structured logs or error details
    metadata JSONB DEFAULT '{}'::JSONB, -- Source-specific metadata
    
    initiator TEXT DEFAULT 'system' -- 'cron', 'admin:user_id', 'system'
);

-- 2. Table for configuring scraper sources (replaces env vars)
CREATE TABLE IF NOT EXISTS public.event_scraper_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    city TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('json_feed', 'rss', 'ical', 'html', 'api')),
    
    enabled BOOLEAN DEFAULT true,
    
    -- Configuration
    extract_rules JSONB DEFAULT '{}'::JSONB, -- Selectors or mapping rules
    headers JSONB DEFAULT '{}'::JSONB, -- Auth headers if needed
    
    last_scraped_at TIMESTAMPTZ,
    last_status TEXT,
    last_error TEXT,
    
    UNIQUE(city, source_url)
);

-- 3. RLS Policies
ALTER TABLE public.event_scraper_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_scraper_sources ENABLE ROW LEVEL SECURITY;

-- Allow admins to read/write sources
CREATE POLICY "Admins can manage scraper sources" 
ON public.event_scraper_sources
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow admins to view runs
CREATE POLICY "Admins can view scraper runs" 
ON public.event_scraper_runs
FOR SELECT 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Service role bypasses RLS (for the actual scraper function)
-- (Implicit in Supabase, but good to note)
