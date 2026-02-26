# HOTMESS — System Map
**Generated:** 2026-02-26
**Status:** Live Production @ hotmessldn.com + hotmess.app

---

## 1. PRODUCTS & SURFACES

| Product | Type | URL | Status |
|---------|------|-----|--------|
| **HOTMESS App** | PWA (Vite + React) | hotmessldn.com / hotmess.app | ✅ Live |
| **HOTMESS Radio** | Live stream (RadioKing) | /radio | ✅ Live |
| **HNH MESS** | Shopify product | Shopify headless via /market | ✅ Live |
| **RAW CONVICT RECORDS** | Music label | SoundCloud (partial OAuth) | ⚠️ Partial |
| **Preloved Marketplace** | P2P listings | /market | ✅ Live |
| **Admin Panel** | Internal | /admin route (gated) | ✅ Live |

---

## 2. INFRASTRUCTURE

```
hotmessldn.com / hotmess.app
        │
        ▼
   Vercel (CDN + Serverless)
   Project: hotmess-globe
   Org: phils-projects-59e621aa
        │
        ├── Frontend: Vite SPA (dist/)
        │   └── Service Worker (PWA, offline)
        │
        ├── API Functions: api/**/*.js (Vercel serverless)
        │   85+ endpoints deployed to iad1 region
        │
        └── Cron Jobs:
            ├── /api/events/cron         → 03:00 daily
            ├── /api/notifications/process → every 5 min
            ├── /api/notifications/dispatch → every 5 min
            └── /api/admin/cleanup/rate-limits → 04:20 daily
```

---

## 3. SUPABASE PROJECTS

| Role | Project ID | URL | Used For |
|------|-----------|-----|---------|
| **Frontend (auth/data)** | `klsywpvncqqglhnhrjbh` | klsywpvncqqglhnhrjbh.supabase.co | Anon key, auth, realtime, storage |
| **Backend (postgres)** | `axxwdjmbwkvqhcpwters` | axxwdjmbwkvqhcpwters.supabase.co | Service role, POSTGRES_URL, server-side ops |

**Note:** Two separate Supabase projects are intentional. Frontend uses anon key for `klsywpvncqqglhnhrjbh`. Server-side API functions use service role for `axxwdjmbwkvqhcpwters`.

---

## 4. THIRD-PARTY INTEGRATIONS

| Service | Purpose | Env Vars | Status |
|---------|---------|---------|--------|
| **Supabase** | Auth, Postgres, Realtime, Storage | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY | ✅ Production |
| **Shopify** | Headless commerce (HNH MESS + merch) | SHOPIFY_API_STOREFRONT_ACCESS_TOKEN, SHOPIFY_SHOP_DOMAIN, SHOPIFY_CHECKOUT_DOMAIN | ✅ Production |
| **Stripe** | Payments + subscriptions | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLISHABLE_KEY | ✅ Production |
| **Telegram** | Auth + bot notifications | TELEGRAM_BOT_TOKEN, VITE_TELEGRAM_BOT_USERNAME | ✅ Production |
| **Google Maps** | Directions + routing | GOOGLE_MAPS_API_KEY | ✅ Production |
| **RadioKing** | Live audio stream | URL hardcoded in RadioContext.tsx | ✅ Production |
| **Sentry** | Error tracking + performance | VITE_SENTRY_DSN | ✅ Production |
| **Web Push** | Browser + mobile notifications | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VITE_VAPID_PUBLIC_KEY | ✅ Production |
| **OpenAI** | AI features (wingman, matchmaking) | OPENAI_API_KEY | ⚠️ Partial use |
| **SoundCloud** | Music upload (RAW CONVICT label) | SOUNDCLOUD_CLIENT_ID/SECRET/REDIRECT_URI/SCOPE | ⚠️ OAuth partial |
| **Notion** | Integration (added 8h ago) | NOTION_CLIENT_ID/SECRET/REDIRECT_URI | ⚠️ Recent addition |
| **Mapbox** | Map tiles (optional) | VITE_MAPBOX_TOKEN | ⚠️ Optional |
| **Google Analytics** | Usage analytics | VITE_GA_MEASUREMENT_ID (not in Vercel) | ⚠️ Not confirmed live |

---

## 5. APPLICATION ARCHITECTURE

### Provider Hierarchy (outer → inner)
```
Sentry.ErrorBoundary → ErrorBoundary → OSProvider
└─ App
   └─ I18nProvider
      └─ AuthProvider (Supabase auth)
         └─ PinLockProvider
            └─ BootGuardProvider (boot FSM)
               └─ QueryClientProvider (TanStack Query)
                  └─ WorldPulseProvider
                     └─ ShopCartProvider
                        └─ BrowserRouter
                           └─ SOSProvider
                              └─ SheetProvider
                                 └─ BootRouter
                                    └─ RadioProvider
                                       └─ OSArchitecture
```

### OS Layer Model
| Layer | Z-Index | Contents |
|-------|---------|----------|
| L0 | 0 | `UnifiedGlobe` (Three.js — only on /pulse) |
| L1 | 50 | `OSBottomNav`, `RadioMiniPlayer` |
| L2 | 100 | Content sheets (`SheetRouter`) |
| L3 | 150 | Persona switcher, filters |
| Interrupts | 180–200 | `IncomingCallBanner` (180), `SOSButton` (190), `SOSOverlay` (200), `PinLockOverlay` (above all) |

### 5-Mode OS Routing
| Route | Mode | Key Feature |
|-------|------|------------|
| `/` | Home | Globe hero + feed cards |
| `/pulse` | Pulse | 3D Globe + events + beacon FAB |
| `/ghosted` | Ghosted | 3-col proximity grid + messaging |
| `/market` | Market | Shopify headless + preloved listings |
| `/profile` | Profile | Persona switcher + settings + safety |
| `/radio` | Radio | Live stream (no nav tab; mini player persists above nav) |

### Boot State Machine
```
LOADING → UNAUTHENTICATED → /auth
        → NEEDS_AGE       → AgeGate
        → NEEDS_ONBOARDING → OnboardingGate (6 steps)
        → NEEDS_COMMUNITY_GATE → CommunityAttestation
        → READY           → OSArchitecture
```

---

## 6. DATA FLOWS

### Auth Flow
```
User opens app → BootGuardContext checks session
→ If no session: redirect /auth → Supabase auth
→ On auth: check age_verified, community_attested_at
→ Gates pass → READY state → OS loads
```

### Chat Flow
```
User sends message → Supabase INSERT messages
→ Realtime subscription fires on recipient
→ useUnreadCount updates badge
→ Push notification via /api/notifications/dispatch
→ Browser notification via showNotification()
```

### Commerce Flow (Shopify)
```
User browses /market → Shopify Storefront API via /api/shopify/*
→ Add to cart → ShopCartContext (localStorage)
→ Checkout → Shopify checkout redirect
→ Webhook fires → /api/shopify/webhooks
→ Order synced to Supabase orders table
```

### Beacon Flow
```
User creates beacon → L2BeaconSheet → INSERT beacons (VIEW backed by actual table)
→ WorldPulseContext Realtime subscription fires for nearby users
→ Globe renders beacon via GlobeBeacons.tsx
→ Beacon shows on /pulse globe
```

### SOS Flow
```
Long-press SOSButton (600ms) → SOSContext.triggerSOS()
→ SOSOverlay renders at Z-200
→ Stops location_shares + right_now_status
→ Shows Text/Add emergency contact options
→ clearSOS() dismisses
```

---

## 7. KEY FILE LOCATIONS

| What | Where |
|------|-------|
| Supabase client | `src/components/utils/supabaseClient.jsx` |
| Boot FSM | `src/contexts/BootGuardContext.jsx` |
| Sheet system | `src/contexts/SheetContext.jsx`, `src/lib/sheetSystem.ts`, `src/lib/sheetPolicy.ts` |
| All sheets | `src/components/sheets/SheetRouter.jsx` + `src/components/sheets/L2*.jsx` |
| OS navigation | `src/modes/OSBottomNav.tsx` |
| Mode router | `src/modes/OSShell.tsx` |
| SOS system | `src/contexts/SOSContext.tsx`, `src/components/sos/SOSButton.jsx`, `src/components/interrupts/SOSOverlay.tsx` |
| Radio | `src/contexts/RadioContext.tsx`, `src/components/radio/RadioMiniPlayer.tsx` |
| Persona system | `src/contexts/PersonaContext.jsx`, `src/components/sheets/PersonaSwitcherSheet.tsx` |
| Push notifications | `src/hooks/usePushNotifications.ts`, `public/sw.js` |
| Globe | `src/components/globe/UnifiedGlobe.tsx` |
| Shopify client | `api/shopify/_storefront.js` |

---

## 8. DATABASE SCHEMA SUMMARY

107 migrations applied. Key tables:

| Table | Purpose |
|-------|---------|
| `User` | Core user record (email, username, photos, is_online) |
| `profiles` | Extended profile (age_verified, community_attested_at, personas) |
| `messages` | Chat messages (thread_id, sender_email, content) |
| `chat_threads` | Chat threads (participant_emails, unread_count JSONB) |
| `beacons` | **VIEW** — backed by actual table; metadata JSONB holds title/description/address/image_url |
| `taps` | Tap/woof system (tapper_email, tapped_email, tap_type) |
| `emergency_contacts` | User emergency contacts (user_id UUID) |
| `push_subscriptions` | Web Push subscriptions (user_id UUID, subscription JSONB) |
| `preloved_listings` | P2P marketplace (seller_id UUID) |
| `orders` | Orders (buyer_email, seller_email, total_gbp, status) |
| `right_now_status` | Live presence **TABLE** (NOT profiles.right_now_status JSONB) |
| `personas` | User personas (up to 5, switch_persona RPC) |

**Critical gotcha:** `beacons` is a VIEW — use `owner_id` (not `user_id`), `starts_at`/`ends_at` (not `start_time`/`end_time`). All metadata in `metadata` JSONB.

---

## 9. DEPLOYMENT PIPELINE

```
git push origin main
        │
        ▼
GitHub (SICQR/hotmess-globe)
        │
        ▼ webhook
Vercel auto-deploy
   npm run build (vite build)
   Output: dist/
   Functions: api/**/*.js → Vercel serverless
        │
        ▼
hotmessldn.com (prod alias)
hotmess.app (prod alias)
```

No CI/CD blocking — push to main = deploy to production immediately.

---

## 10. MULTI-BRAND ECOSYSTEM

| Brand | Role | Integration |
|-------|------|------------|
| **HOTMESS** | Main app / social OS | This repo |
| **HNH MESS** | Lube brand | Shopify product in /market |
| **RAW CONVICT RECORDS** | Music label | SoundCloud (partial), /radio context |
| **HOTMESS RADIO** | 3 shows (Wake The Mess, Dial A Daddy, Hand N Hand) | RadioKing stream in RadioContext |
| **SMASH DADDYS** | In-house music production | Listed in /radio show pages |
| **RAW / HUNG / HIGH** | Clothing sub-brands | Referenced in brand identity, no dedicated routes |
| **SUPERHUNG / SUPERRAW** | Limited drops | No active routes |
| **HUNGMESS** | Editorial fashion | Referenced in HomeMode.tsx |
