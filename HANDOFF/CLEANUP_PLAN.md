# Cleanup Plan

**Goal**: Take the existing codebase from 70% of everything to 100% of MVP

---

## Phase 1: Unblock (Day 1)

### 1.1 Fix CI/CD
- [ ] Fix lint errors blocking builds
- [ ] Run `npm run lint -- --fix`
- [ ] Manually fix remaining issues
- [ ] Verify `npm run build` passes

### 1.2 Close PRs
- [ ] Close all 23 open PRs
- [ ] Start fresh from main branch
- [ ] No more PR debt

### 1.3 Fix Critical Bugs
- [ ] CityPulseBar infinite re-render
- [ ] Any other blocking issues

**Result**: Clean main branch that builds and deploys.

---

## Phase 2: Cut the Fat (Day 2-3)

### 2.1 Remove Stub Pages
Pages that are empty or placeholder — delete them:
```
/RadioFeatures
/LuxShowcase
/Features
/PersonaFeatures
/EventsFeatures
/SocialFeatures
/SafetyFeatures
/TicketMarketplace
/SquadChat
/RightNowDashboard
/BusinessAmplify
/BusinessInsights
/RecordManager
```

### 2.2 Consolidate Duplicate Pages
```
/biz/dashboard + /BusinessDashboard → one page
/creator/dashboard + /CreatorDashboard → one page
Multiple ticket pages → one flow
```

### 2.3 Archive Old Docs
Move 90% of markdown files to `/archive/`:
- Keep: README.md, PRODUCT_QUESTIONNAIRE.md, WHATS_BUILT.md
- Archive: Everything else

### 2.4 Remove Unused Components
Audit `/src/components/` — if it's not imported anywhere, delete it.

**Result**: Leaner codebase, fewer distractions.

---

## Phase 3: Focus the Product (Day 4-5)

### 3.1 Radio-First Homepage
Current: Globe with lots of UI around it
Target: Radio playing, globe showing energy, tonight's beacons

Changes:
- [ ] Radio player more prominent (not hidden in nav)
- [ ] "What's on now" visible immediately
- [ ] Tonight's beacons visible on globe
- [ ] Simplify surrounding UI

### 3.2 Navigation Reorder
Current: HOME • PULSE • EVENTS • MARKET • SOCIAL • MUSIC • MORE
Target: RADIO • TONIGHT • GLOBE • SHOP • GHOSTED • MORE

Or simpler:
- Radio (home)
- Tonight (beacons/events)
- GHOSTED (social/discovery grid — secondary, not the lead)
- Shop
- More (settings, safety, profile)

### 3.3 Care Visibility
- [ ] Safety/Care accessible from every page (1 tap)
- [ ] "You good?" prompts after intensity
- [ ] Aftercare nudge in morning

**Result**: Product feels like the questionnaire describes.

---

## Phase 4: Wire the Money (Day 6-7)

### 4.1 Stripe Integration
- [ ] Connect MembershipUpgrade to Stripe Checkout
- [ ] Test subscription flow end-to-end
- [ ] Webhook handling for subscription changes

### 4.2 Shopify Checkout
- [ ] Verify cart → checkout → Shopify flow works
- [ ] Test purchase end-to-end

### 4.3 Pricing Page
- [ ] Clean up /Pricing page
- [ ] Show tiers clearly: Free / £4.99 / £14.99

**Result**: Can actually make money.

---

## Phase 5: Polish (Day 8-10)

### 5.1 Consistency Pass
- [ ] All buttons use design system variants
- [ ] All cards use consistent styling
- [ ] No random one-off styles

### 5.2 Loading States
- [ ] Skeletons for all data-loading components
- [ ] No jarring content jumps

### 5.3 Error States
- [ ] Error boundaries on all pages
- [ ] Graceful failures, not crashes

### 5.4 Mobile Polish
- [ ] Test every page on mobile
- [ ] Fix any layout breaks

**Result**: Feels finished, not half-baked.

---

## What Gets Cut

These features wait until post-MVP:
- Creator economy (subscriptions, PPV, tips)
- Ticket resale marketplace
- Video calls
- AI features (Wingman, Scene Scout, Profile Optimizer)
- Gamification (XP, leaderboards, challenges)
- Squad/group features
- Business/promoter dashboard
- Advanced filters

They can come back later. For now: Radio, Tonight, Globe, Shop, Care.

---

## Success Criteria

MVP is done when:
- [ ] CI/CD passes (lint, typecheck, build, test)
- [ ] Radio plays on homepage
- [ ] Can see tonight's beacons
- [ ] Can RSVP to event
- [ ] Can browse and buy from shop
- [ ] Can sign up and create profile
- [ ] Can message someone
- [ ] Safety button works
- [ ] Payments work (subscription)
- [ ] Deploys to Vercel without errors

---

## Timeline

| Phase | Days | Focus |
|-------|------|-------|
| 1. Unblock | 1 | CI/CD, PRs, critical bugs |
| 2. Cut | 2-3 | Remove stubs, archive docs |
| 3. Focus | 4-5 | Radio-first, nav, care |
| 4. Money | 6-7 | Stripe, Shopify |
| 5. Polish | 8-10 | Consistency, mobile, errors |

**Total: ~10 days to MVP-ready**

---

## Let's Start

Phase 1, Step 1: Fix the lint errors and get CI/CD green.
