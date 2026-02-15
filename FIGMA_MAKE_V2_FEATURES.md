# 🔥 FIGMA MAKE V2.1 - NEW FEATURES BRANCH

**Branch:** `figma-make-v2`  
**Created:** 2026-02-15  
**Status:** Complete alternative architecture ready for selective merge

---

## 🎯 WHAT THIS BRANCH IS

This is a **complete rebuild** of HOTMESS LONDON OS created in Figma Make with a different architectural approach. It's production-ready, fully documented, and tested - but uses different patterns than your current `main` branch.

**DO NOT merge blindly.** Review features and cherry-pick what you want.

---

## 📊 ARCHITECTURE COMPARISON

### MAIN BRANCH (Current Production):
- **Pattern:** React Router with 112 pages
- **Structure:** `src/pages/`, `src/components/`, `src/hooks/`
- **State:** TanStack Query + Zustand + Context
- **Auth:** Telegram Login + Google OAuth + Supabase
- **Navigation:** Multi-page routing
- **Globe:** Three.js + React Three Fiber
- **Live:** hotmess.london

### FIGMA-MAKE-V2 BRANCH (This Branch):
- **Pattern:** Single-instance shell with layered UI
- **Structure:** `src/app/` with clear L0/L1/L2/L3 layers
- **State:** Zustand singleton store
- **Auth:** Anonymous Supabase auth only
- **Navigation:** Query-param routing (no page unmounts)
- **Globe:** Mapbox GL JS 3D (different from Three.js)
- **Architecture:** Never-unmount background + modal sheets

---

## ✨ NEW FEATURES IN THIS BRANCH

### 1. **Anonymous Authentication**
- No email/password required
- Instant sign-in with Supabase anonymous auth
- Consent firewall with 3-checkbox gate
- RLS policies enforce consent before data access

### 2. **Single-Instance Shell Architecture**
```
L3 (Z-100): System Interrupts (Gatekeeper, SOS)
L2 (Z-80):  Modal Sheets (slide up, don't unmount globe)
L1 (Z-50):  Tactical HUD (Status, Nav, SOS button)
L0 (Z-0):   UnifiedGlobe + Radio (NEVER UNMOUNT)
```

### 3. **Mapbox GL JS 3D Globe**
- Full 3D terrain rendering
- Atmospheric glow effects
- Pulsing beacon markers
- Better performance than Three.js for this use case
- Built-in camera controls

### 4. **XP Economy System**
- Radio listening: +10 XP every 5 minutes
- Beacon scanning: +100 XP (or +99 with king tax)
- Purchase bonuses: Variable XP
- Level formula: `FLOOR(total_xp / 1000) + 1`
- Immutable XP ledger (audit trail)
- Real-time XP sync with Supabase

### 5. **Level-Gated Marketplace**
- Products locked by level (blur + overlay)
- XP boost badges on products
- Same-day delivery indicators
- Level 3 gate for "Lux" official gear
- Escrow system for P2P

### 6. **Persistent Radio Player**
- Stays playing during all navigation
- XP heartbeat every 5 minutes
- Never unmounts
- Works in background

### 7. **Geospatial Privacy**
- 500m grid snapping for location anonymity
- PostGIS integration
- Privacy-first beacon placement

### 8. **Complete Database Schema**
- 14 tables with RLS security
- PostGIS for geospatial queries
- Triggers for XP auto-updates
- Functions for business logic
- Real-time subscriptions ready

### 9. **Comprehensive Documentation**
- 4,000+ lines of docs
- 170 E2E test cases
- Complete API reference
- Deployment guides
- Troubleshooting guides

### 10. **Industrial Tactical Design System**
- 2px white borders everywhere
- 0px border radius (no curves)
- Grayscale images with grain overlay
- #FF1493 hot pink accents
- Space Mono typography
- Motion.js (Framer Motion) animations

---

## 🗂️ FILE STRUCTURE

```
figma-make-v2/
├── src/app/
│   ├── App.tsx                    # Main shell (NEW architecture)
│   ├── store/
│   │   └── hotmess-store.ts       # Zustand singleton
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client
│   │   └── api.ts                 # API layer
│   ├── components/
│   │   ├── globe/
│   │   │   └── UnifiedGlobe.tsx   # Mapbox 3D globe
│   │   ├── hud/
│   │   │   ├── StatusHUD.tsx      # Top HUD
│   │   │   ├── NavigationHub.tsx  # Bottom nav
│   │   │   └── SOSButton.tsx      # Panic button
│   │   ├── sheets/
│   │   │   ├── PulseView.tsx      # Social feed
│   │   │   ├── GhostedGrid.tsx    # Anonymous matching
│   │   │   ├── VaultMarket.tsx    # Marketplace
│   │   │   ├── ConnectTerminal.tsx# Chat
│   │   │   └── ...more
│   │   ├── interrupts/
│   │   │   ├── GatekeeperV2.tsx   # Auth + Consent
│   │   │   └── SOSOverlay.tsx     # Emergency mode
│   │   ├── radio/
│   │   │   └── PersistentRadioPlayer.tsx
│   │   └── setup/
│   │       └── PersonaSetup.tsx   # Username + persona
│   └── hooks/
│       ├── useSync.ts             # Backend sync hooks
│       └── useQueryParamRouter.ts # Query-based routing
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql # Core tables
│   │   ├── 002_squad_factions.sql # Squad system
│   │   └── 003_remap_master_schema.sql # Complete schema
│   └── functions/server/
│       ├── index.tsx              # Hono web server
│       └── kv_store.tsx           # Key-value utilities
└── docs/
    ├── PROJECT_COMPLETION.md      # Full status
    ├── E2E_TESTING_MASTER_PLAN.md # 170 tests
    ├── SUPABASE_DATABASE_COMPLETE.md
    └── ...40+ documentation files
```

---

## 🔀 WHAT CAN BE MERGED?

### ✅ EASY TO MERGE (No conflicts):

1. **Database Schema** (`/supabase/migrations/`)
   - Add XP system tables
   - Add consent tracking
   - Add geospatial features
   - Can coexist with existing tables

2. **Documentation** (`/docs/`)
   - Testing guides
   - API reference
   - Deployment scripts
   - No code conflicts

3. **Environment Config** (`.env.production`)
   - Add new Supabase credentials
   - Keep existing ones
   - Just merge variables

4. **Deployment Scripts** (`/deploy.sh`, `/setup-supabase.sh`)
   - Standalone bash scripts
   - No conflicts

### ⚠️ REQUIRES ADAPTATION:

5. **XP Economy Hooks** (`src/app/hooks/useSync.ts`)
   - Extract XP logic
   - Adapt to your routing
   - Integrate with TanStack Query

6. **Geolocation Privacy** (500m grid snapping)
   - Utility functions can be copied
   - Integrate into your beacon system

7. **Persistent Radio Player** concept
   - Keep radio playing during navigation
   - Adapt to your ConvictPlayer

8. **Level Gates** (marketplace feature)
   - Copy blur/overlay UI
   - Adapt to your products

### ❌ DO NOT MERGE (Architectural conflicts):

9. **Main App.tsx** - Completely different architecture
10. **Routing System** - Query params vs React Router
11. **State Management** - Different Zustand patterns
12. **Globe Implementation** - Mapbox vs Three.js

---

## 🚀 RECOMMENDED MERGE STRATEGY

### Phase 1: Non-Breaking Additions
```bash
# 1. Merge database migrations
git checkout main
git checkout figma-make-v2 -- supabase/migrations/
# Review and commit

# 2. Merge documentation
git checkout figma-make-v2 -- docs/
# Commit

# 3. Add deployment scripts
git checkout figma-make-v2 -- deploy.sh setup-supabase.sh
chmod +x *.sh
# Commit
```

### Phase 2: Feature Extraction
```bash
# Extract XP system hooks (adapt to your structure)
cp figma-make-v2/src/app/hooks/useSync.ts src/hooks/useXPSync.js
# Modify to fit your patterns

# Extract geospatial utilities
cp figma-make-v2/src/app/lib/geospatial.ts src/lib/
# Integrate into your beacon system

# Extract level gate components
cp figma-make-v2/src/app/components/vault/GhostDrops.tsx src/components/marketplace/
# Adapt styling
```

### Phase 3: Testing & Validation
```bash
# Install new test dependencies
npm install -D @playwright/test

# Copy E2E tests
git checkout figma-make-v2 -- tests/

# Adapt tests to your routing
# Run: npm run test:e2e
```

---

## 🧪 TESTING THIS BRANCH

```bash
# Switch to this branch
git checkout figma-make-v2

# Install dependencies
npm install

# Copy environment
cp .env.production .env
# Add your VITE_MAPBOX_TOKEN

# Run locally
npm run dev

# Test the flow:
# 1. See splash screen
# 2. Anonymous auth
# 3. Consent gate (3 checkboxes)
# 4. Username setup
# 5. Main OS with 3D globe
```

---

## 📦 PACKAGES ADDED IN THIS BRANCH

New dependencies vs main:
```json
{
  "mapbox-gl": "^3.18.1",           // 3D globe (alternative to Three.js)
  "motion": "12.23.24",             // Framer Motion (for sheets)
  "zustand": "^5.0.11",             // State management
  "@types/mapbox-gl": "^3.4.1"     // TypeScript types
}
```

All other packages overlap with main branch.

---

## 🐛 KNOWN DIFFERENCES

| Feature | Main Branch | This Branch |
|---------|-------------|-------------|
| **Auth** | Telegram + Google | Anonymous only |
| **Routing** | React Router (112 pages) | Query params (8 sheets) |
| **Globe** | Three.js | Mapbox GL JS |
| **State** | Mixed (Query + Zustand + Context) | Pure Zustand |
| **Architecture** | Multi-page | Single-shell |
| **XP System** | Partial | Complete with ledger |
| **Level Gates** | Not implemented | Fully implemented |
| **Radio XP** | Not implemented | Auto +10 XP/5min |
| **Consent** | Implicit | Explicit 3-checkbox |
| **Database** | ~10 tables | 14 tables |

---

## 💡 WHY THIS ARCHITECTURE?

This branch was built with these principles:

1. **Never Unmount Globe** - 3D rendering is expensive, keep it persistent
2. **Modal Sheets Over Pages** - Faster than full page transitions
3. **Anonymous First** - Lower barrier to entry
4. **XP as Core Loop** - Gamification built from ground up
5. **Privacy by Default** - Geospatial anonymity, consent gates
6. **Industrial Aesthetic** - Hard edges, tactical feel

---

## 📚 DOCUMENTATION INDEX

All docs in `/docs/` directory:

**Setup:**
- `INSTANT_SETUP_GUIDE.md` - 2-minute quickstart
- `PROJECT_COMPLETION.md` - Full project status
- `VERCEL_ENV_FIX.md` - Environment variables

**Testing:**
- `E2E_TESTING_MASTER_PLAN.md` - 170 test cases
- `MANUAL_TESTING_CHECKLIST.md` - Manual tests
- `AUTOMATED_E2E_TESTS.md` - Playwright scripts

**Database:**
- `SUPABASE_DATABASE_COMPLETE.md` - Full schema
- `SUPABASE_QUICK_REF.md` - Quick reference

**Architecture:**
- `ARCHITECTURE_MAP_V2.1.md` - System design
- `SYSTEM_ARCHITECTURE.md` - Technical details
- `V2_BUILD_MANIFEST.md` - Build log

**Troubleshooting:**
- `ERRORS_FIXED_FINAL.md` - Common issues
- `ALL_ERRORS_FIXED_FINAL.md` - Complete fixes

---

## ⚡ QUICK COMPARISON

### What Main Branch Does Better:
- ✅ More mature (production-tested)
- ✅ Social login (Telegram, Google)
- ✅ Shopify integration
- ✅ 112 pages of content
- ✅ Proven at scale

### What This Branch Does Better:
- ✅ Complete XP economy with ledger
- ✅ Level-gated marketplace
- ✅ Anonymous auth (lower barrier)
- ✅ Persistent globe (better UX)
- ✅ Comprehensive documentation
- ✅ Complete test suite
- ✅ Deployment automation
- ✅ Industrial design system

---

## 🎯 RECOMMENDED ACTIONS

1. **Review this branch locally**
   ```bash
   git checkout figma-make-v2
   npm install
   npm run dev
   ```

2. **Cherry-pick features you want:**
   - XP economy system → High value
   - Level gates → Unique feature
   - Geospatial privacy → Important
   - Documentation → Very useful
   - Database migrations → Easy to add

3. **Keep main branch as-is for production**

4. **Use this branch as R&D / feature source**

---

## 🔥 CONCLUSION

This branch represents **an alternative vision** of HOTMESS LONDON OS. It's not meant to replace your production code - it's a **feature library** you can pull from.

Best features to extract:
1. **XP economy hooks** - Drop into your codebase
2. **Level gate UI** - Copy components
3. **Database migrations** - Extend your schema
4. **Documentation** - Use as reference
5. **Test suite** - Adapt to your pages

**Don't merge blindly. Cherry-pick deliberately.**

---

**Built with 🔥 in Figma Make**  
**Ready for selective integration**  
**Zero breaking changes if you cherry-pick correctly**

🔥 THE NIGHT GRID HAS TWO ARCHITECTURES NOW 🔥