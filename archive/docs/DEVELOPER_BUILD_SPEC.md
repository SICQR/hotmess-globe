# HOTMESS Platform - Developer Build Specification

**Document Type**: Developer Handoff / Build Specification  
**Version**: 1.0  
**Date**: January 30, 2026  
**Status**: Ready for Development

---

## Executive Summary

Build a **brutalist luxury social platform** for gay men, focused on nightlife discovery, radio/music culture, social connection, and commerce. Target market is London (MVP), with expansion to major cities globally.

**One-liner**: "Grindr meets Time Out meets Resident Advisor meets Depop — for queer nightlife."

### Business Model
- Freemium with premium tiers (£4.99/£14.99/mo)
- Commission on marketplace transactions (15%)
- Ticket resale fees (10%)
- Business/promoter subscriptions (tiered)
- Creator economy (subscription content, tips)

### Current State
- **~70% complete** — core flows work, production hardening needed
- **Tech debt**: 23 open PRs, some merge conflicts, lint issues blocking CI
- **Priority**: Stabilize CI/CD, complete payment flows, launch-ready polish

---

## What You're Building

### The Four Pillars

| Pillar | Description | Core Features |
|--------|-------------|---------------|
| **NIGHTS** | Event discovery & nightlife | Events calendar, venue map, beacons, RSVP, check-ins |
| **RADIO** | Live shows & music culture | Live streaming, show schedule, DJ profiles, releases |
| **SOCIAL** | Profile matching & messaging | Discovery grid, match scoring, DMs, voice notes, "Right Now" status |
| **COMMERCE** | Marketplace & tickets | Shopify store, P2P marketplace, ticket resale |

### Target Users
1. **Partygoers** — Event discovery, RSVP, friend coordination
2. **Social connectors** — Meeting people, dating, hookups
3. **Music lovers** — Radio shows, releases, DJ culture
4. **Sellers/Creators** — Marketplace, ticket resale, content monetization
5. **Promoters/Venues** — Event promotion, analytics, ticketing

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | React 18 + Vite | SPA with PWA capabilities |
| **Styling** | Tailwind CSS + Framer Motion | Custom design tokens, glass morphism |
| **State** | TanStack Query + Zustand | Server state + client state |
| **Backend** | Supabase (Postgres + Auth + Realtime) | Row-level security, edge functions |
| **API** | Vercel Serverless Functions | `/api/*` endpoints |
| **Commerce** | Shopify Storefront API | Headless commerce |
| **Maps** | Mapbox GL | Event locations, user proximity |
| **3D Globe** | Three.js / React Three Fiber | Hero visualization |
| **Audio** | Web Audio API + SoundCloud | Radio streaming |
| **Payments** | Stripe | Subscriptions, marketplace payouts |
| **Video** | Daily.co | Video calls (not fully integrated) |
| **Notifications** | Supabase + Web Push | Realtime + push |

### Key Dependencies
```json
{
  "react": "^18.x",
  "vite": "^5.x",
  "@tanstack/react-query": "^5.x",
  "zustand": "^4.x",
  "@supabase/supabase-js": "^2.x",
  "tailwindcss": "^3.x",
  "framer-motion": "^11.x",
  "three": "^0.160.x",
  "@react-three/fiber": "^8.x",
  "mapbox-gl": "^3.x",
  "@stripe/stripe-js": "^2.x"
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React SPA)                       │
├─────────────────────────────────────────────────────────────────┤
│  Pages/Routes  │  Components  │  Hooks  │  State (Zustand/RQ)   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Vercel Edge/API     │
                    │   /api/* endpoints    │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌──────────────┐
│   Supabase    │     │    Shopify      │     │   External   │
│  (DB/Auth/    │     │  Storefront     │     │    APIs      │
│   Realtime)   │     │     API         │     │ (Maps/Sound) │
└───────────────┘     └─────────────────┘     └──────────────┘
```

### Folder Structure
```
hotmess-globe/
├── api/                    # Vercel serverless functions
│   ├── auth/               # Authentication endpoints
│   ├── beacons/            # Event/beacon CRUD
│   ├── messages/           # Chat API
│   ├── profiles/           # User profiles
│   ├── routing/            # Maps/directions
│   ├── shopify/            # Commerce proxy
│   ├── soundcloud/         # Audio integration
│   └── tickets/            # Ticket system
├── src/
│   ├── components/         # React components
│   │   ├── ui/             # Design system (buttons, cards, inputs)
│   │   ├── globe/          # 3D globe components
│   │   ├── profile/        # Profile-related
│   │   ├── discovery/      # Social discovery
│   │   ├── events/         # Event components
│   │   ├── messaging/      # Chat/DMs
│   │   ├── radio/          # Music/radio player
│   │   └── safety/         # Safety features
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities, API clients
│   ├── store/              # Zustand stores
│   └── styles/             # Global CSS
├── supabase/               # DB migrations, seed data
├── public/                 # Static assets
└── docs/                   # Documentation
```

---

## Features to Build/Complete

### Priority 1: CRITICAL (Block Launch)

#### 1.1 Payment Flow Completion
**Status**: Partially built  
**Effort**: 40 hours

| Task | Description |
|------|-------------|
| Stripe subscription flow | Wire up membership upgrade page to Stripe Checkout |
| Marketplace checkout | Complete P2P payment with escrow |
| Ticket purchase | Payment for ticket resale |
| Creator payouts | Stripe Connect for creator earnings |
| Receipt/confirmation | Email receipts, in-app purchase history |

**Files to modify**:
- `src/pages/MembershipUpgrade.jsx`
- `src/pages/Checkout.jsx`
- `api/stripe/*`
- `src/pages/CreatorsCheckout.jsx`

#### 1.2 CI/CD Pipeline Fix
**Status**: Blocked by lint errors  
**Effort**: 8 hours

| Task | Description |
|------|-------------|
| Fix lint errors | Resolve unused imports blocking builds |
| Resolve merge conflicts | 3 PRs have conflicts (PRs #30, #31, #32) |
| Enable deployment | Get Vercel preview deploys working |

**Commands**:
```bash
npm run lint        # Must pass
npm run typecheck   # Must pass  
npm run build       # Must succeed
npm run test:ci     # Must pass
```

#### 1.3 Auth Hardening
**Status**: Mostly complete, needs audit  
**Effort**: 16 hours

| Task | Description |
|------|-------------|
| Session management | Refresh token handling, logout everywhere |
| Rate limiting | Prevent brute force on auth endpoints |
| Telegram OAuth | Complete Telegram login integration |
| Magic link flow | Email magic link authentication |

### Priority 2: HIGH (Week 1-2)

#### 2.1 Social Discovery Polish
**Status**: Built, needs refinement  
**Effort**: 24 hours

| Task | Description |
|------|-------------|
| Match probability | AI scoring algorithm working but needs tuning |
| Filter system | Add age, distance, interests, online status filters |
| Infinite scroll | Optimize virtualized list performance |
| "Right Now" status | Real-time availability indicator |

**Match Probability Algorithm** (implemented in `src/hooks/useMatchProfiles.ts`):
```javascript
// Scoring factors:
// - Shared interests (0-40 points)
// - Distance proximity (0-20 points)
// - Activity recency (0-15 points)
// - Profile completeness (0-15 points)
// - Mutual connections (0-10 points)
```

#### 2.2 Messaging Enhancements
**Status**: Core works, features missing  
**Effort**: 20 hours

| Task | Description |
|------|-------------|
| Voice notes | Recording/playback implemented, needs polish |
| Read receipts | Show message read status |
| Typing indicators | Real-time typing status |
| Media sharing | Photo/video in chat |
| Wingman AI | AI conversation suggestions (stub exists) |

#### 2.3 Event System Completion
**Status**: 80% complete  
**Effort**: 16 hours

| Task | Description |
|------|-------------|
| QR check-in | Scan QR at venue for points |
| AI recommendations | Personalized event suggestions |
| Calendar sync | Add to calendar (internal, not device) |
| Directions | In-app navigation to venue |

### Priority 3: MEDIUM (Week 3-4)

#### 3.1 Radio/Music Features
**Status**: Player works, backend incomplete  
**Effort**: 24 hours

| Task | Description |
|------|-------------|
| SoundCloud OAuth | Full OAuth flow for DJ uploads |
| Show schedule | Admin can set live schedule |
| Episode archive | Past shows accessible |
| Release pages | Album/EP detail pages |

#### 3.2 Marketplace
**Status**: Shopify integration works, P2P partial  
**Effort**: 32 hours

| Task | Description |
|------|-------------|
| Seller onboarding | KYC flow for P2P sellers |
| Product listings | Create/edit/delete products |
| Order management | Seller order fulfillment |
| Dispute handling | Buyer protection, refunds |

#### 3.3 Ticket Resale
**Status**: Pages exist, payments not wired  
**Effort**: 24 hours

| Task | Description |
|------|-------------|
| Listing creation | Sell tickets with price |
| Purchase flow | Stripe payment for tickets |
| Transfer mechanism | QR code transfer to buyer |
| Fraud prevention | Signature verification |

### Priority 4: LOW (Post-Launch)

#### 4.1 Creator Economy
| Task | Status |
|------|--------|
| Subscription content | DB ready, UI incomplete |
| Tips/donations | Not started |
| PPV content | Not started |
| Analytics dashboard | Stub exists |

#### 4.2 Gamification
| Task | Status |
|------|--------|
| XP system | Implemented |
| Achievements | Implemented |
| Leaderboards | Partial |
| Challenges | Stub |
| Streaks | Implemented |

#### 4.3 Business Tools
| Task | Status |
|------|--------|
| Promoter dashboard | Stub exists |
| Analytics | Partial |
| Event promotion | Not started |
| Audience insights | Not started |

---

## Database Schema (Supabase)

### Core Tables

```sql
-- Users & Profiles
User                    -- Main user account
UserProfile             -- Extended profile data
UserTag                 -- Interest tags (many-to-many)
UserFollow              -- Follow relationships
UserBlock               -- Block list
RightNowStatus          -- "Right Now" availability

-- Messaging
MessageThread           -- Chat threads
Message                 -- Individual messages
MessageRead             -- Read receipts

-- Events
Beacon                  -- Events, signals, beacons
EventRSVP               -- User RSVPs
BeaconCheckIn           -- Physical check-ins

-- Commerce
Product                 -- P2P marketplace items
Order                   -- Orders
OrderItem               -- Order line items
TicketListing           -- Ticket resale

-- Gamification
Achievement             -- Available achievements
UserAchievement         -- Earned achievements
Challenge               -- Weekly/daily challenges
ChallengeParticipant    -- Challenge entries
Squad                   -- User groups
SquadMember             -- Group membership

-- Safety
SafetyCheckin           -- Welfare checks
TrustedContact          -- Emergency contacts
Report                  -- User reports
```

### Row-Level Security (RLS)
All tables have RLS enabled. Key policies:
- Users can only read their own messages
- Public profiles readable by authenticated users
- Admin-only access to reports
- Creator content respects subscription status

---

## API Contract

### Authentication
```
POST /api/auth/signup          # Create account
POST /api/auth/signin          # Email/password login
POST /api/auth/telegram        # Telegram OAuth
POST /api/auth/magic-link      # Request magic link
POST /api/auth/refresh         # Refresh token
POST /api/auth/logout          # Logout
```

### Profiles
```
GET  /api/profile              # Get own profile
GET  /api/profiles             # Discovery grid (paginated)
GET  /api/profiles/:id         # Get user profile
PATCH /api/profile             # Update own profile
GET  /api/match-probability    # Get match scores
```

### Social
```
POST /api/follow               # Follow user
DELETE /api/follow/:id         # Unfollow
POST /api/block                # Block user
GET  /api/nearby               # Nearby users (requires location)
```

### Messaging
```
GET  /api/messages             # List threads
GET  /api/messages/:threadId   # Get thread messages
POST /api/messages             # Send message
POST /api/messages/voice       # Upload voice note
```

### Events
```
GET  /api/beacons              # List events (filterable)
GET  /api/beacons/:id          # Event detail
POST /api/beacons              # Create beacon
PATCH /api/beacons/:id         # Update beacon
POST /api/rsvp                 # RSVP to event
POST /api/scan/check-in        # QR check-in
```

### Commerce
```
GET  /api/shopify/featured     # Featured products
GET  /api/shopify/collection/:handle
POST /api/shopify/cart         # Cart operations
POST /api/checkout/create      # Start checkout
```

### All authenticated endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

---

## Design System

### Brand Colors
```css
--hot-pink: #FF1493;      /* Primary - CTAs, highlights */
--cyan: #00D9FF;          /* Secondary - Info, events */
--purple: #B026FF;        /* Tertiary - Music, releases */
--lime: #39FF14;          /* Success - Online, confirmed */
--gold: #FFD700;          /* Premium - VIP, featured */
--dark-bg: #0A0A0A;       /* Background */
--glass: rgba(255,255,255,0.05);  /* Glass effect */
--glass-border: rgba(255,255,255,0.1);
```

### Typography
- **Headings**: Inter (bold)
- **Body**: Inter (regular)
- **Accent**: Space Grotesk (optional)

### Component Variants
Buttons have 20+ variants defined in `src/components/ui/button.jsx`:
- `default`, `hot`, `cyan`, `glass`, `ghost`
- `glow`, `gradient`, `premium`
- Sizes: `sm`, `default`, `lg`, `xl`

### Design Principles
1. **Brutalist luxury** — Bold, unapologetic, premium feel
2. **Glass morphism** — Frosted glass effects, blur backdrops
3. **Neon accents** — Glowing borders, hover states
4. **Dark-first** — Always dark mode, high contrast
5. **Motion** — Framer Motion animations throughout

---

## Known Issues & Tech Debt

### Critical
| Issue | Location | Impact |
|-------|----------|--------|
| Lint errors blocking CI | Multiple files | Can't deploy |
| Merge conflicts | PRs #30, #31, #32 | Branches stale |
| React infinite re-render | `CityPulseBar.jsx` | Browser freezes |

### High
| Issue | Location | Impact |
|-------|----------|--------|
| Mock data in production | `CityDataOverlay.jsx` | Fake metrics shown |
| SoundCloud OAuth incomplete | `api/soundcloud/*` | Can't upload music |
| Payment flows not wired | Checkout pages | Can't monetize |

### Medium
| Issue | Location | Impact |
|-------|----------|--------|
| No rate limiting | All API endpoints | Abuse risk |
| Large bundle size | Build output | Slow initial load |
| Missing error boundaries | Various pages | Crashes propagate |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account (or local Docker)
- Vercel account (for deployment)

### Setup
```bash
# Clone
git clone https://github.com/SICQR/hotmess-globe.git
cd hotmess-globe

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in your keys (see Environment Variables below)

# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
npm run test:ci
```

### Environment Variables
```env
# Required
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only

# Commerce
SHOPIFY_STOREFRONT_TOKEN=xxx
SHOPIFY_STORE_DOMAIN=xxx.myshopify.com
STRIPE_SECRET_KEY=sk_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx

# Maps & Media
VITE_MAPBOX_TOKEN=pk.xxx
GOOGLE_MAPS_API_KEY=xxx

# Optional
OPENAI_API_KEY=sk-xxx          # AI features
TELEGRAM_BOT_TOKEN=xxx         # Telegram auth
DAILY_API_KEY=xxx              # Video calls
SOUNDCLOUD_CLIENT_ID=xxx       # Music uploads
```

---

## Development Workflow

### Branch Strategy
- `main` — Production
- `develop` — Staging
- `feature/*` — Feature branches
- `fix/*` — Bug fixes

### PR Requirements
1. Pass lint: `npm run lint`
2. Pass typecheck: `npm run typecheck`
3. Pass tests: `npm run test:ci`
4. Pass build: `npm run build`
5. Code review approval

### Commit Messages
```
feat: Add user profile photo upload
fix: Resolve infinite loop in CityPulseBar
docs: Update API documentation
chore: Update dependencies
```

---

## Success Criteria

### MVP Launch Checklist
- [ ] Auth flows work end-to-end
- [ ] User can create profile with photos
- [ ] Discovery grid loads and filters work
- [ ] Can send/receive messages
- [ ] Events display and RSVP works
- [ ] Radio player streams live shows
- [ ] Shopify products display and cart works
- [ ] Payment flows complete (subscriptions)
- [ ] Safety button works
- [ ] PWA installable
- [ ] No critical console errors
- [ ] Lighthouse score > 70

### Performance Targets
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3s
- Bundle size (gzipped): < 500KB initial

### Quality Gates
- Test coverage: > 70%
- Lint: 0 errors
- TypeCheck: 0 errors
- Accessibility: WCAG 2.1 AA

---

## Contact & Support

**Project Owner**: SICQR  
**Repository**: https://github.com/SICQR/hotmess-globe  
**Documentation**: `/docs/` folder  

Key docs to read:
- `docs/HOTMESS-LONDON-OS-BIBLE++-v1.6.md` — Product spec
- `docs/BRAND-STYLE-GUIDE.md` — Design guidelines
- `docs/BUILD_CHECKLIST.md` — Implementation phases
- `TEST_SETUP.md` — Testing guide
- `INCOMPLETE_FEATURES.md` — What needs finishing

---

**Build something messy. Build something hot.**

*"Don't make the same mistake twice unless he's hot"*
