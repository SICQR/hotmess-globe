-- =====================================================================
-- DROP remaining wide profiles SELECT policy
-- =====================================================================
-- Owner: fix-agent-F (task #134) — extension of FIX-D
-- Applied live: 2026-05-26 10:23 UTC (schema_migrations version 20260526102322)
-- Committed to repo (audit parity): 2026-05-26 12:02 UTC
--
-- Why:
--   FIX-D dropped the duplicate `profiles_read_all_auth` but left the
--   older "Public profiles are viewable by everyone" (qual=true,
--   authenticated) which was still too wide: any signed-in user could
--   read every profile row including hidden + demo profiles, defeating
--   location/privacy intent.
--
--   Replace it with a narrower policy that only exposes visible,
--   non-demo profiles to authenticated readers. `profiles_select_own`
--   already covers self-read regardless of visibility. The Ghosted /
--   People grids fetch via api/profiles.js (service_role) so the
--   server bypass is unaffected; this policy guards only direct client
--   `supabase.from('profiles')` reads.
--
-- Anon remains fully blocked (no SELECT policy at all → 0 rows).
-- Verified live 2026-05-26: anon GET /rest/v1/profiles → [].
--
-- Idempotent — uses `drop policy if exists`.
-- =====================================================================

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists profiles_read_visible_authed on public.profiles;

create policy profiles_read_visible_authed on public.profiles
  for select
  to authenticated
  using (
    coalesce(is_visible, true) = true
    and coalesce(is_demo, false) = false
  );
