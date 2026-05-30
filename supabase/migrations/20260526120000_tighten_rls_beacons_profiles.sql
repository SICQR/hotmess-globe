-- =====================================================================
-- TIGHTEN RLS on beacons + profiles
-- =====================================================================
-- Owner: fix-agent-D (task #132)
-- Applied live: 2026-05-26 10:01 UTC (schema_migrations version 20260526100116)
-- Committed to repo (audit parity): 2026-05-26 12:00 UTC
--
-- Why:
--   1. beacons.beacons_read_all had qual=true on PUBLIC, overriding all
--      narrower SELECT policies via OR-merge. ANY anon could read every
--      beacon (drafts, cancelled, expired).
--   2. profiles already blocks anon (both blanket policies are scoped
--      to {authenticated}), but the duplicate profiles_read_all_auth is
--      redundant churn. Also introduce a public_profiles view so any
--      future anon-facing surface uses a vetted column projection
--      (no email, phone, location).
--
-- Anti-scope per task brief: do NOT touch other tables (chat_threads,
-- right_now_posts, etc.).
--
-- Idempotent — uses `drop policy if exists` and `create or replace view`.
-- =====================================================================

-- ----------------------------------------------------------------------------
-- BEACONS
-- ----------------------------------------------------------------------------

-- The qual=true overreach. Gone.
drop policy if exists beacons_read_all on public.beacons;

-- Replace the old SELECT policy with a tighter active-AND-current rule.
-- Persistent beacons and beacons with no end-time are still public-readable
-- (matches the existing render behaviour for the canonical demo beacons).
drop policy if exists "Anyone can view active beacons" on public.beacons;
drop policy if exists beacons_read_active_public on public.beacons;

create policy beacons_read_active_public on public.beacons
  for select
  to anon, authenticated
  using (
    status = 'active'
    and visibility = 'public'
    and (is_persistent = true or ends_at is null or ends_at > now())
  );

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------

-- Drop the redundant duplicate read-all-authed policy.
drop policy if exists profiles_read_all_auth on public.profiles;

-- Future-proof public surface: a vetted column projection for anon-eligible
-- reads (e.g. /u/:slug shareable cards). No email, phone, location, billing.
create or replace view public.public_profiles as
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

-- security_invoker so the view respects the caller's RLS on profiles.
-- Anon currently has no SELECT policy on profiles, so the view returns
-- 0 rows for anon until a follow-up policy explicitly permits it.
-- SAFE default — opt-in over opt-out.
alter view public.public_profiles set (security_invoker = true);
