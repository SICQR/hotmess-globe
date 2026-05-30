-- ============================================================
-- HOTFIX: Add columns that code expects but DB is missing
-- Safe: all ADD COLUMN IF NOT EXISTS, idempotent
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_online  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen  TIMESTAMPTZ;

-- Sync last_seen from last_seen_at if that column exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_seen_at') THEN
    UPDATE public.profiles SET last_seen = last_seen_at WHERE last_seen IS NULL;
  END IF;
END $$;

-- ── "Beacon" table (PascalCase is the real table; beacons is a view of it) ──
-- Add type (alias for kind) and starts_at (alias for event_date) as stored columns
-- so code queries using these names work without rewriting the view

DO $$ BEGIN
  -- Add 'type' as a regular column backfilled from 'kind'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Beacon' AND column_name='type') THEN
    ALTER TABLE public."Beacon" ADD COLUMN type TEXT;
    UPDATE public."Beacon" SET type = kind WHERE type IS NULL;
  END IF;

  -- Add 'starts_at' backfilled from event_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Beacon' AND column_name='starts_at') THEN
    ALTER TABLE public."Beacon" ADD COLUMN starts_at TIMESTAMPTZ;
    UPDATE public."Beacon" SET starts_at = event_date WHERE starts_at IS NULL;
  END IF;

  -- Add metadata JSONB
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Beacon' AND column_name='metadata') THEN
    ALTER TABLE public."Beacon" ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Refresh the lowercase view to pick up new columns
CREATE OR REPLACE VIEW public.beacons AS SELECT * FROM public."Beacon";

-- ── preloved_listings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.preloved_listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  price       NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency    TEXT NOT NULL DEFAULT 'GBP',
  category    TEXT,
  condition   TEXT,
  images      TEXT[] DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'sold', 'draft', 'removed', 'deleted')),
  location_city    TEXT,
  location_country TEXT,
  shipping_available BOOLEAN DEFAULT FALSE,
  local_pickup       BOOLEAN DEFAULT TRUE,
  views  INTEGER DEFAULT 0,
  saves  INTEGER DEFAULT 0,
  metadata   JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.preloved_listings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='preloved_listings' AND policyname='preloved_read_active_or_own') THEN
    CREATE POLICY preloved_read_active_or_own ON public.preloved_listings
      FOR SELECT TO anon, authenticated
      USING (status = 'active' OR auth.uid() = seller_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='preloved_listings' AND policyname='preloved_manage_own') THEN
    CREATE POLICY preloved_manage_own ON public.preloved_listings
      FOR ALL TO authenticated
      USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
  END IF;
END $$;

GRANT SELECT ON public.preloved_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preloved_listings TO authenticated;

-- right_now_status is the original TABLE (not a view).
-- Created in 20260104033500_create_right_now_status.sql with columns:
-- id, user_email, intent, timeframe, location, active, expires_at, preferences, created_by, created_at, updated_at
-- No changes needed here — queries now use these real column names.
