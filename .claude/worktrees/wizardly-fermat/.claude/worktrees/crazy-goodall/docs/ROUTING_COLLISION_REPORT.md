# HOTMESS Routing Collision Report

**Version:** 1.0  
**Date:** 2026-02-20  
**Purpose:** Document duplicate routes, internal hard reloads, and navigation conflicts

---

## 1. Duplicate Route Declarations

### Exact Duplicates in App.jsx

| Route | First Declaration | Second Declaration | Resolution |
|-------|-------------------|-------------------|------------|
| `/onboarding` | Line 319 | Line 365 | Remove line 365 |
| `/more/beacons` | Line 410 | Line 479 | Remove line 479 |
| `/more/beacons/new` | Line 411 | Line 480 | Remove line 480 |
| `/more/beacons/:id` | Line 412 | Line 481 | Remove line 481 |

### Overlapping Route Patterns

| Pattern | Specific Route | Risk | Resolution |
|---------|---------------|------|------------|
| `/auth/*` | `/auth`, `/auth/sign-in`, `/auth/sign-up`, etc. | Splat may swallow children | Keep both, ensure order |
| `/onboarding/*` | `/onboarding`, `/onboarding/consent`, etc. | Splat may swallow children | Keep both, ensure order |
| `/safety/*` | `/safety`, `/safety/report`, `/safety/resources` | Splat may swallow children | Keep both, ensure order |
| `/calendar/*` | `/calendar` | Unnecessary splat | Remove splat |
| `/scan/*` | `/scan` | Unnecessary splat | Remove splat |
| `/community/*` | `/community` | Unnecessary splat | Remove splat |
| `/leaderboard/*` | `/leaderboard` | Unnecessary splat | Remove splat |
| `/admin/*` | `/admin` | Keep (admin has subroutes) | No change |
| `/connect/*` | `/connect` | Redirect only | Keep |
| `/account/*` | Many redirects | Keep (legacy) | No change |
| `/notifications/*` | Redirect to Settings | Keep (legacy) | No change |

---

## 2. window.location.href Usage (Hard Reloads)

### Critical (Boot/Auth Flow) — HIGH PRIORITY
These cause state loss during authentication:

| File | Line | Code | Resolution |
|------|------|------|------------|
| `src/pages/Auth.jsx` | 84 | `window.location.href = createPageUrl('Profile')` | Replace with navigate |
| `src/pages/Auth.jsx` | 92 | `window.location.href = redirect` | Replace with navigate |
| `src/pages/Auth.jsx` | 159 | `window.location.href = redirect` | Replace with navigate |
| `src/pages/Auth.jsx` | 358 | `window.location.href = nextUrl \|\| createPageUrl('Home')` | Replace with navigate |
| `src/pages/Auth.jsx` | 548 | `window.location.href = next` | Replace with navigate |
| `src/pages/AgeGate.jsx` | 130 | `window.location.href = nextUrl` | Replace with navigate |
| `src/pages/AgeGate.jsx` | 133 | `window.location.href = '/auth'` | Replace with navigate('/auth') |
| `src/pages/OnboardingGate.jsx` | 42 | `window.location.href = createPageUrl('Home')` | Replace with navigate |
| `src/pages/OnboardingGate.jsx` | 45 | `window.location.href = createPageUrl('Profile')` | Replace with navigate |
| `src/pages/OnboardingGate.jsx` | 84 | `window.location.href = createPageUrl('Profile')` | Replace with navigate |
| `src/pages/Login.jsx` | 61 | `window.location.href = returnUrl` | Replace with navigate |
| `src/Layout.jsx` | 183 | `window.location.href = createPageUrl('AccountConsents')` | Replace with navigate |
| `src/Layout.jsx` | 195 | `window.location.href = createPageUrl('OnboardingGate')` | Replace with navigate |
| `src/Layout.jsx` | 208 | `window.location.href = \`${createPageUrl('Profile')}?next=${next}\`` | Replace with navigate |

### Medium Priority (Profile/Navigation)
These cause unnecessary reloads during navigation:

| File | Line | Code | Resolution |
|------|------|------|------------|
| `src/pages/Profile.jsx` | 519 | `window.location.href = safeNext \|\| createPageUrl('Home')` | Replace with navigate |
| `src/pages/Profile.jsx` | 548 | `window.location.href = createPageUrl('Home')` | Replace with navigate |
| `src/pages/ProfileSetup.jsx` | 7 | `window.location.href = createPageUrl('Profile')` | Replace with navigate |
| `src/pages/AccountConsents.jsx` | 70 | `window.location.href = createPageUrl('Profile')` | Replace with navigate |
| `src/pages/PromoteToAdmin.jsx` | 23, 43 | `window.location.href = '/'` | Replace with navigate |
| `src/components/sheets/L2ProfileSheet.jsx` | 393 | `window.location.href = '/settings'` | Replace with navigate |
| `src/features/profilesGrid/ProfilesGrid.tsx` | 203 | `window.location.href = url` | Replace with navigate |
| `src/features/profilesGrid/ProfilesGridWithMatch.tsx` | 212 | `window.location.href = url` | Replace with navigate |
| `src/components/discovery/FiltersDrawer.jsx` | 149 | `window.location.href = createPageUrl(path)` | Replace with navigate |

### Low Priority (Error/Edge Cases)
These are acceptable edge cases or intentional:

| File | Line | Code | Acceptable? |
|------|------|------|-------------|
| `src/lib/PageNotFound.jsx` | 59 | `window.location.href = '/'` | Maybe (error recovery) |
| `src/components/error/PageErrorBoundary.jsx` | 80 | `window.location.href = createPageUrl('Home')` | Yes (error recovery) |
| `src/components/error/ErrorBoundary.jsx` | 43 | `window.location.href = '/'` | Yes (error recovery) |
| `src/pages/AgeGate.jsx` | 138 | `window.location.href = 'https://www.google.com'` | Yes (exit site) |
| `src/components/splash/HotmessSplash.jsx` | 126 | `window.location.href = 'https://google.com'` | Yes (exit site) |
| `src/components/auth/AgeGate.jsx` | 11 | `window.location.href = 'https://google.com'` | Yes (exit site) |

### External Redirects (KEEP)
These are intentional external navigations:

| File | Line | Code | Keep? |
|------|------|------|-------|
| `src/pages/MembershipUpgrade.jsx` | 153 | `window.location.href = result.url` | Yes (Stripe checkout) |
| `src/pages/InviteFriends.jsx` | 129 | `window.location.href = \`sms:?body=${text}\`` | Yes (SMS intent) |
| `src/pages/Music.jsx` | 317 | `window.location.href = url` | Review (external link?) |
| `src/components/admin/RecordManager.tsx` | 40 | `window.location.href = '/api/soundcloud/authorize'` | Yes (OAuth redirect) |
| `src/components/social/ShareButton.jsx` | 133 | `window.location.href = \`mailto:?...\`` | Yes (mailto intent) |
| `src/components/utils/supabaseClient.jsx` | 498 | `window.location.href = redirectUrl` | Review (OAuth?) |
| `src/components/utils/supabaseClient.jsx` | 505 | `window.location.href = createPageUrl('Auth')...` | Replace with navigate |

### Safety Features (KEEP)
These are intentional for safety flows:

| File | Line | Code | Keep? |
|------|------|------|-------|
| `src/components/safety/LiveLocationShare.jsx` | 503 | `window.location.href = '/safety'` | Replace (internal) |
| `src/components/safety/FakeCallGenerator.jsx` | 137 | `window.location.href = '/safety'` | Replace (internal) |

### Directions (KEEP)
These handle external map intents:

| File | Line | Code | Keep? |
|------|------|------|-------|
| `src/components/directions/InAppDirections.jsx` | 209 | `window.location.href = \`/directions?...\`` | Replace (internal) |

### Splash (Review)
| File | Line | Code | Keep? |
|------|------|------|-------|
| `src/components/splash/HotmessSplash.jsx` | 182 | `window.location.href = createPageUrl('Home')` | Replace (internal) |

---

## 3. Navigation Authority Conflicts

### Current Navigation Methods (Ranked by Priority)

| Method | Authority Level | Usage | Should Be |
|--------|-----------------|-------|-----------|
| React Router `<Route>` | 1 (Canonical) | App.jsx | Keep |
| `useNavigate()` | 2 (Correct) | Many | Keep |
| `<Link to>` | 2 (Correct) | Many | Keep |
| `<Navigate to>` | 2 (Correct) | Redirects | Keep |
| `window.location.href` | 3 (Avoid) | 40+ files | Replace |
| `SheetContext ?sheet=` URL sync | 2 (Integrated) | SheetContext | Keep |

### URL Parameter Conflicts

| Parameter | Owner | Conflict Risk |
|-----------|-------|---------------|
| `?sheet=` | SheetContext | None (canonical) |
| `?id=` | Multiple | Ambiguous (beacon, product, profile) |
| `?email=` | Profile | None |
| `?handle=` | Product | None |
| `?thread=` | Messages | None |
| `?next=` | Auth flow | None |
| `?collection=` | Market | None |

**Resolution:** Add namespacing to `?id=`:
- `?beacon_id=` for beacons
- `?product_id=` for products
- `?profile_id=` or `?uid=` for profiles

---

## 4. Legacy Redirect Routes (Keep for Compatibility)

These routes exist for backward compatibility and should NOT be removed:

```jsx
// Shop aliases
<Route path="/shop" element={<Navigate to="/market" replace />} />
<Route path="/marketplace" element={<Navigate to="/market" replace />} />

// Radio aliases
<Route path="/radio" element={<Navigate to={createPageUrl('Radio')} replace />} />
<Route path="/radio/schedule" element={<Navigate to={createPageUrl('RadioSchedule')} replace />} />

// Social aliases
<Route path="/connect" element={<Navigate to={createPageUrl('Social')} replace />} />
<Route path="/connect/*" element={<Navigate to={createPageUrl('Social')} replace />} />

// Account aliases (many)
<Route path="/account" element={<Navigate to={createPageUrl('Settings')} replace />} />
// ... etc.
```

---

## 5. Resolution Plan

### Phase 1: Route Deduplication (Low Risk)
Remove exact duplicates in App.jsx:
- Lines 365 (`/onboarding` duplicate)
- Lines 479-481 (`/more/beacons/*` duplicates)

### Phase 2: Create nav.go() Wrapper
```typescript
// src/lib/nav.ts
import { useNavigate } from 'react-router-dom';
import { useSheet } from '@/contexts/SheetContext';

export function useNav() {
  const navigate = useNavigate();
  const { closeSheet, activeSheet } = useSheet();
  
  const go = (path: string, opts?: { replace?: boolean }) => {
    navigate(path, opts);
  };
  
  const goBack = () => {
    if (activeSheet) {
      closeSheet();
    } else {
      navigate(-1);
    }
  };
  
  return { go, goBack };
}
```

### Phase 3: Replace window.location.href (HIGH PRIORITY)
Replace internal navigations in order:
1. Auth flow (Auth.jsx, AgeGate.jsx, OnboardingGate.jsx, Login.jsx)
2. Layout.jsx gating redirects
3. Profile/navigation flows
4. Feature components

### Phase 4: Remove Unnecessary Splats
Convert `/*` splats to explicit child routes:
- `/calendar/*` → `/calendar`
- `/scan/*` → `/scan`
- `/community/*` → `/community`
- `/leaderboard/*` → `/leaderboard`

---

## 6. Verification Checklist

After migration:
- [ ] Tab switching does not reload app
- [ ] Back button is deterministic (overlay pop → route back)
- [ ] Deep links work (`/profile?email=...`, `/market/p/handle`)
- [ ] Auth redirects preserve return URL
- [ ] No console errors about navigation
- [ ] No flash of content during navigation
- [ ] Playwright navigation tests pass
