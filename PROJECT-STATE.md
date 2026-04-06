# PROJECT-STATE.md

**Last updated:** 2026-04-06
**Current main:** `d41348e`
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
| Photo moderation pipeline | DONE | Trust-first: uploads approved by default, report/flag as safety net, RLS enforced, API filtered |
| Push notification display | DONE | SW handler present, suppression logic, notificationclick focus |
| Presence privacy audit | DONE | 3dp rounding in all APIs, RLS on user_presence, SOS uses raw precision |
| Music/Radio dedup | DONE | Single-surface rule: Radio=broadcast, Music=releases+events |
| HNH MESS page | DONE | Meaning first, product second, CTA third |
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
| T-11 | `1294d67` | Photo moderation truth pass — trust-first default, RLS policy fix, API filter, column bug fix |
| T-12 | `1294d67` | Push notification QA — widened SW suppression (boo/match on /ghosted), notificationclick focus |
| T-13 | `1294d67` | Presence privacy — 3dp GPS rounding in match-probability API, RLS verified |
| T-14 | `f0a939f` | Music/Radio dedup — single-surface rule enforced, cross-domain content removed |
| T-15 | `d41348e` | HNH MESS page — meaning first, product second, CTA third restructure |

---

## Next tickets

All 15 tickets from the initial launch-hardening pass are complete. Next priorities:

1. Real device push notification QA (Chrome mobile, Safari PWA, Android) — manual testing
2. Stripe Connect onboarding — blocked on Phil/dashboard
3. P0/P1 items from plan (missing RPCs, beacon cron, OAuth crash, etc.)
4. Home screen tidy + empty state handling
5. Globe merge (claude/gracious-jones branch)

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
