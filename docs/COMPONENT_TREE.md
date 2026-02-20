# HOTMESS OS — Component Tree Diagram

**Created:** 2026-02-20  
**Status:** Stage 0 Documentation

This document defines the authoritative component hierarchy for the mobile-first OS architecture.

---

## 1. ROOT COMPONENT TREE

```
<React.StrictMode>
  │
  └─ <Sentry.ErrorBoundary>
      │
      └─ <ErrorBoundary>                              Ring 0 (Recovery)
          │
          └─ <OSProvider>                             Ring 0 (OS FSM)
              │
              └─ <App>
                  │
                  └─ <BrowserRouter>                  Ring 1 (Navigation)
                      │
                      ├─ <QueryClientProvider>        Ring 1 (Data)
                      │
                      ├─ <ToastProvider>              Ring 1 (Notifications)
                      │
                      └─ <BootGuardProvider>          Ring 2 (Auth) ⭐ CANONICAL AUTH OWNER
                          │
                          ├─ <I18nProvider>           Ring 2 (i18n)
                          │
                          ├─ <SheetProvider>          Ring 2 (Overlays) ⭐ OUTSIDE ROUTES
                          │   │
                          │   └─ <SheetRenderer>      (Portal renders overlays)
                          │
                          └─ <AppShell>               Ring 3 (Layout)
                              │
                              ├─ <PersistentBackdrop> (z: 0)
                              │   │
                              │   └─ <GlobeCanvas>    (Three.js / Mapbox)
                              │
                              ├─ <RouteOutlet>        (z: 10)
                              │   │
                              │   └─ <Routes>
                              │       ├─ / → <GhostedMode>
                              │       ├─ /pulse → <PulseMode>
                              │       ├─ /market → <MarketMode>
                              │       ├─ /radio → <RadioMode>
                              │       ├─ /profile → <ProfileMode>
                              │       └─ ... other routes
                              │
                              ├─ <BottomDock>         (z: 20)
                              │
                              ├─ <SheetRoot>          (z: 30) Portal target
                              │
                              ├─ <ModalRoot>          (z: 40) Portal target
                              │
                              └─ <CriticalRoot>       (z: 50) Portal target
```

---

## 2. PROVIDER HIERARCHY (ORDER MATTERS)

```
1. ErrorBoundary
   ├─ Catches all errors
   └─ Shows fallback UI

2. OSProvider
   ├─ OS-level state machine
   ├─ Boot interrupts (age gate, consent)
   └─ Critical alerts

3. BrowserRouter
   ├─ Single navigation authority
   └─ History stack management

4. QueryClientProvider
   ├─ TanStack Query cache
   └─ Data fetching

5. BootGuardProvider ⭐
   ├─ CANONICAL onAuthStateChange listener
   ├─ Session management
   ├─ Boot gate flow (age → consent → profile)
   └─ Post-login side effects (once)

6. SheetProvider
   ├─ OUTSIDE route boundary
   ├─ LIFO sheet stack
   └─ Back button integration
```

---

## 3. MODE COMPONENTS

### GhostedMode (Default Surface)
```
<GhostedMode>
  │
  ├─ <GhostedHeader>
  │   ├─ Filter selector
  │   ├─ Notification bell
  │   └─ Location indicator
  │
  └─ <ProfilesGrid>
      ├─ <VirtualGrid>
      │   └─ <ProfileCard>[]
      │       ├─ Primary photo
      │       ├─ Display name
      │       ├─ Distance
      │       └─ Online indicator
      │
      └─ <InfiniteLoader>
```

### PulseMode (Globe Surface)
```
<PulseMode>
  │
  ├─ <GlobeOverlay>
  │   ├─ Stats HUD
  │   ├─ Safety indicator
  │   └─ Event count
  │
  └─ <GlobeInteraction>
      ├─ onBeaconTap → openProfile()
      ├─ onEventTap → openEvent()
      └─ onSafetyTap → openSafety()
```

### MarketMode
```
<MarketMode>
  │
  ├─ <MarketHeader>
  │   ├─ Search
  │   └─ Cart button
  │
  ├─ <MarketTabs>
  │   ├─ All
  │   ├─ Shop (Shopify)
  │   ├─ Preloved (Supabase)
  │   └─ Tickets
  │
  └─ <ProductGrid>
      └─ <ProductCard>[]       (unified component)
          ├─ Image
          ├─ Title
          ├─ Price
          └─ Source badge
```

### RadioMode
```
<RadioMode>
  │
  ├─ <RadioPlayer>
  │   ├─ Now playing
  │   ├─ Play/pause
  │   └─ Volume
  │
  └─ <ShowSchedule>
      └─ <ShowCard>[]
          ├─ Time
          ├─ Host
          └─ Show name
```

### ProfileMode
```
<ProfileMode>
  │
  ├─ <ProfileHeader>
  │   ├─ Avatar
  │   ├─ Display name
  │   └─ Edit button
  │
  └─ <SettingsList>
      ├─ Settings
      ├─ Safety
      ├─ Membership
      ├─ My Listings
      ├─ Notifications
      ├─ Privacy
      └─ Sign Out
```

---

## 4. SHEET COMPONENTS

### ProfileSheet
```
<ProfileSheet profileId={id}>
  │
  ├─ <SheetGrabber>
  │
  ├─ <ProfileHeader>
  │   ├─ Photos carousel
  │   ├─ Name + age
  │   ├─ Distance
  │   └─ Online status
  │
  ├─ <ProfileBio>
  │
  ├─ <ProfileStats>
  │
  └─ <ProfileActions>
      ├─ Message
      ├─ Connect
      └─ Block/Report
```

### ProductSheet
```
<ProductSheet productId={id}>
  │
  ├─ <SheetGrabber>
  │
  ├─ <ProductGallery>
  │   └─ Images carousel
  │
  ├─ <ProductInfo>
  │   ├─ Title
  │   ├─ Price
  │   ├─ Description
  │   └─ Seller info
  │
  └─ <ProductActions>
      ├─ Add to Cart
      └─ Buy Now
```

### EventSheet
```
<EventSheet eventId={id}>
  │
  ├─ <SheetGrabber>
  │
  ├─ <EventHeader>
  │   ├─ Cover image
  │   ├─ Title
  │   ├─ Date/time
  │   └─ Location
  │
  ├─ <EventDescription>
  │
  └─ <EventActions>
      ├─ RSVP
      ├─ Share
      └─ Directions
```

---

## 5. PERSISTENT BACKDROP

```
<PersistentBackdrop mode={currentMode}>
  │
  ├─ <GlobeCanvas>
  │   ├─ Three.js scene
  │   ├─ Earth mesh
  │   └─ Beacon markers
  │
  └─ <BackdropOverlay>
      │
      ├─ mode === 'pulse'
      │   └─ opacity: 0, blur: 0 (fully visible)
      │
      ├─ mode === 'ghosted'
      │   └─ opacity: 0.85, blur: 10px (ghosted)
      │
      ├─ mode === 'market'
      │   └─ opacity: 0.92, blur: 0 (subtle)
      │
      ├─ mode === 'radio'
      │   └─ opacity: 0.90, blur: 5px (ambient)
      │
      └─ mode === 'profile'
          └─ opacity: 0.80, blur: 10px (behind sheet)
```

---

## 6. BOTTOM DOCK

```
<BottomDock>
  │
  ├─ <DockItem route="/" icon={Grid} label="Ghosted">
  │   └─ {unreadCount > 0 && <Badge count={unreadCount} />}
  │
  ├─ <DockItem route="/pulse" icon={Globe2} label="Pulse">
  │   └─ {liveCount > 0 && <Badge count={liveCount} />}
  │
  ├─ <DockItem route="/market" icon={ShoppingBag} label="Market">
  │   └─ {cartCount > 0 && <Badge count={cartCount} />}
  │
  ├─ <DockItem route="/radio" icon={Radio} label="Radio">
  │   └─ {isPlaying && <PlayingIndicator />}
  │
  └─ <DockItem route="/profile" icon={Users} label="Profile">
```

---

## 7. OVERLAY STACK

```
<OverlayRoot>
  │
  ├─ <SheetStack>                    z: 30
  │   ├─ sheet[0] (first opened)
  │   ├─ sheet[1]
  │   └─ sheet[n] (top of stack)
  │
  ├─ <ModalStack>                    z: 40
  │   └─ modal[n]
  │
  └─ <CriticalStack>                 z: 50
      ├─ Safety alerts
      └─ Permission prompts
```

---

## 8. AUTH FLOW COMPONENTS

```
<BootGuardProvider>
  │
  ├─ if !session
  │   └─ <SplashScreen>
  │       └─ <AuthButtons>
  │           ├─ Email/Password form
  │           ├─ Google button
  │           └─ Telegram button
  │
  ├─ if session && !ageVerified
  │   └─ <AgeGate>
  │
  ├─ if session && !consentGiven
  │   └─ <ConsentForm>
  │
  ├─ if session && !profileComplete
  │   └─ <ProfileSetup>
  │
  └─ if session && allGatesPass
      └─ {children} (App content)
```

---

## 9. KEY CONTRACTS

### useProfileOpener
```typescript
const { openProfile, closeProfile, isOpen } = useProfileOpener();

// From grid
openProfile({ userId: '123', source: 'grid' });

// From globe beacon
openProfile({ userId: '456', source: 'globe', preferSheet: true });

// From deep link
openProfile({ userId: '789', source: 'deeplink', preferSheet: false });
```

### useNav
```typescript
const { go, back, replace, canGoBack } = useNav();

// Internal navigation (no reload)
go('/market');

// Back (respects overlay stack)
back();

// Replace current
replace('/profile');
```

### useSheet
```typescript
const { open, close, stack } = useSheet();

// Open sheet
open('profile', { profileId: '123' });

// Close top sheet
close();

// Get stack depth
const depth = stack.length;
```

---

## 10. FILE MAP

| Component | File Path |
|-----------|-----------|
| App | `src/App.jsx` |
| AppShell | `src/components/shell/AppShell.tsx` |
| BootGuardProvider | `src/contexts/BootGuardContext.jsx` |
| SheetProvider | `src/os/sheet-registry.ts` |
| OSBottomNav | `src/modes/OSBottomNav.tsx` |
| GhostedMode | `src/modes/GhostedMode.tsx` |
| PulseMode | `src/modes/PulseMode.tsx` |
| MarketMode | `src/modes/MarketMode.tsx` |
| RadioMode | `src/modes/RadioMode.tsx` |
| ProfileMode | `src/modes/ProfileMode.tsx` |
| ProfilesGrid | `src/features/profilesGrid/ProfilesGrid.tsx` |
| ProductCard | `src/components/marketplace/ProductCard.jsx` |
| useProfileOpener | `src/lib/profile.ts` |
| useNav | `src/lib/nav.ts` |
| tokens | `src/styles/tokens.css`, `src/styles/tokens.ts` |
