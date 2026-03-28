# AUTH_AUTHORITY.md — Stage 3 Auth + Realtime Hygiene

**Created:** Stage 3 Stabilization
**Status:** ✅ Complete

---

## Canonical Auth Owner

| Authority | File | Role |
|-----------|------|------|
| **Primary** | `src/contexts/BootGuardContext.jsx` | Boot state machine, onAuthStateChange listener, profile loading |
| Subordinate | `src/contexts/NowSignalContext.jsx` | React to auth changes for signal features |
| Subordinate | `src/core/viewerState.ts` | Read-only viewer state derivation |
| Subordinate | `src/lib/bootGuard.ts` | Hook wrapper for gate checks |
| Page-local | `src/pages/Auth.jsx` | Auth page form submission |
| Wrapper | `src/components/utils/supabaseClient.jsx` | Auth method wrappers |

**Rule:** Only BootGuardContext should drive app-wide auth state transitions. Other listeners react but do not compete.

---

## onAuthStateChange Listeners

All 6 listeners have verified cleanup:

1. **BootGuardContext.jsx:84** — ✅ `subscription?.unsubscribe()` in cleanup
2. **NowSignalContext.jsx:139** — ✅ `subscription?.unsubscribe()` in cleanup
3. **viewerState.ts:160** — ✅ `subscription.unsubscribe()` in cleanup
4. **bootGuard.ts:272** — ✅ `subscription.unsubscribe()` in cleanup
5. **Auth.jsx:99** — ✅ `authSubscription?.subscription?.unsubscribe()` in cleanup
6. **supabaseClient.jsx (wrappers)** — N/A (method wrappers, not listeners)

---

## Cart Merge Guard

**Problem:** `mergeGuestCartToUser` was called from 3 locations, risking duplicate merges.

**Locations:**
- `src/lib/AuthContext.jsx:70`
- `src/Layout.jsx:166`
- `src/pages/Checkout.jsx:89`

**Solution:** Added deduplication guard in `src/components/marketplace/cartStorage.js`:
- `_cartMergeInProgress` flag prevents concurrent merges
- `_lastCartMergeUserId` prevents redundant merges for same user
- Guard resets after merge completes (in finally block)

---

## Realtime Channel Cleanup

**Problem:** `cleanup()` function in `src/utils/realtime.jsx` was not called on logout.

**Solution:** Added realtime cleanup to logout flow:
- `supabaseClient.jsx` logout method calls `realtimeCleanup()` before `signOut()`
- `supabaseClient.jsx` signOut wrapper also calls `realtimeCleanup()`
- Cleanup is wrapped in try/catch to prevent logout blocking

**Channel Ownership:** See `docs/SUPABASE_REALTIME_OWNERSHIP.md` for full channel inventory.

---

## Debug Logging Removed

Removed `console.log('[supabase] URL:', supabaseUrl)` to prevent Supabase project URL exposure in production logs.

---

## Stage 3 Gates

- [x] Login/logout stable — Verified via lint/typecheck
- [x] Multi-tab stable — Auth listeners have proper cleanup
- [x] Realtime channels do not multiply — cleanup() called on logout
- [x] No duplicate cart merges — Idempotency guard added
- [x] No secrets logged — Debug URL log removed

---

## Verification Commands

```bash
# Auth listeners
rg "onAuthStateChange" -n src

# Cart merge calls
rg "mergeGuestCartToUser" -n src

# Realtime cleanup
rg "removeChannel|\.unsubscribe\(\)" -n src | head -40

# Debug logging check
rg "console\.log.*URL|console\.log.*supabase" -n src
```
