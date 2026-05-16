-- Phase 1a — Schema migration for Founding Partner tier system (Path B: beacons as pin table)
-- Cowork-built, 2026-05-16. Locked decisions from Phil's Phase 0 pause-gate review.
-- ALREADY APPLIED TO PROD via Supabase MCP. Committed for parity / local dev replay.

CREATE TABLE IF NOT EXISTS public.chain_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'chain' CHECK (tier IN ('chain')),
  founding_partner_inquiry_id UUID REFERENCES public.founding_partner_inquiries(id),
  base_locations INTEGER NOT NULL DEFAULT 3,
  primary_postcode TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chain_partners_inquiry_idx ON public.chain_partners(founding_partner_inquiry_id);
ALTER TABLE public.chain_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chain_partners_service_role_all ON public.chain_partners;
CREATE POLICY chain_partners_service_role_all ON public.chain_partners FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS chain_partners_anon_read ON public.chain_partners;
CREATE POLICY chain_partners_anon_read ON public.chain_partners FOR SELECT TO anon, authenticated USING (true);

COMMENT ON TABLE public.chain_partners IS 'Founding Chain partners (cap 5). One row per chain; beacons.chain_partner_id FK aggregates locations.';

ALTER TABLE public.beacons
  ADD COLUMN IF NOT EXISTS founding_partner_inquiry_id UUID REFERENCES public.founding_partner_inquiries(id),
  ADD COLUMN IF NOT EXISTS chain_partner_id UUID REFERENCES public.chain_partners(id),
  ADD COLUMN IF NOT EXISTS is_persistent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS home_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS home_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS active_event_venue_id UUID REFERENCES public.venues(id);

CREATE INDEX IF NOT EXISTS beacons_founding_inquiry_idx ON public.beacons(founding_partner_inquiry_id) WHERE founding_partner_inquiry_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS beacons_chain_partner_idx   ON public.beacons(chain_partner_id) WHERE chain_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS beacons_persistent_idx      ON public.beacons(is_persistent) WHERE is_persistent = TRUE;

COMMENT ON COLUMN public.beacons.is_persistent IS 'TRUE for partner pins (no auto-expiry). Cron job should skip rows where is_persistent=TRUE. ends_at=NULL also indicates no expiry.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_status TEXT CHECK (founding_status IS NULL OR founding_status IN ('original_50','founding','early')),
  ADD COLUMN IF NOT EXISTS locked_username BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS username_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS founding_member_waitlist_id UUID REFERENCES public.founding_member_waitlist(id);

CREATE INDEX IF NOT EXISTS profiles_founding_status_idx ON public.profiles(founding_status) WHERE founding_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_founding_member_waitlist_idx ON public.profiles(founding_member_waitlist_id) WHERE founding_member_waitlist_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique ON public.profiles (LOWER(username)) WHERE username IS NOT NULL;
