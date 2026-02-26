# HOTMESS OS — Component Hierarchy
**Generated:** 2026-02-26

---

## FULL COMPONENT TREE

```
App
├── Providers
│   ├── AuthProvider (Supabase auth state)
│   ├── SheetProvider (sheet stack management)
│   ├── RadioContext (persistent player state)
│   ├── WorldPulseContext (realtime subscriptions)
│   ├── NowSignalContext (Right Now presence)
│   ├── PersonaContext (5 persona states)
│   ├── SOSContext (emergency state)
│   └── PinLockContext (biometric lock)
│
├── BootGuard
│   ├── AgeGate (18+ verification)
│   ├── OnboardingGate (6-step flow)
│   └── CommunityAttestation (step 6)
│
└── OSShell (authenticated layout)
    │
    ├── OSBottomNav (fixed bottom, z-50)
    │   ├── NavButton[home] → HomeMode
    │   ├── NavButton[ghosted] → GhostedMode
    │   ├── NavButton[pulse] → PulseMode
    │   ├── NavButton[market] → MarketMode
    │   ├── NavButton[radio] → RadioMode
    │   └── NavButton[profile] → ProfileMode
    │
    ├── ModeViewport (main content area)
    │   │
    │   ├── HomeMode ────────────────────────────────────
    │   │   ├── HomeHeader
    │   │   │   ├── Logo
    │   │   │   ├── NotificationBell (badge: useUnreadCount)
    │   │   │   └── PersonaSwitcher (long-press avatar)
    │   │   ├── RightNowSection
    │   │   │   ├── RightNowToggle (lime beacon)
    │   │   │   └── NearbyPeopleRow
    │   │   ├── CommunitySection ← NEW
    │   │   │   ├── SectionHeader ("Community")
    │   │   │   ├── PostCard[] (3 latest)
    │   │   │   │   ├── AuthorAvatar
    │   │   │   │   ├── PostContent (truncated)
    │   │   │   │   └── LikeCount
    │   │   │   └── SeeAllButton → community sheet
    │   │   ├── EventsSection
    │   │   │   ├── EventCard[]
    │   │   │   └── SeeAllButton → events sheet
    │   │   └── FeaturedSection
    │   │       └── ProductCard[]
    │   │
    │   ├── GhostedMode ─────────────────────────────────
    │   │   ├── GhostedHeader
    │   │   │   ├── SearchButton
    │   │   │   └── FilterButton → filters sheet
    │   │   ├── OnlineIndicator
    │   │   └── ProfileGrid (3-column)
    │   │       └── ProfileCard[]
    │   │           ├── Avatar (online dot)
    │   │           ├── DisplayName
    │   │           ├── LookingForTags (max 3)
    │   │           └── TapGesture → profile sheet
    │   │
    │   ├── PulseMode ───────────────────────────────────
    │   │   ├── GlobeContainer
    │   │   │   ├── UnifiedGlobe (Three.js)
    │   │   │   │   ├── EarthSphere
    │   │   │   │   ├── AtmosphereShader
    │   │   │   │   └── BeaconMarkers[]
    │   │   │   ├── GlobeControls (OrbitControls)
    │   │   │   └── GlobePerformanceMonitor
    │   │   ├── CityPulseBar
    │   │   │   └── CityButton[] (London, Berlin, NYC, LA)
    │   │   ├── CreateEventFAB → create-event sheet
    │   │   └── BeaconDetailPanel (on marker tap)
    │   │
    │   ├── MarketMode ──────────────────────────────────
    │   │   ├── MarketHeader
    │   │   │   ├── SearchInput
    │   │   │   ├── FilterButton → filters sheet
    │   │   │   └── CartButton (badge) → cart sheet
    │   │   ├── CategoryTabs
    │   │   │   └── Tab[] (Shop, Preloved, Services)
    │   │   ├── ProductGrid
    │   │   │   └── ProductCard[]
    │   │   │       ├── ProductImage
    │   │   │       ├── ProductName
    │   │   │       ├── Price
    │   │   │       └── AddToCartButton
    │   │   └── SellFAB → sell sheet
    │   │
    │   ├── RadioMode ───────────────────────────────────
    │   │   ├── RadioHeader
    │   │   │   └── NowPlaying (track info)
    │   │   ├── ConvictPlayer
    │   │   │   ├── PlayButton
    │   │   │   ├── VolumeSlider
    │   │   │   └── WaveformAnimation
    │   │   ├── ShowSchedule
    │   │   │   └── ShowCard[]
    │   │   │       ├── ShowImage
    │   │   │       ├── ShowTime
    │   │   │       └── ShowTitle
    │   │   └── ShowPages
    │   │       ├── WakeTheMess
    │   │       ├── DialADaddy
    │   │       └── HandNHand
    │   │
    │   └── ProfileMode ─────────────────────────────────
    │       ├── ProfileHeader
    │       │   ├── CoverPhoto
    │       │   ├── Avatar (editable)
    │       │   ├── DisplayName
    │       │   ├── Bio
    │       │   └── EditButton → edit-profile sheet
    │       ├── StatsRow
    │       │   ├── TapsCount
    │       │   ├── WoofsCount
    │       │   └── MatchesCount
    │       ├── ActivitySection ← NEW
    │       │   ├── ActivityButton[community] → community sheet
    │       │   ├── ActivityButton[achievements] → achievements sheet
    │       │   ├── ActivityButton[squads] → squads sheet
    │       │   ├── ActivityButton[sweat-coins] → sweat-coins sheet
    │       │   └── ActivityButton[subscriptions] → creator-subscription sheet
    │       └── SettingsSection
    │           ├── SettingsButton[settings] → settings sheet
    │           ├── SettingsButton[privacy] → privacy sheet
    │           ├── SettingsButton[location] → location sheet
    │           ├── SettingsButton[blocked] → blocked sheet
    │           ├── SettingsButton[emergency] → emergency-contact sheet
    │           └── SettingsButton[help] → help sheet
    │
    ├── SheetRouter (z-80) ──────────────────────────────
    │   └── L2SheetContainer
    │       └── [Current Sheet]
    │           ├── BaseSheet (wrapper)
    │           │   ├── DragHandle
    │           │   └── ScrollableContent
    │           └── [Sheet-specific content]
    │
    ├── RadioMiniPlayer (z-50, above nav) ───────────────
    │   ├── NowPlayingThumb
    │   ├── TrackInfo
    │   ├── PlayPauseButton
    │   └── ExpandButton → RadioMode
    │
    ├── Interrupts (z-120+) ─────────────────────────────
    │   ├── SOSOverlay (z-200)
    │   │   ├── EmergencyHeader
    │   │   ├── LiveLocationShare
    │   │   └── CancelButton
    │   ├── FakeCallOverlay (z-200)
    │   │   ├── CallerAvatar
    │   │   ├── CallerName
    │   │   └── AnswerDeclineButtons
    │   ├── IncomingCallBanner (z-180)
    │   └── PinLockOverlay (z-1000)
    │
    └── ToastContainer (z-110) ──────────────────────────
        └── Toast[]
```

---

## SHEET COMPONENT STRUCTURE

All L2 sheets follow this pattern:

```
L2[Name]Sheet
├── SheetHeader
│   ├── Title
│   └── CloseButton
├── LoadingState (Loader2 spinner)
├── ErrorState (error message + retry)
├── EmptyState (illustration + CTA)
└── ContentState
    ├── [Primary content]
    └── [Action buttons]
```

### New Sheet Components

```
L2AchievementsSheet (182 lines)
├── AchievementGrid (3-col)
│   └── AchievementCard[]
│       ├── Icon (locked/unlocked)
│       ├── Name
│       ├── Description
│       └── Progress bar (if partial)
└── Stats (total unlocked / total)

L2SquadsSheet (304 lines)
├── TabBar [My Squads | Discover]
├── MySquads
│   └── SquadCard[]
│       ├── SquadAvatar
│       ├── SquadName
│       ├── MemberCount
│       └── JoinedDate
├── DiscoverSquads
│   └── SquadCard[] (with Join CTA)
└── CreateSquadFAB → CreateSquadModal

L2CommunityPostSheet (335 lines)
├── PostFeed
│   └── PostCard[]
│       ├── AuthorRow (avatar, name, time)
│       ├── Content
│       ├── Image (optional)
│       └── ActionRow (like, comment, share)
├── CreatePostFAB → CreatePostModal
│   ├── ContentInput
│   ├── CategorySelect
│   ├── ImageUpload
│   └── SubmitButton
└── EmptyState ("Be the first to post!")

L2SweatCoinsSheet (235 lines)
├── BalanceCard
│   ├── CoinIcon
│   ├── CurrentBalance
│   └── BalanceTrend
├── TransactionList
│   └── TransactionRow[]
│       ├── TypeIcon (earn/spend)
│       ├── Description
│       ├── Amount (+/-)
│       └── Timestamp
└── EarnMoreButton

L2CreatorSubscriptionSheet (285 lines)
├── TabBar [My Subs | Subscribers]
├── MySubscriptions
│   └── SubscriptionCard[]
│       ├── CreatorAvatar
│       ├── CreatorName
│       ├── Tier + Price
│       ├── ExpiresAt
│       └── ManageButton
├── MySubscribers
│   └── SubscriberCard[]
└── SubscribeModal (when creatorId prop)
    ├── CreatorInfo
    ├── TierSelector
    └── StripeCheckoutButton
```

---

## STATE MANAGEMENT

```
┌─────────────────────────────────────────────────────┐
│                    CONTEXTS                         │
├─────────────────────────────────────────────────────┤
│ AuthContext        │ Supabase session, user data   │
│ SheetContext       │ Sheet stack, open/close       │
│ RadioContext       │ Playing state, volume, track  │
│ WorldPulseContext  │ Realtime beacon subscriptions │
│ NowSignalContext   │ Right Now toggle state        │
│ PersonaContext     │ Active persona (5 options)    │
│ SOSContext         │ Emergency mode active         │
│ PinLockContext     │ Lock state, PIN verification  │
│ ShopCartContext    │ Cart items, totals            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   CUSTOM HOOKS                      │
├─────────────────────────────────────────────────────┤
│ useAuth()          │ Current user, login/logout    │
│ useSheet()         │ openSheet(), closeSheet()     │
│ useUnreadCount()   │ Notification badge count      │
│ useTaps()          │ Tap/Woof actions              │
│ useMatchProfiles() │ Match scoring                 │
│ useSupabase()      │ Supabase client instance      │
│ usePushNotifs()    │ Push subscription state       │
│ useOfflineSync()   │ Offline queue management      │
└─────────────────────────────────────────────────────┘
```

---

## DATA FLOW

```
User Action
    │
    ▼
Component Event Handler
    │
    ├──► Local State (useState)
    │        │
    │        ▼
    │    Optimistic UI Update
    │
    └──► Supabase Mutation
             │
             ├──► Success → Confirm UI
             │
             └──► Error → Rollback + Toast
```

---

## ROUTING

```
/ (redirect to /home)
/home          → HomeMode
/ghosted       → GhostedMode
/pulse         → PulseMode
/market        → MarketMode
/market?source=preloved → MarketMode (Preloved tab)
/radio         → RadioMode
/profile       → ProfileMode
/profile?uid=X → ProfileMode (viewing other user)
/auth/callback → OAuth callback handler
```

Sheets are NOT routes — they stack via SheetContext.

---

## FILE STRUCTURE

```
src/
├── components/
│   ├── sheets/           # All L2 sheet components
│   │   ├── BaseSheet.tsx
│   │   ├── L2*.jsx/tsx   # 32+ sheets
│   │   ├── SheetRouter.jsx
│   │   └── index.ts
│   ├── ui/               # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   ├── safety/           # SOS, FakeCall, etc.
│   ├── globe/            # Three.js globe components
│   └── radio/            # Radio player components
├── modes/
│   ├── HomeMode.tsx
│   ├── GhostedMode.tsx
│   ├── PulseMode.tsx
│   ├── MarketMode.tsx
│   ├── RadioMode.tsx
│   ├── ProfileMode.tsx
│   ├── OSShell.tsx
│   └── OSBottomNav.tsx
├── contexts/
│   ├── AuthContext.jsx
│   ├── SheetProvider.jsx
│   ├── RadioContext.tsx
│   └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useSheet.ts
│   ├── useTaps.ts
│   └── ...
├── lib/
│   ├── supabase.ts
│   ├── sheetSystem.ts
│   └── layerSystem.ts
└── styles/
    └── globals.css
```
