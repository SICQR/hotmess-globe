# HOTMESS — Global Queer Nightlife Platform

> **"From Ear to Floor"** — A spatial OS for queer nightlife discovery, connection, and commerce.

**Live:** https://hotmess.london  
**Status:** Production (Phase 2 Complete)  
**Updated:** 2026-02-08

---

## 📊 Current Build

| Metric | Count |
|--------|-------|
| **Pages** | 112 |
| **Components** | 333 |
| **Hooks** | 20 |
| **Contexts** | 8 |

---

## ✅ WHAT'S BUILT (Working)

### 🌐 Globe & Spatial Engine
| Feature | Status | Notes |
|---------|--------|-------|
| 3D Interactive Globe | ✅ Working | Three.js + React Three Fiber |
| Beacon Rendering | ✅ Working | Color-coded by type |
| City Zoom | ✅ Working | London, Berlin, NYC, LA, etc. |
| WorldPulse Realtime | ✅ Working | Supabase subscriptions |
| City Pulse Bar | ✅ Working | Quick-jump navigation |

### 📻 Radio & Audio
| Feature | Status | Notes |
|---------|--------|-------|
| ConvictPlayer | ✅ Working | Persistent mini-player |
| Live Radio Stream | ✅ Working | Icecast integration |
| Radio Schedule | ✅ Working | Weekly show timetable |
| Show Pages | ✅ Working | Wake The Mess, Dial A Daddy, HNH |

### 👤 Identity & Auth
| Feature | Status | Notes |
|---------|--------|-------|
| Supabase Auth | ✅ Working | Email + magic link |
| Telegram Login | ✅ Working | Primary auth method |
| Age Gate | ✅ Working | 18+ verification |
| Profile System | ✅ Working | Bio, avatar, tags |
| Onboarding Flow | ✅ Working | Multi-step setup |

### 🎭 Social & Discovery
| Feature | Status | Notes |
|---------|--------|-------|
| Right Now Toggle | ✅ Working | Lime beacon on Globe |
| Profile Grid | ✅ Working | Infinite scroll |
| Messaging | ✅ Working | Real-time threads |
| Bookmarks | ✅ Working | Save profiles/events |

### 🎫 Events
| Feature | Status | Notes |
|---------|--------|-------|
| Event Listings | ✅ Working | Browse/filter |
| Beacon Detail | ✅ Working | Full event pages |
| RSVP System | ✅ Working | Attendance tracking |
| Event Calendar | ✅ Working | Date navigation |

### 🛒 Commerce
| Feature | Status | Notes |
|---------|--------|-------|
| Shopify Integration | ✅ Working | Storefront API |
| P2P Marketplace | ✅ Working | Creator listings |
| Seller Dashboard | ✅ Working | Product management |
| Vault | ✅ Working | Unified order history (Phase 2) |
| Beacon → Listing | ✅ Working | Gold beacons for P2P |

### 🎮 Gamification
| Feature | Status | Notes |
|---------|--------|-------|
| XP System | ✅ Working | Points for actions |
| Leaderboard | ✅ Working | Weekly rankings |
| Challenges | ✅ Working | Daily/weekly tasks |

### 🛡️ Safety
| Feature | Status | Notes |
|---------|--------|-------|
| Safety Page | ✅ Working | Resource hub |
| Report System | ✅ Working | Flag users/content |
| Community Guidelines | ✅ Working | Clear rules |

---

## ⚠️ NEEDS MAJOR IMPROVEMENT

### 🔴 CRITICAL (Fix Immediately)

| Issue | Impact | Solution |
|-------|--------|----------|
| **Globe Performance** | Initial load blocked by heavy 3D assets | Lazy-load Globe component with React.lazy + Suspense |
| **Mobile Globe** | Unusable on low-end devices, crashes iOS Safari | Add 2D fallback map for mobile/weak WebGL |
| **Error Handling** | Pages crash silently on API failures | Add error boundaries, retry logic, user-friendly error states |
| **Offline Mode** | PWA registered but nothing works offline | Implement service worker caching for critical assets |

### 🟠 HIGH PRIORITY (This Sprint)

| Issue | Impact | Solution |
|-------|--------|----------|
| **Tonight Mode** | Toggle exists but not wired in nav | Connect useTonightMode to Layout, adjust UI at 20:00-06:00 |
| **4-Pillar Nav** | Buttons don't navigate consistently | Fix NavigationOrb + pillar button href/onClick |
| **Messages Auto-Scroll** | New messages require manual scroll | Add scrollIntoView on new message |
| **Search Quality** | Global search returns poor results | Implement proper full-text search or Algolia |
| **Cart Persistence** | Shopify cart clears on refresh | Store cart ID in localStorage, rehydrate on load |
| **Push Notifications** | Hook exists, not integrated | Wire usePushNotifications to Telegram bot |
| **Safety FAB** | Panic button exists but no emergency mode | Build emergency mode overlay (red theme, location share) |

### 🟡 MEDIUM PRIORITY (Next Sprint)

| Issue | Impact | Solution |
|-------|--------|----------|
| **Profile Card Variants** | 3+ implementations (Bento, Convict ID, etc.) | Consolidate to single SmartProfileCard |
| **Beacon Colors Drift** | Some pages use hardcoded colors | Import BEACON_COLOR from useP2PListingBeacon everywhere |
| **Route Duplication** | App.jsx has duplicate route definitions | Create routeConfig.js, generate routes from single source |
| **Loading States** | Inconsistent skeleton screens | Standardize on PageSkeletons component |
| **Form Validation** | Inconsistent patterns across forms | Adopt react-hook-form + zod schema validation |
| **Image Optimization** | No lazy loading or responsive images | Add loading="lazy" + srcset |
| **Accessibility** | Missing ARIA labels, keyboard nav gaps | Run axe audit, fix critical issues |

### 🟢 NICE TO HAVE (Backlog)

| Feature | Notes |
|---------|-------|
| AI Verification (Part 19) | Liveness check for verified badge |
| Voice Messages | Audio recording in chat |
| AR Mode | Camera-based beacon discovery |
| Multi-language | i18n setup exists, needs translations |
| Dark/Light Mode | Currently dark-only |
| P2P Payments | Stripe Connect for creator payouts |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    HOTMESS SPATIAL OS                    │
├─────────────────────────────────────────────────────────┤
│  L3: Toasts/Alerts     │ Match, XP, Safety alerts       │
├─────────────────────────────────────────────────────────┤
│  L2: Sheets/Drawers    │ Profile, Events, Market, Chat  │
├─────────────────────────────────────────────────────────┤
│  L1: System HUD        │ Player, SafetyFAB, Nav, Ticker │
├─────────────────────────────────────────────────────────┤
│  L0: Globe (Always-On) │ 3D Canvas, Beacons, WorldPulse │
└─────────────────────────────────────────────────────────┘
```

### Beacon Color Spec

```javascript
const BEACON_COLOR = {
  social: '#39FF14',      // Lime — Right Now / "I'm out"
  event: '#00D9FF',       // Cyan — Events
  marketplace: '#FFD700', // Gold — P2P listings
  radio: '#B026FF',       // Purple — Radio drops
};
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion |
| **3D/Maps** | Three.js, React Three Fiber, Mapbox GL |
| **State** | TanStack Query, Zustand, React Context |
| **Backend** | Supabase (Auth, Postgres, Realtime, Storage) |
| **Commerce** | Shopify Storefront API |
| **Notifications** | Telegram Bot API |
| **Deployment** | Vercel |

---

## 📁 Key Files

```
src/
├── pages/              # 112 page components
├── components/         # 333 UI components
│   ├── globe/          # GlobeHero, CityPulseBar, BeaconPreviewPanel
│   ├── radio/          # ConvictPlayer, RadioShowCard
│   ├── social/         # ProfileCard, GhostedStack
│   ├── safety/         # SafetyButton, PanicButton
│   ├── marketplace/    # ProductCard, ShopCart
│   └── ui/             # Button, Card, Sheet, etc.
├── hooks/              # 20 custom hooks
│   ├── useUnifiedVault.js      # Aggregates orders + beacons
│   ├── useP2PListingBeacon.js  # Beacon create/delete for P2P
│   ├── useGlobeBeacons.js      # Globe beacon rendering
│   └── useRightNowBeacon.js    # Social presence toggle
├── contexts/           # 8 React contexts
│   ├── GlobeContext.jsx        # Globe state + emitPulse
│   ├── WorldPulseContext.jsx   # Realtime subscriptions
│   └── SafetyGateContext.jsx   # Safety state
├── App.jsx             # Router + 100+ route definitions
├── pages.config.js     # Page registry
└── Layout.jsx          # Shell (nav, player, safety)

docs/
├── REMAP-MASTER.md     # Architecture spec (source of truth)
├── SOUL.md             # Product values & philosophy
└── PROJECT_BIBLE.md    # Original vision document
```

---

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/SICQR/hotmess-globe.git
cd hotmess-globe

# Install
npm install

# Environment (copy and fill)
cp .env.example .env.local

# Dev server
npm run dev

# Build
npm run build
```

### Required Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `VITE_MAPBOX_TOKEN` | ✅ | Mapbox GL token |
| `VITE_TELEGRAM_BOT` | ⚡ | Telegram Login Widget |
| `SHOPIFY_STOREFRONT_TOKEN` | ⚡ | Shopify API (commerce) |
| `SHOPIFY_STORE_DOMAIN` | ⚡ | Shopify store URL |

---

## 📋 Implementation Phases

### ✅ Phase 1 — Globe Alive (COMPLETE)
- [x] Telegram Auth + profile creation
- [x] Supabase Realtime on `beacons` table
- [x] Right Now toggle → Lime beacon

### ✅ Phase 2 — Commerce & Vault (COMPLETE)
- [x] Seller → Beacon wiring (Gold beacons for P2P)
- [x] Unified Vault component
- [x] WORLD_PULSE event dispatch

### 🔄 Phase 3 — Sheets & Nav (IN PROGRESS)
- [ ] Globe as persistent shell (no unmount)
- [ ] L2 sheets for pillar content
- [ ] Tonight mode toggle in nav

### ⏳ Phase 4 — Safety & AI
- [ ] Safety FAB → Emergency mode
- [ ] Telegram Bot webhooks
- [ ] Part 19 AI Verification

---

## 🐛 Known Bugs

| Bug | Severity | Workaround |
|-----|----------|------------|
| Globe crashes on iOS Safari | 🔴 Critical | Reload page; needs 2D fallback |
| Messages don't auto-scroll | 🟠 High | Scroll manually |
| Cart clears on refresh | 🟠 High | Complete checkout in one session |
| Profile images 404 sometimes | 🟡 Medium | Re-upload image |
| Duplicate routes in App.jsx | 🟢 Low | Works, just messy |

---

## 📚 Documentation

| Doc | Purpose |
|-----|---------|
| [REMAP-MASTER.md](docs/REMAP-MASTER.md) | Architecture & implementation spec |
| [SOUL.md](docs/SOUL.md) | Product values & philosophy |
| [PROJECT_BIBLE.md](docs/PROJECT_BIBLE.md) | Original vision & ideal user |

---

## 🎨 Brand

| Color | Hex | Use |
|-------|-----|-----|
| Hot Pink | `#FF1493` | Primary brand |
| Cyan | `#00D9FF` | Events, info |
| Lime | `#39FF14` | Success, online, Right Now |
| Gold | `#FFD700` | Premium, P2P marketplace |
| Purple | `#B026FF` | Music, radio |

---

**Built with 🖤 for the queer nightlife community.**

*"Don't make the same mistake twice unless he's hot"*
