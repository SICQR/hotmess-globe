# Ghosted audit — Mutual unlock

**Status:** working
**Last verified in production:** 2026-05-20 — code review + RLS verification on prod.
**Evidence:** `has_mutual_boo(uuid,uuid)` SQL helper live in prod; `isMutualBoo()` client helper (`useTaps.ts:107-115`) checks both directions. UI gate in `L2GhostedPreviewSheet.tsx` (`canInteract = isMutualBoo(uid)`).

## Behaviour
- `canInteract` is the single gate for Message / Meet / Uber / Share Location / Suggest Stop.
- Pre-mutual sheet shows ONLY Boo / Save / Block / Share + microcopy "Boo each other first to unlock chat and location tools."
- Post-mutual sheet swaps in the comms/location row + banner "MUTUAL BOO — CHAT & SAFETY TOOLS UNLOCKED."
- Premium does NOT bypass (verified — premium escape valve removed in PR #281).
- Server-side: `chat_threads`/`chat_messages`/`conversations`/`messages`/`conversation_members` INSERT all require mutual via RLS (PR #282 + canonical migration).

## Never Silent compliance: **Y**
- Pre-mutual: explicit locked-state microcopy + telemetry log to `consent_blocks` on every blocked attempt (`logConsentBlock`).
- Post-mutual: explicit unlocked banner.
- No invisible states — every gated action resolves to a toast + telemetry row.
