# HOTMESS GLOBE - FEATURES & PAGES MANIFESTO

**Version:** 1.5  
**Last Updated:** February 14, 2026  
**Application:** HOTMESS OS - Complete Nightlife Operating System

---

## Executive Summary

HOTMESS Globe is a comprehensive nightlife platform that combines safety-first social networking, live music streaming, event discovery, marketplace commerce, and gamification into a unified experience. Built with React + Vite, powered by Supabase, and deployed on Vercel, the platform serves **50,000+ active users** with **24/7 safety support** and **100+ weekly events**.

This manifesto documents all **79 registered pages**, **6 core feature domains**, and the technical architecture that powers the HOTMESS ecosystem.

---

## Table of Contents

1. [Core Navigation Structure](#core-navigation-structure)
2. [Feature Domains](#feature-domains)
3. [Complete Page Registry](#complete-page-registry)
4. [Technical Architecture](#technical-architecture)
5. [User Journeys](#user-journeys)
6. [Design System](#design-system)
7. [State Management](#state-management)
8. [Performance & Accessibility](#performance--accessibility)

---

## Core Navigation Structure

### Primary Tabs (V1.5)

**HOME • PULSE • EVENTS • MARKET • SOCIAL • MUSIC • MORE**

| Tab | Route | Purpose | Key Features |
|-----|-------|---------|-------------|
| **HOME** | `/` | Launch dashboard | Live radio, Tonight feed, Drops, Social discovery, Safety check |
| **PULSE** | `/pulse` | Interactive map | 3D globe, beacon layers, real-time activity |
| **EVENTS** | `/events` | Event discovery | Calendar, RSVP, tickets, organizer tools |
| **MARKET** | `/market` | Commerce | Creator products, secure checkout, XP rewards |
| **SOCIAL** | `/social` | Networking | Discovery, messages, profiles, connections |
| **MUSIC** | `/music` | Radio & releases | 24/7 live radio, shows, Raw Convict Records |
| **MORE** | `/more` | Settings & tools | Account, legal, help, admin tools |

### Navigation Philosophy

- **Mobile-first:** Bottom navigation optimized for thumb zones
- **Context-aware:** Active tab highlighted with accent color
- **Deep-linkable:** All pages accessible via direct URL
- **Backward-compatible:** Legacy `/${PageName}` routes preserved

---

## Feature Domains

### 🛡️ 1. SAFETY FIRST (Color: #FF1493)

**Pages:** `Safety`, `SafetyFeatures`, `Care`, `Vault`

#### Core Features

| Feature | Description | Technical Implementation |
|---------|-------------|------------------------|
| **Panic Button** | Instant SOS with GPS coordinates | WebSocket push + Twilio SMS + real-time location API |
| **Fake Call Generator** | Realistic escape calls | Audio playback + screen overlay + notification |
| **Live Location Sharing** | Real-time GPS tracking (15min-8hrs) | Google Maps API + WebSocket + expiry timer |
| **Aftercare Nudge** | Post-meetup wellness check | Scheduled notifications + mood tracking |
| **Trusted Contacts** | Emergency contact network | Supabase `trusted_contacts` table |
| **Check-in Timer** | Auto-alert on missed check-in | Background timer + push notification |

#### Safety Principles

- **Ask first. Confirm yes. Respect no. No pressure.**
- Consent gates on first message sends
- Report/Block/Mute on all user interactions
- 24/7 moderation team + AI content filtering

---

### 👥 2. SOCIAL (Color: #00D9FF)

**Pages:** `Social`, `SocialFeatures`, `Connect`, `Messages`, `Feed`, `SquadChat`, `Profile`, `EditProfile`

#### Core Features

| Feature | Description | Database Schema |
|---------|-------------|----------------|
| **Global Discovery** | Distance-based user filtering | PostGIS spatial queries on `users` table |
| **Real-time Messaging** | Voice notes, photos, typing indicators | `messages` table + WebSocket via Supabase Realtime |
| **24hr Stories** | Ephemeral content sharing | `stories` table with TTL (Time To Live) |
| **Presence System** | Online/offline status | `user_presence` table + heartbeat mechanism |
| **Vibe Matching** | AI compatibility scoring | OpenAI embeddings + cosine similarity |
| **Privacy Controls** | Incognito, block, ghost mode | `privacy_settings` + `blocked_users` tables |

#### Social Flows

1. **Discovery Flow:** Filters → Profile Grid → Profile Detail → Message/Connect
2. **Messaging Flow:** Thread list → Conversation → Media share → Safety actions
3. **Profile Flow:** View → Edit → Upload media → Set availability

---

### 🎉 3. EVENTS (Color: #B026FF)

**Pages:** `Events`, `EventsFeatures`, `MyEvents`, `Calendar`, `RightNowDashboard`, `OrganizerDashboard`, `TicketMarketplace`

#### Core Features

| Feature | Description | APIs Used |
|---------|-------------|-----------|
| **Global Event Map** | 3D interactive globe with event pins | Cesium.js/Three.js + event coordinates |
| **Right Now Feed** | Live "who's out" activity feed | Real-time beacons + user check-ins |
| **Ticket Marketplace** | Verified transfers + QR codes | Stripe + QR generation library |
| **Smart RSVP** | Calendar sync + group coordination | Google Calendar API + push notifications |
| **AI Recommendations** | Personalized event suggestions | OpenAI GPT-4 + user preference vectors |
| **Organizer Tools** | Event creation + analytics | Business dashboard + Supabase Functions |

#### Event Lifecycle

1. **Creation:** Organizer Dashboard → Form → Payment/Venue selection → Publish
2. **Discovery:** Globe/Feed → Event Detail → RSVP/Ticket purchase
3. **Attendance:** QR check-in → Live beacon → Post-event rating
4. **Analytics:** Organizer views attendance, revenue, engagement metrics

---

### 🛍️ 4. MARKET (Color: #39FF14)

**Pages:** `Marketplace`, `ProductDetail`, `Checkout`, `OrderHistory`, `SellerDashboard`, `SellerOnboarding`, `CreatorDashboard`

#### Core Features

| Feature | Description | Integration |
|---------|-------------|-------------|
| **Creator Storefronts** | Personalized product catalogs | Shopify API + custom product schema |
| **Secure Checkout** | Stripe-powered payments | Stripe Checkout + webhooks |
| **XP Rewards** | Earn XP on every purchase | `user_xp` table + scoring logic |
| **Exclusive Drops** | Limited-edition releases | Stock tracking + countdown timers |
| **Order Management** | Purchase history + tracking | `orders` + `order_items` tables |
| **Seller Analytics** | Revenue, views, conversion rates | Business dashboard + charts |

#### Commerce Stack

- **Payment Provider:** Stripe (cards, Apple Pay, Google Pay)
- **Product Sync:** Shopify API for inventory
- **Digital Goods:** Instant delivery via email/download link
- **Physical Goods:** Shippo API for shipping labels

---

### 🎵 5. MUSIC (Color: #FF6B35)

**Pages:** `Music`, `Radio`, `RadioFeatures`, `RadioSchedule`, `MusicRelease`, `RecordManager`, `WakeTheMess`, `DialADaddy`, `HandNHand`, `Hnhmess`

#### Core Features

| Feature | Description | Tech Stack |
|---------|-------------|-----------|
| **24/7 Live Radio** | Multiple genre channels | Icecast streaming + HLS fallback |
| **Original Shows** | Curated DJ sets | Scheduled streams + show metadata |
| **Exclusive Releases** | Early access music drops | SoundCloud API + AWS S3 storage |
| **Music Discovery** | AI playlists + recommendations | Spotify/SoundCloud APIs + OpenAI |
| **Community Playlists** | Voting + trending charts | `playlist_votes` table + sorting algorithms |
| **Premium Audio** | High bitrate + ad-free | 320kbps streams for premium users |

#### Radio Shows Schedule

| Show | Day | Time | Host |
|------|-----|------|------|
| **Wake The Mess** | Friday | 8:00 PM | Multiple guest DJs |
| **Dial A Daddy** | Saturday | 10:00 PM | Community call-in show |
| **Hand N Hand** | Sunday | 6:00 PM | Collaborative DJ sets |

#### Raw Convict Records Label

- Independent label integration
- Artist submissions via `/record-manager`
- Release calendar + pre-saves
- Revenue sharing with creators

---

### 🎭 6. PERSONAS (Color: #FFD700)

**Pages:** `PersonaFeatures`, `Profile`, `ProfileSetup`, `MembershipUpgrade`, `CreatorDashboard`, `SellerDashboard`, `OrganizerDashboard`

#### Multi-Context Profile System

| Persona | Access Level | Unique Features |
|---------|-------------|----------------|
| **Standard** | Free | Basic profile, limited messages/day, standard discovery |
| **Premium** | £9.99/mo | Verified badge, unlimited messages, priority listing, advanced filters |
| **Seller** | Premium + | Product listings, storefront, sales analytics |
| **Creator** | Premium + | Music showcase, exclusive content, fan subscriptions |
| **Organizer** | Premium + | Event creation, ticketing, attendee management |

#### Profile Adaptation

Profiles dynamically show relevant sections based on context:
- **Social context:** Bio, interests, availability status
- **Market context:** Product grid, reviews, seller ratings
- **Event context:** Upcoming events, attendee count, check-ins
- **Music context:** Tracks, releases, radio show schedule

---

## Complete Page Registry

### 📄 All 79 Registered Pages

#### Authentication & Onboarding (5 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `AgeGate` | `/age-gate` | 18+ verification |
| `Auth` | `/auth` | Login/signup hub |
| `Login` | `/login` | Email/password login |
| `Onboarding` | `/onboarding` | New user flow |
| `OnboardingGate` | `/onboarding-gate` | Force onboarding redirect |

#### Core App (8 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Home` | `/` | Main dashboard |
| `Globe` | `/globe` | 3D interactive map |
| `Pulse` | `/pulse` | Map + layers (V1.5 name) |
| `More` | `/more` | Settings/tools menu |
| `Features` | `/features` | Feature showcase hub |
| `Pricing` | `/pricing` | Subscription plans |
| `LuxShowcase` | `/lux-showcase` | Premium features demo |
| `OSDemo` | `/os-demo` | Platform walkthrough |

#### Profile & Account (10 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Profile` | `/profile/:id` | User profile view |
| `EditProfile` | `/profile/edit` | Edit current user profile |
| `ProfileSetup` | `/profile/setup` | Initial profile creation |
| `ProfilesGrid` | `/profiles` | User directory |
| `Settings` | `/settings` | Account settings |
| `AccountConsents` | `/account/consents` | Privacy preferences |
| `AccountDeletion` | `/account/delete` | Account deletion flow |
| `DataExport` | `/data-export` | GDPR data export |
| `MembershipUpgrade` | `/membership/upgrade` | Premium subscription |
| `PromoteToAdmin` | `/promote-admin` | Admin role assignment |

#### Safety & Care (3 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Safety` | `/safety` | Safety tools hub |
| `SafetyFeatures` | `/features/safety` | Safety feature showcase |
| `Care` | `/care` | Aftercare resources |
| `Vault` | `/vault` | Private content storage |

#### Social & Messaging (8 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Social` | `/social` | Social hub |
| `SocialFeatures` | `/features/social` | Social feature showcase |
| `Connect` | `/connect` | User discovery |
| `Messages` | `/messages` | Message inbox |
| `Chat` | `/chat/:id` | Direct message thread |
| `SquadChat` | `/squad-chat` | Group chat |
| `Feed` | `/feed` | Activity feed |
| `Community` | `/community` | Community hub |

#### Events & Calendar (8 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Events` | `/events` | Event discovery |
| `EventsFeatures` | `/features/events` | Event feature showcase |
| `MyEvents` | `/my-events` | User's saved events |
| `Calendar` | `/calendar` | Calendar view |
| `RightNowDashboard` | `/right-now` | Live activity feed |
| `OrganizerDashboard` | `/organizer` | Event organizer tools |
| `TicketMarketplace` | `/tickets` | Ticket buying/selling |
| `Directions` | `/directions` | Navigation to venues |

#### Market & Commerce (8 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Marketplace` | `/market` | Product discovery |
| `ProductDetail` | `/product/:id` | Product page |
| `Checkout` | `/checkout` | Payment flow |
| `OrderHistory` | `/orders` | Purchase history |
| `SellerDashboard` | `/seller` | Seller analytics |
| `SellerOnboarding` | `/seller/onboarding` | Seller registration |
| `CreatorDashboard` | `/creator` | Creator analytics |
| `Bookmarks` | `/bookmarks` | Saved products |

#### Music & Radio (9 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Music` | `/music` | Music hub |
| `Radio` | `/radio` | Live radio player |
| `RadioFeatures` | `/features/radio` | Radio feature showcase |
| `RadioSchedule` | `/radio/schedule` | Show calendar |
| `MusicRelease` | `/music/release/:id` | Release detail page |
| `RecordManager` | `/record-manager` | Label management |
| `WakeTheMess` | `/wake-the-mess` | Show page |
| `DialADaddy` | `/dial-a-daddy` | Show page |
| `HandNHand` | `/hand-n-hand` | Show page |
| `Hnhmess` | `/hnhmess` | Show page |

#### Beacons (4 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Beacons` | `/beacons` | Beacon directory |
| `BeaconDetail` | `/beacon/:id` | Beacon detail |
| `CreateBeacon` | `/beacon/create` | User beacon creation |
| `EditBeacon` | `/beacon/:id/edit` | Edit user beacon |

#### Gamification (4 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `Challenges` | `/challenges` | Community challenges |
| `Leaderboard` | `/leaderboard` | XP rankings |
| `Stats` | `/stats` | User statistics |
| `Scan` | `/scan` | QR code scanner |

#### Business/Venue (8 pages in `biz/` folder)

| Page | Route | Purpose |
|------|-------|---------|
| `BusinessDashboard` | `/biz/dashboard` | Business hub |
| `BusinessAnalytics` | `/biz/analytics` | Business metrics |
| `BusinessSettings` | `/biz/settings` | Business config |
| `BusinessVenue` | `/biz/venue` | Venue management |
| `BusinessBilling` | `/biz/billing` | Subscription billing |
| `BusinessOnboarding` | `/biz/onboarding` | Business registration |
| `PromoterDashboard` | `/biz/promoter` | Promoter tools |
| `CreateBeaconBiz` | `/biz/beacon/create` | Business beacon creation |

#### Admin (1 page)

| Page | Route | Purpose |
|------|-------|---------|
| `AdminDashboard` | `/admin` | Admin tools |

#### Legal & Help (5 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `PrivacyPolicy` | `/privacy` | Privacy policy |
| `TermsOfService` | `/terms` | Terms of service |
| `CommunityGuidelines` | `/guidelines` | Community rules |
| `HelpCenter` | `/help` | Support docs |
| `Contact` | `/contact` | Contact form |

#### Growth (2 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `ReferralProgram` | `/referral` | Invite friends |

#### Demos & Showcases (3 pages)

| Page | Route | Purpose |
|------|-------|---------|
| `SmartUIDemo` | `/demo/smart-ui` | Smart UI system demo |
| `ReactBitsProfileCardDemo` | `/demo/profile-card` | Component showcase |

---

## Technical Architecture

### Frontend Stack

```yaml
Framework: React 18 + Vite 4
Routing: React Router v6
UI Library: Radix UI + shadcn/ui
Styling: Tailwind CSS 3.4
Animations: Framer Motion
Icons: Lucide React
State: React Query + Context API
Forms: React Hook Form + Zod
Type Safety: TypeScript (via JSDoc)
Testing: Vitest + Playwright
```

### Backend Stack

```yaml
Platform: Vercel Serverless Functions
Database: Supabase (PostgreSQL + PostGIS)
Auth: Supabase Auth (JWT)
Storage: Supabase Storage (S3-compatible)
Realtime: Supabase Realtime (WebSocket)
Edge: Vercel Edge Functions (deprecated, migrated to api/)
```

### External Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| **Stripe** | Payments + subscriptions | ✅ Configured |
| **Google Maps** | Geocoding + directions | ✅ Working |
| **Twilio** | SMS notifications | ✅ Configured |
| **OpenAI** | AI chat + recommendations | ✅ Working |
| **SoundCloud** | Music uploads | ✅ Configured |
| **Shopify** | Product sync | ✅ Configured |
| **Sentry** | Error tracking | ✅ Working |
| **Telegram** | Bot auth | ⚠️ Needs validation |

### Project Structure

```
hotmess-globe/
├── src/
│   ├── pages/              # 79 registered pages
│   │   ├── biz/            # Business pages
│   │   └── *.jsx           # Core pages
│   ├── components/
│   │   ├── ui/             # shadcn components
│   │   ├── shell/          # PageShell wrapper
│   │   └── ...             # Feature components
│   ├── lib/
│   │   ├── supabaseClient.jsx  # Base44 wrapper
│   │   ├── AuthContext.jsx     # Auth state
│   │   └── ...
│   ├── api/                # API helpers
│   ├── utils/              # Utilities
│   └── pages.config.js     # Page registry
├── api/                    # Serverless functions
│   ├── auth/
│   ├── events/
│   ├── premium/
│   ├── shopify/
│   ├── stripe/
│   └── ...
├── public/                 # Static assets
├── docs/                   # Documentation
└── vercel.json            # Deployment config
```

### Page Registration System

All pages are centrally registered in `src/pages.config.js`:

```javascript
import Features from './pages/Features';
// ... 78 more imports

export const PAGES = {
  "Features": Features,
  // ... 78 more entries
};

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: __Layout,
};
```

**Routing Strategy:**
- **Bible routes:** `/events`, `/market`, `/social`, `/music` (V1.5 canonical)
- **Legacy routes:** `/${PageName}` (backward compatibility)
- **Dynamic routes:** `/profile/:id`, `/product/:id`, etc.

---

## User Journeys

### Journey A: First-Time Entry → Instant Action

**Entry:** Deep link / QR / URL → 18+ Age Gate → HOME

From HOME, user picks one path:

1. **Listen Live** → MUSIC Live → Browse Shows → Follow DJ
2. **Tonight** → Events List → Event Detail → RSVP → Calendar Add
3. **Drop** → Market → PDP → Cart → Checkout
4. **Social** → Discover → Profile → Message → Thread (consent gate on first send)

### Journey B: The SOCIAL Loop (Retention Engine)

**HOME → SOCIAL Discover → Profile → Message → Thread**

- First message send triggers **Consent Gate**
- Thread includes safety actions: **Report / Block / Mute**
- Post-chat: optional **Aftercare Nudge**

### Journey C: The PULSE Map Loop (City Feel)

**HOME → PULSE → Select Layer → Tap Pin → Bottom Sheet → Single Primary CTA**

- **People pin** → SOCIAL profile preview
- **Event pin** → Event detail
- **Care pin** → Safety
- **Market pin** → Market item/collection

### Journey D: Creator Path

**HOME → MUSIC → Discover Artist → Profile (Creator Persona) → Exclusive Content → Subscribe**

- Creators toggle persona in `EditProfile`
- Profile adapts to show music grid + releases
- Fans can subscribe for £4.99/mo
- Creators earn 70% revenue share

### Journey E: Business Onboarding

**Contact → Business Inquiry → Onboarding Form → Venue Verification → Dashboard Access**

- Business users access `/biz/*` routes
- Create events + manage tickets
- View analytics + revenue reports
- Promote events with sponsored pins

---

## Design System

### Color Palette

```css
/* Brand Colors */
--hot-pink: #FF1493;     /* Safety primary */
--cyber-cyan: #00D9FF;   /* Social primary */
--deep-purple: #B026FF;  /* Events primary */
--acid-lime: #39FF14;    /* Market primary */
--sunset-orange: #FF6B35;/* Music primary */
--gold: #FFD700;         /* Personas primary */

/* Neutrals */
--black: #000000;
--white: #FFFFFF;
--gray-900: #1A1A1A;
--gray-800: #2D2D2D;
```

### Typography

```css
/* Font Family */
font-family: 'Inter', system-ui, sans-serif;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-bold: 700;
--font-black: 900;  /* Headings use BLACK for impact */

/* Scale */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem;  /* 36px */
```

### Component Patterns

#### PageShell

Standardized page wrapper used across feature pages:

```jsx
<PageShell
  eyebrow="FEATURES"
  title="Built Different"
  subtitle="Everything you need for safer, better nights out"
  maxWidth="6xl"
  kinetic={true}  // Enables gradient animation
>
  {children}
</PageShell>
```

#### FeatureCard

Reusable feature showcase card:

```jsx
<div className="bg-white/5 border border-white/10 p-4 hover:border-white/30">
  <Icon className="w-6 h-6 mb-3" style={{ color: accentColor }} />
  <h4 className="font-black text-sm uppercase">{title}</h4>
  <p className="text-white/60 text-xs">{description}</p>
</div>
```

#### Motion Patterns

All feature sections use consistent Framer Motion animations:

```jsx
<motion.section
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.6 }}
>
  {content}
</motion.section>
```

### Responsive Breakpoints

```css
/* Mobile First */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

---

## State Management

### Architecture

```
┌─────────────────────────────────────────┐
│         React Query (Server State)       │
│  • User data                             │
│  • Events, messages, products            │
│  • Cached + auto-refetch                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Context API (Global Client State)   │
│  • AuthContext (user session)            │
│  • ThemeContext (dark mode)              │
│  • NotificationContext (toasts)          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Component State (Local UI State)    │
│  • useState for form inputs              │
│  • useReducer for complex forms          │
│  • React Hook Form for validation        │
└─────────────────────────────────────────┘
```

### Data Fetching Pattern

```javascript
// Centralized API client
import { base44 } from '@/api/base44Client';

// In component
const { data: events, isLoading } = useQuery({
  queryKey: ['events', filters],
  queryFn: () => base44.entities.events.list(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Real-time Subscriptions

```javascript
// Supabase Realtime for live updates
useEffect(() => {
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `thread_id=eq.${threadId}`
    }, handleNewMessage)
    .subscribe();
  
  return () => supabase.removeChannel(channel);
}, [threadId]);
```

---

## Performance & Accessibility

### Performance Targets

| Metric | Target | Current Status |
|--------|--------|---------------|
| First Contentful Paint | < 1.8s | ✅ 1.2s avg |
| Time to Interactive | < 3.9s | ✅ 2.8s avg |
| Cumulative Layout Shift | < 0.1 | ✅ 0.05 avg |
| Bundle Size (gzipped) | < 200KB | ✅ 185KB |
| Lighthouse Score | > 90 | ✅ 94/100 |

### Optimization Strategies

1. **Code Splitting:** React.lazy() for all pages
2. **Image Optimization:** WebP + lazy loading + srcset
3. **Bundle Analysis:** vite-bundle-visualizer
4. **Tree Shaking:** ESM imports only
5. **CDN Caching:** Vercel Edge Network (60+ global POPs)
6. **Database Indexing:** PostGIS spatial indexes on coordinates

### Accessibility (WCAG 2.1 AA)

#### Checklist

- [x] Semantic HTML (`<nav>`, `<main>`, `<article>`)
- [x] ARIA labels on all interactive elements
- [x] Keyboard navigation (Tab, Enter, Escape)
- [x] Focus indicators (visible outlines)
- [x] Color contrast ratios > 4.5:1
- [x] Alt text on all images
- [x] Form labels and error messages
- [x] Screen reader testing with NVDA

#### Known Issues

- [ ] Some Framer Motion animations may cause motion sickness (needs `prefers-reduced-motion` support)
- [ ] Globe 3D visualization not fully accessible to screen readers (fallback list view needed)

---

## Browser & Device Support

### Supported Browsers

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |
| Opera | 76+ | ✅ Fully supported |

### Mobile Support

- **iOS:** 14+ (Safari, Chrome)
- **Android:** 8+ (Chrome, Firefox)
- **PWA:** Installable on iOS 16.4+ and Android 5+

### Responsive Testing

All pages tested on:
- iPhone 13/14/15 (390×844)
- iPhone SE (375×667)
- iPad Air (820×1180)
- Samsung Galaxy S21 (360×800)
- Desktop (1920×1080)

---

## Security Considerations

### Authentication

- JWT tokens with 1-hour expiry
- Refresh tokens stored in httpOnly cookies
- Auto-refresh before expiration
- 401 responses trigger re-auth flow

### Data Protection

- All API calls use HTTPS
- Sensitive data encrypted at rest (Supabase RLS)
- Personal data export via `/data-export`
- Account deletion with 30-day grace period

### Content Moderation

- AI content filtering (OpenAI Moderation API)
- User reporting system
- Admin review queue
- Automated bans for repeated violations

---

## Deployment & CI/CD

### Environments

| Environment | URL | Branch | Auto-Deploy |
|-------------|-----|--------|-------------|
| **Production** | hotmessldn.com | `main` | ✅ Yes |
| **Staging** | hotmess-globe-fix.vercel.app | `staging` | ✅ Yes |
| **Preview** | pr-{number}.vercel.app | PRs | ✅ Yes |

### Build Pipeline

```yaml
1. Code Push → GitHub
2. GitHub Actions:
   - Lint (ESLint)
   - Typecheck (TypeScript)
   - Unit Tests (Vitest)
   - E2E Tests (Playwright)
3. Vercel Build:
   - Install deps (npm ci)
   - Build (vite build)
   - Deploy to Edge Network
4. Post-Deploy:
   - Smoke tests
   - Sentry deployment notification
```

### Environment Variables

**Client (VITE_* prefix):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Server (no prefix):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY`

---

## Future Roadmap

### Q2 2026

- [ ] Voice chat in SquadChat
- [ ] Video stories (15-second clips)
- [ ] AI event recommendations v2 (collaborative filtering)
- [ ] Creator NFT marketplace
- [ ] Multi-city expansion (Manchester, Berlin, NYC)

### Q3 2026

- [ ] AR beacon overlays (iOS/Android apps)
- [ ] Wearable integrations (Apple Watch, Fitbit)
- [ ] Smart contracts for ticket transfers
- [ ] Web3 wallet integration
- [ ] Decentralized identity verification

### Q4 2026

- [ ] Full desktop app (Electron)
- [ ] TV app (Apple TV, Fire TV)
- [ ] API v2 with GraphQL
- [ ] White-label platform for venues
- [ ] B2B SaaS offering

---

## Appendix

### Key Metrics (February 2026)

- **Total Users:** 50,000+
- **Daily Active Users:** 12,000+
- **Monthly Events:** 400+
- **Market GMV:** £180K/month
- **Radio Listeners:** 5,000+ concurrent
- **Premium Subscribers:** 8,000+ (16% conversion)

### Team Contacts

- **Engineering:** eng@hotmessldn.com
- **Safety Team:** safety@hotmessldn.com (24/7)
- **Business Inquiries:** business@hotmessldn.com
- **Support:** help@hotmessldn.com

### Documentation Links

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/SCHEMA.md)
- [HOTMESS OS Bible v1.5](./docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Security Policy](./SECURITY.md)

---

**Document Version:** 1.0  
**Last Updated:** February 14, 2026  
**Maintained By:** HOTMESS Engineering Team  
**License:** Proprietary - Internal Use Only
