# Ghosted audit — Boo / Match flow

**Status:** working
**Last verified in production:** 2026-05-20 — static code review (`useTaps.ts`, `L2GhostedPreviewSheet.tsx`, `GhostedCard.tsx`) + DB schema check (`taps` table).
**Evidence:** `taps` table live in prod `rfoftonnlwudilafhfkl` with `from_user_id`, `to_user_id`, `tap_type='boo'`, indexed both directions (`idx_taps_mutual_lookup` / `_reverse`). `sendTap()` inserts a boo; on reciprocal boo it returns `{ sent:true, mutual:true }` and fires the MatchOverlay.

## Behaviour
- Tap "BOO" on a profile → row inserted into `taps` (optimistic UI + rollback on error, `useTaps.ts:158/180`).
- Re-tapping removes the boo (toggle, `useTaps.ts:140-156`).
- Free users capped at 3 boos/day (`L2GhostedPreviewSheet.handleBoo`); premium lifts the cap (capacity only — NOT consent).
- Reciprocal boo → match notification + push to the other user (`useTaps.ts:203-227`).

## Never Silent compliance: **Y (mostly)**
- Confirmed: `toast('Boo sent')` on success; MatchOverlay on mutual.
- Failed: insert error rolls back optimistic state and returns `{sent:false}` — but **no user-facing toast on failure** (silent rollback). Minor gap: a stray failed boo shows nothing. Recommend a `toast.error('Couldn\'t send boo — try again')` on the rollback path.
- Daily-limit: surfaces the premium-gate sheet (clear).
