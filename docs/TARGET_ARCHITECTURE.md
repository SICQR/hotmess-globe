# HOTMESS — Target Architecture
**Generated:** 2026-02-26

---

## VERDICT: STAY THE COURSE

The current architecture is correct. This is not a restructure — it's a consolidation and completion plan.

**Current:** `hotmess-globe` → Vite + React + TypeScript + Supabase + Vercel
**Target:** Same stack, fully completed, with cleaned infrastructure

No monorepo. No Next.js migration. No architectural pivot. The existing ring model, sheet system, and OS architecture are production-grade and should be maintained.

---

## CURRENT ARCHITECTURE (Ring Model)

```
┌──────────────────────────────────────────────────────────────────┐
│ RING 4: FEATURE MODULES                                           │
│  Globe · Radio · Safety · Social · Market · Profiles · Events     │
│  (lazy-loaded, route-gated, sheet-based)                          │
├──────────────────────────────────────────────────────────────────┤
│ RING 3: NAVIGATION                                                │
│  React Router (sole URL authority)                                │
│  OSBottomNav (5 tabs + Radio mini-player)                        │
├──────────────────────────────────────────────────────────────────┤
│ RING 2: WINDOW MANAGER                                            │
│  SheetProvider + SheetRouter (LIFO stack, Z-100/150)             │
│  36+ L2 sheets, sheetPolicy.ts for access control               │
├──────────────────────────────────────────────────────────────────┤
│ RING 1: SERVICES                                                  │
│  Auth (Supabase) · Realtime · Storage · Cache (TanStack Query)   │
│  Push Notifications · Sentry · Analytics                         │
├──────────────────────────────────────────────────────────────────┤
│ RING 0: RUNTIME                                                   │
│  Boot FSM (BootGuardContext) · Error Boundaries · Sentry         │
│  PinLock · SOS System (Z-190/200)                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## TARGET STATE: COMPLETION MILESTONES

### Milestone 1: Legal & Compliance (URGENT — required for app store)
- Add `/about`, `/accessibility`, `/legal`, `/privacy`, `/affiliate` routes
- Add GDPR CookieBanner component
- Add SoundConsentModal for radio autoplay
- These are table-stakes for any UK product

### Milestone 2: Revenue Activation
- Build creator subscription UI (table + Stripe already wired)
- Build amplification pricing UI (`get_amplification_price()` RPC live)
- Wire up `creator_subscriptions` to ProfileMode and creator profiles

### Milestone 3: Social Completion
- Build community posts feed in HomeMode (table live)
- Build achievements display in ProfileMode (table live)
- Build venue kings / check-in leaderboard (tables live)

### Milestone 4: Radio Enhancement
- Add `NowNextCard` to radio mini-player and radio mode
- Add `SoundConsentModal` for browser autoplay compliance
- Add `QualityPopover` for stream quality selection
- Add show reminders via push notifications

### Milestone 5: Persona System Completion
- Scope chat threads to active persona (persona-bound conversations)
- Add visual skin variants per persona type (Travel Skin, etc.)
- Auto-switch persona based on GPS location (geo-trigger)

### Milestone 6: Branch & Infrastructure Cleanup
- Delete all `copilot/*` and `cursor/*` remote branches (80+)
- Resolve PR #113 (figma-make-v2 merge blocker)
- Close PR #81 (temp/no-gate-test — security risk)
- Clean Vercel env vars (remove 5 dead vars, add missing Preview/Dev vars)
- Rotate POSTGRES credentials (were in git history)

---

## DEPLOYMENT TARGETS

| Environment | Trigger | URL |
|-------------|---------|-----|
| Production | Push to `main` | hotmessldn.com + hotmess.app |
| Preview | Push to any branch | hotmess-globe-*.vercel.app |
| Local dev | `npm run dev -- --host` | localhost:5173 |

No staging environment currently exists. Recommendation: Create a `staging` branch that auto-deploys to `staging.hotmessldn.com`. Currently using Preview deployments for this purpose.

---

## RECOMMENDED STAGING SETUP

```bash
# Create staging branch
git checkout -b staging main
git push origin staging

# In Vercel dashboard:
# - Set staging branch to deploy to staging.hotmessldn.com
# - Keep main → hotmessldn.com

# Workflow:
# feature-branch → staging (validate) → main (production)
```

---

## NON-GOALS (what to NOT do)

| What | Why Not |
|------|---------|
| Migrate to Next.js | PWA + Vite is working in production; Next.js adds SSR complexity that doesn't benefit this app |
| Monorepo | One app, no need for monorepo overhead |
| Microservices | Vercel serverless handles all API needs |
| Rewrite routing | React Router is working; don't touch it |
| Add new auth providers | Supabase + Telegram + Google is sufficient |
| Self-host Supabase | Managed Supabase is fine at this scale |
| Move off Vercel | No reason to; it's the right deployment platform |

---

## TECH DEBT PAYOFF PLAN

### P0 (Before app store submission)
- Legal pages
- GDPR banner
- Profile_overrides RLS FK fix
- Rotate Postgres credentials

### P1 (Next 2 weeks)
- Creator subscriptions UI
- Community posts feed
- Achievements UI
- Branch cleanup (80+ stale remote branches)
- Vercel env cleanup

### P2 (Next month)
- Persona-bound chat
- Radio enhancements (NowNextCard, SoundConsentModal)
- Venue kings + check-in leaderboard
- Squads UI
- PR queue cleanup (#113)

### P3 (Backlog)
- Auto skin switch
- AIConcierge
- Biometric checkout integration
- Full-screen fake call overlay
- Group chat backend
