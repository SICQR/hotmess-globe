# HOTMESS Next Sprint Plan

## Current State: Production Ready ✅

**Deployed Features:**
- Match Probability System (8-dimension scoring)
- Daily Check-in with XP rewards
- Streak tracking & counter
- Social proof badges
- Route-based page transitions
- Lux design system components
- Hero banners & floating CTAs
- Live user counters
- Ad system integration

---

## Sprint 1: Authentication & Onboarding (HIGH PRIORITY)

### 1.1 Social Auth Integration
**Status:** Partially implemented, needs wiring

| Provider | Backend | Frontend | Status |
|----------|---------|----------|--------|
| Google | ✅ Ready | ⚠️ UI exists | Wire to Supabase |
| Apple | ✅ Ready | ⚠️ UI exists | Wire to Supabase |
| Telegram | ✅ API ready | ⚠️ Widget exists | Test & verify |

**Files to update:**
- `src/pages/Auth.jsx` - Connect OAuth buttons
- `src/components/utils/supabaseClient.jsx` - Verify OAuth config
- `api/auth/telegram/verify.js` - Test flow

### 1.2 Simplified Onboarding
**Goal:** Reduce friction from 8 steps to 3

```
Current: Age Gate → Consent → SignUp → Verify → Username → Face → Membership → Profile
Target:  Splash (accept) → Auth (social/email) → Quick Profile → Done
```

**Tasks:**
- [ ] Combine age gate + consent into splash
- [ ] Make face verification optional (badge incentive)
- [ ] Defer membership to contextual upsells
- [ ] Add "Complete Profile" XP rewards

---

## Sprint 2: Notifications & Re-engagement (CRITICAL)

### 2.1 Missing Notifications
| Type | Trigger | Priority |
|------|---------|----------|
| `new_follower` | Someone follows you | P1 |
| `post_liked` | Someone likes your post | P1 |
| `profile_views` | 5+ views/day | P2 |
| `match_online` | High-match user online | P1 |
| `streak_expiring` | Streak ends in 4 hours | P1 |

**Files:**
- `src/lib/notifications.ts` - ✅ Created
- `api/notifications/dispatch.js` - Needs testing
- `api/cron/reactivation.js` - Create

### 2.2 Re-engagement Cron Jobs
| Days Inactive | Message | Hook |
|---------------|---------|------|
| 3 days | "Miss you!" | New matches |
| 7 days | "Someone viewed you" | Curiosity |
| 14 days | "Event this weekend" | FOMO |
| 30 days | "We've improved" | Features |

---

## Sprint 3: Performance & Polish

### 3.1 Code Splitting
```javascript
// Lazy load heavy pages
const Globe = lazy(() => import('./pages/Globe'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Music = lazy(() => import('./pages/Music'));
```

### 3.2 Skeleton Loading
- [ ] ProfileCard skeleton
- [ ] Event list skeleton
- [ ] Message thread skeleton
- [ ] Product grid skeleton

### 3.3 Image Optimization
- [ ] Blur-up placeholders
- [ ] WebP conversion
- [ ] Lazy loading with intersection observer

---

## Sprint 4: Revenue & Monetization

### 4.1 Contextual Upsells
| Trigger | Upsell |
|---------|--------|
| View 10th profile | "Unlock unlimited views" |
| Send 5th message | "Go Premium for unlimited" |
| Use Right Now | "Premium users seen first" |
| Event RSVP | "VIP access available" |

### 4.2 Ad Placements (Already integrated)
- Home page leaderboard ✅
- Social page medium rectangle (add)
- Profile page mobile banner (add)
- Messages inbox footer (add)

---

## Sprint 5: Safety Enhancements

### 5.1 Panic Button Improvements
- [ ] Add vibration feedback
- [ ] Quick-exit to innocent app
- [ ] Auto-record audio option
- [ ] Emergency contacts SMS

### 5.2 Trust & Verification
- [ ] Verified badge display
- [ ] ID verification flow
- [ ] Trust score algorithm
- [ ] Report history tracking

---

## Sprint 6: Content & Community

### 6.1 Stories Feature
- `src/components/social/Stories.jsx` - ✅ Exists
- [ ] Add story creation UI
- [ ] Add story viewer analytics
- [ ] Add story replies

### 6.2 Live Features
- [ ] Live streaming (future)
- [ ] Live events (future)
- [ ] Live audio rooms (future)

---

## Quick Wins (Can do now)

1. **Test AdminDashboard** - Visit `/admin` and verify access
2. **Test Daily Check-in** - Verify XP rewards work
3. **Test Match Sorting** - Verify profiles sort by match %
4. **Clean up branches** - Delete 50+ stale remote branches
5. **Run ESLint** - Fix any remaining warnings

---

## Priority Order

```
Week 1: Auth wiring (Google/Apple/Telegram)
Week 2: Notification testing & cron jobs
Week 3: Performance (code splitting, skeletons)
Week 4: Monetization upsells
Week 5: Safety polish
Week 6: Content features
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Daily Active Users | ? | Track |
| Check-in Rate | ? | 40% |
| Match Message Rate | ? | 25% |
| Premium Conversion | ? | 5% |
| 7-day Retention | ? | 60% |

---

## Commands

```bash
# Run locally
npm run dev

# Check lint
npm run lint

# Run tests
npm test

# Deploy preview
vercel

# Deploy production
vercel --prod
```
