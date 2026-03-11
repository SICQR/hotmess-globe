# Boot Flow, Supabase Connectivity & Ghosted Messaging — Fix Documentation

**Date:** 2026-03-11  
**Branch:** `copilot/fix-boot-flow-issues`

---

## 1. Summary of Findings

### 1.1 Boot Flow (BootGuardContext)

The boot state machine (`src/contexts/BootGuardContext.jsx`) had **one logic bug** and **one React hooks anti-pattern**:

#### Bug — Missing community-gate check in error path (FIXED ✅)

**Location:** `loadProfile()`, the `else if (error)` branch (generic DB fetch error, non-PGRST116)

**Before:**
```js
} else if (error) {
  const localAge = getLocalAgeVerified();
  if (localAge) {
    setBootState(BOOT_STATES.READY);  // ⚠️ skips community gate!
  } else {
    setBootState(BOOT_STATES.NEEDS_AGE);
  }
}
```

**After:**
```js
} else if (error) {
  const localAge = getLocalAgeVerified();
  const localCommunity = getLocalCommunityAttested();
  if (localAge && localCommunity) {
    setBootState(BOOT_STATES.READY);
  } else if (localAge) {
    setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE);  // ✅ correct gate
  } else {
    setBootState(BOOT_STATES.NEEDS_AGE);
  }
}
```

**Impact:** On a transient Supabase fetch error, a user who had confirmed their age in localStorage (but had not yet completed community attestation) would be silently advanced to `READY` state, bypassing the community gate entirely.

#### Anti-pattern — `loadProfile` defined after the `useEffect` that uses it (FIXED ✅)

`loadProfile` was a plain `async` function defined **after** the `useEffect` that called it. The `useEffect` had an empty `[]` deps array, meaning it captured a stale closure reference. Additionally, `refetchProfile` — a `useCallback` — did not list `loadProfile` in its dependency array, a React hooks rules violation.

**Fix:** `loadProfile` was hoisted to a `useCallback([])` (stable reference — it only closes over stable `useState` setters and the external `supabase` singleton) and moved **before** the `useEffect` that depends on it. The `useEffect` now lists `[loadProfile]` in its deps. `refetchProfile` now correctly lists `[session?.user?.id, session?.user?.email, loadProfile]`.

---

### 1.2 Supabase Connectivity

#### Navigator Lock deadlock (documented, already fixed in prior commit)

`supabase-js v2` holds the Navigator Lock during `_initialize()` → `_notifyAllSubscribers()`. If `onAuthStateChange` callbacks `await` anything that calls `getSession()` (such as `loadProfile()`), a circular lock acquisition deadlock occurs, leaving the app stuck at `LOADING` forever.

The fix is already in place: the `onAuthStateChange` callback fires `loadProfile()` with `void` (no `await`), allowing the lock to be released before `loadProfile()` acquires it for its own `getSession()` call.

#### Timeout safeguards (existing, confirmed working)

| Timeout | Value | Purpose |
|---------|-------|---------|
| `bootTimeout` | 10 s | Never leave user on LOADING if `initAuth()` hangs |
| `profileTimeout` | 8 s | Never leave user on LOADING if `loadProfile()` hangs |

Both timeouts fall back to `UNAUTHENTICATED` or `NEEDS_ONBOARDING`/`NEEDS_AGE` based on localStorage state.

---

### 1.3 Ghosted Grid — Two-User Messaging Path

The complete path for two users to discover and message each other:

```
User A: /ghosted → tap profile card
        → openSheet('profile', { email: userB.email })     [always allowed]
        → L2ProfileSheet opens

        → tap "Message" button
        → openSheet('chat', { toUid: userB.id, title: ... }) [allowed: profile in stack]
        → L2ChatSheet opens

        → resolves UID → email via /api/resolve-user-email
        → finds or creates chat_threads row
        → inserts message into messages table
        → Supabase Realtime pushes INSERT event to User B
```

**User B receives:**
- Supabase Realtime subscription on `messages:thread:{id}` notifies immediately
- Push notification via `pushNotify()` → `/api/notify-push` Edge Function (if VAPID keys set)

#### Sheet policy (gating)

Chat, video, and travel sheets are **gated**: they only open from `/ghosted` (or when a `profile` sheet is already in the stack). See `src/lib/sheetPolicy.ts`.

---

## 2. Files Changed

| File | Change |
|------|--------|
| `src/contexts/BootGuardContext.jsx` | Fix community-gate bug; hoist `loadProfile` to `useCallback([])`; add `loadProfile` to `useEffect` and `refetchProfile` deps |
| `e2e/messaging.spec.ts` | Rewrite to test actual `/ghosted` routes (old tests referenced non-existent `/social`, `/messages`, `/chat` pages) |
| `src/__tests__/bootGuard.test.ts` | **New** — 22 unit tests for boot state machine transitions |
| `src/__tests__/ghostedChat.test.ts` | **New** — 17 unit tests for ghosted chat thread resolution, message send guard, and sheet policy |

---

## 3. Test Coverage Added

### Unit tests (`src/__tests__/bootGuard.test.ts`)

| Test group | Tests | What is verified |
|------------|-------|-----------------|
| READY state | 3 | All gates passed → READY; localStorage fills missing DB fields |
| NEEDS_AGE | 3 | Unverified age → NEEDS_AGE; null profile; generic fetch error |
| NEEDS_ONBOARDING | 5 | Age ok but onboarding not done; empty display_name; new user (PGRST116) |
| NEEDS_COMMUNITY_GATE | 2 | Age + onboarding done, no community attestation |
| Fetch error fallback | 3 | localStorage governs state on DB error |
| localStorage parsing | 6 | `'true'`, `'1'`, `'TRUE'` → verified; `null`, `'false'`, `''` → not verified |

### Unit tests (`src/__tests__/ghostedChat.test.ts`)

| Test group | Tests | What is verified |
|------------|-------|-----------------|
| Thread resolution | 6 | Existing thread found; reversed email order works; new thread created |
| Message send guard | 5 | Empty text blocked; null sender blocked; isSending blocked |
| Sheet policy (two-user journey) | 6 | Full `/ghosted` → profile → chat path works; blocked outside ghosted |

---

## 4. Boot State Machine Reference

```
supabase.auth.getSession()
    │
    ├── error / no session ──────────────────────────── UNAUTHENTICATED
    │
    └── session found
            │
            └── loadProfile(userId)
                    │
                    ├── PGRST116 (no profile row)
                    │       ├── localAge=false ─── NEEDS_AGE
                    │       └── localAge=true ──── NEEDS_ONBOARDING
                    │
                    ├── other DB error
                    │       ├── !localAge ───────── NEEDS_AGE
                    │       ├── localAge only ───── NEEDS_COMMUNITY_GATE  ← BUG FIXED
                    │       └── localAge+community  READY
                    │
                    └── profile found
                            ├── !age_verified ───── NEEDS_AGE
                            ├── !onboarding_complete NEEDS_ONBOARDING
                            ├── !display_name ────── NEEDS_ONBOARDING (legacy guard)
                            ├── !community_at ────── NEEDS_COMMUNITY_GATE
                            └── all ok ──────────── READY
```

---

## 5. Two-User Grindr-style Journey: Prerequisites

For two users to discover and message each other end-to-end:

| Requirement | Status |
|-------------|--------|
| Both users complete onboarding (age → community → profile) | ✅ Boot flow handles this |
| Both users appear in `/api/profiles` response | ✅ Fetches from `profiles` table |
| Profile cards tap to `L2ProfileSheet` | ✅ `onOpenProfile` in GhostedMode |
| "Message" button in profile sheet | ✅ `openSheet('chat', { toUid })` |
| UID→email resolution for chat | ✅ `/api/resolve-user-email` |
| `chat_threads` row creation on first message | ✅ `handleSend()` in L2ChatSheet |
| Realtime message delivery | ✅ Supabase Realtime subscription per thread |
| Push notification on new message | ⚠️ Requires VAPID keys in Supabase Edge Function secrets |
| `SUPABASE_SERVICE_ROLE_KEY` in GitHub CI secrets | ⚠️ Required for integration tests |

The only remaining blockers are environment configuration (VAPID keys for push notifications, Supabase secrets for CI integration tests) — not code issues.
