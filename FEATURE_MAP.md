# 🗺️ COMPLETE FEATURE MAP - Where Everything Lives

## 👀 BRANCH EXPLORER

This document maps EVERY feature to its source branch so you know exactly where to cherry-pick from.

---

## 1️⃣ MESSAGING SYSTEM

**Branch:** `feat/l2-sheet-architecture`  
**Path:** `src/components/messaging/`

### Files to Cherry-Pick:
```bash
ChatThread.jsx (30,680 bytes) ← Full chat interface
VoiceNote.jsx (15,975 bytes) ← Voice message recording
MediaViewer.jsx (3,702 bytes) ← Image/video viewing
TypingIndicator.jsx (8,249 bytes) ← Real-time typing
GroupChatManager.jsx (5,507 bytes) ← Group chat creation
WingmanPanel.jsx (8,478 bytes) ← AI assistant
ThreadList.jsx (5,534 bytes) ← Message thread list
NewMessageModal.jsx (15,229 bytes) ← New message UI
NotificationBadge.jsx (2,791 bytes) ← Unread indicators
```

**Total:** 95,145 bytes (95KB) of messaging code  
**Status:** ✅ Production-ready  
**Prototype Match:** Chat interface (Screen 4)

---

## 2️⃣ MARKETPLACE/VAULT

**Branch:** `feat/l2-sheet-architecture`  
**Path:** `src/components/marketplace/`

### Files to Cherry-Pick:
```bash
ProductCard.jsx (6,558 bytes) ← Product display
UnifiedCartDrawer.jsx (15,849 bytes) ← Shopping cart
ProductForm.jsx (14,359 bytes) ← Sell products
MakeOfferModal.jsx (6,051 bytes) ← P2P offers
AIRecommendations.jsx (5,507 bytes) ← Product recs
DropBeacons.jsx (6,856 bytes) ← Product beacons
CartDrawer.jsx (8,914 bytes) ← Cart UI
MarketplaceReviewModal.jsx (6,903 bytes) ← Reviews
OffersList.jsx (5,763 bytes) ← Offer management
ComplementaryProducts.jsx (4,601 bytes) ← Related items
AgeVerificationGate.jsx (9,841 bytes) ← 18+ gate
ShopCollections.jsx (2,132 bytes) ← Collections
cartStorage.js (11,926 bytes) ← Cart persistence
```

**Total:** 105,260 bytes (105KB) of marketplace code  
**Status:** ✅ Production-ready  
**Prototype Match:** Vault (Screen 8)  
**Add:** Level gates from `figma-make-v2`

---

## 3️⃣ SOCIAL/GHOSTED GRID

**Branch:** `feat/l2-sheet-architecture`  
**Path:** `src/components/social/`

### Files to Cherry-Pick:
```bash
DiscoveryGrid.jsx (11,591 bytes) ← Main discovery
AIMatchmaker.jsx (11,834 bytes) ← AI matching
TacticalProfileCard.jsx (4,290 bytes) ← Profile cards
RightNowGrid.tsx (5,866 bytes) ← Live users
HandshakeButton.jsx (2,726 bytes) ← Connect action
Stories.jsx (17,846 bytes) ← Story system
ConsentGate.jsx (5,344 bytes) ← Privacy controls
ShareButton.jsx (10,105 bytes) ← Sharing
MessageButton.jsx (2,384 bytes) ← Quick message
ReferralProgram.jsx (10,704 bytes) ← Referrals
```

**Total:** 82,690 bytes (83KB) of social code  
**Status:** ✅ Production-ready  
**Prototype Match:** HOTMESS OS Feed (Screen 2)

---

## 4️⃣ SOS EMERGENCY SYSTEM

**Branch:** `feat/l2-sheet-architecture`  
**Path:** `src/components/sos/`

### Files to Cherry-Pick:
```bash
SOSButton.jsx (4,976 bytes) ← Emergency button
```

**Also Add from `figma-make-v2`:**
```bash
src/app/components/interrupts/SOSOverlay.tsx ← Emergency screen
```

**Total:** ~10KB of SOS code  
**Status:** ✅ Ready to integrate  
**Prototype Match:** SOS TRIGGERED (Screen 9)

---

## 5️⃣ L2 SHEET ARCHITECTURE

**Branch:** `feat/l2-sheet-architecture`  
**Path:** `src/components/sheets/`

### Files to Cherry-Pick:
```bash
L2ChatSheet.jsx (13,171 bytes) ← Chat modal
L2GhostedSheet.jsx (12,315 bytes) ← Anonymous matching
L2VaultSheet.jsx (11,466 bytes) ← Marketplace modal
L2ProfileSheet.jsx (15,299 bytes) ← Profile view
L2EventSheet.jsx (12,645 bytes) ← Event details
L2ShopSheet.jsx (9,067 bytes) ← Shopping modal
L2SheetContainer.jsx (7,230 bytes) ← Sheet wrapper
SheetRouter.jsx (3,085 bytes) ← Sheet routing
SheetLink.jsx (5,046 bytes) ← Sheet navigation
BaseSheet.tsx (943 bytes) ← Base component
EventSheet.tsx (2,357 bytes) ← Event sheet
MiniProfileSheet.tsx (1,692 bytes) ← Mini profile
```

**Total:** 94,316 bytes (94KB) of sheet code  
**Status:** ✅ Production-ready  
**Integration:** Wire to existing routing

---

## 6️⃣ MATCHING SYSTEM

**Branch:** `feat/l2-sheet-architecture`  
**Path:** `src/components/matching/`

### Files to Cherry-Pick:
```bash
MatchScoreBadge.jsx (6,964 bytes) ← Match percentage
```

**Status:** ✅ Ready  
**Use:** Show compatibility scores

---

## 7️⃣ XP ECONOMY

**Branch:** `figma-make-v2`  
**Path:** `supabase/migrations/` + `src/app/hooks/`

### Database Migrations:
```sql
001_initial_schema.sql ← Core tables + XP ledger
002_squad_factions.sql ← Squad system
003_remap_master_schema.sql ← Complete schema
```

### Hooks to Port:
```typescript
src/app/hooks/useSync.ts ← XP sync logic
  - useXPSync() ← +10 XP radio, +100 XP scans
  - useRadioSync() ← Radio integration
  - useGeolocationSync() ← Location tracking
```

### UI Components:
```typescript
src/app/components/vault/VaultMarket.tsx ← Level gate pattern
  - Extract blur + lock overlay
  - Extract level indicator UI
  - Extract XP badge component
```

**Status:** 🚧 Needs porting to React Router patterns  
**Size:** Database schema + hooks + UI  
**Prototype Match:** XP badges on Vault (Screen 8)

---

## 8️⃣ PERSONA SYSTEM

**Branch:** `feat/l2-sheet-architecture`  
**Path:** `src/components/persona/`

### Explore:
```bash
git checkout feat/l2-sheet-architecture
ls -la src/components/persona/
```

**Also in `figma-make-v2`:**
```bash
src/app/components/setup/PersonaSetup.tsx ← Setup flow
src/app/components/sheets/PersonaManager.tsx ← Persona switcher
```

**Prototype Match:** Persona Manager (Screen 10)

---

## 9️⃣ GLOBE SYSTEM

**Branch:** `main` (Keep current Three.js implementation)  
**Path:** `src/components/globe/`

### What Exists:
- GlobeHero.jsx ← Three.js globe
- CityPulseBar.jsx ← City navigation
- BeaconPreviewPanel.jsx ← Beacon details

**Alternative in `figma-make-v2`:**
```bash
src/app/components/globe/UnifiedGlobe.tsx ← Mapbox GL JS version
```

**Decision:** Keep main's Three.js (production-proven)  
**Prototype Match:** Globe View (Screen 1)

---

## 📐 ADDITIONAL FEATURES

### Events System
**Branch:** `main`  
**Path:** `src/components/events/`  
**Status:** ✅ Keep existing  
**Prototype Match:** Events List (Screens 6-7)

### Radio Player
**Branch:** `main`  
**Path:** `src/components/radio/`  
**File:** `ConvictPlayer.jsx`  
**Add:** XP heartbeat (+10 XP/5min) from `figma-make-v2`

### Navigation
**Branch:** `main`  
**Path:** `src/components/navigation/`  
**Status:** ✅ Keep existing  
**Style:** Match prototype bottom nav

### Profile System
**Branch:** `main` + `feat/l2-sheet-architecture`  
**Combine:** Existing profiles + L2ProfileSheet  
**Style:** Match prototype cards

---

## 🎯 CHERRY-PICK PRIORITY

### Phase 1: Core Features (Do First)
1. ✅ Messaging (95KB)
2. ✅ Marketplace (105KB)
3. ✅ Social/Ghosted (83KB)
4. ✅ L2 Sheets (94KB)

### Phase 2: Enhancements
5. ✅ SOS System (10KB)
6. ✅ XP Economy (database + hooks)
7. ✅ Matching (7KB)

### Phase 3: Polish
8. ✅ Style to match Figma prototypes
9. ✅ Add XP badges and level gates
10. ✅ Integrate sheets with routing

---

## 💡 USAGE

### To Find a Feature:
1. Search this file for the feature name
2. Note the source branch
3. Check the file paths
4. Use cherry-pick commands from `INTEGRATION_PLAN.md`

### To Cherry-Pick:
```bash
git checkout production-unified
git checkout <source-branch> -- <file-path>
git add <file-path>
git commit -m "Add <feature> from <branch>"
```

---

## 📊 STATISTICS

**Total Code to Cherry-Pick:**
- Messaging: 95KB
- Marketplace: 105KB  
- Social: 83KB
- Sheets: 94KB
- SOS: 10KB
- Matching: 7KB
- **Total: ~394KB of new features**

**Plus:**
- Database migrations (3 files)
- XP hooks (to be ported)
- UI styling (ongoing)

---

**🗺️ USE THIS MAP TO NAVIGATE THE CODEBASE 🗺️**