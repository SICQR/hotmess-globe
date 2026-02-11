# HOTMESS — System Architecture

> **"From Ear to Floor"** — A spatial operating system for queer nightlife discovery, connection, and commerce.

**Updated:** 2026-02-11  
**Status:** Production  
**Live:** https://hotmess.london

---

## Overview

HOTMESS is a React-based progressive web application with a Supabase backend, Vercel serverless functions, and integrated third-party services (Shopify, Stripe, Telegram, SoundCloud, Google Maps). The system provides real-time geospatial social discovery, event promotion, creator commerce, and gamified engagement.

---

## System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (React SPA)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │   Globe    │  │   Events   │  │   Social   │             │
│  │  (Three.js)│  │  Discovery │  │  Matching  │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │   Market   │  │   Music    │  │  Messaging │             │
│  │  (Shopify) │  │  (Radio)   │  │  (Chat)    │             │
│  └────────────┘  └────────────┘  └────────────┘             │
└─────────────────────────┬────────────────────────────────────┘
                          │
                          ├─────────────────────┐
                          │                     │
    ┌─────────────────────▼──────┐   ┌─────────▼──────────┐
    │   Supabase Backend         │   │  Vercel Serverless │
    │  ┌──────────────────────┐  │   │  ┌──────────────┐  │
    │  │ Auth (JWT)           │  │   │  │ /api/nearby  │  │
    │  │ PostgreSQL + RLS     │  │   │  │ /api/routing │  │
    │  │ Real-time (WebSocket)│  │   │  │ /api/events  │  │
    │  │ Storage (R2)         │  │   │  │ /api/shopify │  │
    │  └──────────────────────┘  │   │  │ /api/stripe  │  │
    └────────────────────────────┘   │  │ /api/ai      │  │
                                     │  └──────────────┘  │
                                     └────────────────────┘
                          │                     │
        ┌─────────────────┼─────────────────────┼───────┐
        │                 │                     │       │
  ┌─────▼───────┐   ┌────▼─────┐   ┌──────────▼──┐   ┌▼────────┐
  │  Shopify    │   │  Stripe  │   │  Telegram   │   │ Google  │
  │  Storefront │   │  Payments│   │  Bot API    │   │  Maps   │
  └─────────────┘   └──────────┘   └─────────────┘   └─────────┘
```

---

## Frontend Architecture

### Tech Stack
- **Framework:** React 18 + Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **3D/Maps:** Three.js, React Three Fiber, Mapbox GL
- **State Management:** TanStack Query, Zustand, React Context
- **Real-time:** Supabase Realtime subscriptions
- **Deployment:** Vercel

### Application Structure

```
src/
├── App.jsx                      # Router configuration
├── pages.config.js              # Page registry
├── Layout.jsx                   # App shell (nav, player, HUD)
│
├── pages/                       # 100+ route components
│   ├── Pulse.jsx               # Globe landing
│   ├── Events.jsx              # Event listings
│   ├── Social.jsx              # User discovery
│   ├── Market.jsx              # Commerce hub
│   ├── Music.jsx               # Radio + releases
│   ├── Messages.jsx            # Chat threads
│   └── ...
│
├── components/                  # 300+ UI components
│   ├── globe/                  # GlobeHero, BeaconPreviewPanel
│   ├── radio/                  # ConvictPlayer, RadioShowCard
│   ├── social/                 # ProfileCard, MatchSheet
│   ├── marketplace/            # ProductCard, CartDrawer
│   ├── safety/                 # SafetyButton, PanicMode
│   └── ui/                     # Shadcn components
│
├── hooks/                       # Custom React hooks
│   ├── useGlobeBeacons.js      # Real-time beacon subscription
│   ├── useRightNowBeacon.js    # "I'm out" toggle
│   ├── useUnifiedVault.js      # Order history aggregator
│   └── useP2PListingBeacon.js  # Creator product beacons
│
├── contexts/                    # React Context providers
│   ├── AuthContext.jsx         # Authentication state
│   ├── GlobeContext.jsx        # Globe instance + emit
│   ├── WorldPulseContext.jsx   # Real-time event bus
│   └── BootGuardContext.jsx    # Consent/gating flow
│
└── lib/                         # Core utilities
    ├── supabase.ts             # Client singleton
    ├── api.ts                  # Fetch helpers
    └── profileResolver.ts      # User data resolver
```

### Routing Strategy

**Canonical Routes** (Bible-based navigation):
- `/pulse` → Globe/Discovery
- `/events` → Event listings
- `/social` → User matching
- `/music` → Radio + releases
- `/market` → Commerce hub
- `/scan` → Ticket/QR system

**Legacy Routes** (backward-compatible):
- `/${PageName}` → Generated from `pages.config.js`
- Production build restricts to allowlisted routes

**Shell Architecture** (Layers):
```
L3: Toasts/Alerts     │ Match notifications, XP alerts, Safety warnings
L2: Sheets/Drawers    │ Profile, Events, Market, Chat (slide-up panels)
L1: System HUD        │ Player, SafetyFAB, Navigation, Ticker
L0: Globe (Always-On) │ 3D Canvas, Beacons, WorldPulse
```

---

## Backend Architecture

### Supabase (Primary Backend)

**PostgreSQL Database:**
- 60+ tables across identity, social, commerce, events, messaging
- Row-Level Security (RLS) for authorization
- Email-based user identification (`profiles.email`)
- Realtime publication on: `presence_locations`, `Beacon`, `messages`

**Key Tables:**
- `auth.users` → Supabase auth
- `profiles` → User profiles (persona, verification, tags)
- `Beacon` → Events, social beacons, product listings
- `EventRSVP` → Event attendance tracking
- `products` → Creator marketplace items
- `orders` → Transaction records
- `messages` → Chat messages
- `presence_locations` → Real-time user locations
- `right_now_status` → "I'm out" toggle
- `notifications` → User alerts
- `xp_ledger` → Gamification points

**Authentication:**
- Email/magic link (primary)
- Google OAuth
- Discord OAuth
- Telegram login widget

**Storage:**
- User avatars, product images, event posters
- Public bucket policy for read access

### Vercel Serverless Functions (`/api`)

**Architecture:** Domain-organized serverless endpoints

**Core Domains:**

| Path | Purpose | Key Dependencies |
|------|---------|------------------|
| `/api/auth` | Telegram verification | Telegram Bot API |
| `/api/nearby` | Proximity queries | Supabase, Google Maps |
| `/api/profiles` | User discovery, matching | Supabase embeddings |
| `/api/match-probability` | Compatibility scoring | OpenAI embeddings |
| `/api/events` | Web scraper + cron | OpenAI (optional), event feeds |
| `/api/routing` | Directions, ETAs | Google Maps Directions API |
| `/api/shopify` | Storefront integration | Shopify Storefront API |
| `/api/stripe` | Payments, subscriptions | Stripe API |
| `/api/soundcloud` | OAuth, track uploads | SoundCloud API |
| `/api/notifications` | Dispatch system | Supabase, email provider |
| `/api/ai` | Chat, scene scout | OpenAI GPT-4 |
| `/api/presence` | Location broadcast | Supabase Realtime |
| `/api/tickets` | QR check-in | Supabase + JWT signing |

**Rate Limiting:**
- IP-based middleware at `api/_rateLimit.js`
- 100 requests/minute per IP (configurable)

---

## Third-Party Integrations

### Shopify (Commerce)
- **Storefront API** for product listings
- **Admin API** for order sync
- Webhooks for order/fulfillment updates
- Custom checkout domain (`shop.hotmessldn.com`)

### Stripe (Payments)
- Subscription tiers (Plus, Chrome)
- One-time purchases (tickets, merch)
- Seller payouts (Connect accounts)
- Webhook handling for payment state

### Telegram (Notifications + Auth)
- Bot API for message delivery
- Login Widget for authentication
- Chat ID sync with profiles
- Webhook endpoint for commands

### SoundCloud (Music)
- OAuth PKCE flow
- Track upload for radio shows
- Metadata retrieval
- Embed player integration

### Google Maps (Routing)
- Directions API for travel time
- Places API for venue lookup
- Geocoding for address → lat/lng

---

## Data Flow Examples

### 1. Real-Time Presence ("Right Now")

```
User toggles "I'm out" → 
  ├─ POST /api/presence/update (lat, lng, status)
  │   └─ Inserts row in presence_locations table
  │
  ├─ Supabase Realtime publishes update
  │   └─ All subscribed clients receive new presence
  │
  └─ Globe renders lime beacon at user's location
      └─ Other users can tap beacon → see profile
```

### 2. Event Discovery

```
User opens /events →
  ├─ Fetch beacons WHERE beacon_type = 'event' AND is_active = true
  │   └─ Filtered by proximity (30km radius)
  │
  ├─ Render on Globe as cyan beacons
  │
  └─ Tap beacon → EventDetailSheet opens
      ├─ RSVP button → INSERT into EventRSVP
      └─ Share button → Generate deep link
```

### 3. Creator Marketplace

```
Seller creates product →
  ├─ Upload images to Supabase Storage
  ├─ INSERT into products table
  │
  └─ useP2PListingBeacon.js creates gold beacon
      └─ INSERT into Beacon (beacon_type = 'marketplace')
          └─ Appears on Globe + /market
```

### 4. AI Chat + Crisis Detection

```
User sends message in ChatSheet →
  ├─ POST /api/ai/chat with message text
  │
  ├─ OpenAI analyzes for crisis keywords
  │   └─ IF detected: inject safety resources
  │
  └─ Response streamed back to client
      └─ Tool calling for venue/event lookup
```

---

## Security Model

### Authentication
- **JWT tokens** from Supabase Auth
- Session storage in localStorage
- Auto-refresh on expiry
- Logout on invalid token

### Authorization
- **Row-Level Security (RLS)** on all tables
- Email-based policy checks
- Role flags in `profiles.role_flags` (JSON)
- Admin detection via `scanme@sicqr.com` email

### Data Privacy
- Age verification required (18+)
- Consent flow on first boot
- GDPR export/delete functionality
- Encrypted message storage (future)

### Rate Limiting
- IP-based throttling on API routes
- 100 req/min default
- Admin bypass for trusted IPs
- Database-backed tracking

### Content Moderation
- User report system (`reports` table)
- Adult content flags (`adult_content_flags`)
- Shadow banning (RLS-based)
- Trust score system

---

## Deployment Architecture

### Vercel Configuration

**Build Settings:**
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18.x

**Environment Variables:**
- `VITE_SUPABASE_URL` (client)
- `VITE_SUPABASE_ANON_KEY` (client)
- `SUPABASE_SERVICE_ROLE_KEY` (server)
- `GOOGLE_MAPS_API_KEY` (server)
- `OPENAI_API_KEY` (server)
- `SHOPIFY_*` (server)
- `STRIPE_*` (server)

**Cron Jobs** (configured in `vercel.json`):
- `/api/events/cron` → Every 6 hours (event scraper)
- `/api/notifications/process` → Every 5 minutes

**Rewrites:**
- `/api/*` → Serverless functions
- `/*` → `index.html` (SPA fallback)

### Production Checklist
- [x] SSL certificate (automatic via Vercel)
- [x] Custom domain configured
- [x] Environment variables set
- [x] Cron jobs scheduled
- [x] Error monitoring (Sentry recommended)
- [ ] CDN caching for assets
- [ ] Database connection pooling
- [ ] Rate limiting enabled

---

## Performance Considerations

### Frontend Optimization
- Lazy loading for Globe component (React.lazy)
- Code splitting by route
- Asset optimization (images, fonts)
- Service worker caching (PWA)

### Database Optimization
- Indexes on frequently queried columns
- Geospatial tile-based queries
- Materialized views for analytics
- Connection pooling

### API Optimization
- Edge caching for static data
- Database query result caching
- Batch operations where possible
- Async processing for heavy tasks

---

## Monitoring & Observability

### Recommended Tools
- **Error Tracking:** Sentry
- **Analytics:** Mixpanel, Google Analytics
- **Logging:** Vercel logs, Supabase logs
- **Uptime:** UptimeRobot
- **Performance:** Lighthouse CI

### Key Metrics
- Page load time (target: <3s)
- Time to interactive (target: <5s)
- API response time (target: <500ms)
- Database query time (target: <100ms)
- WebSocket connection health

---

## Scalability Path

### Current Limits
- Supabase Free: 500MB database, 2GB bandwidth/month
- Vercel Hobby: 100GB bandwidth, 100k edge requests/month
- Serverless function timeout: 10s (Hobby), 60s (Pro)

### Scaling Strategies
1. **Horizontal:** Multi-region Vercel deployments
2. **Vertical:** Upgrade Supabase to Pro (8GB RAM, 160GB storage)
3. **Caching:** CloudFlare in front of Vercel
4. **Database:** Read replicas for analytics queries
5. **Storage:** Migrate to dedicated CDN (CloudFlare R2)

---

## Development Workflow

### Local Setup
```bash
npm install
cp .env.example .env.local
# Fill in .env.local with dev credentials
npm run dev
```

### Testing
```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm test              # Vitest unit tests
npm run test:e2e      # Playwright e2e tests
```

### Deployment
```bash
git push origin main  # Auto-deploys to production
```

---

## Known Limitations

### Technical Debt
- Double-nested `src/src/` directory (Figma Make artifact)
- Duplicate route definitions in `App.jsx`
- Inconsistent loading states across pages
- No proper error boundaries on all routes
- Globe performance issues on low-end devices

### Feature Gaps
- No offline mode (PWA registered but not functional)
- No push notifications (hooks exist, not wired)
- No multi-language support (i18n setup exists)
- Limited accessibility (ARIA labels missing)
- No dark/light mode toggle

---

## Architecture Evolution (Roadmap)

### Phase 1 (Current)
- [x] Supabase auth + RLS
- [x] Real-time beacons
- [x] Shopify integration
- [x] Basic AI chat

### Phase 2 (In Progress)
- [ ] Globe as persistent shell (no unmount)
- [ ] Tonight mode (20:00-06:00 UI shift)
- [ ] Safety FAB → Emergency mode
- [ ] Telegram bot webhooks

### Phase 3 (Future)
- [ ] Voice messages in chat
- [ ] AR mode (camera-based beacon discovery)
- [ ] P2P payments (Stripe Connect)
- [ ] AI verification (liveness check)

---

## References

- [Database Schema](./DATABASE.md)
- [API Endpoints](./SERVER_ROUTES.md)
- [Environment Variables](./ENV_VARS.md)
- [Agent Tasks](./AGENT_TASKS.md)

**Built with 🖤 for the queer nightlife community.**
