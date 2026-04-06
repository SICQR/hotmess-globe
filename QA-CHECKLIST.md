# Real-Device QA Checklist

**Baseline:** `456e0e5`
**Date:** 2026-04-06
**Target:** hotmessldn.com (production)
**Question:** Can a real user trust this enough to use it tonight?

---

## Automated QA Results (Claude, 2026-04-06)

### API + Infrastructure: 14/14 PASS

| # | Test | Result | Detail |
|---|------|--------|--------|
| 1 | Homepage loads | PASS | 200, 1.0s, 2915 bytes |
| 2 | Profiles API | PASS | 6 profiles returned |
| 3 | Profile detail API | PASS | 200 |
| 4 | Shopify products API | PASS | 3 products |
| 5 | Globe pulse (no auth) | PASS | 401 (correct) |
| 6 | Match probability (no auth) | PASS | 401 (correct) |
| 7 | Events cron (no auth) | PASS | 401 (correct) |
| 8 | manifest.json | PASS | 200 |
| 9 | sw.js | PASS | 200 |
| 10 | HSTS header | PASS | max-age=31536000 |
| 11 | GPS coord precision | PASS | 4 decimals (51.5074) |
| 12 | Profiles with photos | PASS | No null URLs |
| 13 | CSP header | PASS | Present |
| 14 | www redirect | PASS | 301 to apex |

### Data Quality: 4/4 PASS

| # | Test | Result | Detail |
|---|------|--------|--------|
| 1 | No email leaks in profiles API | PASS | Zero @ symbols in response |
| 2 | No email leaks in profile detail | PASS | Zero @ symbols |
| 3 | GPS rounded in all responses | PASS | Max 4 decimal places |
| 4 | All photo URLs valid | PASS | No null/empty URLs |

### Browser QA (dev server, mobile 375x812): 5/5 PASS

| # | Test | Result | Detail |
|---|------|--------|--------|
| 1 | Splash screen renders | PASS | Wordmark, gold shimmer, JOIN + Sign In |
| 2 | Mobile layout | PASS | Centered, no overflow, CTAs within viewport |
| 3 | Boot guard blocks unauthed routes | PASS | /ghosted, /radio, /hnhmess all redirect to splash |
| 4 | No JS errors | PASS | Only React dev-mode CSS animation warning (cosmetic) |
| 5 | No failed network requests | PASS | Zero 4xx/5xx on load |

### SOFT: 1 cosmetic issue

| # | What | Severity | Detail |
|---|------|----------|--------|
| S1 | HotmessWordmark animation CSS warning | Low | React dev-mode only. `animation` and `animationDelay` shorthand conflict. Does not affect prod build or visual output. |

---

## What I CANNOT test (needs Phil on real device)

These require a logged-in session on a physical device:

### Must test on phone

| # | Test | Why I can't |
|---|------|-------------|
| 1 | **Sign up with email + magic link** | Needs real email inbox |
| 2 | **Onboarding flow (all 7 steps)** | Needs auth session |
| 3 | **Profile photo upload** | Needs camera roll / file picker |
| 4 | **Ghosted grid with real data** | Needs auth to see past boot guard |
| 5 | **Boo / Boo back / Match overlay** | Needs two logged-in users |
| 6 | **Chat send + receive** | Needs two logged-in users |
| 7 | **Chat image upload** | Needs auth + file picker |
| 8 | **Meet prefill** | Needs active chat thread |
| 9 | **Push notifications (receive + tap)** | Needs real browser push API |
| 10 | **Push suppression (in-thread)** | Needs two devices |
| 11 | **SOS push to trusted contacts** | Needs auth + trusted contacts set |
| 12 | **Radio play + mini player persistence** | Needs auth (boot guard blocks) |
| 13 | **Market checkout via Stripe** | Needs auth + Stripe test mode |
| 14 | **Presence heartbeat (online/offline)** | Needs auth + location permission |
| 15 | **PWA install + home screen launch** | Needs Safari/Chrome on phone |
| 16 | **Back button closes sheets** | Needs auth + sheet navigation |

---

## How to run the manual tests

1. Open **hotmessldn.com** on your phone (Safari or Chrome)
2. Tap **Join** — enter your email
3. Check inbox for magic link — tap it
4. Complete onboarding (name, photo, vibe, safety, location)
5. You're on the Ghosted grid — run tests 3-16 above
6. For two-user tests (5, 6, 10): use a second device or incognito

Mark each PASS / FAIL / SOFT. Come back with the fails.

---

## Go / No-Go summary

**Automated FAIL count:** 0
**Automated SOFT count:** 1 (cosmetic, no user impact)
**Manual tests remaining:** 16

### Decision

- [ ] GO — ship it (after manual tests pass)
- [ ] NO-GO — fix fails first, re-test
