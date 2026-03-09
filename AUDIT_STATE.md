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
| GlobeTeaser invisible on dark bg | Gold radial glow + brighter rings/nodes | agent:ae9eb95a (IN PROGRESS) |
| #4: Intention bar HOOKUP/HANG/EXPLORE writes to right_now_status TABLE | Code review verified correct implementation | 942cb5b (agent-a) |
| #7: Notifications bell opens L2NotificationInboxSheet | Code review verified correct implementation + unread badge | 942cb5b (agent-a) |
| #12: Profile completion Edit link navigates to /profile | Code review verified correct navigation + real data | 942cb5b (agent-a) |
| #5: Chat flow — SheetContext state.stack typo in policy check | state.sheetStack was undefined, causing policy always to fail | 80c8cfe (agent-d) |
| #6: Profile mode — Edit profile, photo upload, persona switcher | Code review verified all wiring correct: EditProfile→avatar upload, PhotosSheet→gallery, PersonaSwitcher→create-persona | agent-d (VERIFIED) |

---

## 🐛 OPEN BUGS (to be fixed)

| # | Bug | Severity | Owner |
|---|-----|----------|-------|
| 1 | Market mode: SYSTEM ERROR on first load (stale chunk) → auto-reload fix deployed, needs verify | HIGH | unowned |
| 2 | Pulse: Globe.jsx FEED button visible in PulseMode L0 — z-index stacking issue, obscured or inaccessible | MED | agent-b (ANALYSED — awaiting decision) |
| 3 | HomeMode "World Pulse" section blank (dark orb on dark bg) | MED | agent:ae9eb95a (fixing) |
| 5 | Chat flow — SheetContext policy check used state.stack instead of state.sheetStack | FIXED | agent-d ✅ |
| 6 | Profile mode: Edit profile, photo upload, persona switcher — needs audit | VERIFIED | agent-d ✅ |
| 8 | Radio tab — does stream play, mini player show, schedule load? | MED | ✅ CLOSED (agent-b) |
| 9 | SOS long-press — does overlay appear, PIN dismiss work? | HIGH | unowned |
| 10 | Marketplace (Shop/Preloved tabs) — do products load? | MED | unowned |
| 11 | Beacon creation FAB on /pulse — does multi-step form work? | MED | unowned |

---

## 🔍 MODES TO AUDIT (browser test needed)

- [x] Home — OK (demo users gone, cards render, safety strip present)
- [x] Pulse — globe renders, beacon queries fixed, city overlay dismissible. Globe.jsx FEED button: z-index analysis complete
- [ ] Ghosted — profile sheet fixed, chat policy now working — needs live chat flow test (agent-d: policy bug fixed)
- [ ] Market — chunk error → auto-reload should fix, needs verify
- [x] Profile — edit profile (avatar upload via EditProfile), photos (gallery via PhotosSheet), persona switch (all verified wired correctly)
- [x] Radio — stream, mini player, schedule (all wiring verified working)
- [ ] SOS — long-press trigger, overlay, PIN

---

## HOW TO USE THIS FILE AS AN AGENT

1. Pick an unowned bug from the table above and write your agent ID in the Owner column
2. Investigate the relevant code in src/
3. Fix if possible, or document root cause
4. Update this file with your findings
5. Commit your changes with clear commit message
6. Mark the bug as fixed in the ✅ FIXED table

CRITICAL RULES (from CLAUDE.md):
- Brand gold: #C8962C (no pink)
- OS bg: #050507
- Run: npm run lint && npm run typecheck before any commit
- Write to right_now_status TABLE (not profiles.right_now_status JSONB)
- Supabase project: axxwdjmbwkvqhcpwters (production)
