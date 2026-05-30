-- ============================================================================
-- VENUE TIERS — Build 6
-- Adds tier system to pulse_places for invisible presence amplification.
-- Tiers: free (default), standard (£29/mo), pro (£79/mo), community (free forever)
-- ============================================================================

-- Tier column
ALTER TABLE public.pulse_places
ADD COLUMN IF NOT EXISTS tier text DEFAULT 'free';

-- Validate tier values (use a check constraint)
DO $$ BEGIN
  ALTER TABLE public.pulse_places
  ADD CONSTRAINT pulse_places_tier_check
  CHECK (tier IN ('free', 'standard', 'pro', 'community'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Subscription status (for Stripe integration later)
ALTER TABLE public.pulse_places
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';

DO $$ BEGIN
  ALTER TABLE public.pulse_places
  ADD CONSTRAINT pulse_places_subscription_status_check
  CHECK (subscription_status IN ('active', 'inactive', 'trial'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Event activation flag (Standard+ can activate event mode)
ALTER TABLE public.pulse_places
ADD COLUMN IF NOT EXISTS event_active boolean DEFAULT false;

-- Last peak timestamp (for analytics / conversion triggers)
ALTER TABLE public.pulse_places
ADD COLUMN IF NOT EXISTS last_peak_at timestamptz;

-- Indexes for tier-based queries
CREATE INDEX IF NOT EXISTS idx_pulse_places_tier ON public.pulse_places(tier);
CREATE INDEX IF NOT EXISTS idx_pulse_places_event_active ON public.pulse_places(event_active) WHERE event_active = true;

-- ============================================================================
-- VENUE ANALYTICS FOUNDATION (lightweight, for future dashboards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.venue_analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_slug text NOT NULL REFERENCES public.pulse_places(slug),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  checkins_total int DEFAULT 0,
  peak_hour smallint,           -- 0-23
  peak_count int DEFAULT 0,
  unique_visitors int DEFAULT 0,
  taps_total int DEFAULT 0,     -- profile taps from this venue context
  created_at timestamptz DEFAULT now(),
  UNIQUE(place_slug, snapshot_date)
);

-- RLS: venue analytics readable by venue owners (future), writable by service role only
ALTER TABLE public.venue_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage venue analytics"
  ON public.venue_analytics_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- UPGRADE TRIGGER SIGNALS (internal, for future venue sales)
-- Records moments when a venue shows upgrade-worthy behavior
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.venue_upgrade_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_slug text NOT NULL,
  signal_type text NOT NULL, -- 'organic_peak' | 'missed_traffic' | 'repeated_activity' | 'high_taps_low_conversion'
  signal_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_upgrade_signals_slug ON public.venue_upgrade_signals(place_slug);
CREATE INDEX IF NOT EXISTS idx_venue_upgrade_signals_type ON public.venue_upgrade_signals(signal_type);
