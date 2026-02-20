# HOTMESS Profile & Maps Authority

**Version:** 1.0  
**Date:** 2026-02-20  
**Purpose:** Define ONE Profile authority for all profile/map interactions

---

## 1. Current State (Problem)

Profile-related functionality is scattered across 15+ components:

### Pages
- `src/pages/Profile.jsx` — Full profile page (route: `/Profile`)
- `src/pages/EditProfile.jsx` — Edit profile page
- `src/pages/ProfilesGrid.jsx` — Profile discovery grid (route: `/ProfilesGrid`)
- `src/pages/ProfileSetup.jsx` — Initial profile setup

### Features
- `src/features/profilesGrid/ProfilesGrid.tsx` — Actual grid implementation
- `src/features/profilesGrid/ProfilesGridWithMatch.tsx` — Grid with match scoring
- `src/features/profilesGrid/ProfileCard.tsx` — Grid card
- `src/features/profilesGrid/SmartProfileCard.tsx` — Enhanced card
- `src/features/profilesGrid/GPSSmartCard.tsx` — Location-aware card

### Sheets
- `src/components/sheets/L2ProfileSheet.jsx` — Sheet profile view
- `src/components/sheets/MiniProfileSheet.tsx` — Compact sheet

### Views (Variants)
- `src/components/profile/StandardProfileView.jsx`
- `src/components/profile/CreatorProfileView.jsx`
- `src/components/profile/SellerProfileView.jsx`
- `src/components/profile/OrganizerProfileView.jsx`
- `src/components/profile/PremiumProfileView.jsx`

### Cards
- `src/components/social/TacticalProfileCard.jsx`
- `src/components/react-bits/ProfileCard/ProfileCard.jsx`

### Support
- `src/components/profile/ProfileStats.jsx`
- `src/components/profile/ProfileHeader.jsx`
- `src/components/profile/ProfileWingman.jsx`
- `src/components/profile/ProfileCompleteness.jsx`
- `src/components/profile/ProfileOptimizer.jsx`

---

## 2. Maps Integration

### Current Globe/Map Profile Opening
The Globe shows user presence beacons. Clicking a beacon should open that user's profile.

**Current Flow:**
1. Globe renders beacon markers
2. Click marker → ??? (inconsistent)
3. Some markers open L2ProfileSheet
4. Some markers navigate to Profile page
5. Some markers do nothing

**Problem:** No single entry point for "open profile from map".

---

## 3. Target Architecture

### Contract E: Profile Authority

```typescript
// src/lib/profile.ts

export type ProfileSource = 
  | 'grid'      // ProfilesGrid tap
  | 'globe'     // Globe beacon tap
  | 'map'       // Map marker tap
  | 'search'    // Search result tap
  | 'deeplink'  // Direct URL
  | 'chat'      // Message thread tap
  | 'mention'   // @mention tap
  | 'social';   // Social feed tap

export interface ProfileOpenOptions {
  /** User ID or account_id */
  userId: string;
  
  /** Where the open was triggered from */
  source: ProfileSource;
  
  /** Prefer sheet over route (mobile default: true) */
  preferSheet?: boolean;
  
  /** Email for legacy deep links */
  email?: string;
  
  /** Additional context to pass to profile */
  context?: Record<string, unknown>;
}

/**
 * Single entry point for all profile opens
 */
export function openProfile(options: ProfileOpenOptions): void;

/**
 * Hook version for components
 */
export function useProfileOpener(): {
  open: (options: ProfileOpenOptions) => void;
  close: () => void;
  isOpen: boolean;
  currentUserId: string | null;
};
```

### Implementation

```typescript
// src/lib/profile.ts
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Detect mobile (simplified)
const isMobile = () => window.innerWidth < 768;

export function useProfileOpener() {
  const { openSheet, closeSheet, isSheetOpen, sheetProps } = useSheet();
  const navigate = useNavigate();
  
  const open = (options: ProfileOpenOptions) => {
    const { userId, source, preferSheet = isMobile(), email, context } = options;
    
    // Log for analytics
    console.log(`[Profile] Opening ${userId} from ${source}`);
    
    if (preferSheet) {
      // Open as L2 sheet (preferred on mobile)
      openSheet(SHEET_TYPES.PROFILE, {
        id: userId,
        email,
        source,
        ...context,
      });
    } else {
      // Navigate to profile route (desktop or deeplink)
      const url = email 
        ? `${createPageUrl('Profile')}?email=${encodeURIComponent(email)}`
        : `${createPageUrl('Profile')}?uid=${encodeURIComponent(userId)}`;
      navigate(url);
    }
  };
  
  const close = () => {
    closeSheet();
  };
  
  return {
    open,
    close,
    isOpen: isSheetOpen(SHEET_TYPES.PROFILE),
    currentUserId: sheetProps?.id || null,
  };
}
```

---

## 4. Component Consolidation

### ProfileCard (CANONICAL)
**File:** `src/features/profilesGrid/ProfileCard.tsx`

Merge features from:
- SmartProfileCard.tsx → Add `smart` prop
- TacticalProfileCard.jsx → Add `tactical` prop
- GPSSmartCard.tsx → Add `showDistance` prop

```typescript
interface ProfileCardProps {
  profile: Profile;
  
  // Display modes
  variant?: 'default' | 'smart' | 'tactical' | 'mini';
  
  // Features
  showDistance?: boolean;
  showMatchScore?: boolean;
  showBadges?: boolean;
  showOnlineStatus?: boolean;
  
  // Actions
  onTap?: () => void;
  onMessage?: () => void;
  onWink?: () => void;
}
```

### ProfilesGrid (CANONICAL)
**File:** `src/features/profilesGrid/ProfilesGrid.tsx`

Merge features from ProfilesGridWithMatch.tsx:
- Add `showMatchBar` prop
- Add `sortOptions` prop
- Remove separate component

### L2ProfileSheet (CANONICAL)
**File:** `src/components/sheets/L2ProfileSheet.jsx`

Merge MiniProfileSheet:
- Add `compact` prop for mini mode
- Keep full sheet as default

---

## 5. View Variants (KEEP)

The profile view variants serve different user types:
- **StandardProfileView** — Default user
- **CreatorProfileView** — Content creators (shows content)
- **SellerProfileView** — Marketplace sellers (shows listings)
- **OrganizerProfileView** — Event organizers (shows events)
- **PremiumProfileView** — Premium members (shows perks)

**Selection Logic:**
```typescript
function selectProfileView(profile: Profile): ComponentType {
  if (profile.is_creator) return CreatorProfileView;
  if (profile.is_seller) return SellerProfileView;
  if (profile.is_organizer) return OrganizerProfileView;
  if (profile.membership_tier === 'premium') return PremiumProfileView;
  return StandardProfileView;
}
```

This logic should live in L2ProfileSheet, not scattered.

---

## 6. Globe Integration

### Beacon Click Handler
```typescript
// In Globe/GlobeBeacons component
const { open: openProfile } = useProfileOpener();

const handleBeaconClick = (beacon: Beacon) => {
  if (beacon.type === 'presence' && beacon.user_id) {
    openProfile({
      userId: beacon.user_id,
      source: 'globe',
      preferSheet: true, // Always sheet from globe
    });
  } else if (beacon.type === 'event') {
    // Open event sheet instead
    openSheet(SHEET_TYPES.EVENT, { id: beacon.event_id });
  }
};
```

### Map Marker Click Handler
```typescript
// In Map component (Mapbox)
const { open: openProfile } = useProfileOpener();

map.on('click', 'presence-layer', (e) => {
  const feature = e.features?.[0];
  if (feature?.properties?.user_id) {
    openProfile({
      userId: feature.properties.user_id,
      source: 'map',
      preferSheet: true,
    });
  }
});
```

---

## 7. Deep Link Support

### URL Patterns
- `/Profile?uid={userId}` — Primary
- `/Profile?email={email}` — Legacy
- `/social/u/{userId}` — Redirect to Profile

### Deep Link Handler
```typescript
// In Profile.jsx page
const { uid, email } = useSearchParams();
const { open: openProfile } = useProfileOpener();

useEffect(() => {
  if (uid || email) {
    // If accessed via deep link, could still show as sheet
    // or render inline depending on UX preference
  }
}, [uid, email]);
```

---

## 8. Back Button Behavior

### Rules
1. If profile is open as sheet → Close sheet (stay on current route)
2. If profile is open as page → Navigate back

### Implementation
```typescript
// In useNav hook
const goBack = () => {
  if (isSheetOpen(SHEET_TYPES.PROFILE)) {
    closeSheet();
  } else {
    navigate(-1);
  }
};
```

---

## 9. Migration Checklist

### Phase 1: Create Contract
- [x] Create `src/lib/profile.ts` with `useProfileOpener` ✅ Stage 4
- [ ] Export from lib index (optional)

### Phase 2: Update Entry Points
- [x] ProfilesGrid.tsx → Use `useProfileOpener` ✅ Stage 4
- [ ] ProfilesGridWithMatch.tsx → Use `useProfileOpener` (deferred: merge later)
- [x] Globe beacon click → Use `useProfileOpener` ✅ Stage 4
- [ ] Map marker click → Use `useProfileOpener` (Mapbox)
- [ ] Search results → Use `useProfileOpener`
- [ ] Chat thread tap → Use `useProfileOpener`
- [ ] Social feed taps → Use `useProfileOpener`

### Phase 3: Consolidate Cards (DEFERRED)
- [ ] Merge SmartProfileCard into ProfileCard
- [ ] Remove TacticalProfileCard (replace usages)
- [ ] Remove react-bits ProfileCard (unused)

### Phase 4: Consolidate Sheets (DEFERRED)
- [ ] Add `compact` mode to L2ProfileSheet
- [ ] Remove MiniProfileSheet

### Phase 5: Verify
- [x] Grid tap → Opens profile sheet ✅ Stage 4
- [x] Globe tap → Opens profile sheet ✅ Stage 4
- [ ] Map tap → Opens profile sheet
- [ ] Search tap → Opens profile sheet
- [ ] Deep link → Works correctly
- [ ] Back button → Deterministic

---

## 10. Files to Modify/Delete

| File | Action |
|------|--------|
| `src/lib/profile.ts` | CREATE |
| `src/features/profilesGrid/ProfileCard.tsx` | MODIFY (add variants) |
| `src/features/profilesGrid/ProfilesGrid.tsx` | MODIFY (use contract) |
| `src/features/profilesGrid/ProfilesGridWithMatch.tsx` | DELETE (merge) |
| `src/features/profilesGrid/SmartProfileCard.tsx` | DELETE (merge) |
| `src/components/social/TacticalProfileCard.jsx` | DELETE (replace) |
| `src/components/sheets/MiniProfileSheet.tsx` | DELETE (merge) |
| `src/components/sheets/L2ProfileSheet.jsx` | MODIFY (add compact) |
| `src/components/globe/GlobeBeacons.tsx` | MODIFY (use contract) |
| `src/pages/Profile.jsx` | MODIFY (handle deep links) |
