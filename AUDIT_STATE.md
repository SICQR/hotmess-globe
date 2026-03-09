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

---

## 🐛 OPEN BUGS (to be fixed)

| # | Bug | Severity | Owner |
|---|-----|----------|-------|
| 1 | Market mode: SYSTEM ERROR on first load (stale chunk) → auto-reload fix deployed, needs verify | HIGH | unowned |
| 2 | Pulse: Globe.jsx FEED button visible in PulseMode L0 — should not be interactive / may confuse users | MED | unowned |
| 3 | HomeMode "World Pulse" section blank (dark orb on dark bg) | MED | agent:ae9eb95a (fixing) |
| 5 | Chat flow — L2ChatSheet load after profile sheet fix (needs live test) | HIGH | unowned |
| 6 | Profile mode: Edit profile, photo upload, persona switcher — needs audit | MED | unowned |
| 8 | Radio tab — does stream play, mini player show, schedule load? | MED | unowned |
| 9 | SOS long-press — does overlay appear, PIN dismiss work? | HIGH | unowned |
| 10 | Marketplace (Shop/Preloved tabs) — do products load? | MED | unowned |
| 11 | Beacon creation FAB on /pulse — does multi-step form work? | MED | unowned |

---

## 🔍 MODES TO AUDIT (browser test needed)

- [x] Home — OK (demo users gone, cards render, safety strip present)
- [ ] Pulse — globe renders, beacon queries fixed, city overlay dismissible — needs re-verify
- [ ] Ghosted — profile sheet fixed — needs chat flow test
- [ ] Market — chunk error → auto-reload should fix, needs verify
- [ ] Profile — edit profile, photos, persona switch
- [ ] Radio — stream, mini player, schedule
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
