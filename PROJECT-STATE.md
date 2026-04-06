# PROJECT-STATE.md

**Last updated:** 2026-04-06
**Current main:** `c222497`
**Handover baseline:** `003ecfa`
**Docs:** HANDOVER.md v2.1, LAUNCH-BLOCKERS.md, FIRST-10-TICKETS.md

---

## Mode

**Launch-hardening + trust-completion.**

The platform has a working core loop:

```
Home → Pulse → Ghosted → Boo → Match → Chat → Meet → IRL
```

Remaining work is launch blockers, trust hardening, moderation, privacy, and operational cleanup. Not broad product building.

---

## Launch blockers

| Blocker | Status | Notes |
|---------|--------|-------|
| Photo moderation pipeline | PARTIAL | Migration applied, pending/approved model exists, full server-side review workflow still missing |
| Push notification display | DONE / verify in-browser | SW handler present; needs real device confirmation |
| Presence privacy audit | PARTIAL | Rounding and RLS addressed, needs final verification against public-facing APIs |
| Stripe Connect onboarding | BLOCKED (manual) | Phil/dashboard action required |
| Legacy radio removal | DONE | Old shell system removed/replaced |

---

## Completed tickets (since baseline `003ecfa`)

| Ticket | Commit | Summary |
|--------|--------|---------|
| T-01 | pre-baseline | Push notification display — SW handler already present |
| T-02 | `d58fdec` | Photo moderation migration applied to prod |
| T-03 | `d58fdec` | Presence privacy rounding + user_presence RLS |
| T-04 | `27842cd` | Legacy radio removal — unified on RadioContext.tsx |
| T-05 | `27842cd` | base44Client.js deleted |
| T-06 | `819c674` | Taps migrated from email FK to UUID FK (10 files + migration) |
| T-07 | `af4fcf1` | Report photo targets specific photo + flags via RLS |
| T-08 | `9f31799` | 30 London seed profiles with presence + photos in prod |
| T-09 | — | Env var audit — no missing-env crashes, CRON_SECRET still 401 |
| T-10 | `c222497` | profile_overrides table created with correct profiles FK + RLS |

---

## Next 5 tickets

### T-11 — Final photo moderation truth pass

- Verify owner sees pending, others see approved only, rejected clears cleanly
- No broken media shells
- Manual moderation workflow documented
- **AC:** Real upload tested end-to-end on prod/dev accounts

### T-12 — Real device push notification QA

- Chrome mobile, Safari iOS/PWA, Android Chrome
- Tap-through deep linking
- Focused-thread suppression behavior
- **AC:** User receives and opens push in real browser conditions

### T-13 — Final presence privacy verification

- No exact coords exposed to other users
- Verify API payloads, movement/public presence behavior, logout/background cleanup
- **AC:** Privacy-safe by code and observed UX

### T-14 — Music / Radio dedup cleanup

- Radio = live broadcast only, Music = release library only
- Remove duplicate now-playing/archive/release truths
- **AC:** One audio truth per surface

### T-15 — HNH MESS page final conversion pass

- Top hero, human image, stigma-smashing blurb, product/CTA hierarchy
- **AC:** Meaning first, product second, CTA third

---

## Do not start yet

- New AI feature work
- New premium feature families
- New tabs / new modes
- Large redesigns
- New commerce systems
- Admin overbuild

---

## Working mode

- One targeted ticket at a time
- Verify against live behavior
- Keep docs aligned with current SHA
- Claude Code = implementation engine
- Human lead = product truth / release authority
