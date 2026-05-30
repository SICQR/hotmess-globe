# HOTMESS Globe — Stabilization RUNLOG

> Session tracking for stabilization work. Resume from here if interrupted.

---

## 2026-02-20T02:35:00Z — Stage 0 Documentation Complete

**Branch:** `stabilization/2026-02-20-phase0`

### Stage 0 — COMPLETED ✅

All required documentation created:

1. ✅ `docs/OS_REMAP_BLUEPRINT.md` — Ring model architecture, provider order, z-index layers
2. ✅ `docs/DUPLICATION_REMAP_INDEX.md` — All duplication clusters with migration plans
3. ✅ `docs/ROUTING_COLLISION_REPORT.md` — Route duplicates, window.location.href migrations
4. ✅ `docs/PROFILE_MAP_AUTHORITY.md` — Profile contract, consolidation plan
5. ✅ `docs/MARKET_ARCHITECTURE.md` — MESSMARKET unification (Shopify + Preloved + Tickets)
6. ✅ `docs/SUPABASE_REALTIME_OWNERSHIP.md` — Channel inventory, RealtimeManager contract

### OS Truth Summary

**The HOTMESS codebase requires 4 key architectural fixes:**

1. **Navigation Authority (HIGH):** 40+ files use `window.location.href` causing hard reloads. Must create `nav.go()` wrapper and migrate all internal navigation to React Router.

2. **Overlay Authority (HIGH):** SheetProvider is mounted inside Layout.jsx causing sheet state loss on route changes. Must move SheetProvider outside Layout, directly under Router.

3. **Auth Listener Hygiene (MEDIUM):** 6 files contain `onAuthStateChange` listeners. BootGuardContext is the primary candidate owner; others should become subordinate (react to user state changes via useEffect).

4. **Realtime Channel Ownership (MEDIUM):** 20+ channels created without centralized cleanup. Must create RealtimeManager singleton with owner tracking and logout cleanup.

**Secondary consolidations:**
- Profile: 15+ components → unified `openProfile()` contract
- Market: Shopify + Preloved + Tickets → unified MarketItem interface
- Sheets: OSProvider + SheetContext → clarify ownership (SheetContext for stack, OSProvider for FSM/interrupts)

---

### Ready for Stage 1

**GATE PASSED:** Stage 0 documentation complete.

**Next action:** Begin Stage 1 — Router Collision Fix + Nav Contract

Stage 1 tasks:
1. Remove duplicate route declarations in App.jsx
2. Create `src/lib/nav.ts` with `useNav()` hook
3. Replace high-priority `window.location.href` assignments (auth flow first)
4. Verify: tab switch does not reload, back button is deterministic

---

## Key Findings

### Navigation Authority Conflicts

Multiple navigation mechanisms coexist:
1. React Router (primary) — `/src/App.jsx`
2. SheetContext URL sync — `?sheet=` params
3. Direct `window.location.href` assignments — found in 40+ locations

### Auth Listener Multiplication Risk

Files containing `onAuthStateChange` (6):
- `src/contexts/BootGuardContext.jsx` — Primary candidate
- `src/contexts/NowSignalContext.jsx` — Subordinate
- `src/core/viewerState.ts` — Subordinate
- `src/lib/bootGuard.ts` — Candidate to delete (duplicate)
- `src/pages/Auth.jsx` — Keep (page-specific)
- `src/components/utils/supabaseClient.jsx` — Wrapper

### Realtime Channel Count

25+ unique channel subscriptions found across codebase:
- Globe module: 12 channels
- WorldPulse: 2 channels
- NowSignal: 2 channels
- Notifications: 2 channels
- Safety: 2 channels
- Chat: 3 channels
- Business: 1 channel
- Core: 2 channels

### Sheet System Mount Issue

`SheetProvider` is mounted inside `Layout.jsx`, not at the root. This means:
- Sheets may lose state on route changes
- Sheet stack is not preserved across navigation
- URL sync (`?sheet=`) may conflict with route changes

**Fix:** Move SheetProvider to App.jsx, directly under Router.

---

## Files Created This Session

| File | Action | Status |
|------|--------|--------|
| `docs/OS_REMAP_BLUEPRINT.md` | Created | ✅ |
| `docs/DUPLICATION_REMAP_INDEX.md` | Created + Fixed | ✅ |
| `docs/ROUTING_COLLISION_REPORT.md` | Created | ✅ |
| `docs/PROFILE_MAP_AUTHORITY.md` | Created | ✅ |
| `docs/MARKET_ARCHITECTURE.md` | Created | ✅ |
| `docs/SUPABASE_REALTIME_OWNERSHIP.md` | Created | ✅ |
| `docs/RUNLOG.md` | Updated | ✅ |
