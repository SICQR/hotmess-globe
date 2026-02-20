# Routing Collision Report
**Version:** 1.0  
**Date:** 2026-02-20  
**Status:** Stage 1 intelligence — audit only, no code changes

---

## Purpose

This report lists every routing defect found in `src/App.jsx`: duplicate route paths, conflicting declarations, splat-route risks, legacy-redirect duplication, and all internal `window.location` hard navigations that break the app-shell feel.

---

## 1. Duplicate Route Paths

The following `path` values are declared more than once in `src/App.jsx`. In React Router v6, the first matching route wins, so the second declaration is silently dead.

| Path | Line (approx) | First occurrence | Second occurrence | Impact |
|------|--------------|-----------------|------------------|--------|
| `/onboarding` | ~319, ~365 | `pageKey="OnboardingGate"` | `pageKey="Onboarding"` | Second `Onboarding` key is dead |
| `/more/beacons` | ~410, ~479 | `pageKey="Beacons"` | `pageKey="Beacons"` | Full duplicate, no effect but confusing |
| `/more/beacons/new` | ~411, ~480 | `pageKey="CreateBeacon"` | `pageKey="CreateBeacon"` | Full duplicate |
| `/more/beacons/:id` | ~412, ~481 | `<EventDetailRedirect>` | `<EventDetailRedirect>` | Full duplicate |

### Fix

Remove the second declaration of each duplicate. The three `/more/beacons*` routes in the "Legacy lowercase routes" block (lines ~479–481) are exact copies of the routes already declared in the "Bible-friendly /more/* tool routes" block. Delete the duplicates.

The `/onboarding` duplicate is more subtle: the first mount uses `OnboardingGate` (the canonical page key), the second uses `Onboarding`. The `Onboarding` variant should be removed and its intent merged into `OnboardingGate`.

---

## 2. Conflicting Route Declarations

### 2a. `/safety` and `/safety/*`

```jsx
<Route path="/safety/*" element={<PageRoute pageKey="Safety" />} />
<Route path="/safety/report" element={<PageRoute pageKey="Safety" />} />
<Route path="/safety/resources" element={<PageRoute pageKey="Care" />} />
<Route path="/safety" element={<PageRoute pageKey="Safety" />} />
```

`/safety/*` (splat) is declared before the specific sub-routes. In React Router v6, a more-specific path always wins over a splat of equal depth, so `/safety/report` and `/safety/resources` should still match. However, `/safety/resources` renders `Care` while `/safety/*` renders `Safety` — this is intentional but the splat order can confuse readers. Move the splat to the end as a fallback.

### 2b. `/social/u/:email` and `/social/u/:id`

```jsx
<Route path="/social/u/:id" element={<SocialUserRedirect />} />   // line ~335
<Route path="/social/u/:email" element={<ProfileRedirect />} />    // line ~407
```

These are identical path shapes (`/social/u/:param`). The second declaration (`/social/u/:email`) is **dead** — React Router uses the first match. Both redirects go to the Profile page but with different param names (`uid` vs `email`). The second should be removed; `SocialUserRedirect` should handle both `uid` and `email` lookup.

### 2c. `/calendar/*` and `/calendar`

```jsx
<Route path="/calendar/*" element={<PageRoute pageKey="Calendar" />} />
<Route path="/calendar" element={<PageRoute pageKey="Calendar" />} />
```

`/calendar/*` already matches `/calendar` because splat matches zero segments. The standalone `/calendar` route is redundant.

### 2d. `/leaderboard/*` and `/leaderboard`

Same pattern as calendar:
```jsx
<Route path="/leaderboard/*" element={<PageRoute pageKey="Leaderboard" />} />
<Route path="/leaderboard" element={<PageRoute pageKey="Leaderboard" />} />
```

Same fix: remove the specific `/leaderboard` route, keep only the splat.

---

## 3. Legacy Redirect Duplication

### 3a. `/more/beacons*` declared three times total

Once in the "Bible-friendly" block, once in the "Legacy lowercase routes" block, and the last-chance auto-generated `Pages` loop could produce a `/Beacons` route as well (mitigated by `LEGACY_PAGE_ROUTE_ALLOWLIST`).

### 3b. `/radio` and `/radio/schedule`

```jsx
<Route path="/radio" element={<Navigate to={createPageUrl('Radio')} replace />} />
<Route path="/radio/schedule" element={<Navigate to={createPageUrl('RadioSchedule')} replace />} />
```

These redirect to `/Radio` and `/RadioSchedule` (PascalCase page-name URLs). These will in turn be served by the auto-generated `/{PageName}` route block. This works but is a two-hop redirect on legacy URLs. Consider redirecting directly to the canonical Bible URL (`/music/live` and `/music/schedule`) to avoid the extra hop.

### 3c. `/connect/*`

```jsx
<Route path="/connect" element={<Navigate to={createPageUrl('Social')} replace />} />
<Route path="/connect/*" element={<Navigate to={createPageUrl('Social')} replace />} />
```

Redirects to `/Social` (PascalCase), not `/social` (canonical). Same two-hop issue. Fix: `navigate('/social', { replace: true })`.

---

## 4. Splat Route Risks

### 4a. `path="*"` catch-all position

The `<Route path="*" element={<PageNotFound />} />` is placed after all route declarations, which is correct. No change needed.

### 4b. `path="/auth/*"` and `path="/auth"` overlap

```jsx
<Route path="/auth" element={<PageRoute pageKey="Auth" />} />
<Route path="/auth/*" element={<PageRoute pageKey="Auth" />} />
```

Both render `Auth`. The `/*` splat is a catch-all for any `/auth/...` sub-path the explicit sub-routes don't match. This is intentional and correct. No issue.

### 4c. `path="/admin/*"`

```jsx
<Route path="/admin" element={<PageRoute pageKey="AdminDashboard" />} />
<Route path="/admin/*" element={<PageRoute pageKey="AdminDashboard" />} />
```

Same pattern as auth — intentional catch-all. Correct.

---

## 5. Internal `window.location` Hard Navigations

These cause a full page reload, breaking the app-shell feel and destroying React state.

### Category A — Must be replaced with `navigate()` (Stage 2)

| File | Code | Fix |
|------|------|-----|
| `src/pages/AgeGate.jsx` | `window.location.href = nextUrl` | `navigate(nextUrl, { replace: true })` |
| `src/pages/AgeGate.jsx` | `window.location.href = '/auth'` | `navigate('/auth')` |
| `src/pages/Auth.jsx` | `window.location.href = createPageUrl('Profile')` | `navigate(createPageUrl('Profile'))` |
| `src/pages/Profile.jsx` | `window.location.href = safeNext \|\| createPageUrl('Home')` | `navigate(safeNext \|\| '/')` |
| `src/pages/Profile.jsx` (button) | `window.location.href = createPageUrl('Home')` | `navigate('/')` |
| `src/pages/OnboardingGate.jsx` | `window.location.href = createPageUrl('Home')` | `navigate('/')` |
| `src/pages/OnboardingGate.jsx` | `window.location.href = createPageUrl('Profile')` | `navigate(createPageUrl('Profile'))` |
| `src/pages/ProfileSetup.jsx` | `window.location.href = createPageUrl('Profile')` | `navigate(createPageUrl('Profile'))` |
| `src/pages/AccountConsents.jsx` | `window.location.href = createPageUrl('Profile')` | `navigate(createPageUrl('Profile'))` |
| `src/pages/Login.jsx` | `window.location.href = returnUrl` | `navigate(returnUrl, { replace: true })` |
| `src/pages/PromoteToAdmin.jsx` | `window.location.href = '/'` (both occurrences) | `navigate('/')` |

### Category B — Legitimate external/hard navigations (keep as-is)

| File | Code | Reason |
|------|------|--------|
| `src/pages/CheckoutStart.jsx` | `window.location.assign(checkoutUrl)` | Shopify checkout — external domain |
| `src/pages/MembershipUpgrade.jsx` | `window.location.href = result.url` | Stripe — external domain |
| `src/pages/InviteFriends.jsx` | `window.location.href = 'sms:?body=...'` | SMS deep link protocol |
| `src/pages/Music.jsx` | `window.location.href = url` | SoundCloud external URL |
| `src/pages/AgeGate.jsx` | `window.location.href = 'https://www.google.com'` | Under-18 off-site redirect |
| `src/lib/AuthContext.jsx` | `base44.auth.logout(window.location.href)` | Supabase auth redirect |
| `src/lib/AuthContext.jsx` | `base44.auth.redirectToLogin(window.location.href)` | Supabase auth redirect |
| `src/pages/Chat.jsx`, `SquadChat.jsx`, `Checkout.jsx`, `Settings.jsx`, `Connect.jsx` | `base44.auth.requireProfile(window.location.href)` | Auth redirect with return URL |

### Category C — Read-only usage (safe, keep as-is)

| File | Code | Reason |
|------|------|--------|
| `src/utils/legacyRedirects.js` | `window.location.href` / `window.location.pathname` | Reads only, used for SSR compat check |
| `src/pages/InviteFriends.jsx` | `window.location.origin` | Building absolute URL for share |
| `src/pages/MembershipUpgrade.jsx` | `window.location.origin` | Building Stripe return URL |
| `src/pages/Login.jsx` | `window.location.origin` | Building return URL |
| `src/pages/Stats.jsx` | `window.location.href` | Building share URL (read) |
| `src/pages/Community.jsx` | `navigator.clipboard.writeText(window.location.href)` | Clipboard copy |
| `src/pages/Connect.jsx` | `new URLSearchParams(window.location.search)` | Reads search params |
| `src/pages/OSDemo.jsx` | `window.location.search` | Dev demo display |
| `src/pages/CreatorDashboard.jsx` | `window.location.reload()` | Error recovery — acceptable |

---

## 6. Route Authority Summary

| Rule | Current state | Target |
|------|--------------|--------|
| One route table | ✅ All in `App.jsx` | Keep |
| No duplicate paths | ❌ 4 duplicate paths found | Fix in Stage 2 |
| No dead routes | ❌ `/social/u/:email` dead, `/onboarding` second variant dead | Fix in Stage 2 |
| No internal `window.location` navigation | ❌ 11 internal hard-nav call sites | Fix in Stage 2 |
| Legacy redirects go to canonical URLs | ❌ Some redirect to PascalCase page URLs (2-hop) | Fix in Stage 2 |
| Splat order correct | ⚠️ Minor ordering issues — no functional impact | Fix in Stage 2 |
