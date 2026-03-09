# HOTMESS Live Audit State — 2026-03-09

This file is the shared coordination point for the audit swarm.
Each agent READS this before starting and WRITES its findings back.

---

## ✅ FIXED (this session)

| Bug | Fix | Commit |
|-----|-----|--------|
| L2ProfileSheet always loaded own profile when opened with `id` prop | Added `id` prop, resolved as `resolvedUid` | ed5fdab |
| PulseMode beacon queries failing — `venue_address` column doesn't exist | Removed from all 3 SELECT strings | c8658b2 |
| ErrorBoundary showed SYSTEM ERROR on chunk load failure (stale cache after deploy) | Auto-reload once on chunk errors | 11cb6be |
| LIVE CITY DATA overlay had no dismiss button | Added X button + `onDismiss` prop wired from Globe.jsx | 3bff86d |
| demo1/demo2 seed rows in right_now_status | Deleted via Supabase admin API | DB only |
| QA test auth accounts (qa-test-march9b, qa-audit-9march, hmdemo) | Deleted via Supabase admin API | DB only |
| GlobeTeaser invisible on dark bg | Gold radial glow + brighter rings/nodes | agent:ae9eb95a |
| Market import path wrong (@/lib/data → @/lib/data/market) | Fixed import | aeb46a8 |
| Market handleProductTap passed { productId } but sheet expects { product } | Fixed prop shape | aeb46a8 |
| SheetContext canOpenSheet() used state.stack (undefined) — chat blocked everywhere | Fixed typo → state.sheetStack | 80c8cfe |

---

## ✅ VERIFIED CORRECT (no changes needed)

| Area | Verified by | Notes |
|------|-------------|-------|
| Intention bar → right_now_status TABLE | Agent A | RightNowModal upserts to correct table |
| Notifications bell → L2NotificationInboxSheet | Agent A | openSheet('notification-inbox') wired + registered |
| Profile completion card Edit link | Agent A | Navigates to /profile, real completion % |
| Radio stream + mini player + schedule | Agent B | Stream URL correct, MiniPlayer z-40, L2ScheduleSheet registered |
| Beacon creation FAB | Agent C | Multi-step form, correct Supabase INSERT |
| Profile mode all 18 items | Agent D | Edit, photos, persona, earnings all wired |
| SOS system end-to-end | Agent E | All 19 checks pass — production ready |

---

## 🔶 NEEDS PHIL DECISION

| # | Issue | Options |
|---|-------|---------|
| 2 | Globe.jsx FEED button obscured on /pulse due to z-index stacking | A) Hide on /pulse (recommended) · B) Move to PulseMode HUD · C) Add z-10 to PulseMode |

---

## 🔍 MODES STATUS

- [x] Home — clean, intention bar correct, notifications wired
- [x] Pulse — beacon queries fixed, city overlay dismissible, GlobeTeaser visible
- [x] Ghosted — profile sheet fixed, chat policy typo FIXED (80c8cfe)
- [x] Market — two bugs FIXED (aeb46a8)
- [x] Profile — all 18 menu items verified, photos, persona switcher OK
- [x] Radio — stream, mini player, schedule all correct
- [x] SOS — full 19-point pass, all safety features production-ready

---

## Swarm agent files
See .swarm/ folder for individual agent findings.
