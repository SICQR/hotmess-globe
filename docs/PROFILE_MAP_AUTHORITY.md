# Profile + Map Authority
**Version:** 1.0  
**Date:** 2026-02-20  
**Status:** Stage 1 intelligence — defines the single authority contract (Contract E)

---

## Purpose

Define ONE profile authority so that:
1. Every surface that opens a profile calls the same function.
2. The profile renders in the correct context (sheet on mobile, route on direct URL).
3. Back behavior is deterministic.
4. Map marker selection is a first-class profile opener, not an ad-hoc implementation.

---

## 1. Current State Audit

### 1.1 Entry points that open a profile

| Surface | Current mechanism | Target |
|---------|------------------|--------|
| ProfilesGrid (Social/Discover) | `openSheet(SHEET_TYPES.PROFILE, { email })` via SheetContext | ✅ Correct pattern — adapt to `nav.openProfile()` |
| Globe marker tap | Unknown — `Globe.jsx` needs audit | `nav.openProfile(userId, 'globe')` |
| Home `RightNowOverlay` | `<Link to={createPageUrl('Profile')}>` | `nav.openProfile(userId, 'home')` |
| Search results | Direct route nav | `nav.openProfile(userId, 'search')` |
| DM / chat header | Route nav or inline card | `nav.openProfile(userId, 'chat')` |
| `/social/u/:id` deep link | `SocialUserRedirect` → Profile page | **Keep route** — Profile page renders for direct URL |
| Leaderboard | Route nav | `nav.openProfile(userId, 'leaderboard')` |
| Beacons detail | Route nav | `nav.openProfile(userId, 'beacon')` |

### 1.2 Profile rendering variants

| Component | Type | Used by |
|-----------|------|---------|
| `src/pages/Profile.jsx` | Full-page route render | Direct URL, redirect targets |
| `src/components/sheets/L2ProfileSheet.jsx` | Sheet overlay (L2) | SheetContext callers |
| `src/components/sheets/MiniProfileSheet.tsx` | Compact inline sheet | Some social surfaces |
| `src/components/profile/StandardProfileView.jsx` | Sub-view inside Profile page | Profile page only |
| `src/components/profile/SellerProfileView.jsx` | Sub-view inside Profile page | Profile page only |
| `src/components/profile/CreatorProfileView.jsx` | Sub-view inside Profile page | Profile page only |
| `src/components/profile/PremiumProfileView.jsx` | Sub-view inside Profile page | Profile page only |
| `src/components/profile/OrganizerProfileView.jsx` | Sub-view inside Profile page | Profile page only |
| `src/features/profilesGrid/ProfileCard.tsx` | Card in grid (not a full profile) | ProfilesGrid |
| `src/features/profilesGrid/SmartProfileCard.tsx` | Enriched card | ProfilesGrid |
| `src/components/social/TacticalProfileCard.jsx` | Compact card (no navigation) | Inline social surfaces |

**Profile variants to consolidate:**

- `L2ProfileSheet` → canonical sheet renderer (keep)
- `MiniProfileSheet` → retire; use `L2ProfileSheet` with `compact` prop
- Sub-views (`StandardProfileView`, etc.) → internal to Profile page (keep)
- Cards (`ProfileCard`, `SmartProfileCard`, `TacticalProfileCard`) → grid/preview only, not profile openers (keep)

---

## 2. Target Profile Authority Contract (Contract E)

### 2.1 The single opener function

```ts
// src/lib/nav.ts (create in Stage 5)
export function openProfile(
  userId: string,
  source: 'grid' | 'globe' | 'map' | 'search' | 'chat' | 'beacon' | 'deeplink' | 'home' | 'leaderboard'
): void {
  // On mobile (default): open as L2 sheet
  // On direct URL / deeplink: already handled by router
  openSheet(SHEET_TYPES.PROFILE, { uid: userId, source });
}
```

All surfaces call `nav.openProfile(userId, source)`. The function is the **single point of entry** for opening a profile programmatically.

### 2.2 Route-based entry (deep links)

The route `/social/u/:id` remains canonical for deep links:

```jsx
// App.jsx (existing)
<Route path="/social/u/:id" element={<SocialUserRedirect />} />
```

`SocialUserRedirect` calls `nav.openProfile(id, 'deeplink')` which opens the sheet. If JavaScript hasn't loaded yet (SSR/crawler), the `Profile` page route serves as the fallback.

### 2.3 Back behavior rules

| Context | Back action | Result |
|---------|------------|--------|
| Profile opened as sheet | Tap back / swipe down | `closeSheet()` → returns to previous surface |
| Profile opened from direct URL `/social/u/:id` | Browser back | React Router `navigate(-1)` → previous route |
| Profile opened from sheet inside another sheet (nested) | Tap back | `popSheet()` → returns to parent sheet |
| Profile page with `?returnTo=` param | Explicit close button | `navigate(returnTo)` |

---

## 3. Maps Responsibilities

### 3.1 Current state

`Globe.jsx` renders the map (Mapbox/Three.js). Marker/pin selection in `Globe.jsx` appears to open a "bottom sheet" or navigate, but the exact mechanism needs audit.

`src/components/globe/LocalBeaconsView.jsx`, `BeaconPreviewPanel.jsx`, `NearbyGrid.jsx` — these are components rendered inside the Globe surface that show nearby users/beacons.

### 3.2 Map marker → profile authority

Map pin types defined in the OS Bible:

| Pin type | Tap action |
|----------|-----------|
| People pin | `nav.openProfile(userId, 'globe')` |
| Event pin | `openSheet(SHEET_TYPES.EVENT, { eventId })` |
| Care pin | `navigate('/safety')` |
| Market pin | `openSheet(SHEET_TYPES.MARKET, { itemId })` |

**Rule:** No map component may open its own custom overlay or navigate directly. All map tap actions must go through the OS contracts (Sheet API or `nav.go()`).

### 3.3 Globe lifecycle

- `UnifiedGlobe` mounts ONCE at L0 and never unmounts.
- Globe does NOT remount on route/tab change.
- Globe's realtime channels are owned by `WorldPulseContext` (ambient) and `useRealtimeBeacons` (beacon pins).
- These channels subscribe once on mount and unsubscribe on logout.

### 3.4 Globe component ownership

| Component | Owner | Realtime channels |
|-----------|-------|------------------|
| `UnifiedGlobe` | `src/App.jsx` L0 slot | None (wrapper only) |
| `Globe.jsx` (page) | Globe module | `beacons-realtime`, `user-activities-realtime` |
| `useRealtimeBeacons.js` | Globe module | `presence-beacons`, `events-beacons`, `presence-count` |
| `ActivityStream.jsx` | Globe module | `globe-activities`, `globe-checkins`, `globe-rightnow`, `globe-messages`, `globe-orders`, `globe-rsvps` |
| `WorldPulseContext` | Ring 1 (ambient) | `world-pulse-beacons`, `world-pulse-checkins` |

**Target:** `Globe.jsx` and `useRealtimeBeacons.js` should be merged so there is one beacon realtime channel, not two separate subscriptions to the `beacons` table.

---

## 4. Profile Lookup Contract

The `Profile` page (and `L2ProfileSheet`) accept:
- `?email=` query param (legacy, from Base44 era)
- `?uid=` query param (preferred, Supabase auth UID)

### Canonical lookup

```ts
// /api/profile?uid=<uuid>  OR  /api/profile?email=<email>
// Returns: { id, email, full_name, avatar_url, city, profile_type, ... }
```

Both lookups must be supported until all callers are migrated to UID-only.

### Migration target (Stage 5)

All callers of `nav.openProfile()` pass `userId` (UUID). The `email`-based lookup becomes a fallback for legacy deep links only.

---

## 5. Definition of Done (Stage 5 Gate)

- [ ] `nav.openProfile(userId, source)` exists in `src/lib/nav.ts`
- [ ] All profile openers (grid, globe marker, home overlay, search) call `nav.openProfile`
- [ ] Globe map markers call `nav.openProfile` for people pins
- [ ] `MiniProfileSheet` removed; `L2ProfileSheet` handles compact mode
- [ ] `/social/u/:id` deep link works and opens sheet
- [ ] Back from profile sheet returns to correct previous surface
- [ ] Back from profile page (direct URL) goes to previous route
- [ ] No `window.location` used to navigate to profiles
