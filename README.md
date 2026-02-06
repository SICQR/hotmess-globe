# HOTMESS - London OS

> **A brutalist luxury platform combining nightlife discovery, radio, social connection, and commerce for gay men in London.**

![Version](https://img.shields.io/badge/version-1.6-FF1493)
![Status](https://img.shields.io/badge/status-Beta-00D9FF)
![Platform](https://img.shields.io/badge/platform-PWA-39FF14)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Documentation](#documentation)
- [Pages & Routes](#pages--routes)
- [Features](#features)
- [Components](#components)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)

---

## Overview

HOTMESS is a comprehensive platform with four core pillars:

1. **🌃 Nights** - Event discovery, beacons, venue pulse
2. **📻 Radio** - Live shows, DJ culture, music releases
3. **💬 Social** - Profile matching, messaging, "Right Now" status
4. **🛒 Commerce** - Marketplace, Shopify integration, creator economy

**Brand Colors:**
- Hot Pink: `#FF1493` (Primary)
- Cyan: `#00D9FF` (Events/Info)
- Purple: `#B026FF` (Music/Releases)
- Lime: `#39FF14` (Success/Online)
- Gold: `#FFD700` (Premium)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + Framer Motion |
| State | TanStack Query + Zustand |
| Backend | Supabase (Postgres + Auth + Realtime) |
| API | Vercel Serverless Functions |
| Commerce | Shopify Storefront API |
| Maps | Mapbox GL |
| Globe | Three.js / React Three Fiber |
| Audio | Web Audio API + SoundCloud |

---

## Documentation

All documentation files with their purpose and status.

### Core Documentation (`docs/`)

| File | Status | Description |
|------|--------|-------------|
| `HOTMESS-LONDON-OS-BIBLE++-v1.6.md` | ✅ Current | Master product specification |
| `HOTMESS-LONDON-OS-BIBLE-v1.5.md` | 📦 Archive | Previous version spec |
| `BRAND-STYLE-GUIDE.md` | ✅ Current | Colors, typography, voice, microcopy |
| `USER_GUIDE.md` | ✅ Current | End-user documentation |
| `BUILD_CHECKLIST.md` | ✅ Current | Implementation phases & priorities |
| `EXECUTIVE_SUMMARY.md` | ✅ Current | High-level project overview |

### Technical Documentation

| File | Status | Description |
|------|--------|-------------|
| `API_MATCH_PROBABILITY.md` | ✅ Complete | Match scoring algorithm docs |
| `SMART_UI_SYSTEM.md` | ✅ Complete | Component library & animations |
| `DEPLOYMENT.md` | ✅ Complete | Vercel/Supabase deployment guide |
| `CI_CD_SETUP.md` | ✅ Complete | GitHub Actions pipeline |
| `TEST_SETUP.md` | ✅ Complete | Testing framework & strategy |
| `SECURITY.md` | ✅ Complete | Security practices & audit |
| `BACKUP_RECOVERY.md` | ✅ Complete | Database backup procedures |

### Feature Documentation

| File | Status | Description |
|------|--------|-------------|
| `PREMIUM_FEATURES_QUICKSTART.md` | ✅ Complete | Monetization features guide |
| `SUPPORT_WORKFLOWS.md` | ✅ Complete | Customer support procedures |
| `BUSINESS_OPERATIONS.md` | ✅ Complete | Business dashboard guide |
| `SOUNDCLOUD_API_FIELD_REQUIREMENTS.md` | ✅ Complete | Audio integration specs |

### Analysis & Reports

| File | Status | Description |
|------|--------|-------------|
| `ANALYSIS-SUMMARY.md` | ✅ Complete | Codebase analysis summary |
| `AUDIT_COMPLETION_REPORT.md` | ✅ Complete | Security audit results |
| `CODE_QUALITY_RECOMMENDATIONS.md` | ✅ Complete | Code improvement suggestions |
| `HYPER-ANALYSIS-REPORT.md` | ✅ Complete | Deep technical analysis |
| `IMPROVEMENTS_IMPLEMENTED.md` | ✅ Complete | Changelog of improvements |
| `INCOMPLETE_FEATURES.md` | ✅ Current | Features needing work |
| `HIGH_RETENTION_PLAN.md` | ✅ Current | User retention strategy |

### Development Tracking

| File | Status | Description |
|------|--------|-------------|
| `TODO-2026-01-16.md` | 🔄 Active | Current sprint tasks |
| `GITHUB_ISSUES_TO_CREATE.md` | 🔄 Active | Issue backlog |
| `GITHUB_ISSUES_HANDOFF_PACK_2026-01-06.md` | 📦 Archive | Historical issues |
| `DEVELOPER_HANDOFF_TODOS.md` | ✅ Complete | Developer onboarding |
| `IMPLEMENTATION_NOTES.md` | ✅ Complete | Implementation decisions |
| `ISSUES-TRACKER.md` | 🔄 Active | Bug tracking |

### PR & Merge Documentation

| File | Status | Description |
|------|--------|-------------|
| `PR_MERGE_COORDINATION.md` | ✅ Complete | PR merge procedures |
| `README_PR_COORDINATION.md` | ✅ Complete | PR coordination guide |

### Root-Level Documentation

| File | Location | Description |
|------|----------|-------------|
| `README.md` | Root | This file - master index |
| `START_HERE.md` | Root | Quick start guide |
| `AI_WORKFLOW.md` | Root | AI/Copilot integration |
| `SECURITY_SUMMARY.md` | Root | Security overview |
| `SUMMARY.md` | Root | Project summary |

### Status Reports & Analysis (Root)

| File | Status | Description |
|------|--------|-------------|
| `CODEBASE_ANALYSIS.md` | ✅ Complete | Full codebase review |
| `EXECUTIVE_ANALYSIS.md` | ✅ Complete | Business analysis |
| `FEATURES_USP_CTA_AUDIT.md` | ✅ Complete | Feature audit |
| `LAYOUT_UX_RECOMMENDATIONS.md` | ✅ Complete | UX improvements |
| `WEBAPP_IMPROVEMENTS.md` | ✅ Complete | Web app enhancements |
| `REVENUE_FLOWS_COMPLETE.md` | ✅ Complete | Monetization flows |
| `BUSINESS_READINESS_COMPLETE.md` | ✅ Complete | Launch readiness |

### PR Resolution Files (Root)

| File | Status | Description |
|------|--------|-------------|
| `PR_STATUS_DASHBOARD.md` | 📦 Archive | PR status tracking |
| `PR_RESOLUTIONS_README.md` | 📦 Archive | Conflict resolutions |
| `PR_FAILURE_ANALYSIS.md` | 📦 Archive | Failed PR analysis |
| `PR_FAILURE_INVESTIGATION.md` | 📦 Archive | PR debugging |
| `PR_ACTION_QUICK_REFERENCE.md` | 📦 Archive | PR quick ref |
| `PR_ANALYSIS_README.md` | 📦 Archive | PR analysis |
| `EXECUTIVE_SUMMARY_PRS.md` | 📦 Archive | PR executive summary |
| `UNFINISHED_PRS_COMPREHENSIVE_ANALYSIS.md` | 📦 Archive | Incomplete PRs |
| `CONFLICT_RESOLUTIONS.md` | 📦 Archive | Merge conflicts |
| `MERGE_RESOLUTION_SUMMARY.md` | 📦 Archive | Merge summary |
| `APPLYING_RESOLUTIONS.md` | 📦 Archive | Resolution steps |

### CI/CD & Deployment (Root)

| File | Status | Description |
|------|--------|-------------|
| `DEPLOYMENT_READINESS.md` | ✅ Complete | Deploy checklist |
| `CI_PIPELINE_FIXES.md` | ✅ Complete | CI fixes |
| `TROUBLESHOOTING_CI.md` | ✅ Complete | CI debugging |
| `COMMIT_VERIFICATION_REPORT.md` | ✅ Complete | Commit audit |
| `E2E_TEST_REPORT.md` | ✅ Complete | E2E test results |

### Implementation Summaries (Root)

| File | Status | Description |
|------|--------|-------------|
| `IMPLEMENTATION_COMPLETE.md` | ✅ Complete | Completed features |
| `IMPLEMENTATION_SUMMARY.md` | ✅ Complete | Implementation overview |
| `POLISH_WOW_FEATURES_IMPLEMENTATION.md` | ✅ Complete | Polish features |
| `FINAL_SUMMARY.md` | ✅ Complete | Final project summary |
| `NEXT_SPRINT_PLAN.md` | 🔄 Active | Upcoming work |

### Misc Documentation

| File | Location | Description |
|------|----------|-------------|
| `OPTIMIZED_FOR_GH_COPILOT.md` | Root | Copilot optimization |
| `GRANTING_COPILOT_PERMISSIONS.md` | Root | Copilot setup |
| `INSTRUCTIONS_TO_PUSH.md` | Root | Git push guide |
| `REPOSITORY_STATUS_CONFIRMATION.md` | Root | Repo health |
| `supabase/README.md` | supabase/ | Database docs |
| `wireframes/README.md` | wireframes/ | Design wireframes |
| `public/icons/README.md` | public/icons/ | PWA icon guide |
| `patches/README.md` | patches/ | Patch notes |
| `.github/PULL_REQUEST_TEMPLATE.md` | .github/ | PR template |
| `.github/copilot-instructions.md` | .github/ | Copilot config |

### Documentation Status Legend

- ✅ **Current/Complete** - Up to date, actively maintained
- 🔄 **Active** - Being actively updated
- 📦 **Archive** - Historical reference, may be outdated

---

## Pages & Routes

### Status Legend
- ✅ **Built** - Fully functional
- 🟡 **Partial** - Core functionality, needs polish
- 🔴 **Stub** - Page exists but incomplete
- ⬜ **Planned** - Not yet started

---

### Core Navigation

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/` | Home | ✅ Built | Globe hero, mode selection, featured content |
| `/welcome` | Welcome | ✅ Built | Premium onboarding flow |
| `/auth` | Auth | ✅ Built | Sign in/up, password reset, Telegram link |
| `/pulse` | Pulse | ✅ Built | Map-based discovery, live signals |
| `/more` | More | ✅ Built | Navigation hub to tools & settings |

---

### Social / Discovery

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/social` | Social | ✅ Built | Profile grid, filters, match scoring |
| `/social/discover` | → Social | ✅ Built | Redirects to Social |
| `/social/inbox` | Messages | ✅ Built | Chat threads, voice notes |
| `/social/u/:id` | Profile | ✅ Built | View other user profiles |
| `/profiles` | ProfilesGrid | ✅ Built | Discovery grid with infinite scroll |
| `/connect` | Connect | 🟡 Partial | Legacy social view |

---

### User Profile & Account

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/Profile` | Profile | ✅ Built | Own profile view, stats, achievements |
| `/ProfileSetup` | ProfileSetup | 🟡 Partial | Initial profile completion |
| `/EditProfile` | EditProfile | ✅ Built | Edit name, bio, photos, tags |
| `/settings` | Settings | ✅ Built | Privacy, notifications, account |
| `/settings/privacy` | → Settings | ✅ Built | Privacy tab |
| `/settings/notifications` | → Settings | ✅ Built | Notification preferences |
| `/account/delete` | AccountDeletion | ✅ Built | GDPR deletion request |
| `/account/export` | DataExport | ✅ Built | GDPR data export |
| `/account/consents` | AccountConsents | ✅ Built | Manage data consents |
| `/membership` | MembershipUpgrade | ✅ Built | Tier comparison, upgrade flow |

---

### Events & Beacons

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/events` | Events | ✅ Built | Event grid, filters, AI recommendations |
| `/events/:id` | BeaconDetail | ✅ Built | Event detail, RSVP, directions |
| `/Beacons` | Beacons | ✅ Built | All beacon types (events, drops, signals) |
| `/CreateBeacon` | CreateBeacon | ✅ Built | Create event/beacon |
| `/EditBeacon` | EditBeacon | ✅ Built | Edit existing beacon |
| `/MyEvents` | MyEvents | ✅ Built | User's RSVPs and created events |
| `/calendar` | Calendar | 🟡 Partial | Personal event calendar |
| `/scan` | Scan | 🟡 Partial | QR code scanner for check-ins |

---

### Music & Radio

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/music` | Music | ✅ Built | Music hub, releases, playlists |
| `/music/live` | Radio | ✅ Built | Live radio player, current show |
| `/music/shows` | RadioSchedule | ✅ Built | Show schedule, episode history |
| `/music/shows/:slug` | → Show hero | ✅ Built | Individual show landing |
| `/music/releases` | → Music | ✅ Built | Music releases |
| `/music/releases/:slug` | MusicRelease | ✅ Built | Album/release detail page |
| `/RadioFeatures` | RadioFeatures | 🔴 Stub | Radio feature showcase |

**Radio Shows:**
- Wake The Mess (`/music/shows/wake-the-mess`)
- Dial A Daddy (`/music/shows/dial-a-daddy`)
- Hand N Hand (`/music/shows/hand-n-hand`)

---

### Marketplace / Commerce

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/market` | Shop | ✅ Built | Shopify storefront homepage |
| `/market/:collection` | ShopCollection | ✅ Built | Product collection view |
| `/market/p/:handle` | ShopProduct | ✅ Built | Product detail (Shopify) |
| `/market/creators` | Marketplace | ✅ Built | P2P creator marketplace |
| `/market/creators/p/:id` | ProductDetail | ✅ Built | P2P product detail |
| `/market/creators/cart` | CreatorsCart | ✅ Built | Creator marketplace cart |
| `/market/creators/checkout` | CreatorsCheckout | ✅ Built | Creator checkout flow |
| `/cart` | ShopCart | ✅ Built | Shopify cart |
| `/checkout/start` | CheckoutStart | ✅ Built | Begin checkout |
| `/checkout` | Checkout | 🟡 Partial | Checkout completion |
| `/orders` | OrderHistory | ✅ Built | Past orders |
| `/SellerDashboard` | SellerDashboard | 🟡 Partial | Seller analytics & inventory |

---

### Tickets

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/tickets` | Tickets | 🟡 Partial | Ticket resale marketplace |
| `/tickets/:id` | TicketDetail | 🟡 Partial | Ticket detail & purchase |
| `/tickets/chat/:threadId` | TicketChat | 🟡 Partial | Buyer/seller chat |
| `/TicketMarketplace` | TicketMarketplace | 🔴 Stub | Alternative ticket view |

---

### Business / Promoter Tools

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/biz` | BusinessDashboard | 🟡 Partial | Business home |
| `/biz/dashboard` | BusinessDashboard | 🟡 Partial | Analytics overview |
| `/biz/analytics` | BusinessAnalytics | 🟡 Partial | Detailed metrics |
| `/biz/onboarding` | BusinessOnboarding | 🟡 Partial | Business account setup |
| `/business/globe` | BusinessGlobe | 🟡 Partial | City heat visualization |
| `/business/amplify` | BusinessAmplify | 🔴 Stub | Promotion scheduling |
| `/business/insights` | BusinessInsights | 🔴 Stub | Audience insights |

---

### Creator Tools

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/creator` | CreatorDashboard | 🟡 Partial | Creator home |
| `/creator/dashboard` | CreatorDashboard | 🟡 Partial | Earnings, subscribers |
| `/OrganizerDashboard` | OrganizerDashboard | 🟡 Partial | Event organizer tools |
| `/RecordManager` | RecordManager | 🔴 Stub | Music release management |

---

### Admin Tools

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/AdminDashboard` | AdminDashboard | 🟡 Partial | Platform admin |
| `/admin/cadence` | CadencePanel | 🟡 Partial | Feature flags, signals |
| `/admin/cities` | CityReadiness | 🟡 Partial | City launch readiness |
| `/PromoteToAdmin` | PromoteToAdmin | ✅ Built | Admin promotion (dev) |

---

### Safety & Care

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/safety` | Safety | ✅ Built | Safety hub, panic button |
| `/safety/resources` | Care | ✅ Built | Mental health resources |
| `/safety/report` | → Safety | ✅ Built | Report flow |
| `/Care` | Care | ✅ Built | Aftercare, resources |

---

### Community & Gamification

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/community` | Community | ✅ Built | Posts, tribes, feed |
| `/leaderboard` | Leaderboard | 🟡 Partial | XP rankings |
| `/Challenges` | Challenges | 🟡 Partial | Weekly challenges |
| `/Stats` | Stats | 🟡 Partial | Personal statistics |
| `/InviteFriends` | InviteFriends | 🟡 Partial | Referral program |
| `/SquadChat` | SquadChat | 🔴 Stub | Group chat |

---

### Legal & Info

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/legal/privacy` | Privacy | ✅ Built | Privacy policy |
| `/legal/terms` | Terms | ✅ Built | Terms of service |
| `/legal/privacy-hub` | PrivacyHub | ✅ Built | Privacy center |
| `/guidelines` | CommunityGuidelines | ✅ Built | Community rules |
| `/contact` | Contact | ✅ Built | Contact form |
| `/help` | HelpCenter | 🟡 Partial | FAQ, support |
| `/Pricing` | Pricing | 🟡 Partial | Membership pricing |

---

### Special / Promo Pages

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/hnhmess` | Hnhmess | ✅ Built | HNH MESS product launch |
| `/LuxShowcase` | LuxShowcase | 🔴 Stub | Premium showcase |
| `/SmartUIDemo` | SmartUIDemo | ✅ Built | Component showcase |
| `/Features` | Features | 🔴 Stub | Feature marketing |
| `/PersonaFeatures` | PersonaFeatures | 🔴 Stub | Persona system promo |
| `/EventsFeatures` | EventsFeatures | 🔴 Stub | Events feature promo |
| `/SocialFeatures` | SocialFeatures | 🔴 Stub | Social feature promo |
| `/SafetyFeatures` | SafetyFeatures | 🔴 Stub | Safety feature promo |

---

### Legacy / Internal

| Route | Page | Status | Description |
|-------|------|--------|-------------|
| `/age` | AgeGate | ✅ Built | Age verification |
| `/onboarding` | OnboardingGate | ✅ Built | Onboarding router |
| `/Globe` | Globe | 🟡 Partial | Standalone globe view |
| `/Feed` | Feed | 🟡 Partial | Activity feed |
| `/Bookmarks` | Bookmarks | ✅ Built | Saved items |
| `/Chat` | Chat | ✅ Built | Direct chat route |
| `/Directions` | Directions | ✅ Built | Navigation/directions |
| `/Login` | Login | ✅ Built | Legacy login redirect |
| `/RightNowDashboard` | RightNowDashboard | 🔴 Stub | "Right Now" analytics |

---

## Features

### ✅ Fully Built

| Feature | Components | Description |
|---------|------------|-------------|
| **Authentication** | Auth, TelegramLogin | Email/password, magic link, Telegram OAuth |
| **Profile System** | Profile, ProfileHeader, ProfileStats | Full profile with photos, bio, tags, stats |
| **Discovery Grid** | ProfilesGrid, SmartProfileCard, BentoGrid | Infinite scroll, match scoring, smart sizing |
| **Match Probability** | MatchBar, matchInsights | AI-powered compatibility scoring |
| **Messaging** | ChatThread, ThreadList, VoiceNote | Real-time chat, voice notes, typing indicators |
| **Events** | EventCard, EventsMapView, EventRSVP | Discovery, RSVP, AI recommendations |
| **Radio Player** | ConvictPlayer, RadioShowCard | Live streaming, schedule, episode history |
| **Marketplace** | Shop, ProductCard, ShopCart | Shopify integration, cart, checkout |
| **Safety** | SafetyButton, PanicButton, FakeCallButton | Panic mode, fake calls, location sharing |
| **Beacons** | BeaconComposer, BeaconDetail | Create/edit events, check-ins |
| **Gamification** | XP system, achievements, streaks | Points, badges, leaderboard |
| **PWA** | Service worker, install prompt | Offline support, push notifications |
| **Accessibility** | SkipToContent, HighContrast, FocusTrap | WCAG compliance, keyboard nav |

### 🟡 Partially Built

| Feature | Status | Missing |
|---------|--------|---------|
| **Video Calls** | UI exists | Daily.co integration incomplete |
| **Creator Economy** | Database ready | Subscription/PPV flows not wired |
| **Persona System** | Switcher exists | Full management UI needed |
| **Ticket Resale** | Pages exist | Payment flow incomplete |
| **Business Dashboard** | Pages exist | Analytics data incomplete |
| **Push Notifications** | Infrastructure ready | Preference enforcement needed |
| **AI Assistant** | Component exists | RAG/function calling not wired |
| **Scene Scout** | Planned | API not built |
| **Wingman** | Panel exists | AI generation not wired |

### 🔴 Planned / Stub

| Feature | Priority | Notes |
|---------|----------|-------|
| **Profile Optimizer** | High | AI suggestions for better profiles |
| **Safety Check-ins** | High | Automated welfare checks |
| **Telegram Bot** | Medium | Notifications via Telegram |
| **Re-engagement Flows** | Medium | Dormant user reactivation |
| **Weekly Digest** | Medium | Email summary |
| **Advanced Filters** | Low | Saved filter presets |
| **Squad Challenges** | Low | Group competitions |

---

## Components

### UI Components (`src/components/ui/`)

| Component | Status | Description |
|-----------|--------|-------------|
| `button.jsx` | ✅ | 20+ variants (hot, cyan, glass, glow, gradient) |
| `premium-card.jsx` | ✅ | Glass cards, feature cards, stat cards |
| `card.jsx` | ✅ | Base card component |
| `input.jsx` | ✅ | Form inputs |
| `select.jsx` | ✅ | Dropdowns |
| `tabs.jsx` | ✅ | Tab navigation |
| `dialog.jsx` | ✅ | Modals |
| `sheet.jsx` | ✅ | Slide-out panels |
| `toast` | ✅ | Sonner notifications |
| `VirtualList.jsx` | ✅ | Virtualized scrolling |
| `MagneticButton.tsx` | ✅ | Cursor-following buttons |
| `skeleton.jsx` | ✅ | Loading states |

### Feature Components

| Category | Key Components |
|----------|----------------|
| **Profile** | ProfileHeader, ProfileStats, PersonaSwitcher, ProfileOptimizer |
| **Discovery** | ProfileCard, SmartProfileCard, MatchBar, RightNowGrid |
| **Messaging** | ChatThread, ThreadList, VoiceNote, WingmanPanel |
| **Events** | EventCard, EventsMapView, AIEventRecommendations |
| **Radio** | ConvictPlayer, RadioShowCard |
| **Safety** | SafetyButton, PanicButton, FakeCallButton, SafetyCheckinModal |
| **Commerce** | ProductCard, ShopCartDrawer, FeeDisplay |
| **Social** | ShareButton, ConsentGate, HandshakeButton |
| **Globe** | GlobeHero, CityPulseBar, LiveFeed |

---

## API Endpoints

### Auth & User
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/telegram` - Telegram OAuth
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update profile

### Social
- `GET /api/profiles` - Discovery grid
- `GET /api/match-probability` - Match scoring
- `POST /api/follow` - Follow user
- `GET /api/messages/:threadId` - Chat history

### Events
- `GET /api/beacons` - List events
- `POST /api/beacons` - Create beacon
- `POST /api/rsvp` - RSVP to event

### Commerce
- `GET /api/shopify/featured` - Featured products
- `GET /api/shopify/product` - Product detail
- `POST /api/shopify/cart` - Cart operations

### Safety
- `POST /api/safety/panic` - Trigger panic
- `POST /api/safety/checkin` - Safety check-in

---

## Database Schema

### Core Tables
- `User` - User accounts
- `UserFollow` - Follow relationships
- `UserTag` - User interest tags
- `RightNowStatus` - "Right Now" availability
- `Message` / `MessageThread` - Chat
- `Beacon` - Events/signals
- `EventRSVP` - RSVPs
- `BeaconCheckIn` - Check-ins

### Commerce
- `Product` - P2P marketplace
- `Order` / `OrderItem` - Orders
- `TicketListing` - Ticket resale

### Gamification
- `Achievement` / `UserAchievement` - Badges
- `Challenge` / `ChallengeParticipant` - Challenges
- `Squad` / `SquadMember` - Groups

### Safety
- `SafetyCheckin` - Welfare checks
- `TrustedContact` - Emergency contacts
- `Report` - User reports

---

## Getting Started

```bash
# Clone
git clone https://github.com/yourusername/hotmess-globe.git
cd hotmess-globe

# Install
npm install

# Environment
cp .env.example .env.local
# Fill in your keys

# Run
npm run dev

# Build
npm run build

# Analyze bundle
npm run build:analyze
```

---

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Shopify
SHOPIFY_STOREFRONT_TOKEN=xxx
SHOPIFY_STORE_DOMAIN=xxx.myshopify.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Maps
VITE_MAPBOX_TOKEN=pk.xxx

# AI (optional)
OPENAI_API_KEY=sk-xxx

# Telegram (optional)
TELEGRAM_BOT_TOKEN=xxx

# Video (optional)
DAILY_API_KEY=xxx
```

---

## Build Summary

| Category | Built | Partial | Planned | Total |
|----------|-------|---------|---------|-------|
| Pages | 52 | 25 | 12 | 89 |
| Components | 150+ | 20+ | 15+ | 185+ |
| API Endpoints | 30+ | 10+ | 15+ | 55+ |

**Overall Completion: ~70%**

---

## Contributing

1. Check `docs/BUILD_CHECKLIST.md` for priorities
2. Follow `docs/BRAND-STYLE-GUIDE.md` for design
3. Run `npm run lint` before committing
4. Create PR against `main`

---

## License

Proprietary - HOTMESS London Ltd.

---

**Built with 🖤 + 💖 in London**

*"Don't make the same mistake twice unless he's hot"*

