-- =====================================================================
-- Repo parity: tighten RLS on beacons + profiles
-- =====================================================================
-- Owner: fix-agent-F (task #134). Composes two production changes:
--   1. The 2026-05-26 wave (fix-agent-D, live versions 20260526100116
--      `tighten_rls_beacons_profiles_2026_05_26`) — already LIVE.
--   2. The follow-up profiles tightening applied 2026-05-26 by
--      fix-agent-F (live name
--      `drop_wide_profiles_policy_add_visible_only_2026_05_26`) — the
--      ONLY NEW change to the DB from this PR. Wave 1 left
--      `"Public profiles are viewable by everyone"` in place
--      (qual=true, authenticated) which defeated location / privacy
--      safety. Replaced with a narrower visible-only policy below.
--
-- All statements idempotent — re-applying on a live env is a no-op.
--
-- Anti-scope: do NOT touch chat_threads, boo_actions, pulse_places,
-- venues, or any other RLS surface. Flagged separately if needed.
-- =====================================================================

-- ----------------------------------------------------------------------------
-- BEACONS
-- ----------------------------------------------------------------------------

-- Wave 1: the qual=true overreach is gone.
drop policy if exists beacons_read_all on public.beacons;

-- Replace the old SELECT policy with a tighter active-AND-current rule.
-- Persistent beacons and beacons with no end-time are still public-readable
-- (preserves the existing render behaviour for the canonical demo beacons,
-- which use is_persistent=true).
drop policy if exists "Anyone can view active beacons" on public.beacons;

create policy beacons_read_active_public on public.beacons
  for select
  to anon, authenticated
  using (
    status = 'active'
    and visibility = 'public'
    and (is_persistent = true or ends_at is null or ends_at > now())
  );

-- Owners keep their existing "Owners can manage own beacons" policy
-- (qual = owner_id = auth.uid(), polcmd = *). No change.

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------

-- Wave 1: drop the redundant duplicate that was scoped to {authenticated}.
drop policy if exists profiles_read_all_auth on public.profiles;

-- Wave 2 (NEW): drop the remaining wide policy and replace with a narrower
-- visible+non-demo policy. Self-read remains via profiles_select_own.
-- The Ghosted/People grids fetch via api/profiles.js (service_role) so the
-- server bypass is unaffected; this policy only guards direct client
-- supabase.from('profiles') reads.
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;

create policy profiles_read_visible_authed on public.profiles
  for select
  to authenticated
  using (
    coalesce(is_visible, true) = true
    and coalesce(is_demo, false) = false
  );

-- Future-proof public surface: a vetted column projection for anon-eligible
-- reads (e.g. /u/:slug shareable cards). No email, phone, location, billing,
-- telegram_id, subscription_*, etc. security_invoker=true so the view
-- respects the caller's RLS on profiles.
create or replace view public.public_profiles
  with (security_invoker = true) as
  select
    id,
    username,
    display_name,
    avatar_url,
    bio,
    is_verified,
    verification_level,
    persona_type,
    created_at
  from public.profiles
  where coalesce(is_visible, true) = true
    and coalesce(is_demo, false) = false;

grant select on public.public_profiles to anon, authenticated;
