# HOTMESS OS — Flow Map (Mobile-First)

**Created:** 2026-02-20  
**Status:** Stage 0 Documentation

This document maps all user flows in the mobile-first OS architecture.

---

## 1. AUTH / SIGNUP FLOWS

### 1.1 Email/Password Sign Up
```
┌─────────────────┐
│  App Launch     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Splash Screen  │
│  (HotmessSplash)│
└────────┬────────┘
         │ "Sign Up"
         ▼
┌─────────────────┐
│  Auth Page      │
│  Email + Pass   │
└────────┬────────┘
         │ Submit
         ▼
┌─────────────────┐
│ Supabase signUp │
│ (supabaseClient)│
└────────┬────────┘
         │ Success
         ▼
┌─────────────────┐
│ Email Confirm   │
│ (if enabled)    │
└────────┬────────┘
         │ Click link
         ▼
┌─────────────────┐
│ BootGuard       │
│ (onAuthChange)  │
└────────┬────────┘
         │ Session detected
         ▼
┌─────────────────┐
│ Age Gate        │
│ (18+ check)     │
└────────┬────────┘
         │ Confirm 18+
         ▼
┌─────────────────┐
│ Consent Form    │
│ (GDPR/Terms)    │
└────────┬────────┘
         │ Accept
         ▼
┌─────────────────┐
│ Profile Setup   │
│ (Create profile)│
└────────┬────────┘
         │ Complete
         ▼
┌─────────────────┐
│ Ghosted (Home)  │
│ OS Surface      │
└─────────────────┘
```

### 1.2 Google OAuth
```
┌─────────────────┐
│  Splash/Auth    │
└────────┬────────┘
         │ "Continue with Google"
         ▼
┌─────────────────┐
│ signInWithOAuth │
│ provider:google │
└────────┬────────┘
         │ Redirect
         ▼
┌─────────────────┐
│ Google Consent  │
│ (external)      │
└────────┬────────┘
         │ Allow
         ▼
┌─────────────────┐
│ Redirect to app │
│ /Auth?provider= │
│ google          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BootGuard       │
│ → Boot gates    │
└─────────────────┘
```

### 1.3 Telegram Auth (If Implemented)
```
┌─────────────────┐
│  Auth Page      │
└────────┬────────┘
         │ "Continue with Telegram"
         ▼
┌─────────────────┐
│ Telegram Widget │
│ (TelegramLogin) │
└────────┬────────┘
         │ Authorize
         ▼
┌─────────────────┐
│ window.onTele-  │
│ gramAuth()      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ /api/auth/      │
│ telegram/verify │
└────────┬────────┘
         │ Valid?
         ▼
┌─────────────────┐
│ Link to profile │
│ OR create new   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BootGuard       │
│ → Boot gates    │
└─────────────────┘
```

### 1.4 Login Flow
```
┌─────────────────┐
│  Login Page     │
└────────┬────────┘
         │ Email + Password
         ▼
┌─────────────────┐
│ signInWithPass- │
│ word            │
└────────┬────────┘
         │ Success
         ▼
┌─────────────────┐
│ BootGuard       │
│ (session exists)│
└────────┬────────┘
         │ Side effects:
         │ - Cart merge (once)
         │ - Realtime subscriptions
         │ - Profile hydration
         ▼
┌─────────────────┐
│ Ghosted (Home)  │
└─────────────────┘
```

### 1.5 Logout Flow
```
┌─────────────────┐
│  Settings       │
└────────┬────────┘
         │ "Sign Out"
         ▼
┌─────────────────┐
│ auth.signOut()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cleanup:        │
│ - Close channels│
│ - Clear caches  │
│ - Reset state   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Splash Screen   │
└─────────────────┘
```

---

## 2. PROFILE FLOWS

### 2.1 Profile Open (Grid/Globe)
```
┌─────────────────┐
│ ProfileCard     │
│ (Grid/Globe)    │
└────────┬────────┘
         │ Tap
         ▼
┌─────────────────┐
│ useProfileOpener│
│ openProfile()   │
└────────┬────────┘
         │ source: 'grid'|'globe'
         ▼
┌─────────────────┐
│ SheetContext    │
│ open('profile') │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ProfileSheet    │
│ (Slide up)      │
└────────┬────────┘
         │ Back/swipe
         ▼
┌─────────────────┐
│ Sheet closes    │
│ Return to grid  │
└─────────────────┘
```

### 2.2 Profile Deep Link
```
┌─────────────────┐
│ URL: /p/:id     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route match     │
│ App.jsx         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Profile Page    │
│ (Full route)    │
└────────┬────────┘
         │ Back
         ▼
┌─────────────────┐
│ Previous route  │
│ or Ghosted      │
└─────────────────┘
```

---

## 3. GHOSTED (CHAT) FLOWS

### 3.1 Thread Open
```
┌─────────────────┐
│ Ghosted Grid    │
│ (ProfilesGrid)  │
└────────┬────────┘
         │ Tap profile
         ▼
┌─────────────────┐
│ Profile Sheet   │
│ "Message" button│
└────────┬────────┘
         │ Tap
         ▼
┌─────────────────┐
│ Thread Sheet    │
│ or /social/t/:id│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ChatThread      │
│ (Messages)      │
└────────┬────────┘
         │ Send message
         ▼
┌─────────────────┐
│ Supabase insert │
│ messages table  │
└────────┬────────┘
         │ Realtime
         ▼
┌─────────────────┐
│ Recipient sees  │
│ new message     │
└─────────────────┘
```

### 3.2 Unread Badge
```
┌─────────────────┐
│ App Boot        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Subscribe to    │
│ messages table  │
└────────┬────────┘
         │ New message
         ▼
┌─────────────────┐
│ Increment badge │
│ on Ghosted tab  │
└────────┬────────┘
         │ User opens
         ▼
┌─────────────────┐
│ Mark as read    │
│ Clear badge     │
└─────────────────┘
```

---

## 4. PULSE (GLOBE) FLOWS

### 4.1 Globe View
```
┌─────────────────┐
│ Pulse Tab       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Globe component │
│ (Three.js/Map)  │
└────────┬────────┘
         │ Realtime subscribe
         ▼
┌─────────────────┐
│ Beacons appear  │
│ (presence/events│
└────────┬────────┘
         │ Tap beacon
         ▼
┌─────────────────┐
│ openProfile()   │
│ or Event sheet  │
└─────────────────┘
```

### 4.2 Safety Visibility
```
┌─────────────────┐
│ Globe with HUD  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Safety FAB      │
│ (bottom right)  │
└────────┬────────┘
         │ Tap
         ▼
┌─────────────────┐
│ Safety Sheet    │
│ - Panic button  │
│ - Location share│
│ - Safe exit     │
└─────────────────┘
```

---

## 5. MARKET FLOWS

### 5.1 Browse Products
```
┌─────────────────┐
│ Market Tab      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ MarketMode      │
│ Tabs: All/Shop/ │
│ Preloved        │
└────────┬────────┘
         │ Filter
         ▼
┌─────────────────┐
│ getAllProducts()│
│ (market.ts)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ProductCard     │
│ (unified)       │
└────────┬────────┘
         │ Tap
         ▼
┌─────────────────┐
│ Product Detail  │
│ Sheet or Route  │
└─────────────────┘
```

### 5.2 Preloved Create Listing
```
┌─────────────────┐
│ Market → "Sell" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CreateListing   │
│ Sheet           │
└────────┬────────┘
         │ Fill form
         ▼
┌─────────────────┐
│ Upload images   │
│ (Supabase stor) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ createListing() │
│ (market.ts)     │
└────────┬────────┘
         │ Insert
         ▼
┌─────────────────┐
│ preloved_list-  │
│ ings table      │
└────────┬────────┘
         │ Success
         ▼
┌─────────────────┐
│ Show in Market  │
└─────────────────┘
```

### 5.3 Shopify Checkout
```
┌─────────────────┐
│ Product Detail  │
└────────┬────────┘
         │ "Add to Cart"
         ▼
┌─────────────────┐
│ Cart Storage    │
│ (local/DB)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cart Drawer     │
│ "Checkout"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Shopify creates │
│ checkout URL    │
└────────┬────────┘
         │ ONLY hard redirect
         ▼
┌─────────────────┐
│ Shopify Hosted  │
│ Checkout        │
└────────┬────────┘
         │ Complete
         ▼
┌─────────────────┐
│ Return to app   │
│ /checkout/done  │
└─────────────────┘
```

---

## 6. RADIO FLOWS

### 6.1 Stream Playback
```
┌─────────────────┐
│ Radio Tab       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RadioMode       │
│ Show schedule   │
└────────┬────────┘
         │ "Play Live"
         ▼
┌─────────────────┐
│ Audio element   │
│ stream URL      │
└────────┬────────┘
         │ Playing
         ▼
┌─────────────────┐
│ Mini-player     │
│ (persistent)    │
└────────┬────────┘
         │ Navigate away
         ▼
┌─────────────────┐
│ Stream continues│
│ Mini-player vis │
└─────────────────┘
```

### 6.2 Show Details
```
┌─────────────────┐
│ Radio Schedule  │
└────────┬────────┘
         │ Tap show
         ▼
┌─────────────────┐
│ Show Detail     │
│ Sheet           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ - Host info     │
│ - Past episodes │
│ - Subscribe     │
└─────────────────┘
```

---

## 7. BACK BUTTON BEHAVIOR

### Priority Order (LIFO)
```
1. Critical Interrupt → Dismiss
2. Modal → Close modal
3. Sheet → Close sheet
4. Nested route → Pop route
5. Root surface → Exit confirmation
```

### Implementation
```
┌─────────────────┐
│ User presses    │
│ back            │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ navigation.ts   │
│ popOverlay()    │
└────────┬────────┘
         │ Overlay exists?
         ├─── Yes ───▶ Close overlay
         │             Return true
         │
         └─── No ────▶ router.back()
```

---

## 8. NAVIGATION MAP

```
/                   → Ghosted (ProfilesGrid)
/ghosted            → redirect to /
/social             → redirect to /
/pulse              → Pulse (Globe)
/globe              → redirect to /pulse
/market             → Market (unified)
/market/p/:handle   → Product detail
/radio              → Radio
/music/*            → redirect to /radio
/profile            → Profile settings
/p/:id              → Profile detail (deep link)
/social/t/:threadId → Chat thread
/events             → Events list
/events/:id         → Event detail
/settings           → Settings
/safety/*           → Safety features
```

---

## 9. MISSING FLOWS (TO IMPLEMENT)

| Flow | Status | Priority |
|------|--------|----------|
| Telegram auth verification | ⚠️ Endpoint missing | P0 |
| Realtime cleanup on logout | ⚠️ Scattered | P1 |
| Persistent radio player | ⚠️ Not implemented | P2 |
| Globe backdrop persistence | ⚠️ Not implemented | P1 |
| Unread badge on Ghosted | ⚠️ Partial | P2 |
