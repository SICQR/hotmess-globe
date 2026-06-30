-- ============================================================================
-- DB-08 (CRITICAL) — Stop profiles.last_lat/last_lng/location leaking cross-user
-- DRAFT MIGRATION — branch fix/db-criticals. DO NOT APPLY to prod. Phil applies.
-- Inherits: sacred-invariant #2/#3 (no exact tracking), 48-spatial-identity-exposure.
-- Fixes finding DB-08. Blast radius: every authenticated profiles read.
-- ----------------------------------------------------------------------------
-- PROVEN LEAK (live JWT-scoped probe, 2026-06-30): an ordinary authenticated user
--   reads 223 other profiles and 114 of them return precise last_lat+last_lng.
--   Policy `profiles_read_visible_authed` (USING is_visible AND NOT is_demo) grants
--   ROW-wide read of every visible profile; the coordinate columns carry
--   authenticated SELECT, so exact coords ride along. The client does exactly this:
--   src/components/utils/queryConfig.jsx  useAllUsers -> profiles.select('*').
--   This DEFEATS the nearby_candidates_secure fuzzing entirely. Anon = 0 (RLS blocks).
--
-- FIX: column-level REVOKE so the precise fields can never be returned by PostgREST,
--   for any role. Coarse location (location_area/location_name/location_radius_km/
--   location_precision) is retained for display. Proximity now flows ONLY through the
--   banded SECDEF RPC (DB-01).
--
-- *** SEQUENCING — MANDATORY ***  Ship the client change FIRST (or same deploy):
--   queryConfig.jsx must stop `select('*')` (see paired commit) BEFORE this REVOKE,
--   or `select('*')` will throw "permission denied for column last_lat" and break
--   the Connect grid. The paired commit changes useAllUsers to an explicit safe list.
-- ============================================================================

REVOKE SELECT (last_lat, last_lng, location) ON public.profiles FROM anon, authenticated;

-- The owner does NOT need these via PostgREST: the viewer's own position comes from
-- device GPS, and presence writes go through user_presence_locations. If any self-read
-- is later required, expose it via a SECURITY DEFINER RPC scoped to auth.uid(), e.g.:
--   CREATE FUNCTION public.get_my_location() RETURNS TABLE(lat double precision, lng double precision)
--   LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
--     SELECT last_lat, last_lng FROM public.profiles WHERE id = auth.uid() $$;

-- VERIFY after apply (read-only) — expect permission denied / 0 precise leak:
--   as authenticated user B:  SELECT last_lat FROM public.profiles WHERE id <> auth.uid();
