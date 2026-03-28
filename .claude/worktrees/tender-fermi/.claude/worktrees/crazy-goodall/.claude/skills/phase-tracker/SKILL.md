---
name: phase-tracker
description: >
  Tracks progress across the HOTMESS 6-phase product plan with granular task-level detail.
  Cross-references live code and Supabase DB state to report what's done, what's broken,
  and what's next. Use this skill whenever someone asks "where are we", "what's the status",
  "what phase are we in", "what's left", "what's done", "catch me up", "what should I work on",
  "what's blocking", "update the plan", "what shipped", "what's broken", or any variation of
  progress tracking. Also use when starting a new session, when Phil asks for a status update,
  or when deciding what to build next. Even if the user just says "go" with no context, check
  this skill to pick the highest-priority unfinished task.
---

# Phase Tracker — HOTMESS Product Plan v1.0

Source: HOTMESS_PRODUCT_PLAN.docx (24 March 2026)
Repo: SICQR/hotmess-globe @ 81e3ee2
Live DB: klsywpvncqqglhnhrjbh

## Live Snapshot (as of plan creation)

14 real users, 1 tap sent, 0 check-ins, 0 trusted contacts, 4 messages, 3 chat threads
8 approved community posts, 10 ghost profiles (seeded, non-interactive), 10 live presence rows (ghost only)

## Guiding Principles

These govern every decision. If a task conflicts with a principle, the principle wins.

1. **Core loop first.** Go Live → face on grid → tap → mutual → chat. Nothing else matters until this works with real users.
2. **Safety is the product identity, not a feature.** Every decision asks: does this make users feel safer or less safe?
3. **Dead code is a liability.** Every element without a purpose ships confusion.
4. **Brand consistency is a trust signal.** Gold on black — not pink, not purple.
5. **Solve cold start before adding features.** The app needs ~20 real active users to feel alive.

---

## PHASE 0: CRITICAL FIXES (In flight)

Production bugs on the live app. Must land before any other work.

| # | Task | Files | Effort | How to Verify |
|---|------|-------|--------|---------------|
| P0-1 | Ghosted grid — join profiles to presence. Change query: SELECT * → join profiles on user_id. Map display_name, avatar_url, bio, city. Grid renders real face photos with names. | `modes/GhostedMode.tsx`, `features/profilesGrid/ProfilesGrid` | 2h | Open /ghosted — see real photos with names, not blank cards |
| P0-2 | Safety page mobile layout. Remove desktop sidebar wrapper. Use same AppLayout as Ghosted/Music/Market. Add SOS + Fake Call quick-action buttons above tabs. | `pages/Safety.jsx`, `App.jsx` | 1h | Open /safety on mobile — full screen, no sidebar |
| P0-3 | Pulse FAB — colour + position. Purple → #C8962C gold. Position: fixed bottom-24 right-4, z-20. Padding pb-32 on empty state. | `modes/PulseMode.tsx` | 30m | Open /pulse — FAB is gold, bottom-right, not overlapping content |
| P0-4 | Wire dead icons. Shield in Pulse header → navigate("/safety"). SOS button in Ghosted header → navigate("/sos"). | `modes/PulseMode.tsx`, `modes/GhostedMode.tsx` | 20m | Tap shield icon → lands on /safety. Tap SOS → lands on /sos |
| P0-5 | Verify /sos + /fake-call routes. Confirm SOSPage.tsx triggers SOSOverlay. Confirm FakeCallGenerator renders. Visual QA on mobile. | `pages/SOSPage.tsx`, `pages/FakeCallPage.tsx` | 1h | Visit /sos — overlay triggers. Visit /fake-call — renders correctly |

**Done criteria:** Real faces on Ghosted grid, Safety usable on mobile, SOS/fake-call working, Pulse FAB gold.

---

## PHASE 1: CORE LOOP CLOSED (~2 weeks)

Make the product work end to end.

| # | Task | Files | Effort | How to Verify |
|---|------|-------|--------|---------------|
| P1-1 | Migrate Safety.jsx from base44 → Supabase. Replace base44.entities.TrustedContact.* with supabase.from("trusted_contacts"). Replace base44.entities.SafetyCheckIn.* with supabase.from("safety_checkins"). RLS: user_email JWT for checkins/contacts; user_id UUID for incidents. | `pages/Safety.jsx` | 3h | Safety page loads data from Supabase, no base44 calls |
| P1-2 | Wire aftercare nudge trigger. Fire AftercareNudge.jsx 3s after checkOutMutation success + after ChatMeetupPage meetup confirmation. ALL GOOD → dismiss; NEED A MINUTE → resources; GET HELP → /safety. | `pages/Safety.jsx`, `ChatMeetupPage`, `components/safety/AftercareNudge.jsx` | 2h | Check out → 3s later nudge appears with 3 options |
| P1-3 | /care route — build real page. Aftercare resources, breathing link, Samaritans 116 123, community tips. /care and /more/care both route to it. Remove /care → / redirect. | `App.jsx`, `pages/Care.jsx` (create) | 3h | Visit /care — real content page, not redirect |
| P1-4 | Night mode persistence. Move nightMode state to localStorage("hm_night_mode_v1"). Read on HomeMode mount, apply immediately. | `modes/HomeMode.tsx` | 30m | Toggle night mode, navigate away, come back — persisted |
| P1-5 | Email templates rebrand gold. api/email/templates.js: primary #FF1493 → #C8962C, secondary #00D9FF → #050507. supabase/functions/send-email: same. Test welcome email rendering. | `api/email/templates.js`, `supabase/functions/send-email/index.ts` | 1h | Trigger welcome email — arrives gold, not pink |
| P1-6 | Onboarding — trusted contact capture. SafetySeedScreen: prompt for one trusted contact (name + phone/email). "Add contact" → trusted_contacts insert. "Skip for now" → continue. Copy: "We alert this person if you don't come home". | `components/onboarding/screens/SafetySeedScreen.jsx` | 3h | Complete onboarding — trusted_contacts table has a row |
| P1-7 | SOSButton visibility. Change idle state from bg-red-500/20 to visible treatment (full red, lower opacity ring). One-time tooltip: "Hold for SOS". Subtle pulse ring at rest. | `components/sos/SOSButton.jsx` | 2h | SOS button clearly visible, tooltip appears first load |

**Success signal:** 10+ real taps, 5+ trusted contacts added.

---

## PHASE 2: NAVIGATION RETHINK (~1 week)

The nav doesn't match the product. 3 of 5 tabs are social discovery variants. Safety, Vault, Challenges, Leaderboard, and Care have no entry point.

**Current nav:** Home, Pulse, Ghosted, Market, Profile
**Not in nav:** Safety, Vault, Challenges, Leaderboard, Care
**Redirects to /:** /care, /social, /connect, /hnhmess→nowhere

| # | Task | Files | Effort | How to Verify |
|---|------|-------|--------|---------------|
| P2-1 | Replace Profile nav tab with More. Change OSBottomNav tab 5: User icon → Grid icon, /profile → /more. Profile accessible from /more → "My Profile". Notification badge moves with it. | `modes/OSBottomNav.tsx`, `pages/More.jsx` | 2h | Bottom nav shows More tab, tapping opens /more |
| P2-2 | Build /more as proper hub page. Items: Safety (shield, red), Care (heart, gold), Vault (lock), Challenges (bolt), Leaderboard (trophy), My Profile (user), Settings (gear). Each: icon + title + one-line description + contextual badge. Mobile-first, full screen. | `pages/More.jsx` or `modes/MoreMode.tsx` (create) | 4h | /more shows all 7 items with icons and badges |
| P2-3 | Safety badge in /more. "SET UP" badge if 0 trusted contacts. "ACTIVE" badge if check-in running. Safety is item 1, always. | `pages/More.jsx`, `hooks/useSafety.js` | 2h | /more shows Safety first with correct badge |

**Success signal:** Safety setup rate >30% new users.

---

## PHASE 3: COLD START & GROWTH (~2 weeks)

14 real users, 1 tap. Cold start is a product problem.

| # | Task | Files | Effort | How to Verify |
|---|------|-------|--------|---------------|
| P3-1 | Invite mechanic. "Invite a friend" card in Ghosted when <5 real users nearby. Tap → native share: "I'm on HOTMESS — meet me tonight [link]". Deep link: hotmessldn.com?invite=CODE → stores referrer in profiles. | `modes/GhostedMode.tsx`, profiles table (add referred_by) | 4h | Ghosted shows invite card, share works, referral stored |
| P3-2 | "What now?" post-onboarding screen. After onboarding: 3 specific actions. 1) Share your vibe → Go Live. 2) Find tonight's events → /pulse. 3) Set up safety → /safety. | `components/onboarding/screens/WelcomeTour.jsx` | 3h | After onboarding → screen with 3 action buttons |
| P3-3 | Ghost profiles — honest empty state. Replace non-interactive ghost faces with honest empty state. Option A: "Be the first in your area" + invite CTA. Option B: keep ghost grid with "Ghost" label. **Decision required from Phil.** | `modes/GhostedMode.tsx`, `features/profilesGrid/ProfilesGrid` | 2h | Ghosted empty state is honest, not fake |
| P3-4 | Day 2 safety setup push. 24h after signup: push "Set up your safety check-in before you go out tonight". Only if trusted_contacts count = 0. Tap → /safety. Uses notification_outbox + dispatch cron. | `api/notifications/dispatch.js`, notification_outbox | 2h | 24h after signup → push received → taps to /safety |
| P3-5 | Revenue products — deploy NOW. Samui Promoter booking page → hotmessldn.com/samui. DJ Bookability Scorecard → deploy. Nightlife Promoter Starter Kit (£27) → activate Gumroad. All 3 are built. **Owner: Phil.** | `DEPLOY.sh`, Gumroad listings | 2h | All 3 products live and purchasable |

**Success signal:** 20 real weekly active users.

---

## PHASE 4: SURFACE BUILT FEATURES (~1 week)

Vault, Challenges, Leaderboard are fully built. Users can't discover them.

| # | Task | Files | Effort | How to Verify |
|---|------|-------|--------|---------------|
| P4-1 | Leaderboard on Home. Add section below Radio banner on HomeMode. Top 3: avatar + name + XP + badge. "See full leaderboard →" → /leaderboard. Weekly ranking. | `modes/HomeMode.tsx` | 2h | HomeMode shows leaderboard section |
| P4-2 | Daily challenge badge on Home. Badge next to notification bell in Home top bar. Tap → /more/challenges. Shows: active challenge name + XP reward + completion status. | `modes/HomeMode.tsx`, `pages/More.jsx` | 3h | Home top bar has challenge badge, tapping opens challenges |
| P4-3 | Vault entry points. MusicTab: "Unlock exclusive tracks → Vault" teaser for non-members. /more: Vault listed as "Exclusive content". | `components/music/MusicTab.jsx` | 2h | Vault accessible from MusicTab and /more |
| P4-4 | Personas — wire or hide. Active persona should filter Ghosted lane + Right Now preset. Until wired: hide PersonaSwitcherSheet from long-press. **Decision required from Phil.** | `modes/OSBottomNav.tsx`, `contexts/PersonaContext.tsx` | 4h | Either personas filter grid, or switcher is hidden |

**Success signal:** Challenge completion rate >0%.

---

## PHASE 5: MUSIC + RADIO UNIFIED (~3 days)

Two siloed experiences for the same content.

| # | Task | Files | Effort | How to Verify |
|---|------|-------|--------|---------------|
| P5-1 | Contextual links Music↔Radio. In /music: "Listen Live →" banner when show active → /radio. In /radio: "Releases →" → /music. Schedule shows which artists/tracks are in /music library. | `components/music/MusicTab.jsx`, `modes/RadioMode.tsx` | 4h | Can navigate Music→Radio and Radio→Music |
| P5-2 | Merge mini players into one. RadioMiniPlayer + MusicMiniPlayer → single unified player. Shows whatever is playing. Tap expands to full player contextually. | `App.jsx`, `components/radio/RadioMiniPlayer.jsx`, `components/music/MusicMiniPlayer.jsx` | 4h | Only one mini player visible at any time |

**Success signal:** Users navigating Music→Radio.

---

## PHASE 6: TECHNICAL DEBT

| # | Task | Files | Effort | How to Verify |
|---|------|-------|--------|---------------|
| P6-1 | Full base44 removal. Audit all base44.entities.* and base44.integrations.* calls. Known: Safety.jsx (P1-1), PanicButton.jsx (SendEmail). Replace with Supabase direct + /api/safety/alert. Target: zero base44 in user-facing paths. | All files using `base44Client.ts` | 4h | `grep -r "base44" src/` returns nothing |
| P6-2 | Dead routes cleanup. Remove /social → /. /connect → remove. Keep /globe → /pulse. Examples/* → dev only. Decide /hnhmess. | `App.jsx` | 2h | No redirect routes in production |
| P6-3 | Sheet naming: "ghosted" → "right-now". Update SHEET_REGISTRY + all openSheet("ghosted") calls. Ghosted = grid. Right Now = Go Live status. | `lib/sheetSystem.ts`, `modes/HomeMode.tsx`, `modes/GhostedMode.tsx` | 1h | Sheet uses "right-now" key |
| P6-4 | v2/* routes — graduate or delete. /v2/home, /v2/profile, /v2/market, /v2/map. **Decision: Phil recommends delete.** | `App.jsx`, `pages/HomePage.jsx`, `pages/ProfilePage.jsx`, `pages/MarketPage.jsx`, `pages/MapPage.jsx` | 1h | No /v2/* routes exist |

**Success signal:** Zero base44 in production.

---

## DECISIONS REQUIRED FROM PHIL

These cannot be executed without Phil's call. They are product strategy questions.

| # | Decision | Recommendation | Phase |
|---|----------|----------------|-------|
| 1 | Ghost profiles: honest empty state, ghost label, or team-staffed demo profiles? | Honest empty state + invite mechanic | P3 |
| 2 | /care — build it or cut it from brand? | Build it. 4 hours. It is the differentiator. | P1 |
| 3 | Nav: Profile tab → More tab? | Do it now. 14 users. No better time. | P2 |
| 4 | Personas: wire them to filter experience, or hide switcher? | Hide switcher until wired. | P4 |
| 5 | v2/* routes: graduate or delete? | Delete. They are noise. | P6 |

---

## TIMELINE

| Phase | Timeframe | Focus | Success Signal |
|-------|-----------|-------|----------------|
| 0 — Fixes | Now | Grid, Safety layout, SOS/Fake Call, Pulse FAB | Real faces on Ghosted |
| 1 — Core loop | Week 1–2 | base44→Supabase, aftercare, SOS visible, /care, safety onboarding | 10+ real taps, 5+ trusted contacts |
| 2 — Nav | Week 2–3 | Profile→More tab, /more hub, Safety surfaced | Safety setup rate >30% |
| 3 — Cold start | Week 3–4 | Invite mechanic, nudges, honest ghosts, revenue | 20 real WAU |
| 4 — Surface | Week 4–5 | Leaderboard+Challenges on Home, Vault entry, Personas | Challenge completion >0% |
| 5 — Music | Week 5 | Radio+Music linked, single mini player | Users navigating Music→Radio |
| 6 — Debt | Week 6 | base44 removed, dead routes, v2 resolved | Zero base44 in production |

---

## WHAT GOOD LOOKS LIKE (End of Plan)

A new user opening the app should see these within 3 minutes:

1. Real faces on the grid (Go to Ghosted → actual people with names, photos, distance)
2. Safety is immediately obvious (SOS visible, /more shows Safety first, trusted contact added in onboarding)
3. Core loop works (Go Live → tapped → tap back → chat opens, with real users)
4. Every button does something (no dead icons, no /care → /, no shield→nowhere)
5. Emails match the app (welcome email gold, not pink)
6. Safety system is used (20%+ users have a trusted contact)
7. Revenue is active (Gumroad live, Samui deployed, first sale made)

---

## How to Run a Status Check

### 1. Check the code

```bash
cd /path/to/hotmess-globe
git log --oneline -20                    # What changed recently?
grep -r "base44" src/ --include="*.tsx" --include="*.jsx" --include="*.ts" | wc -l  # base44 calls remaining
wc -l src/modes/GhostedMode.tsx          # Is grid non-trivial?
ls src/pages/Care.jsx 2>/dev/null        # Does /care page exist?
ls src/pages/More.jsx src/modes/MoreMode.tsx 2>/dev/null  # Does /more page exist?
```

### 2. Check the database

Use Supabase MCP:
- `execute_sql`: `SELECT COUNT(*) FROM profiles WHERE onboarding_completed = true`
- `execute_sql`: `SELECT COUNT(*) FROM trusted_contacts`
- `execute_sql`: `SELECT COUNT(*) FROM taps`
- `execute_sql`: `SELECT COUNT(*) FROM messages`

### 3. Check deployments

Use Vercel MCP:
- `list_deployments` — recent deploy status
- `get_runtime_logs` — any errors in production

### 4. Report

Use this format — tight, honest, no fluff:

```
PHASE [N]: [Name] — [STATUS]

Done:
- P[N]-[X]: [task] (verified: [how])

Not done:
- P[N]-[X]: [task] (reason / blocker)

Broken:
- P[N]-[X]: [what's wrong] → [fix]

Decisions pending:
- [decision] (recommendation: [X])
```

Status values: COMPLETE, IN PROGRESS, NOT STARTED, BLOCKED
