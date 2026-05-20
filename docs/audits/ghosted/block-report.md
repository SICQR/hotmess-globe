# Ghosted audit — Block / Report

**Status:** working (block) / unverified (report end-to-end)
**Last verified in production:** 2026-05-20 — code review.
**Evidence:** `handleBlock` in `L2GhostedPreviewSheet.tsx` inserts into `blocks` (`blocker_id`, `blocked_id`) and closes the sheet. `useGhostedGrid.ts` filters blocked IDs out of the nearby/live/recent grids (`ghosted-blocked` query, `blockedIds` set applied in all three card transforms).

## Behaviour
- Block: one tap → `blocks` row → grid immediately excludes the user on next fetch → sheet closes with `toast('User blocked')`.
- Report: present in the broader UI (report flows exist in `src/lib/reportListing.ts` and moderation surfaces) but the Ghosted-profile-sheet report path was not exercised in this audit.

## Never Silent compliance: **Y (block) / partial (report)**
- Block: confirms with toast; failure path falls through to a toast as well (`catch { toast('Failed to block') }`).
- Report: needs an explicit confirmed/failed state check in a dedicated pass — marked unverified.

## Recommendation
Verify the report path end-to-end (submit → moderation row → user-facing confirmation) in a follow-up. Not a launch blocker for founding emails (block works; report has fallbacks elsewhere).
