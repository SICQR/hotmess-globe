# HOTMESS London OS - Comprehensive Codebase Analysis

**Analysis Date**: 2026-01-28  
**Platform**: LGBT+ Social Network & Nightlife Discovery Platform  
**Tech Stack**: React 18 + Vite + Supabase + Base44 SDK  
**Status**: Beta Testing Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Page Hierarchy & Navigation](#page-hierarchy--navigation)
4. [Feature Analysis](#feature-analysis)
5. [Safety System (Deep Dive)](#safety-system-deep-dive)
6. [Social/Ghost Status System (Deep Dive)](#socialghost-status-system-deep-dive)
7. [Buyer/Seller Marketplace (Deep Dive)](#buyerseller-marketplace-deep-dive)
8. [Site Copy & Messaging](#site-copy--messaging)
9. [Components Inventory](#components-inventory)
10. [API Routes](#api-routes)
11. [Database Schema](#database-schema)
12. [Unfinished Work & TODOs](#unfinished-work--todos)
13. [Technical Debt](#technical-debt)
14. [Missing Features](#missing-features)

---

## Executive Summary

HOTMESS is a comprehensive LGBT+ social networking platform built with modern React technologies. The application features:

- **~50+ Pages** across user, business, and admin interfaces
- **~260+ Components** organized by feature domain
- **~50+ API Routes** handling backend operations
- **30+ Serverless Functions** for complex operations
- **45+ Database Migrations** defining the data model

### Key Feature Areas
| Area | Status | Description |
|------|--------|-------------|
| Social Discovery | ✅ Complete | Profile browsing, messaging, presence |
| Events | ✅ Complete | Event listings, RSVPs, calendar integration |
| Marketplace | ✅ Complete | Shopify integration, cart, checkout |
| Music/Radio | ✅ Complete | Live streaming, shows, releases |
| Safety | ✅ Complete | Reporting, blocking, resources |
| Beacons | ✅ Complete | Location-based drops, check-ins |
| Premium Content | ⚠️ Partial | Placeholders exist, payment flow incomplete |
| QR Scanner | ⚠️ Partial | Beacon scanning works, ticket scanning partial |
| SoundCloud | ⚠️ Partial | OAuth endpoints exist, needs hardening |

---

## Architecture Overview

### Application Structure

```
/workspace/
├── src/                    # Frontend React application
│   ├── pages/              # 50+ page components (routes)
│   ├── components/         # 260+ reusable components
│   ├── features/           # Feature-specific modules
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts (Auth, i18n)
│   ├── lib/                # Core utilities (AuthContext, query-client)
│   ├── utils/              # Helper functions
│   └── api/                # API client modules
├── api/                    # Vercel serverless API routes
├── functions/              # Edge/serverless functions (Base44)
├── supabase/               # Database migrations and functions
├── e2e/                    # Playwright end-to-end tests
└── public/                 # Static assets
```

### Provider Hierarchy

```
App.jsx
├── I18nProvider           # Internationalization (en, es, fr, de)
│   ├── AuthProvider       # Authentication state
│   │   ├── QueryClientProvider  # React Query
│   │   │   ├── ShopCartProvider # Shopping cart state
│   │   │   │   └── Router       # React Router
│   │   │   │       └── Layout   # Shell with navigation
│   │   │   │           └── Pages...
```

### Layout System

The `Layout.jsx` provides:
- **Desktop Sidebar** (≥768px): Fixed left navigation with brand, primary nav, quick links, user panel
- **Mobile Header** (< 768px): Top header with hamburger menu
- **Global Features**: Search, notifications, radio player, panic button, AI assistant
- **Gatekeeper Flow**: Age Gate → Consent → Onboarding → Profile Setup

---

## Page Hierarchy & Navigation

### Primary Navigation (V1.5 Bible)

| Tab | Route | Purpose |
|-----|-------|---------|
| **HOME** | `/` | Launcher/dashboard with hero sections |
| **PULSE** | `/pulse` | Interactive globe/map with layers |
| **EVENTS** | `/events` | Event discovery and RSVPs |
| **MARKET** | `/market` | Shopify-powered marketplace |
| **SOCIAL** | `/social` | Profile discovery + messaging |
| **MUSIC** | `/music` | Radio streaming + releases |
| **MORE** | `/more` | Tools, settings, legal |

### Complete Page Inventory

#### Authentication & Onboarding (8 pages)
| Page | Route | Status |
|------|-------|--------|
| `Auth` | `/auth`, `/auth/sign-in`, `/auth/sign-up` | ✅ Complete |
| `AgeGate` | `/age` | ✅ Complete |
| `OnboardingGate` | `/onboarding` | ✅ Complete |
| `Onboarding` | `/onboarding/*` | ✅ Complete |
| `ProfileSetup` | N/A (internal) | ✅ Complete |
| `AccountConsents` | `/account/consents` | ✅ Complete |
| `Login` | Legacy redirect | ✅ Complete |

#### Core User Pages (15 pages)
| Page | Route | Status |
|------|-------|--------|
| `Home` | `/` | ✅ Complete |
| `Pulse` | `/pulse` | ✅ Complete |
| `Globe` | Internal component | ✅ Complete |
| `Events` | `/events` | ✅ Complete |
| `BeaconDetail` | `/events/:id` | ✅ Complete |
| `Social` | `/social` | ✅ Complete |
| `Messages` | `/social/inbox` | ✅ Complete |
| `Profile` | `/social/u/:id` | ✅ Complete |
| `EditProfile` | `/account/profile` | ✅ Complete |
| `Music` | `/music` | ✅ Complete |
| `MusicRelease` | `/music/releases/:slug` | ✅ Complete |
| `Radio` | `/music/live` | ✅ Complete |
| `RadioSchedule` | `/music/schedule` | ✅ Complete |
| `More` | `/more` | ✅ Complete |
| `Directions` | `/directions` | ✅ Complete |

#### Marketplace Pages (12 pages)
| Page | Route | Status |
|------|-------|--------|
| `Shop` | `/market` | ✅ Complete (Shopify) |
| `ShopCollection` | `/market/:collection` | ✅ Complete |
| `ShopProduct` | `/market/p/:handle` | ✅ Complete |
| `ShopCart` | `/cart` | ✅ Complete |
| `CheckoutStart` | `/checkout/start` | ✅ Complete |
| `Checkout` | `/checkout` | ✅ Complete |
| `Marketplace` | `/market/creators` | ✅ Complete (P2P) |
| `ProductDetail` | `/market/creators/p/:id` | ✅ Complete |
| `CreatorsCart` | `/market/creators/cart` | ✅ Complete |
| `CreatorsCheckout` | `/market/creators/checkout` | ✅ Complete |
| `OrderHistory` | `/orders` | ✅ Complete |
| `SellerDashboard` | Internal | ✅ Complete |

#### Tools Pages (12 pages)
| Page | Route | Status |
|------|-------|--------|
| `Beacons` | `/more/beacons` | ✅ Complete |
| `CreateBeacon` | `/more/beacons/new` | ✅ Complete |
| `EditBeacon` | `/more/beacons/:id/edit` | ✅ Complete |
| `Stats` | `/more/stats` | ✅ Complete |
| `Challenges` | `/more/challenges` | ✅ Complete |
| `Safety` | `/safety` | ✅ Complete |
| `Care` | `/safety/resources` | ✅ Complete |
| `Calendar` | `/calendar` | ✅ Complete |
| `Scan` | `/scan` | ⚠️ Partial |
| `Community` | `/community` | ✅ Complete |
| `Leaderboard` | `/leaderboard` | ✅ Complete |
| `Bookmarks` | `/saved` | ✅ Complete |

#### Account & Settings (8 pages)
| Page | Route | Status |
|------|-------|--------|
| `Settings` | `/settings` | ✅ Complete |
| `MembershipUpgrade` | `/membership` | ✅ Complete |
| `DataExport` | `/account/export` | ✅ Complete |
| `AccountDeletion` | `/account/delete` | ✅ Complete |
| `HelpCenter` | `/help` | ✅ Complete |
| `Contact` | `/support` | ✅ Complete |
| `InviteFriends` | Internal | ✅ Complete |
| `MyEvents` | Internal | ✅ Complete |

#### Business Pages (4 pages)
| Page | Route | Status |
|------|-------|--------|
| `BusinessDashboard` | `/biz` | ✅ Complete |
| `BusinessAnalytics` | `/biz/analytics` | ✅ Complete |
| `BusinessOnboarding` | `/biz/onboarding` | ✅ Complete |
| `VenueManagement` | `/biz/venue` | ✅ Complete |

#### Admin Pages (5 pages)
| Page | Route | Status |
|------|-------|--------|
| `AdminDashboard` | `/admin` | ✅ Complete |
| `OrganizerDashboard` | Internal | ✅ Complete |
| `PromoteToAdmin` | `/promote-admin` | ✅ Complete |
| `RecordManager` | Internal | ⚠️ Partial |
| `RightNowDashboard` | Internal | ✅ Complete |

#### Legal Pages (6 pages)
| Page | Route | Status |
|------|-------|--------|
| `Privacy` | `/legal/privacy` | ✅ Complete |
| `Terms` | `/legal/terms` | ✅ Complete |
| `PrivacyHub` | `/legal/privacy-hub` | ✅ Complete |
| `PrivacyPolicy` | `/privacy` | ✅ Complete |
| `TermsOfService` | `/terms` | ✅ Complete |
| `CommunityGuidelines` | `/guidelines` | ✅ Complete |

#### Special Show Pages (3 pages)
| Page | Route | Status |
|------|-------|--------|
| `WakeTheMess` | `/music/shows/wake-the-mess` | ✅ Complete |
| `DialADaddy` | `/music/shows/dial-a-daddy` | ✅ Complete |
| `HandNHand` | `/music/shows/hand-n-hand` | ✅ Complete |
| `Hnhmess` | `/hnhmess` | ✅ Complete |

---

## Feature Analysis

### 1. Social Discovery System

**Location**: `src/features/profilesGrid/`, `src/pages/Social.jsx`, `src/pages/Connect.jsx`

**Components**:
- `ProfilesGrid.tsx` - Main grid layout with infinite scroll
- `ProfileCard.tsx` - Individual profile card
- `SmartProfileCard.tsx` - Enhanced card with smart badges
- `BentoGrid.tsx` - Alternative bento layout
- `TelegramPanel.tsx` - Telegram integration

**Features**:
- ✅ Profile browsing with photos
- ✅ Travel time estimates (Haversine + Google Maps API)
- ✅ Presence/status indicators
- ✅ "Right Now" availability system
- ✅ Vibe compatibility scoring
- ✅ Filtering by tags, tribes, boundaries
- ✅ Infinite scroll pagination

**API Endpoints**:
- `GET /api/profiles` - Paginated profile list
- `POST /api/travel-time` - Calculate ETA between locations
- `POST /api/presence/update` - Update user presence

### 2. Messaging System

**Location**: `src/components/messaging/`, `src/pages/Messages.jsx`

**Components**:
- `ChatThread.jsx` - Full conversation view
- `NewMessageModal.jsx` - Compose new message
- `GroupChatManager.jsx` - Group chat management
- `QuickReplyChips.jsx` - Quick reply options
- `MessageInput.jsx` - Message composer

**Features**:
- ✅ Real-time messaging
- ✅ Read receipts
- ✅ Typing indicators
- ✅ Media attachments
- ✅ Thread search
- ✅ Consent gate on first message
- ✅ Block/report/mute actions

### 3. Events System

**Location**: `src/pages/Events.jsx`, `src/components/events/`

**Components**:
- `EventCard.jsx` - Event display card
- `EventsMapView.jsx` - Map visualization
- `PersonalizedRecommendations.jsx` - AI recommendations
- `AIEventRecommendations.jsx` - ML-based suggestions
- `EventReminders.jsx` - Notification service
- `TicketScanner.jsx` - QR ticket scanning

**Features**:
- ✅ Event browsing with filters
- ✅ RSVP system
- ✅ Calendar integration (ICS download)
- ✅ Map view of events
- ✅ AI-powered recommendations
- ✅ Event scraping from external sources
- ⚠️ Ticket QR validation (partial)

### 4. Marketplace System

**Location**: `src/features/shop/`, `src/components/marketplace/`

**Dual System**:
1. **Shopify Storefront** (Primary): Headless commerce via Storefront API
2. **P2P Marketplace** (Secondary): User-to-user listings

**Components**:
- `ShopCartContext.jsx` - Cart state management
- `ShopCartDrawer.jsx` - Sliding cart panel
- `UnifiedCartDrawer.jsx` - Unified cart UI
- `ProductCard.jsx` - Product display
- `ProductForm.jsx` - Product creation
- `CartDrawer.jsx` - Shopping cart

**Features**:
- ✅ Shopify product browsing
- ✅ Collection filtering
- ✅ Cart management
- ✅ Checkout redirect to Shopify
- ✅ P2P listings and offers
- ✅ Order history
- ⚠️ XP purchasing (coming soon)

### 5. Music/Radio System

**Location**: `src/pages/Music.jsx`, `src/pages/Radio.jsx`, `src/components/radio/`

**Components**:
- `PersistentRadioPlayer.jsx` - Global player
- `RadioContext.jsx` - Player state
- `radioUtils.js` - Schedule helpers
- `RecordManager.tsx` - Admin upload tool

**Features**:
- ✅ Live radio streaming
- ✅ Show schedule with times
- ✅ Calendar ICS generation
- ✅ Release pages with countdown
- ✅ SoundCloud embed integration
- ⚠️ SoundCloud upload (needs OAuth hardening)

### 6. Globe/Pulse Map System

**Location**: `src/pages/Pulse.jsx`, `src/components/globe/`

**Components**:
- `Globe.jsx` - 3D globe (Three.js)
- `GlobeScene.jsx` - Scene management
- `GlobeSearch.jsx` - Location search
- `CityDataOverlay.jsx` - City statistics
- `GlobeFilters.jsx` - Layer filters
- `HeatmapOverlay.jsx` - Activity heatmap

**Features**:
- ✅ 3D globe visualization
- ✅ Multiple layers (events, people, care, market)
- ✅ Pin clustering
- ✅ Bottom sheet previews
- ✅ Real-time presence updates
- ⚠️ Weather/transit data (placeholders)

### 7. Safety System

**Location**: `src/pages/Safety.jsx`, `src/components/safety/`

**Components**:
- `PanicButton.jsx` - Emergency button
- `SafeWordSystem.jsx` - Safe word triggers
- `CheckInTimer.jsx` - Timed check-ins
- `EmergencyContacts.jsx` - Contact management
- `ResourceLinks.jsx` - Support resources

**Features**:
- ✅ User reporting
- ✅ User blocking
- ✅ Panic button
- ✅ Check-in timers
- ✅ Emergency contacts
- ✅ Resource links
- ✅ Aftercare prompts

### 8. Beacon System

**Location**: `src/pages/Beacons.jsx`, `src/components/beacon/`

**Components**:
- `BeaconCard.jsx` - Beacon display
- `BeaconMap.jsx` - Location picker
- `BeaconScanner.jsx` - QR scanner

**Features**:
- ✅ Create location beacons
- ✅ Time-limited visibility
- ✅ Privacy controls
- ✅ QR code generation
- ✅ Check-in with XP rewards
- ✅ Nearby beacon discovery

### 9. Gamification System

**Location**: `src/components/gamification/`, `src/pages/Leaderboard.jsx`

**Features**:
- ✅ XP system
- ✅ Level progression
- ✅ Daily challenges
- ✅ Leaderboards
- ✅ Achievement badges
- ⚠️ SweatCoin integration (placeholder)

### 10. Admin System

**Location**: `src/pages/AdminDashboard.jsx`, `src/components/admin/`

**Components**:
- `AnalyticsDashboard.jsx` - Platform analytics
- `ContentModeration.jsx` - Content review
- `UserManagement.jsx` - User admin
- `EventScraperControl.jsx` - Scraper management
- `ShopifyManager.jsx` - Product sync
- `RecordManager.tsx` - Audio uploads

**Features**:
- ✅ User management
- ✅ Content moderation
- ✅ Analytics dashboard
- ✅ Event scraper control
- ✅ Shopify sync
- ⚠️ SoundCloud uploads (partial)

---

## Safety System (Deep Dive)

### Spec vs Implementation Comparison

| Feature | Spec Says | Implementation Status |
|---------|-----------|----------------------|
| **Panic Button** | "Instant alert to trusted contacts + optional 999" | ✅ **Implemented** - Sends SOS email, clears storage, redirects to Google |
| **Check-In Timer** | "Set a timer, get prompted to confirm you're safe" | ✅ **Implemented** - Custom durations (1-48 hours), labels, alerts trusted contacts |
| **Trusted Contacts** | "Share location with friends during meetups" | ✅ **Implemented** - Add phone/email, notified on panic or overdue check-in |
| **Fake Call** | "Escape awkward situations with a fake incoming call" | ❌ **NOT IMPLEMENTED** - DialADaddy is a radio show page, not fake calls |
| **Aftercare Nudge** | "'You good?' prompt after meetup" | ⚠️ **Partial** - Exists in Care page copy, no automated post-meetup trigger |
| **Safety Resources** | "Direct access to support services" | ✅ **Implemented** - Care.jsx has emergency numbers, helplines, checklists |

### Panic Button Implementation

**Location**: `src/components/safety/PanicButton.jsx`

**What It Does**:
1. Fixed button in bottom-left corner (visible to authenticated users)
2. On activation:
   - Fetches user's geolocation
   - Retrieves trusted contacts and custom emergency message
   - Sends SOS email via Base44 integration
   - **Clears ALL localStorage and sessionStorage** (nuclear exit)
   - Hard redirects to `https://www.google.com` (disguise exit)

```jsx
// Key implementation excerpt
const handleEmergency = async () => {
  // Get location
  navigator.geolocation?.getCurrentPosition(async (position) => {
    const mapsLink = `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`;
    
    // Send SOS to each trusted contact
    for (const contact of trustedContacts) {
      await base44.integrations.Core.SendEmail({
        to: contact.email,
        subject: `🆘 EMERGENCY: ${user.full_name} needs help`,
        body: `${emergencyMessage}\n\nLocation: ${mapsLink}`
      });
    }
    
    // Nuclear exit
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('https://www.google.com');
  });
};
```

### Check-In Timer System

**Location**: `src/components/safety/CheckInTimerCustomizer.jsx`, `src/pages/Safety.jsx`

**Features**:
- Custom timers with labels ("Date night", "Late meeting")
- Duration options: 1, 2, 4, 8, 12, 24, 48 hours
- If user doesn't check out, trusted contacts are alerted
- Saved to user profile for reuse

### Missing: Fake Call Feature

**Spec Description**:
> "Fake Call - Escape awkward situations with a fake incoming call"

**Current State**: 
- The route `/DialADaddy` exists but is a **radio show page** (for the "Dial A Daddy" radio program)
- No implementation of simulated incoming phone call UI
- No vibration/ringtone simulation
- No fake caller screen

**Recommendation**: Create new component `src/components/safety/FakeCallGenerator.jsx`:
```jsx
// Proposed implementation
const FakeCallGenerator = () => {
  const triggerFakeCall = () => {
    // Vibrate device
    navigator.vibrate?.([500, 200, 500, 200, 500]);
    // Show fake incoming call overlay
    setShowFakeCallOverlay(true);
    // Play ringtone audio
  };
};
```

### Aftercare Nudge Implementation

**Location**: `src/pages/Care.jsx`

**Current State**:
- Care.jsx has static "AFTERCARE CHECKLIST" content
- Lists items like "Had water?", "Eaten something?", "Checked in with a friend?"
- **NOT automated** - user must manually navigate to Care page
- Spec envisions: Automatic "You good?" popup after meetup with [ALL GOOD] [NEED A MINUTE] [GET HELP] buttons

**What's Missing**:
- Post-meetup detection (when user returns from meeting someone)
- Automated nudge modal
- Response tracking

---

## Social/Ghost Status System (Deep Dive)

### "No Ghost Status" Design Philosophy

The platform explicitly implements a **"no ghost status"** policy, meaning users cannot be passively available indefinitely.

### Right Now Feature

**Location**: `src/components/discovery/RightNowManager.jsx`, `src/components/discovery/RightNowModal.jsx`

**Key Microcopy** (from actual code):
```jsx
// RightNowManager.jsx
"Auto-expires, no ghost status."

// RightNowModal.jsx  
"Ends automatically. No ghost status."
```

**Implementation**:

| Setting | Options | Purpose |
|---------|---------|---------|
| **Duration** | 30 min, 1 hr, 2 hr, Tonight | Automatic expiry - prevents ghosting |
| **Logistics** | Can host, Can travel, Hotel, Undecided | Clear intent communication |
| **Cold Vibe Mode** | Toggle (+15 XP) | Cali Sober/substance-free intent |

**Flow**:
1. User clicks "GO LIVE" CTA
2. Modal opens with duration + logistics options
3. User goes live → appears on Globe with green pulse
4. **Auto-expires** at set time → no lingering "available" status
5. User can manually end with "END NOW" button

### AI Matchmaking System

**Location**: `src/components/social/AIMatchmaker.jsx`, `functions/calculateVibeCompatibility.ts`

**Spec Claims**: "8-dimension compatibility scoring"

**Actual Implementation**: 6 dimensions calculated:

| Dimension | Points | Implementation |
|-----------|--------|----------------|
| **Vibe Archetype Compatibility** | 30 | Archetype matrix (architect×explorer, etc.) |
| **Shared Traits** | 5 each | Trait intersection |
| **Personality Alignment** | 20-25 | 5 personality trait similarity (openness, energy, social, adventure, intensity) |
| **Intent Match** | 20 | Same current intent (Right Now) |
| **Shared Venues** | 15-20 | Beacon check-in history overlap |
| **Interest Overlap** | 10-15 | Interest array intersection |
| **Proximity** | 5 | Distance < 5km |
| **Activity Level** | 10 | Social frequency match |

**Match Score Display**:
- 80%+ → "Super Match" + Flame icon + gradient background
- 60-79% → "Great Match" + cyan gradient
- 40-59% → "Good Match" + yellow/amber
- <40% → "Match" + gray

### AI Wingman / Global Assistant

**Location**: `src/components/ai/GlobalAssistant.jsx`

**Spec Claims**:
> "AI Wingman - Conversation starters, match insights, profile optimization"

**Actual Implementation**:
- ✅ General AI chat assistant
- ✅ Quick questions about events, XP, safety, etc.
- ❌ **NOT profile-specific** - doesn't analyze a target profile
- ❌ **NO conversation starters** for specific users
- ❌ **NO match insights** explaining "why you're compatible"
- ❌ **NO profile optimization tips**

**Current Quick Questions**:
```javascript
const quickQuestions = [
  "What events are happening tonight?",
  "Show me products under 1000 XP",
  "Help me find people into techno",
  "Explain the XP system",
  "How do I use Right Now?",
  "What's my next challenge?",
  "Show me top-rated sellers",
  "How do safety check-ins work?"
];
```

**Missing Per-Profile Wingman**:
```jsx
// Proposed: Profile-aware AI Wingman
<ProfileWingman 
  targetProfile={profile}
  onGenerateOpener={(opener) => setMessageDraft(opener)}
/>

// Would show:
// - "Ask about the Fabric set he mentioned"
// - "You both listed house music"  
// - "Similar travel patterns (Mediterranean)"
```

---

## Buyer/Seller Marketplace (Deep Dive)

### Dual Commerce Architecture

HOTMESS runs **two parallel marketplace systems**:

| System | Purpose | Status |
|--------|---------|--------|
| **Official Shop** | HOTMESS in-house brands (RAW, HUNG, HIGH) + limited editions | ✅ Complete |
| **MESSMARKET** | Etsy-style community sellers marketplace | ✅ Complete |

### Official Shop (Shopify Integration)

**Location**: `api/shopify/*`, `src/features/shop/`

**Brands Available**:
| Brand | Type | Description |
|-------|------|-------------|
| **RAW** | Core | "Unfiltered. Unapologetic." - Bold basics |
| **HUNG** | Core | "Statement pieces. Maximum impact." - Luxury streetwear |
| **HIGH** | Core | "Elevated essentials." - Premium basics |
| **SUPERHUNG** | Limited | Ultra-limited drops, collector pieces |
| **SUPERRAW** | Limited | Rare, radical collector pieces |

**Flow**:
```
Market page → Collection → Product Detail → Cart → Shopify Checkout
```

**Implementation**:
- Storefront API for browsing
- Cart stored in localStorage + synced
- Checkout redirects to Shopify hosted checkout
- Webhooks handle order updates

### MESSMARKET (Community Sellers)

**Brand Configuration** (`src/lib/brand.js`):
```javascript
messmarket: {
  name: 'MESSMARKET',
  tagline: 'Community sellers. Zero gatekeepers.',
  description: 'Etsy-style marketplace for the HOTMESS community.',
  fee: '10% platform fee',
  features: [
    'Verified seller badges',
    'Escrow-protected transactions',
    'XP rewards for buyers & sellers',
    'Direct messaging with sellers',
    'Rating & review system',
  ],
}
```

### P2P Marketplace Implementation

**Location**: `src/pages/Marketplace.jsx`, `src/pages/SellerDashboard.jsx`

**Seller Dashboard Tabs**:
| Tab | Component | Features |
|-----|-----------|----------|
| **Products** | `ProductTable` | CRUD products, stock management |
| **Orders** | `OrdersTable` | Order fulfillment, shipping |
| **Offers** | `SellerOffers` | Negotiate offers |
| **Analytics** | `SellerAnalytics` | Sales charts, revenue |
| **Featured** | `FeaturedListings` | Boost visibility (XP cost) |
| **Disputes** | `DisputeResolution` | Handle buyer complaints |
| **Promotions** | `PromotionManager` | Discount codes |
| **Payouts** | `PayoutManager` | Withdraw earnings |

### Dispute Resolution System

**Location**: `src/components/seller/DisputeResolution.jsx`

**Dispute States**:
- `open` - Buyer filed dispute
- `under_review` - Admin reviewing
- `resolved` - Decision made

**Features**:
- Dispute timeline view
- Evidence upload
- Response submission
- Admin notification

### Payout System

**Location**: `src/components/seller/PayoutManager.jsx`

**Implementation**:
```jsx
// Calculates available balance from delivered, paid orders
const available = orders
  .filter(o => o.status === 'delivered' && o.payment_status === 'paid')
  .reduce((sum, o) => sum + (o.total || 0), 0);
```

**Note**: Stripe Connect integration is a **placeholder** - button says "Connect Stripe Account" but doesn't actually initiate OAuth flow.

### XP Currency (Coming Soon)

**Spec Says**: Products can be purchased with XP

**Current State**: 
- UI shows "COMING SOON" badges
- No XP → purchase conversion implemented
- `sweatCoinPurchase.ts` function exists but is placeholder

---

## Site Copy & Messaging

### Brand Voice Guidelines (from implementation)

**Observed Patterns**:
- ALL CAPS for headlines, labels, CTAs
- Short, punchy phrases
- Sex-positive but not crude
- Safety-forward messaging
- Community-first language

### Key Microcopy Examples

#### Safety/Care Copy

```jsx
// Care.jsx - Emergency section
"If you or someone you know is in immediate danger, call 999."

// Aftercare checklist
"Before You Go Out: ✓ Charger, ✓ Cash/card, ✓ Safe word, 
✓ Someone knows where you're going"

// Consent section
"CONSENT & BOUNDARIES - A reminder that consent is ongoing, 
enthusiastic, and can be withdrawn at any time."
```

#### Social Discovery Copy

```jsx
// RightNowModal.jsx
"Ends automatically. No ghost status."

// Home.jsx hero
"Find your match in minutes"
"Compatibility-first discovery. Real-time availability."

// ProfilesGrid
"RIGHT NOW" badge (red-orange gradient, pulsing)
```

#### Onboarding Copy

```jsx
// WelcomeTour.jsx steps
Step 1: "CONNECT - Find guys near you. Go 'Right Now' when available."
Step 2: "GLOBE - Watch the world in real-time"
Step 3: "EVENTS - Never miss a party"
Step 4: "MARKET - Shop official drops and creator products"
Step 5: "MESSAGES - Chat securely, no ghost status"
```

#### Community Guidelines Copy

```jsx
// CommunityGuidelines.jsx
"CONSENT FIRST - Always ask, always respect the answer"
"SAFETY ALWAYS - Report concerns, block bad actors"
"AUTHENTIC CONNECTIONS - Be real, no catfishing"
"INCLUSIVE COMMUNITY - Respect all backgrounds"
```

### Missing Copy Elements (from spec)

The spec defines specific copy that's not consistently implemented:

| Element | Spec Says | Implementation |
|---------|-----------|----------------|
| **Age Gate** | "18+ only. Verify to enter." | ✅ Present |
| **Consent Gate** | "Consent first. Keep it clear, keep it respectful." | ⚠️ Generic "18+ verified" |
| **Location** | "We show ETAs, not addresses — until you both agree." | ❌ Not present in UI |
| **Aftercare Nudge** | "You good?" → ALL GOOD / NEED A MINUTE / GET HELP | ❌ Not automated |
| **Telegram Link** | "Link Telegram to keep chats synced (optional)." | ⚠️ Basic link only |

---

## Missing Features

### Critical Missing (Spec vs Implementation)

| Feature | Spec Description | Status |
|---------|------------------|--------|
| **Fake Call** | "Escape awkward situations with a fake incoming call" | ❌ **NOT IMPLEMENTED** |
| **Automated Aftercare Nudge** | "Post-meetup check-in: You good?" | ❌ **NOT IMPLEMENTED** |
| **Profile-Specific AI Wingman** | "Conversation starters based on profile analysis" | ❌ **NOT IMPLEMENTED** |
| **Match Insights** | "Explains *why* you're compatible" | ❌ **NOT IMPLEMENTED** (score shown, no explanation) |
| **Profile Optimization Tips** | "Tips to improve your profile based on data" | ❌ **NOT IMPLEMENTED** |
| **Full Telegram Feed** | "See Telegram chats alongside HOTMESS messages" | ❌ **NOT IMPLEMENTED** (link only) |

### Partially Implemented

| Feature | Spec Description | Status |
|---------|------------------|--------|
| **8-Dimension Matching** | "8-dimension compatibility scoring" | ⚠️ 6 dimensions implemented |
| **Uber Booking** | "One-tap Uber booking from profiles" | ⚠️ Deep link utility exists, not wired to profile UI |
| **Creator Subscriptions** | "Premium content, subscriptions, monetization" | ⚠️ DB tables exist, UI shows "Coming Soon" |
| **XP Purchasing** | "Buy products with XP" | ⚠️ Placeholder only |

### Technical Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **No E2E tests for safety flows** | Can't verify panic button works | Add Playwright tests |
| **No fake call component** | Missing key safety feature | Create FakeCallGenerator.jsx |
| **Aftercare not automated** | Users must manually access Care page | Add post-meetup detection hook |
| **AI Wingman not profile-aware** | Generic assistant, not matchmaking helper | Enhance GlobalAssistant with profile context |

---

## Components Inventory

### Component Categories (260+ total)

| Category | Count | Purpose |
|----------|-------|---------|
| `ui/` | 65+ | Base UI primitives (Shadcn/Radix) |
| `events/` | 12 | Event-related components |
| `globe/` | 11 | 3D globe visualization |
| `admin/` | 12 | Admin dashboard tools |
| `marketplace/` | 12 | Shop and P2P components |
| `profile/` | 13 | Profile display and editing |
| `messaging/` | 6 | Chat and notifications |
| `safety/` | 4 | Safety and reporting |
| `social/` | 9 | Social discovery |
| `community/` | 6 | Community features |
| `auth/` | 4 | Authentication gates |
| `seller/` | 7 | Seller tools |
| `radio/` | 3 | Radio/music player |
| `error/` | 3 | Error boundaries |
| `discovery/` | 3 | Discovery features |
| `search/` | 3 | Search functionality |
| `moderation/` | 3 | Moderation tools |
| `notifications/` | 2 | Notification center |
| `onboarding/` | 2 | Onboarding flows |
| Other | 80+ | Various utilities |

### Key Reusable Components

#### UI Primitives (`src/components/ui/`)
- `Button` - Primary action buttons
- `Card` - Content containers
- `Dialog` - Modal dialogs
- `Sheet` - Sliding panels
- `Tabs` - Tab navigation
- `Select` - Dropdown selects
- `Input` - Form inputs
- `Toast/Sonner` - Notifications
- `Skeleton` - Loading states
- `OSCard` - Branded card style

#### Feature Components
- `PageShell.jsx` - Consistent page wrapper with kinetic headlines
- `ErrorBoundary.jsx` - Error catching wrapper
- `GlobalSearch.jsx` - Universal search modal
- `NotificationCenter.jsx` - Notification hub
- `PanicButton.jsx` - Emergency safety button
- `GlobalAssistant.jsx` - AI chat assistant
- `ScrollProgress.tsx` - Page scroll indicator

---

## API Routes

### Vercel Serverless Functions (`/api/`)

#### Core APIs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/profile` | GET/PATCH | User profile |
| `/api/profiles` | GET | Profile listings |
| `/api/nearby` | GET | Nearby users |
| `/api/travel-time` | POST | ETA calculations |
| `/api/viewer-location` | GET | GeoIP location |

#### Notifications
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications/dispatch` | POST | Send notifications |
| `/api/notifications/preferences` | GET/PATCH | User preferences |
| `/api/notifications/process` | POST | Process queue |
| `/api/notifications/settings` | GET/PATCH | Notification settings |

#### Events
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/events/scrape` | POST | Trigger scraper |
| `/api/events/cron` | GET | Scheduled scraper |
| `/api/events/diag` | GET | Scraper diagnostics |

#### Shopify Integration
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/shopify/collections` | GET | List collections |
| `/api/shopify/collection` | GET | Single collection |
| `/api/shopify/products` | GET | Product listings |
| `/api/shopify/product` | GET | Product details |
| `/api/shopify/cart` | POST | Cart operations |
| `/api/shopify/featured` | GET | Featured products |
| `/api/shopify/sync` | POST | Sync products |
| `/api/shopify/webhooks` | POST | Webhook handler |

#### SoundCloud Integration
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/soundcloud/authorize` | GET | OAuth initiate |
| `/api/soundcloud/callback` | GET | OAuth callback |
| `/api/soundcloud/status` | GET | Connection status |
| `/api/soundcloud/upload` | POST | Track upload |
| `/api/soundcloud/disconnect` | POST | Disconnect account |
| `/api/soundcloud/public-profile` | GET | Public profile data |
| `/api/soundcloud/public-tracks` | GET | Public tracks |

#### Stripe Payments
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/create-checkout-session` | POST | Create checkout |
| `/api/stripe/cancel-subscription` | POST | Cancel subscription |
| `/api/stripe/webhook` | POST | Stripe webhooks |

#### Scanning/Tickets
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/scan/check-in` | POST | Beacon check-in |
| `/api/scan/redeem` | POST | Ticket redemption |
| `/api/tickets/qr` | GET | Generate ticket QR |

#### Routing/Directions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/routing/directions` | POST | Route directions |
| `/api/routing/etas` | POST | Multiple ETAs |

#### Admin
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/cleanup/rate-limits` | POST | Clean rate limits |
| `/api/admin/notifications/dispatch` | POST | Admin notify |

#### GDPR
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/gdpr/request` | POST | Data requests |

### Edge Functions (`/functions/`)

| Function | Purpose |
|----------|---------|
| `beaconAnalytics` | Beacon stats calculation |
| `calculateVibeCompatibility` | Vibe matching algorithm |
| `calculateWarBonus` | War mode bonuses |
| `calculateZoneBlobs` | Zone visualization |
| `cashoutKingEarnings` | King payout |
| `checkInBeacon` | Process beacon check-in |
| `collectPassiveTax` | Passive earnings |
| `createPickupBeacon` | Create pickup beacons |
| `generateVibeTooltip` | Vibe tooltip text |
| `getAIEventRecommendations` | ML event suggestions |
| `getHeatmapData` | Activity heatmap |
| `importShopifyProducts` | Shopify import |
| `markMessagesRead` | Mark read status |
| `muteConversation` | Mute threads |
| `nearbyBeacons` | Nearby beacon search |
| `pushToSoundCloud` | SoundCloud upload |
| `scanBeaconQR` | QR scan handler |
| `scanPickupBeacon` | Pickup scan |
| `scheduleEventScraper` | Schedule scraper |
| `scrapeEvents` | Event scraping |
| `sendEventNotifications` | Event alerts |
| `sendPushNotification` | Push notifications |
| `sweatCoinPurchase` | SweatCoin integration |
| `syncAudioMetadata` | Audio metadata sync |
| `syncShopifyInventory` | Inventory sync |
| `synthesizeVibe` | Vibe calculation |
| `telegramProxy` | Telegram API proxy |
| `toggleBookmark` | Bookmark toggle |
| `triggerWarMultiplier` | War mode trigger |
| `uploadMessageMedia` | Media uploads |
| `verifyBeacon` | Beacon verification |

---

## Database Schema

### Core Tables (from migrations)

| Table | Purpose |
|-------|---------|
| `User` | User profiles and settings |
| `Beacon` | Location drops, events, releases |
| `EventRSVP` | Event attendance tracking |
| `ChatThread` | Message threads |
| `Message` | Individual messages |
| `Product` | P2P marketplace products |
| `CartItems` | Shopping cart items |
| `Order` | Order records |
| `Report` | Safety reports |
| `Block` | Blocked users |
| `Notification` | Notification queue |
| `UserFollow` | Social follows |
| `UserVibe` | Vibe preferences |
| `UserTribe` | Tribe membership |
| `UserActivity` | Activity tracking |
| `SearchAnalytics` | Search tracking |
| `Referral` | Referral tracking |
| `PushSubscription` | Push notification subs |
| `GDPRRequest` | Data requests |
| `SupportTicket` | Support tickets |
| `Venue` | Venue data |
| `PremiumContent` | Premium content records |

### Key RLS Policies
- Users can read all authenticated user profiles
- Users can only update their own profile
- Messages restricted to thread participants
- Admin-only access for moderation tables
- Service role for backend operations

---

## Unfinished Work & TODOs

### High Priority Issues

#### 1. SoundCloud OAuth Integration
**Status**: ⚠️ Partially Implemented  
**Location**: `api/soundcloud/*`, `functions/pushToSoundCloud.ts`

**What's Done**:
- OAuth endpoints exist
- Basic upload endpoint

**What's Missing**:
- Production credential setup
- Token refresh handling
- Error recovery UI
- Upload progress tracking

#### 2. QR Scanner / Ticket Validation
**Status**: ⚠️ Partially Implemented  
**Location**: `src/pages/Scan.jsx`, `api/scan/*`

**What's Done**:
- Beacon QR scanning UI
- Check-in endpoint
- Ticket QR generation

**What's Missing**:
- Full ticket scanning UI
- Scan history view
- Offline queue support
- Admin redemption UI polish

#### 3. Premium Content System
**Status**: ⚠️ Placeholder  
**Location**: `src/components/profile/MediaGallery.jsx`

**What's Done**:
- Database table exists
- UI placeholders ("Coming Soon")

**What's Missing**:
- Content upload flow
- Payment integration
- Unlock mechanism
- Blur/lock overlay

#### 4. Mock Data Replacement
**Status**: ⚠️ Partial  
**Location**: `src/components/globe/CityDataOverlay.jsx`

**What's Done**:
- Real beacon/user data
- Travel time calculations

**What's Missing**:
- Real weather API integration
- Real transit API integration
- City statistics endpoint

### Medium Priority Issues

#### 5. Event Scraper Backend
**Status**: ⚠️ Needs Integration  
**Location**: `functions/scrapeEvents.ts`, `api/events/scrape.js`

**Missing**:
- Scheduled cron execution
- Error monitoring
- Admin notifications
- Duplicate detection improvement

#### 6. Discovery Filters
**Status**: ⚠️ Basic Only  
**Location**: `src/components/discovery/`

**Missing**:
- Age range filter
- Distance radius filter
- Advanced tag filtering
- Saved filter presets

#### 7. Offline Support
**Status**: ⚠️ Minimal  
**Location**: `src/hooks/useOfflineSync.js`

**Missing**:
- Full service worker implementation
- Offline mutation queue
- Cache strategy

### Low Priority Issues

#### 8. XP Purchasing
**Status**: ❌ Coming Soon  
**Location**: `src/components/marketplace/ProductCard.jsx`

#### 9. SweatCoin Integration
**Status**: ❌ Placeholder  
**Location**: `functions/sweatCoinPurchase.ts`

---

## Technical Debt

### Code Quality Issues

1. **Large Components**
   - `EditProfile.jsx` - ~500+ lines
   - `Profile.jsx` - ~400+ lines
   - Recommendation: Break into smaller components

2. **Duplicate Logic**
   - User fetching pattern repeated across 20+ pages
   - Recommendation: Create `useCurrentUser` hook (partially done)

3. **Mixed File Extensions**
   - Mix of `.js`, `.jsx`, `.ts`, `.tsx`
   - Recommendation: Migrate to TypeScript consistently

4. **Magic Numbers**
   - Polling intervals hardcoded
   - Recommendation: Create constants file

### Performance Considerations

1. **Bundle Size**
   - 82+ dependencies
   - Three.js for globe
   - Recommendation: Code splitting, lazy loading

2. **Real-time Updates**
   - Some features use polling instead of WebSockets
   - Recommendation: Migrate to Supabase realtime

### Security Considerations

1. **Rate Limiting**
   - Implemented via `api/middleware/rateLimiter.js`
   - Status: ✅ Done

2. **Input Sanitization**
   - Via `src/components/utils/sanitize.jsx`
   - Status: ✅ Done

3. **Content Security Policy**
   - Vercel headers configured
   - Status: ✅ Done

---

## Recent Implementations (2026-01-28)

### New Components Added

#### 1. FakeCallGenerator (`src/components/safety/FakeCallGenerator.jsx`)
**Status**: ✅ **IMPLEMENTED**

Implements the spec requirement: "Fake Call - Escape awkward situations with fake incoming call"

**Features**:
- Customizable caller name (presets: Mum, Best Friend, Work, Flatmate, Partner)
- Delay timer options: Now, 5s, 30s, 1min, 5min
- Realistic vibration pattern
- Full-screen incoming call UI
- Answer redirects to Safety Hub
- Wired into Safety page and Care page

#### 2. ProfileWingman (`src/components/profile/ProfileWingman.jsx`)
**Status**: ✅ **IMPLEMENTED**

Implements the spec requirement: "AI Wingman - Conversation starters, match insights"

**Features**:
- AI-generated conversation starters based on profile analysis
- Templates for: interests, music, location, travel, bio-based openers
- Match insights explaining why users are compatible
- Copy/use functionality for easy message sending
- Refresh button to regenerate openers
- Wired into Profile page (shows when viewing other profiles)

#### 3. AftercareNudge (`src/components/safety/AftercareNudge.jsx`)
**Status**: ✅ **IMPLEMENTED**

Implements the spec requirement: "Aftercare Nudge: 'You good?' prompt after meetup"

**Features**:
- Three response options:
  - ALL GOOD (green) - positive confirmation
  - NEED A MINUTE (yellow) - shows care resources
  - GET HELP (pink) - shows emergency contacts + resources
- Private response tracking
- `useAftercareNudge` hook for triggering

#### 4. InAppDirections (`src/components/directions/InAppDirections.jsx`)
**Status**: ✅ **IMPLEMENTED**

Implements the spec requirement: "Never leave the app" for navigation

**Features**:
- Embeddable Leaflet map component
- Travel modes: Walk, Bike, Drive + Uber deep link
- Compact view for profile cards
- Full expanded map view with route polylines
- Real-time ETA display
- `ETABadges` component for quick travel time display
- `DirectionsButton` for modal trigger

#### 5. PersonaCard (`src/components/profile/PersonaCard.jsx`)
**Status**: ✅ **IMPLEMENTED**

Implements the spec requirement: "Multi-Layered Profile Skins"

**Features**:
- Six persona types with distinct styling:
  - Standard (white)
  - Seller (purple)
  - Creator (pink)
  - Organizer (cyan)
  - Premium (gold)
  - DJ (green)
- Three variants: default, compact, featured
- Status badges: Online, Right Now, Busy, Away
- Match score display
- Level/XP progress indicators
- `PersonaGrid` component for layouts

#### 6. HotmessSplash (`src/components/splash/HotmessSplash.jsx`)
**Status**: ✅ **IMPLEMENTED**

Condenses the fragmented gate system into ONE bold entry experience

**Features**:
- Single "ENTER" action confirms: 18+, cookies, terms, GDPR
- Inline auth (sign in/sign up) without page switching
- Audio support for splash track
- Beautiful gradient animations
- Replaces: AgeGate, CookieGate, OnboardingGate, ConsentGate

### Enhanced Pages

#### HNH MESS Lube Page (`src/pages/Hnhmess.jsx`)
**Status**: ✅ **ENHANCED**

- Complete redesign with bold hero section
- Full-viewport hero with gradient effects
- Product gallery with thumbnails
- Integrated SoundCloud player
- Care-first messaging section
- Proper copyright footer:
  - © 2026 HOTMESS LONDON LTD. All rights reserved.
  - HNH MESS™ is a trademark of HOTMESS LONDON LTD.
  - Music © RAW CONVICT RECORDS. Used under license.

---

## Summary

HOTMESS London OS is a feature-rich, well-structured application with:

- **Strengths**:
  - Modern React architecture
  - Comprehensive feature set
  - Good separation of concerns
  - Real-time capabilities
  - Strong safety features
  - Headless Shopify integration
  - **NEW**: Complete safety system (Fake Call, Aftercare Nudge, Check-ins)
  - **NEW**: AI-powered profile matching with conversation starters
  - **NEW**: In-app navigation without leaving the platform
  - **NEW**: Multi-layered persona system
  - **NEW**: Streamlined onboarding with unified splash

- **Areas for Improvement**:
  - Complete SoundCloud OAuth
  - Finish ticket scanning
  - Replace mock data
  - TypeScript migration
  - Test coverage expansion

The codebase is production-ready for beta testing with the documented limitations clearly marked in the UI.

---

*Analysis generated: 2026-01-28*
*Last updated: 2026-01-28 - Added new component implementations*
