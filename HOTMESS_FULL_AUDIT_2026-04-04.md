# HOTMESS — Full Platform Audit
**Date:** 2026-04-04 | **Session:** 10 (Planning only — no fixes)
**Scope:** Every button, back button, trigger, auth path, DB write, cron job, API endpoint, sheet, and broken thing in the platform.

---

## TABLE OF CONTENTS

1. [Onboarding Flow — Complete Map](#1-onboarding-flow--complete-map)
2. [Auth Flow — Complete Map](#2-auth-flow--complete-map)
3. [Ghosted Grid Flow](#3-ghosted-grid-flow)
4. [Sheet System — Registry & Status](#4-sheet-system--registry--status)
5. [Stripe & Payments Flows](#5-stripe--payments-flows)
6. [Cron Jobs](#6-cron-jobs)
7. [API Endpoint Audit](#7-api-endpoint-audit)
8. [Dead Code & Broken Imports](#8-dead-code--broken-imports)
9. [Profile Data Integrity](#9-profile-data-integrity)
10. [Prioritized Fix List](#10-prioritized-fix-list)

---

## 1. ONBOARDING FLOW — COMPLETE MAP

### 1.1 Entry Points

| Entry | What Happens |
|-------|-------------|
| First visit (no auth) | `BootRouter` → `OnboardingRouter` → `SplashScreen` |
| Returning session but `onboarding_completed=false` | `BootRouter` → `OnboardingRouter` → stage-mapped screen |
| `hm_age_confirmed_v1=true` in localStorage | AgeGate bypassed; goes straight to SIGNUP |
| Deep link with `?sheet=*` | Sheet param preserved; parsed after boot completes |
| OAuth return (`/auth/callback`) | `AuthCallbackPage` routes: `onboarding_completed=true` → `/ghosted`, else → `/` |

---

### 1.2 `OnboardingRouter.jsx` — Stage-to-Screen Map

**File:** `src/components/onboarding/OnboardingRouter.jsx`

```
STAGE_TO_SCREEN = {
  start            → AGE_GATE          (screen: SplashScreen → AgeGate)
  age_gate         → SIGNUP
  age_verified     → SIGNUP
  signed_up        → QUICK_SETUP
  quick_setup      → PROFILE           (ProfileSetupScreen)
  profile_complete → PIN_SETUP
  vibe_complete    → PIN_SETUP

  // Legacy catch-alls (all route to QUICK_SETUP):
  signup, profile, vibe, safety, location → QUICK_SETUP
}
```

**Screen Stack (happy path, new user):**
```
SplashScreen
  ↓ handleSplashComplete()
AgeGateScreen
  ↓ handleAgeGateComplete() [if not authed]
SignUpScreen  (Auth.jsx wrapped in onboarding context)
  ↓ OAuth/magic link triggers supabase.auth → /auth/callback → back to /
  ↓ OnboardingRouter re-mounts with session
QuickSetupScreen  (display_name, username, PIN — stage: signed_up → quick_setup → profile_complete)
  ↓ handleQuickSetupComplete()
ProfileSetupScreen  (photos, vibe tags, bio — stage: profile_complete)
  ↓ handleProfileComplete()
PinSetupScreen  (confirm PIN — stage: vibe_complete)
  ↓ handlePinComplete() → refetchProfile() → navigate('/ghosted')
```

---

### 1.3 Navigation Triggers & Back Buttons — Per Screen

#### SplashScreen
| Button | Handler | Action |
|--------|---------|--------|
| "Get Started" CTA | `handleSplashComplete()` | `goTo(AGE_GATE)`, pushes `AGE_GATE` to historyRef |
| "Sign In" link | `handleSignInFromSplash()` | `goTo(SIGNIN)` |
| Back button | `goBack()` | Pops historyRef (goes nowhere — first screen) |
| **DB writes** | None | — |

#### AgeGateScreen
| Button | Handler | Action |
|--------|---------|--------|
| "I am 18+" confirm | `handleAgeGateComplete()` | If authed: writes `age_verified=true`, `onboarding_stage='signed_up'` → `goTo(QUICK_SETUP)`. If not authed: `goTo(SIGNUP)` |
| "Leave" (exit) | Redirect | `window.location = 'https://google.com'` |
| Back button | `goBack()` | Returns to SPLASH |
| **DB writes** | `profiles.update({ age_verified: true, onboarding_stage: 'signed_up' })` | Only if already authed |

#### SignUpScreen (Auth.jsx)
| Button | Handler | Action |
|--------|---------|--------|
| "Continue with Google" | `supabase.auth.signInWithOAuth()` | Redirect to Google → `/auth/callback` |
| "Continue with Email" | Sets view to `email` sub-view | Shows email input |
| Magic link send | `supabase.auth.signInWithOtp()` | Sends OTP email; shows confirmation screen with 60s countdown + resend |
| Password sign in | `supabase.auth.signInWithPassword()` | On success: redirect to `?next=` or `/` |
| Password sign up | `supabase.auth.signUp()` | Sends confirmation; waits for email |
| Back | `goBack()` | Resets form → view 'chooser' |
| **DB writes** | None (Supabase auth.users) | — |
| **ISSUE** | Password reset hardcodes `hotmessldn.com` domain | `src/pages/Auth.jsx` line ~282 |

#### QuickSetupScreen
| Button | Handler | Action |
|--------|---------|--------|
| "Continue" | `handleQuickSetupComplete()` | Validates display_name + writes to profiles → `goTo(PROFILE)` |
| Back | `goBack()` | Returns to SIGNUP |
| **DB writes** | `profiles.update({ display_name, username, onboarding_stage: 'quick_setup' })` | — |
| **DB writes (PIN)** | `profiles.update({ pin_code_hash })` | PIN hashed client-side |

#### ProfileSetupScreen
| Button | Handler | Action |
|--------|---------|--------|
| Photo upload | `uploadToStorage()` → `profiles.update({ avatar_url })` | Uploads to Supabase storage |
| "Continue" | `handleProfileComplete()` | Writes vibe tags → `goTo(PIN_SETUP)` |
| Skip photo | "Continue" without photo | Allowed — avatar_url stays null |
| Back | `goBack()` | Returns to QUICK_SETUP |
| **DB writes** | `profiles.update({ public_attributes: { age, position, looking_for }, tags, persona_type, onboarding_stage: 'profile_complete' })` | — |

#### PinSetupScreen
| Button | Handler | Action |
|--------|---------|--------|
| PIN confirmation | `handlePinComplete()` | Calls `refetchProfile()` → fires `completeOnboarding()` → `navigate('/ghosted')` |
| Back | `goBack()` | Returns to PROFILE |
| **DB writes** | `profiles.update({ onboarding_stage: 'vibe_complete' })` → then `completeOnboarding()` → `profiles.upsert({ onboarding_completed: true })` | — |

---

### 1.4 DB Write Sequence (Full New User)

```
1. supabase.auth.signUp() / signInWithOAuth()  → auth.users table (Supabase-managed)
2. auth trigger creates row in profiles (by DB trigger: handle_new_user)
3. profiles.update({ age_verified: true, onboarding_stage: 'signed_up' })       ← AgeGate complete
4. profiles.update({ display_name, username, pin_code_hash, onboarding_stage: 'quick_setup' })  ← QuickSetup
5. profiles.update({ avatar_url })                                                ← Photo upload
6. profiles.update({ public_attributes, tags, persona_type, onboarding_stage: 'profile_complete' }) ← Vibe
7. profiles.upsert({ onboarding_completed: true, onboarding_stage: 'vibe_complete' })  ← Final
8. user_presence.upsert({ status: 'online' })                                    ← BootGuard READY
```

---

### 1.5 OnboardingRouter — Known Issues

| Issue | File | Line | Severity |
|-------|------|------|----------|
| Legacy `OnboardingGate.jsx` still exists with duplicate 7-step flow | `src/pages/OnboardingGate.jsx` | entire file | Medium — it's wired to READY state in BootRouter for community gate? Confirm whether it's still reachable |
| `completeOnboarding()` is fire-and-forget — can't await or unmount triggers re-render via BootRouter | `src/components/onboarding/OnboardingRouter.jsx` | line ~288 | Low (by design) |
| Referral code captured in BOTH `auth/callback.jsx` AND `OnboardingGate.jsx` — dual write | Both files | — | Medium (duplicate inserts to `referrals` table) |
| Users stuck at `start` stage (26 users) — `age_verified=false`, no `onboarding_stage` | `OnboardingRouter.jsx` | line ~165-197 safety net | High |
| Users stuck at `quick_setup` stage (18 users) — halfway through setup | `OnboardingRouter.jsx` STAGE_TO_SCREEN | — | High |
| No timeout recovery if OAuth redirect fails mid-flow | `OnboardingRouter.jsx` | — | Medium |

---

## 2. AUTH FLOW — COMPLETE MAP

### 2.1 `BootGuardContext.jsx` — Boot State Machine

**File:** `src/contexts/BootGuardContext.jsx`

```
LOADING
  ├─ No session → UNAUTHENTICATED
  ├─ Session + age_verified=false → NEEDS_AGE (AgeGate)
  ├─ Session + age_verified=true + onboarding_completed=false → NEEDS_ONBOARDING
  ├─ Session + onboarding_completed=true + community_attested_at=null → NEEDS_COMMUNITY_GATE
  └─ Session + onboarding_completed=true → READY
```

**Key implementation details:**
- Reads Supabase token from localStorage synchronously at boot (`sb-rfoftonnlwudilafhfkl-auth-token`) — eliminates network call for returning users (session 10 fix, `7ad858d`)
- `onAuthStateChange` does NOT await `loadProfile()` (Navigator Lock deadlock mitigation)
- 10s boot timeout → falls back to UNAUTHENTICATED
- 8s profile-load timeout → retry once, then fail

**DB writes in BootGuardContext:**
- `profiles.update({ age_verified: true })` → `markAgeVerified()`
- `profiles.upsert({ onboarding_completed: true })` → `completeOnboarding()`
- `user_presence.upsert({ status: 'online' })` → heartbeat every 30s
- `user_presence.upsert({ status: 'offline' })` → on tab close / visibility change

---

### 2.2 `auth/callback.jsx` — OAuth / Magic Link Handler

**File:** `src/pages/auth/callback.jsx`

**Flow:**
```
/auth/callback
  ↓ supabase.auth.exchangeCodeForSession() (PKCE)
  ↓ Check profiles.onboarding_completed
  ├─ true  → navigate('/ghosted')    [returning user fast-path]
  └─ false → navigate('/')           [new user; BootRouter → OnboardingRouter]

Side effects:
  - If ?invite=CODE in localStorage → referrals.insert({ inviter, invitee, code })
  - 400 (bot/bad callback) → navigate('/') gracefully
```

**Known issues:**
- Referral insert is best-effort; no dedup check — could double-insert if callback fires twice (mobile browsers sometimes do this)
- `exchangeCodeForSession` can fail if code is used twice (PKCE is single-use) — no retry UI

---

### 2.3 Google OAuth Return Path (Step by Step)

```
1. User clicks "Continue with Google"
2. supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
3. Browser → accounts.google.com → authorize → redirect to /auth/callback?code=XXX
4. /auth/callback: exchangeCodeForSession(code)
5. Supabase creates/updates auth.users row
6. If new user: DB trigger fires → creates profiles row with default values
7. Callback checks profiles.onboarding_completed
   - true → /ghosted
   - false → / → BootGuardContext → NEEDS_ONBOARDING → OnboardingRouter
```

---

### 2.4 Auth Failure Modes

| Failure | What Happens | Fix Needed |
|---------|-------------|-----------|
| OAuth code used twice (mobile back button) | Supabase throws "code already used" | Add error handler in callback.jsx, redirect to /auth with toast |
| Network down during callback | Infinite loading spinner | Add timeout + fallback to /auth |
| Bot or spam request to /auth/callback | Returns 400 → navigate('/') | ✅ Already handled |
| Magic link expired | Supabase error on OTP verification | Show "link expired" state in Auth.jsx (currently shows generic error) |
| Session localStorage missing (Safari purge) | BootGuard hits network, may be slow | IndexedDB hint (`writeIDBHint()`) written on SIGNED_IN — mitigation in place |
| `profiles` row doesn't exist (trigger failure) | BootGuard gets null profile → loops | BootGuard creates stub profile on first boot if missing |

---

## 3. GHOSTED GRID FLOW

### 3.1 `GhostedMode.tsx` → `ProfilesGrid.jsx` → `L2ProfileSheet.jsx`

**File:** `src/modes/GhostedMode.tsx`

**Layout:**
```
/ghosted
  └─ Header (sticky): City pill | "GHOSTED" | Filter count badge | Filter icon
  └─ Tabs: All | Online Now | Right Now | Events Tonight
  └─ Preset chips: Nearby | Young | Hookup | Hang | Online
  └─ ProfilesGrid (3-col, infinite scroll via offset)
  └─ FAB: "Share your vibe" (opens RightNow modal)
```

**Tap on profile card:**
```
Profile card tap
  → openSheet('profile', { uid: profile.id })
  → L2ProfileSheet renders
```

**Long-press on profile card:**
```
Quick action menu appears:
  ├─ Boo     → taps.insert({ from_email, to_email, type: 'boo' })
  ├─ Message → canOpenSheet('chat', pathname, sheetStack) check → openSheet('chat', { userId })
  ├─ Save    → saved_items.insert({ user_id, saved_id })
  ├─ Block   → Confirm dialog → blocks.insert() + user_blocks.insert() + optimistic hide
  └─ Report  → openSheet('report', { targetId: profile.id })
```

---

### 3.2 `L2ProfileSheet.jsx` — All Buttons

**Props accepted:** `uid`, `id`, `email` (all optional, uses current user if none)

**Data resolution:**
```
uid || id → strip 'profile_' prefix → query /api/profile?uid=X OR profiles.id=X
email → query /api/profile?email=X OR profiles.email=X
Both → merged response normalizes auth_user_id vs id
```

**Action buttons:**

| Button | Handler | DB Write | Issues |
|--------|---------|----------|--------|
| Message | `handleMessage()` | None (opens chat sheet) | ✅ Uses `userId` (UUID), not email |
| Video Call | `handleVideoCall()` | None (opens video sheet) | ✅ Uses `toUid` |
| Save / Unsave | `handleSaveToggle()` | `taps.insert/delete({ from_email, to_email, type: 'save' })` | ⚠️ Uses email not UUID — legacy pattern |
| Share | `handleShare()` | None | ✅ Web Share API + clipboard fallback |
| Block | `handleBlock()` | `user_blocks.insert({ blocker_email, blocked_email })` + `profile_blocklist_users.insert()` | ⚠️ Dual write (legacy) |
| Report | `handleReport()` | `reports.insert({ reporter_email, type, item_id, reason })` | ✅ |
| Travel times | Auto-computed | None | ✅ Haversine, no API call |
| View recorded | Auto on open | `profile_views.insert({ viewer_id, viewed_id, viewed_at })` | ✅ 24h dedup |

**Own-profile detection logic:**
```javascript
const isOwnProfile =
  (!email && !resolvedUid) ||
  (profileUser?.email === currentUser?.email) ||
  (profileUser?.auth_user_id === authUid);
```
→ Redirects to `/profile` if own profile detected.

**Known issues:**
- `taps` table uses email as FK (`from_email`, `to_email`) — inconsistent with rest of codebase moving to UUIDs
- `profile_blocklist_users` is a legacy table being written alongside `user_blocks` — needs consolidation
- Photo carousel: if `avatar_url` is null and no profile photos, shows initial letter fallback (correct behaviour)

---

### 3.3 Filter Sync

Filters stored in `localStorage: 'hm_ghosted_filters'`. Three sync mechanisms:
1. `StorageEvent` (cross-tab)
2. Window focus listener
3. Custom event `hm_filters_updated` (dispatched from `L2FiltersSheet`)

**Known issue:** If user adjusts filters in L2FiltersSheet while GhostedMode is not the active tab, the custom event fires but GhostedMode's listener may not be mounted → grid doesn't refresh until tab switch. Low priority.

---

## 4. SHEET SYSTEM — REGISTRY & STATUS

### 4.1 Architecture

- **Registry:** `src/lib/sheetSystem.ts` — 72 registered sheet types
- **Policy:** `src/lib/sheetPolicy.ts` — gates `chat`, `video`, `travel` to `/ghosted` or profile-in-stack
- **Context:** `src/contexts/SheetContext.jsx` — LIFO stack, URL sync, animation state
- **Router:** `src/components/sheets/SheetRouter.jsx` — lazy-loads components, pauses radio on `video-call`/`schedule`/`show`

### 4.2 All Registered Sheet Types

| Category | Types |
|----------|-------|
| Profile & Social | `profile`, `profile-views`, `taps`, `social`, `squads`, `create-persona`, `referral` |
| Messaging | `chat`, `video-call`, `directions` |
| Events | `event`, `events`, `create-event`, `now-happening`, `ticket` |
| Shopping | `shop`, `marketplace`, `product`, `cart`, `filters`, `boost-shop`, `order`, `checkout`, `purchase` |
| Settings | `edit-profile`, `photos`, `location`, `location-watcher`, `settings`, `privacy`, `blocked`, `notifications`, `notification-inbox`, `emergency-contact`, `more-auth-methods` |
| Marketplace/Selling | `sell`, `my-listings`, `edit-listing`, `payouts`, `seller-onboarding`, `data-export` |
| Safety | `safety`, `report`, `support`, `help`, `accessibility` |
| Media/Radio | `radio` (implied), `show`, `schedule`, `qr`, `uber` |
| Other | `admin`, `brand`, `legal`, `quick-actions`, `search`, `sweat-coins`, `achievements`, `membership`, `amplify`, `city-picker`, `ghosted`, `card-actions`, `mini-profile`, `premium-gate`, `chat-meetup`, `my-orders`, `favorites`, `vaults` |

### 4.3 Sheet Opening — Policy Check

```javascript
// From sheetPolicy.ts
canOpenSheet(type, pathname, sheetStack):
  if (['chat', 'video', 'travel'].includes(type)):
    return pathname.startsWith('/ghosted')
        || sheetStack.some(s => s.type === 'profile')
  return true  // all other sheets always openable
```

**If blocked:** Toast: "Go to Ghosted to start a conversation"

### 4.4 Known Sheet Issues

| Issue | Location | Severity |
|-------|----------|----------|
| `PlaceholderSheet` renders "Coming Soon" for any unregistered type | `SheetRouter.jsx` | Low (graceful fallback) |
| Audio pause only on `video-call`/`schedule`/`show` — `chat-meetup` missing from `AUDIO_VIDEO_SHEETS` | `SheetRouter.jsx` | Low |
| Sheet URL param `?sheet=type` can be bookmarked but may fail if auth not ready | `SheetContext.jsx` | Low |

---

## 5. STRIPE & PAYMENTS FLOWS

### 5.1 Boost Checkout (`/api/stripe/create-boost-checkout.js`)

**Auth:** Bearer token → `getAuthedUser()` — ✅

**PRICE_MAP (reads from env vars):**
```javascript
globe_glow         → STRIPE_BOOST_GLOBE_GLOW_PRICE_ID
profile_bump       → STRIPE_BOOST_PROFILE_BUMP_PRICE_ID
vibe_blast         → STRIPE_BOOST_VIBE_BLAST_PRICE_ID
incognito_week     → STRIPE_BOOST_INCOGNITO_PRICE_ID
extra_beacon_drop  → STRIPE_BOOST_EXTRA_BEACON_PRICE_ID
highlighted_message → STRIPE_BOOST_HIGHLIGHTED_MSG_PRICE_ID
```

**500 Root Cause:** `new Stripe(process.env.STRIPE_SECRET_KEY)` — if `STRIPE_SECRET_KEY` is missing/wrong in Vercel env, this throws and crashes the handler. Also: if any `STRIPE_BOOST_*_PRICE_ID` env var is unset, `priceId` is `undefined` → returns 400 (not 500). **The 500 is specifically `STRIPE_SECRET_KEY` missing or the price ID set but invalid in Stripe.**

**Fix required:** Wrap `new Stripe()` in try/catch with 503 response; add env var check before instantiation.

---

### 5.2 Membership Checkout (`/api/stripe/create-checkout-session.js`)

**Auth:** Bearer token → `supabase.auth.getUser()` — ✅

**Flow:**
```
POST /api/stripe/create-checkout-session
  { tierId }
  → Look up membership_tiers.id=tierId → get price
  → stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price_data: {...} }] })
  → Return { url }
```

**Issue:** Uses `price_data` (inline price creation) not Stripe Price IDs — means no Stripe dashboard price management. Every checkout creates a new Stripe Price object. This is functional but unclean.

---

### 5.3 Stripe Webhook (`/api/stripe/webhook.js`)

**Auth:** `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` — ✅

**Idempotency:** Checks `stripe_events_log` before processing — ✅

**Handled events:**
- `checkout.session.completed` → boosts, memberships, vault items, preloved sales, creator subscriptions
- `customer.subscription.updated` → updates `memberships` table
- `customer.subscription.deleted` → cancels membership

**RPC calls (may fail silently):**
- `activate_user_boost({ user_id, boost_key, quantity })` — called on boost purchase
- **Status: UNKNOWN** — whether this RPC exists in prod DB not confirmed

---

### 5.4 Creator Subscription (`/api/premium/subscribe.js`)

**Auth:** Bearer token — ✅

**CORS BUG:** Hardcoded `'https://hotmess-globe-fix.vercel.app'` as CORS fallback (file line 15). Should be `'https://hotmessldn.com'`. If `ALLOWED_ORIGIN` env var is set this is fine; if not, CORS will block production requests.

**Flow:** XP-based subscription — deducts XP from buyer, credits creator. Manual rollback if creator credit fails (no atomic transaction).

---

### 5.5 Premium Unlock (`/api/premium/unlock.js`)

Same CORS bug as subscribe.js. Same XP transaction pattern. Same lack of atomic rollback.

---

### 5.6 CORS Fallback BUG — 5 Files

All 5 files fallback to `hotmess-globe-fix.vercel.app` (old staging URL) if `ALLOWED_ORIGIN` is not set:
```
api/video/create-room.js
api/safety/respond.js
api/safety/alert.js
api/premium/unlock.js
api/premium/subscribe.js
```

**Impact:** If `ALLOWED_ORIGIN` Vercel env var is not set, all these endpoints will block CORS from `hotmessldn.com`. Must verify env var is set.

---

### 5.7 Required Stripe Env Vars (Vercel)

```
STRIPE_SECRET_KEY                    ← CRITICAL (500 without this)
STRIPE_WEBHOOK_SECRET                ← CRITICAL (webhook rejects all events)
STRIPE_BOOST_GLOBE_GLOW_PRICE_ID     ← 400 if missing
STRIPE_BOOST_PROFILE_BUMP_PRICE_ID   ← 400 if missing
STRIPE_BOOST_VIBE_BLAST_PRICE_ID     ← 400 if missing
STRIPE_BOOST_INCOGNITO_PRICE_ID      ← 400 if missing
STRIPE_BOOST_EXTRA_BEACON_PRICE_ID   ← 400 if missing
STRIPE_BOOST_HIGHLIGHTED_MSG_PRICE_ID ← 400 if missing
```

---

## 6. CRON JOBS

### 6.1 Vercel Cron Schedule (`vercel.json`)

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/events/cron` | `0 3 * * *` | 3 AM daily — scrape events for London/Manchester/Brighton |
| `/api/notifications/process` | `*/5 * * * *` | Every 5 min — process notification queue |
| `/api/notifications/dispatch` | `*/5 * * * *` | Every 5 min — dispatch outbox |
| `/api/admin/cleanup/rate-limits` | `20 4 * * *` | 4:20 AM daily — purge old rate limit records |
| `/api/cron/referral-rewards` | `15 */6 * * *` | Every 6 hours at :15 — run referral reward grants |

---

### 6.2 Cron Auth Analysis

| Cron | Auth Method | 401 If... |
|------|-------------|-----------|
| `/api/events/cron` | `x-vercel-cron: 1` header OR Bearer `EVENT_SCRAPER_CRON_SECRET` (fallback: `CRON_SECRET`) OR `?secret=` query param | None of the above present |
| `/api/notifications/process` | `x-vercel-cron: 1` OR `OUTBOX_CRON_SECRET` (fallback: `CRON_SECRET`) | Missing both |
| `/api/notifications/dispatch` | Same as process | Same |
| `/api/admin/cleanup/rate-limits` | `x-vercel-cron: 1` OR `x-cron-secret` header/`?secret=` param (fallback: `RATE_LIMIT_CLEANUP_SECRET` or `CRON_SECRET`) | Missing both |
| `/api/cron/referral-rewards` | Bearer `CRON_SECRET` only (no Vercel header check) | `CRON_SECRET` not set |

**Root cause of 401s:** Vercel injects `x-vercel-cron: 1` automatically on its own cron triggers. These endpoints check for this header. The 401s reported suggest either:
1. The endpoints are being hit directly (not via Vercel cron), OR
2. The Vercel project's cron feature is on a plan that requires Vercel Pro (confirm)

**For `/api/cron/referral-rewards`:** Does NOT check `x-vercel-cron` header — only checks Bearer `CRON_SECRET`. If this is unset in Vercel env, every cron invocation returns 401.

---

### 6.3 Cron Failure Details

#### `/api/events/cron`
- Hardcoded cities: `['London', 'Manchester', 'Brighton']`
- Calls external event scraper
- Writes to `beacons` VIEW — **THIS WILL FAIL** — beacons is a VIEW, not a table. Writes need to go to the underlying `events` table.
- Writes to `event_scraper_runs` table (logging)

#### `/api/cron/referral-rewards`
- Calls `supabase.rpc('grant_referral_rewards')`
- **RPC `grant_referral_rewards` existence in prod DB: UNCONFIRMED**
- If RPC doesn't exist → 500 every 6 hours silently

---

## 7. API ENDPOINT AUDIT

### 7.1 Auth Status By Endpoint

| Endpoint | Auth | Status | Issues |
|----------|------|--------|--------|
| `nearby.js` | Bearer required | ✅ | — |
| `profile.js` | Optional (RLS) | ⚠️ | Has hardcoded fallback demo profiles |
| `profiles.js` | Optional (RLS) | ⚠️ | Silently filters female profiles (line 510) |
| `health.js` | HEALTH_SECRET or Vercel header | ✅ | — |
| `globe/index.js` | Optional (forwarded) | ⚠️ | 500 if any query fails; no fallback |
| `globe/pulse.js` | None | ❌ | Fully public; exposes heat tile data |
| `admin/*` | Bearer + is_admin DB check | ✅ | — |
| `notifications/dispatch.js` | OUTBOX_CRON_SECRET or Vercel | ✅ | — |
| `notifications/push.js` | None (assumes dispatch gates it) | ⚠️ | Callable directly without auth |
| `ai/chat.js` | Bearer token | ✅ | Requires OPENAI_API_KEY or Claude API key |
| `ai/wingman.js` | Bearer token | ✅ | Subscription tier gate (CHROME/ELITE) |
| `stripe/*` | Bearer token | ✅ | CORS bug on subscribe/unlock/video/safety |
| `safety/alert.js` | Bearer token | ✅ | CORS fallback bug |
| `safety/respond.js` | Bearer token | ✅ | CORS fallback bug |
| `video/create-room.js` | Bearer token | ✅ | CORS fallback bug |

---

### 7.2 `profiles.js` — Gender Filter Bug

**File:** `api/profiles.js` line ~510

```javascript
if (isFemaleGender(gender)) return null;
```

This silently removes female profiles from the grid entirely. The function `isFemaleGender()` checks for 'woman', 'female', 'f', 'girl', 'femme' etc. **This may be intentional** (a specific use case for the platform — confirm with Phil), but it's undocumented, has no admin toggle, and would cause confusion if unintentional.

---

### 7.3 `profile.js` — Hardcoded Fallback Profiles

**File:** `api/profile.js` lines 13–47

Two demo profiles (`jay@example.com`, `sam@example.com`) are always returned when the DB is unavailable. These shouldn't appear in prod. But since they only return on DB failure, impact is minimal. Still: clean up for professionalism.

---

### 7.4 Missing Required Env Vars (Full List)

**CRITICAL — App won't function without:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

**HIGH — Features will 500/400 silently:**
```
CRON_SECRET                          ← referral-rewards cron 401s
ALLOWED_ORIGIN                       ← CORS block on 5 endpoints
STRIPE_BOOST_*_PRICE_ID (×6)         ← All boost checkouts fail with 400
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

**MEDIUM — Features degrade:**
```
OPENAI_API_KEY                       ← All AI features disabled
GOOGLE_MAPS_API_KEY                  ← Nearby ETAs missing
SOUNDCLOUD_CLIENT_ID/SECRET          ← SoundCloud integration fails
SHOPIFY_SHOP_DOMAIN                  ← Shop tab broken
SHOPIFY_ADMIN_ACCESS_TOKEN           ← Shop sync broken
TELEGRAM_BOT_TOKEN                   ← Telegram login broken
```

---

## 8. DEAD CODE & BROKEN IMPORTS

### 8.1 `base44Client.js`

**Status:** File still exists at `api/_utils/` equivalent but has **zero imports** in `src/`. Safe to delete. The compatibility stub functions (`InvokeLLM`, `SendEmail`, `UploadFile`) now live in `src/components/utils/supabaseClient.jsx` as `integrations.Core.*`.

### 8.2 `InvokeLLM` Stub

**File:** `src/components/utils/supabaseClient.jsx` lines ~1245–1270

```javascript
async InvokeLLM({ prompt, response_json_schema }) {
  // DEV: returns fakeFromSchema(response_json_schema)
  // PROD: returns { error: 'AI is not configured' }
}
```

**13 components** still call `InvokeLLM()`. In production these return error responses. The `console.warn('[TODO] LLM endpoint needed')` stub is in `mediaProcessing.jsx` line 72.

### 8.3 Wrong Project ID in `usePresence.ts`

**File:** `src/hooks/usePresence.ts` line 193

```javascript
const session = JSON.parse(localStorage.getItem('sb-klsywpvncqqglhnhrjbh-auth-token') ?? '{}');
```

This reads from the DEV/staging project's localStorage key (`klsywpvncqqglhnhrjbh`), not prod (`rfoftonnlwudilafhfkl`). In production, this always reads `{}` — the session is always empty from this hook's perspective. Any code that depends on `session` in `usePresence.ts` will fail silently.

**`clearBadSessions.js` line 4** documents this: `"NOTE: klsywpvncqqglhnhrjbh is the DEV/staging project."` — so this is a known reference, but the hook is reading the wrong key in prod.

### 8.4 Hardcoded Supabase Credentials

**File:** `src/components/utils/supabaseClient.jsx` lines 6–7

```javascript
const supabaseUrl = "https://rfoftonnlwudilafhfkl.supabase.co";
const supabaseKey = "eyJhbGci...";  // Full JWT anon key
```

The anon key is intentionally public (it's a client key, RLS is the security layer). But hardcoding bypasses env config — makes it impossible to switch environments without a code change. Should read `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.

### 8.5 `OnboardingGate.jsx` — Legacy File

**File:** `src/pages/OnboardingGate.jsx`

Still exists with a full 7-step onboarding flow. `BootRouter.jsx` may still route to it for the `NEEDS_COMMUNITY_GATE` state. Needs audit: is this reachable in prod? Is it still needed? It contains duplicate referral code capture.

### 8.6 `hotmess-globe-fix` CORS Fallback

5 API files have wrong CORS fallback (detailed in §5.6 above). This is dead staging URL.

---

## 9. PROFILE DATA INTEGRITY

### 9.1 Users at `start` Stage (~26 users)

**Symptom:** `onboarding_stage = 'start'` or null, `onboarding_completed = false`

**Cause:** These users either:
1. Landed on the app, saw the splash, but never completed age gate
2. Had their profile row created by auth trigger but never progressed (abandoned)
3. Were created by bot/test accounts

**What they have:** `profiles` row exists (from auth trigger), `age_verified = false`, no `display_name`, no `username`.

**Recovery options:**
- If email is valid real user: send re-engagement email, their onboarding continues normally on next visit
- If test/bot: can be deleted (check `is_admin` or `@hotmess.app` email pattern)
- **OnboardingRouter already has safety net** (lines 165-197): if `age_verified=true` but `onboarding_stage='start'`, advances to `signed_up`. But these 26 users have `age_verified=false`.

### 9.2 Users at `quick_setup` Stage (~18 users)

**Symptom:** `onboarding_stage = 'quick_setup'`, `onboarding_completed = false`

**Cause:** Got past age gate + signup, but abandoned during QuickSetupScreen (display_name entry, username, PIN step).

**What they have:** Auth session, `age_verified=true`, `onboarding_stage='signed_up'` or `'quick_setup'`, no `display_name`, no PIN.

**Recovery:** On next visit, `OnboardingRouter` correctly routes them to `QUICK_SETUP` screen. No action needed — they'll self-recover when they return.

**Data check (run in Supabase):**
```sql
SELECT email, onboarding_stage, age_verified, display_name, created_at
FROM profiles
WHERE onboarding_completed = false
ORDER BY onboarding_stage, created_at;
```

---

## 10. PRIORITIZED FIX LIST

### 🔴 P0 — Production Breaking

| # | Issue | File | Fix |
|---|-------|------|-----|
| P0-1 | **Boost checkout 500** — `STRIPE_SECRET_KEY` unset or invalid | `api/stripe/create-boost-checkout.js` | Wrap `new Stripe()` in try/catch; return 503. Verify `STRIPE_SECRET_KEY` is set in Vercel env for prod. |
| P0-2 | **Wrong project ID in usePresence.ts** — reads staging localStorage key in prod; presence is always broken | `src/hooks/usePresence.ts:193` | Change `klsywpvncqqglhnhrjbh` → `rfoftonnlwudilafhfkl`. Or read dynamically from `supabaseClient` URL. |
| P0-3 | **CORS block on 5 endpoints** — if `ALLOWED_ORIGIN` not set, video calls, safety alerts, premium subscribe/unlock all reject prod origin | `api/video/create-room.js`, `api/safety/alert.js`, `api/safety/respond.js`, `api/premium/subscribe.js`, `api/premium/unlock.js` | Change fallback from `hotmess-globe-fix.vercel.app` → `hotmessldn.com`. Also verify `ALLOWED_ORIGIN` env var is set. |
| P0-4 | **Cron 401 — referral rewards** — `CRON_SECRET` env var check only; no Vercel header check; if env var unset → every cron run 401s | `api/cron/referral-rewards.js` | Add `x-vercel-cron: 1` header check (like other cron endpoints). |
| P0-5 | **`activate_user_boost` RPC** — called by Stripe webhook on every boost purchase; if RPC doesn't exist in prod DB, boost purchases complete payment but never activate | `api/stripe/webhook.js` | Verify RPC exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'activate_user_boost'`. If missing, create migration. |
| P0-6 | **`grant_referral_rewards` RPC** — called every 6 hours; if missing → 500 on every cron run | `api/cron/referral-rewards.js` | Same — verify RPC exists in prod. |

---

### 🟠 P1 — High Impact (Broken Features)

| # | Issue | File | Fix |
|---|-------|------|-----|
| P1-1 | **Beacons cron writes to VIEW** — `events/cron.js` writes to `beacons` which is a VIEW; writes will fail silently | `api/events/cron.js` | Change write target to the underlying `events` table. Check what columns the VIEW exposes vs the table. |
| P1-2 | **Referral double-insert** — referral code captured in both `auth/callback.jsx` AND `OnboardingGate.jsx` | Both files | Remove from `OnboardingGate.jsx` (legacy file). Keep canonical capture in `auth/callback.jsx`. |
| P1-3 | **OAuth code-used-twice crash** — no error handler when Supabase throws "code already used" | `src/pages/auth/callback.jsx` | Add try/catch around `exchangeCodeForSession`; on error, redirect to `/auth` with toast "Please sign in again". |
| P1-4 | **Boost price IDs missing** — if any `STRIPE_BOOST_*_PRICE_ID` env var unset → 400 on that boost type | `api/stripe/create-boost-checkout.js` | Audit all 6 price IDs in Vercel env. Add validation in handler that returns named-error for each missing ID. |
| P1-5 | **`supabaseClient.jsx` hardcoded credentials** — can't swap environments; anon key in source code | `src/components/utils/supabaseClient.jsx:6-7` | Move to `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. |
| P1-6 | **`globe/pulse.js` unauthenticated** — full heat tile data publicly accessible | `api/globe/pulse.js` | Add optional Bearer token check; apply rate limiting via `_rateLimit.js`. |

---

### 🟡 P2 — Medium (UX Bugs / Correctness Issues)

| # | Issue | File | Fix |
|---|-------|------|-----|
| P2-1 | **`taps` table uses email as FK** — inconsistent with UUID-first approach; `handleSaveToggle()` in L2ProfileSheet passes email | `src/components/sheets/L2ProfileSheet.jsx` | Migrate tap writes to use `from_user_id`/`to_user_id` UUIDs. Add UUID columns to `taps` table. |
| P2-2 | **`user_blocks` + `profile_blocklist_users` dual write** — legacy table still written | `src/components/sheets/L2ProfileSheet.jsx` | Remove `profile_blocklist_users` write; keep `user_blocks` only. Update any reads of `profile_blocklist_users`. |
| P2-3 | **Female profiles silently filtered from grid** — undocumented, no admin toggle | `api/profiles.js:510` | Document intent. If intentional: add comment + admin config toggle. If unintentional: remove filter. |
| P2-4 | **Magic link expiry error not handled** — shows generic error instead of "link expired, resend?" | `src/pages/Auth.jsx` | Detect Supabase `OtpExpiredError` and show resend UI. |
| P2-5 | **Password reset hardcodes domain** | `src/pages/Auth.jsx:~282` | Use `window.location.origin` instead of hardcoded `hotmessldn.com`. |
| P2-6 | **`OnboardingGate.jsx` reachability** — legacy 7-step flow may still be routed to by BootRouter for `NEEDS_COMMUNITY_GATE` | `src/components/shell/BootRouter.jsx` | Audit BootRouter. If `NEEDS_COMMUNITY_GATE` still routes to `OnboardingGate`, evaluate whether community gate step should be folded into `OnboardingRouter` instead. |
| P2-7 | **XP unlock transaction — no atomic rollback** | `api/premium/unlock.js`, `api/premium/subscribe.js` | Use Supabase `rpc()` for atomic XP transfer, or document the rollback behavior. |

---

### 🔵 P3 — Low (Cleanup / Polish)

| # | Issue | File | Fix |
|---|-------|------|-----|
| P3-1 | **`base44Client.js` file still exists** | Root of api/ or src/utils | Delete file — zero imports confirmed. |
| P3-2 | **`InvokeLLM` stub** — 13 components show silent AI errors in prod | `src/components/utils/supabaseClient.jsx:1245` | Either wire to real Claude API endpoint, or replace all 13 call sites with inline stubs that show appropriate "AI not available" UI. |
| P3-3 | **`mediaProcessing.jsx` moderation stub** | `src/components/utils/mediaProcessing.jsx:72` | Wire to real moderation endpoint or document auto-approve policy. |
| P3-4 | **Hardcoded demo profiles in `profile.js`** | `api/profile.js:13-47` | Remove or move to test-only env. |
| P3-5 | **`notify-push` push handler not wired in SW** | `public/sw.js` | Add `push` event handler to service worker to display notifications in browser (documented as known gap in CLAUDE.md). |
| P3-6 | **`push_subscriptions` bucket / `uploads` bucket don't exist in prod** | Supabase dashboard | Create both buckets in prod project `rfoftonnlwudilafhfkl`. |
| P3-7 | **`globe/index.js` no fallback on query failure** | `api/globe/index.js` | Add try/catch per query; return partial data rather than 500. |
| P3-8 | **Realtime subscriptions multiply on Vite HMR** | Multiple files | Dev-only issue. Add guard: `if (import.meta.hot) removeChannel()` before re-subscribing. |

---

## APPENDIX: KEY FILE REFERENCE

```
Boot:
  src/contexts/BootGuardContext.jsx      Auth state machine, presence heartbeat
  src/components/shell/BootRouter.jsx    Route gating
  src/components/onboarding/OnboardingRouter.jsx  Onboarding screen manager

Auth:
  src/pages/Auth.jsx                     Login/signup UI
  src/pages/auth/callback.jsx            OAuth/magic link callback
  src/pages/AgeGate.jsx                  18+ gate
  src/pages/OnboardingGate.jsx           Legacy 7-step onboarding (confirm if still live)

Ghosted:
  src/modes/GhostedMode.tsx              Grid + filters + tabs
  src/pages/ProfilesGrid.jsx             3-col grid component
  src/components/sheets/L2ProfileSheet.jsx  Profile detail
  src/components/sheets/L2ChatSheet.jsx  Messaging

Sheets:
  src/lib/sheetSystem.ts                 SHEET_REGISTRY (72 types)
  src/lib/sheetPolicy.ts                 Gating rules
  src/contexts/SheetContext.jsx          LIFO stack + URL sync
  src/components/sheets/SheetRouter.jsx  Component map

Payments:
  api/stripe/create-boost-checkout.js   Boost checkout (500 source)
  api/stripe/create-checkout-session.js Membership checkout
  api/stripe/webhook.js                 Stripe event processor
  api/premium/subscribe.js              XP subscription (CORS bug)
  api/premium/unlock.js                 XP unlock (CORS bug)

Cron:
  api/events/cron.js                    Event scraper
  api/notifications/process.js          Notification queue processor
  api/notifications/dispatch.js         Outbox dispatcher
  api/admin/cleanup/rate-limits.js      Rate limit cleanup
  api/cron/referral-rewards.js          Referral grant cron

Config:
  vercel.json                           Cron schedule + routes + CSP
  src/components/utils/supabaseClient.jsx  Supabase singleton + compat stubs
```

---

*End of audit. Total issues found: 6 P0, 6 P1, 7 P2, 8 P3 = 27 actionable items.*
*Recommendation: Fix all P0s in a single session before any new feature work.*
