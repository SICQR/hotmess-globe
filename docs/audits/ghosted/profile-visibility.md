# Ghosted audit — Profile visibility

**Status:** working
**Last verified in production:** 2026-05-20 — code review (`useGhostedGrid.ts`) + `/api/profiles` ghost-filter.
**Evidence:** Grid queries exclude (1) blocked users, (2) invisible users (`user_privacy_settings.visibility = 'invisible'`), (3) ghost/test accounts (`@hotmess.app`, `@hotmess.test`, `demo_`, `admin_`, `e2e_` prefixes) — filter mirrored in both `useGhostedGrid.ts` and `/api/profiles.js`.

## Behaviour
- Nearby/live/recent grids only surface profiles with a `display_name` set and not on the exclusion lists.
- Ghost-account filter prevents internal/test profiles leaking onto the public grid (DO/DON'T rule in CLAUDE.md).
- Discreet Mode (`useDiscreetMode`) lets a user reduce their own discoverability (localStorage-backed, storage-event synced).

## Never Silent compliance: **Y**
- Visibility is a steady-state filter, not an action. A user toggling Discreet Mode gets immediate UI reflection.
- One watch item: if a profile is hidden by privacy settings, the owner has no in-grid indicator that they're invisible to others — consider a "You're in Discreet Mode" persistent chip (already partially present via the Safety hub). Not a blocker.
