# HOTMESS — Technical Specification

---

## Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS + Framer Motion |
| **State** | TanStack Query (server) + Zustand (client) |
| **Backend** | Supabase (Postgres, Auth, Realtime, Storage) |
| **API** | Vercel Serverless Functions |
| **Commerce** | Shopify Storefront API |
| **Maps** | Mapbox GL |
| **3D** | Three.js / React Three Fiber |
| **Audio** | Web Audio API + SoundCloud |
| **Payments** | Stripe |
| **Video** | Daily.co (not fully integrated) |

---

## Project Structure

```
hotmess-globe/
├── api/                    # Vercel serverless functions
│   ├── auth/
│   ├── beacons/
│   ├── messages/
│   ├── profiles/
│   ├── shopify/
│   ├── soundcloud/
│   ├── stripe/
│   └── safety/
├── src/
│   ├── components/
│   │   ├── ui/             # Design system
│   │   ├── globe/          # 3D globe
│   │   ├── radio/          # Radio player
│   │   ├── safety/         # Safety features
│   │   └── ...
│   ├── features/
│   │   ├── profilesGrid/   # GHOSTED grid
│   │   └── shop/
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilities
│   └── store/              # Zustand stores
├── supabase/               # DB migrations
├── public/                 # Static assets
└── HANDOFF/                # This folder
```

---

## Environment Variables

### Required
```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_xxx

# Shopify
SHOPIFY_STOREFRONT_TOKEN=xxx
SHOPIFY_STORE_DOMAIN=xxx.myshopify.com

# Maps
VITE_MAPBOX_TOKEN=pk.xxx
```

### Optional
```env
OPENAI_API_KEY=sk-xxx          # AI features
TELEGRAM_BOT_TOKEN=xxx         # Telegram auth
DAILY_API_KEY=xxx              # Video calls
SOUNDCLOUD_CLIENT_ID=xxx       # Music uploads
GOOGLE_MAPS_API_KEY=xxx        # Directions
```

---

## Local Development

```bash
# Clone
git clone https://github.com/SICQR/hotmess-globe.git
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

# Test
npm run test
npm run lint
npm run typecheck
```

---

## Database (Supabase)

### Core Tables
```sql
-- Users
users                  -- Auth accounts
user_profiles          -- Extended profile
user_tags              -- Interests
user_follows           -- Relationships
user_blocks            -- Block list
right_now_status       -- "I'm out" status

-- Messaging
message_threads
messages
message_reads

-- Events/Beacons
beacons
event_rsvps
beacon_checkins

-- Commerce
products               -- P2P marketplace
orders
ticket_listings

-- Safety
safety_checkins
trusted_contacts
reports
```

### Row-Level Security
All tables have RLS enabled. Key policies:
- Users read own data only
- Public profiles visible to authenticated users
- Messages private to participants
- Admin-only access for reports

---

## API Endpoints

### Auth
```
POST /api/auth/telegram/verify
```

### Profiles (GHOSTED)
```
GET  /api/profiles              # Discovery grid
GET  /api/profile               # Own profile
PATCH /api/profile              # Update profile
GET  /api/nearby                # Nearby users
GET  /api/match-probability     # Match scores
```

### Messaging
```
GET  /api/messages              # List threads
GET  /api/messages/:threadId    # Thread messages
POST /api/messages              # Send message
```

### Events/Beacons
```
GET  /api/beacons               # List beacons
POST /api/beacons               # Create beacon
POST /api/rsvp                  # RSVP to event
POST /api/scan/check-in         # QR check-in
```

### Commerce
```
GET  /api/shopify/featured
GET  /api/shopify/collection/:handle
POST /api/shopify/cart
POST /api/stripe/create-checkout-session
```

### Safety
```
POST /api/safety/check-ins
POST /api/safety/respond
```

### All authenticated endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

---

## Key Hooks

```javascript
useUserContext()      // User state, tier, limits
useProfiles()         // GHOSTED profiles
useSafety()           // Safety features
useGamification()     // XP, streaks (post-MVP)
useRevenue()          // Upsell triggers
```

---

## Deployment

### Vercel
- Auto-deploy on push to `main`
- Preview deploys on PRs
- Environment variables in Vercel dashboard

### Supabase
- Migrations in `supabase/migrations/`
- Run: `npx supabase db push`

### Commands
```bash
npm run build         # Production build
npm run lint          # Check lint
npm run typecheck     # Check types
npm run test:ci       # Run tests
```

---

## Current State

### Working ✅
- Auth flow
- Profile CRUD
- GHOSTED grid (discovery)
- Messaging
- Events/Beacons
- Radio player
- Shopify integration
- Safety button
- PWA

### Broken/Incomplete 🔴
- Stripe checkout (not wired)
- Subscriptions (UI only)
- SoundCloud upload (OAuth incomplete)
- Video calls (Daily.co not integrated)
- AI features (endpoints exist, not wired)
- Push notifications (infrastructure only)

---

## Build Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run lint -- --fix` | Auto-fix lint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Run tests |
| `npm run test:ci` | CI test suite |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3s |
| Bundle size (gzipped) | < 500KB initial |

---

## Quality Gates

Before merging:
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run typecheck` passes (0 errors)
- [ ] `npm run build` succeeds
- [ ] `npm run test:ci` passes

---

*This is the technical source of truth. Reference for all dev work.*
