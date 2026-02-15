# 🔥 PRODUCTION-UNIFIED BRANCH - MASTER INTEGRATION

**Created:** 2026-02-15  
**Strategy:** Cherry-pick best features from all branches  
**Goal:** Production-ready app matching Figma prototypes  
**Status:** 🚧 In Progress

---

## 🎯 INTEGRATION STRATEGY

This branch intelligently combines:

### 1️⃣ **BASE** (`main` branch)
- ✅ Production-proven architecture
- ✅ Three.js globe
- ✅ Telegram + Google OAuth
- ✅ Shopify integration
- ✅ 112 pages
- ✅ Real user base at hotmess.london

### 2️⃣ **FEATURES** (`feat/l2-sheet-architecture`)
- ✅ Complete messaging system (ChatThread, VoiceNote, etc.)
- ✅ Full marketplace (ProductCard, CartDrawer, etc.)
- ✅ Social discovery (DiscoveryGrid, AIMatchmaker, etc.)
- ✅ SOS emergency system
- ✅ L2 sheet architecture
- ✅ Matching system

### 3️⃣ **ECONOMY** (`figma-make-v2`)
- ✅ XP economy hooks
- ✅ Level gates for marketplace
- ✅ Database migrations (14 tables)
- ✅ Geospatial privacy

### 4️⃣ **DESIGN** (Your Figma prototypes)
- ✅ Industrial dark aesthetic
- ✅ Gold/yellow accents
- ✅ Event cards with images
- ✅ Bottom nav (Home, Pulse, Vault, Events, Profile)
- ✅ SOS emergency screen
- ✅ Persona Manager grid

---

## 📋 CHERRY-PICK CHECKLIST

### Phase 1: Core Components (In Progress)

#### Messaging System
- [ ] `src/components/messaging/ChatThread.jsx` (30KB)
- [ ] `src/components/messaging/VoiceNote.jsx`
- [ ] `src/components/messaging/MediaViewer.jsx`
- [ ] `src/components/messaging/TypingIndicator.jsx`
- [ ] `src/components/messaging/GroupChatManager.jsx`
- [ ] `src/components/messaging/WingmanPanel.jsx` (AI wingman)
- [ ] `src/components/messaging/ThreadList.jsx`
- [ ] `src/components/messaging/NewMessageModal.jsx`

**Source:** `feat/l2-sheet-architecture`  
**Status:** Ready to cherry-pick  
**Conflicts:** None (new components)

#### Marketplace/Vault
- [ ] `src/components/marketplace/ProductCard.jsx`
- [ ] `src/components/marketplace/UnifiedCartDrawer.jsx` (15KB)
- [ ] `src/components/marketplace/ProductForm.jsx` (14KB)
- [ ] `src/components/marketplace/MakeOfferModal.jsx`
- [ ] `src/components/marketplace/AIRecommendations.jsx`
- [ ] `src/components/marketplace/DropBeacons.jsx`
- [ ] `src/components/marketplace/MarketplaceReviewModal.jsx`
- [ ] `src/components/marketplace/cartStorage.js`

**Source:** `feat/l2-sheet-architecture`  
**Integration:** Merge with existing Shopify code  
**Add:** Level gates from `figma-make-v2`

#### Social/Ghosted Grid
- [ ] `src/components/social/DiscoveryGrid.jsx` (11KB)
- [ ] `src/components/social/AIMatchmaker.jsx` (11KB)
- [ ] `src/components/social/TacticalProfileCard.jsx`
- [ ] `src/components/social/RightNowGrid.tsx`
- [ ] `src/components/social/HandshakeButton.jsx`
- [ ] `src/components/social/Stories.jsx` (17KB)
- [ ] `src/components/social/ConsentGate.jsx`
- [ ] `src/components/social/ShareButton.jsx`

**Source:** `feat/l2-sheet-architecture`  
**Status:** Ready to cherry-pick  
**Style:** Match Figma prototype cards

#### SOS System
- [ ] `src/components/sos/SOSButton.jsx` (4KB)
- [ ] Create `src/components/sos/SOSOverlay.jsx` from `figma-make-v2`

**Source:** `feat/l2-sheet-architecture` + `figma-make-v2`  
**Style:** Match Figma emergency screen prototype

#### L2 Sheets
- [ ] `src/components/sheets/L2ChatSheet.jsx` (13KB)
- [ ] `src/components/sheets/L2GhostedSheet.jsx` (12KB)
- [ ] `src/components/sheets/L2VaultSheet.jsx` (11KB)
- [ ] `src/components/sheets/L2ProfileSheet.jsx` (15KB)
- [ ] `src/components/sheets/L2EventSheet.jsx` (12KB)
- [ ] `src/components/sheets/L2ShopSheet.jsx` (9KB)
- [ ] `src/components/sheets/SheetRouter.jsx`
- [ ] `src/components/sheets/L2SheetContainer.jsx`

**Source:** `feat/l2-sheet-architecture`  
**Integration:** Wire to existing routing  
**Style:** Match Figma prototype sheets

---

### Phase 2: XP Economy

#### Database Migrations
- [ ] `supabase/migrations/001_initial_schema.sql`
- [ ] `supabase/migrations/002_squad_factions.sql`
- [ ] `supabase/migrations/003_remap_master_schema.sql`

**Source:** `figma-make-v2`  
**Action:** Run in Supabase SQL editor  
**Tables Added:** xp_ledger, consent tracking, geospatial features

#### XP Hooks
- [ ] Port XP sync logic from `figma-make-v2/src/app/hooks/useSync.ts`
- [ ] Adapt to TanStack Query patterns
- [ ] Wire to radio player for +10 XP/5min
- [ ] Wire to beacon scans for +100 XP

**Source:** `figma-make-v2`  
**Integration:** Create `src/hooks/useXPEconomy.js`

#### Level Gates
- [ ] Extract level gate UI from `figma-make-v2`
- [ ] Add blur + lock overlay to ProductCard
- [ ] Add XP badges to event cards
- [ ] Add level indicators to UI

**Source:** `figma-make-v2`  
**Style:** Use gold accents from Figma prototypes

---

### Phase 3: UI Styling

#### Match Figma Prototypes
- [ ] Event cards with full-color images
- [ ] Gold/yellow accent badges
- [ ] Bottom navigation styling
- [ ] Profile card layouts
- [ ] Chat message bubbles
- [ ] SOS emergency screen styling
- [ ] Persona Manager grid layout

**Reference:** Your Figma prototypes  
**Assets:** Use existing image assets from main branch

#### Components to Restyle
- [ ] ProductCard → Match Vault prototype
- [ ] EventCard → Match Events List prototype
- [ ] ProfileCard → Match social prototype
- [ ] ChatThread → Match chat prototype
- [ ] SOSButton → Match emergency prototype

---

### Phase 4: Integration & Testing

#### Wire Features Together
- [ ] Connect sheets to navigation
- [ ] Wire messaging to profiles
- [ ] Connect marketplace to XP system
- [ ] Link beacons to events
- [ ] Integrate SOS with location

#### Testing
- [ ] Test full user flow
- [ ] Test XP earning
- [ ] Test level gates
- [ ] Test messaging
- [ ] Test marketplace
- [ ] Test SOS system

#### Mobile Optimization
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Fix responsive issues
- [ ] Optimize performance

---

## 🗂️ FILE ORGANIZATION

```
production-unified/
├── src/
│   ├── components/
│   │   ├── messaging/          ← From feat/l2-sheet-architecture
│   │   │   ├── ChatThread.jsx
│   │   │   ├── VoiceNote.jsx
│   │   │   └── ...
│   │   ├── marketplace/        ← From feat/l2-sheet-architecture
│   │   │   ├── ProductCard.jsx (+ level gates)
│   │   │   ├── UnifiedCartDrawer.jsx
│   │   │   └── ...
│   │   ├── social/             ← From feat/l2-sheet-architecture
│   │   │   ├── DiscoveryGrid.jsx
│   │   │   ├── AIMatchmaker.jsx
│   │   │   └── ...
│   │   ├── sos/                ← From feat/l2-sheet-architecture
│   │   │   ├── SOSButton.jsx
│   │   │   └── SOSOverlay.jsx (from figma-make-v2)
│   │   ├── sheets/             ← From feat/l2-sheet-architecture
│   │   │   ├── L2ChatSheet.jsx
│   │   │   ├── L2GhostedSheet.jsx
│   │   │   └── ...
│   │   └── globe/              ← Keep from main
│   │       └── GlobeHero.jsx (Three.js)
│   ├── hooks/
│   │   ├── useXPEconomy.js     ← New from figma-make-v2
│   │   ├── useGlobeBeacons.js  ← Keep from main
│   │   └── ...
│   ├── pages/                  ← Keep from main (112 pages)
│   └── contexts/               ← Keep from main
├── supabase/
│   └── migrations/             ← Add from figma-make-v2
│       ├── 001_initial_schema.sql
│       ├── 002_squad_factions.sql
│       └── 003_remap_master_schema.sql
└── docs/
    └── INTEGRATION_GUIDE.md    ← This file
```

---

## 🔀 MERGE STRATEGY

### Cherry-Pick Commands

```bash
# 1. Checkout the unified branch
git checkout production-unified

# 2. Cherry-pick messaging components
git checkout feat/l2-sheet-architecture -- src/components/messaging/
git add src/components/messaging/
git commit -m "✨ Add complete messaging system from L2 architecture"

# 3. Cherry-pick marketplace components
git checkout feat/l2-sheet-architecture -- src/components/marketplace/
git add src/components/marketplace/
git commit -m "✨ Add marketplace components from L2 architecture"

# 4. Cherry-pick social components
git checkout feat/l2-sheet-architecture -- src/components/social/
git add src/components/social/
git commit -m "✨ Add social/ghosted grid from L2 architecture"

# 5. Cherry-pick sheets
git checkout feat/l2-sheet-architecture -- src/components/sheets/
git add src/components/sheets/
git commit -m "✨ Add L2 sheet architecture"

# 6. Cherry-pick SOS
git checkout feat/l2-sheet-architecture -- src/components/sos/
git add src/components/sos/
git commit -m "✨ Add SOS system"

# 7. Add XP migrations
git checkout figma-make-v2 -- supabase/migrations/
git add supabase/migrations/
git commit -m "📊 Add XP economy database migrations"
```

---

## 📐 ARCHITECTURAL DECISIONS

### Keep from Main:
- ✅ Three.js globe (production-proven)
- ✅ React Router (112 pages working)
- ✅ TanStack Query + Zustand (proven patterns)
- ✅ Telegram/Google auth (users expect it)
- ✅ Shopify integration (revenue stream)

### Add from feat/l2-sheet-architecture:
- ✅ L2 sheets for modal content
- ✅ Complete messaging system
- ✅ Social discovery grid
- ✅ Marketplace components
- ✅ SOS system

### Add from figma-make-v2:
- ✅ XP economy backend (database + hooks)
- ✅ Level gates UI pattern
- ✅ Geospatial privacy functions

### Style with Figma Prototypes:
- ✅ Visual design system
- ✅ Component layouts
- ✅ Color scheme (gold accents)
- ✅ Typography

---

## ⚠️ POTENTIAL CONFLICTS

### Routing
**Issue:** L2 sheets use different routing than main  
**Solution:** Keep main's React Router, add sheet routes

### State Management
**Issue:** L2 components may use different patterns  
**Solution:** Adapt to TanStack Query + Zustand

### Styling
**Issue:** Different CSS approaches  
**Solution:** Use Tailwind consistently

### Auth
**Issue:** figma-make-v2 uses anonymous auth  
**Solution:** Keep Telegram/Google, ignore anonymous

---

## 🎯 SUCCESS CRITERIA

### Feature Completeness
- [ ] All messaging features working
- [ ] Marketplace with level gates
- [ ] Social discovery functional
- [ ] XP economy earning/spending
- [ ] SOS system operational
- [ ] L2 sheets integrated

### Visual Match
- [ ] Matches Figma prototypes
- [ ] Gold accent badges
- [ ] Event cards styled
- [ ] Profile cards styled
- [ ] Chat interface styled

### Performance
- [ ] <3s load time
- [ ] Smooth animations
- [ ] No console errors
- [ ] Mobile responsive

### Testing
- [ ] Full E2E flow works
- [ ] XP earning verified
- [ ] Level gates tested
- [ ] Mobile tested

---

## 📊 PROGRESS TRACKING

**Phase 1:** 🚧 In Progress (0/8 component groups)  
**Phase 2:** ⏳ Pending (0/3 tasks)  
**Phase 3:** ⏳ Pending (0/5 tasks)  
**Phase 4:** ⏳ Pending (0/4 tasks)

**Overall:** 0% Complete

---

## 🔥 NEXT ACTIONS

1. **Run cherry-pick commands** above
2. **Resolve any merge conflicts**
3. **Test each component group**
4. **Style to match prototypes**
5. **Run E2E tests**
6. **Deploy to staging**
7. **User acceptance testing**
8. **Merge to main**

---

**🔥 THIS IS THE PRODUCTION BRANCH. LET'S BUILD IT RIGHT. 🔥**