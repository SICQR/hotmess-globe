# Boot Flow, Supabase Connectivity & Ghosted Messaging — Fix Documentation

**Last updated:** 2026-03-11  
**Branch:** `copilot/fix-boot-flow-logic-issues`

---

## 1. Summary of Changes

This document covers four interconnected fixes:

| # | Fix | File |
|---|-----|------|
| 1 | Community-gate bypass in `loadProfile` error path | `src/contexts/BootGuardContext.jsx` |
| 2 | `loadProfile` hooks ordering violation (stale closure) | `src/contexts/BootGuardContext.jsx` |
| 3 | Exponential-backoff retry for transient Supabase errors | `src/contexts/BootGuardContext.jsx` |
| 4 | Confirmation button stuck state on community gate | `src/pages/OnboardingGate.jsx` |

---

## 2. Bug Details

### 2.1 Community-Gate Bypass (CRITICAL)

**Location:** `loadProfile()`, the `else if (error)` branch (generic DB fetch error, non-PGRST116)

**Root cause:** On any non-PGRST116 fetch error, a user with `localAge=true` but no `localCommunity`
was advanced to `NEEDS_ONBOARDING` instead of `NEEDS_COMMUNITY_GATE`. This allowed a user who had
verified their age (localStorage) but had never completed community attestation to reach the onboarding
flow and potentially bypass the community gate entirely.

```js
// BEFORE — community gate silently bypassed on DB error
} else if (error) {
  const localAge = getLocalAgeVerified();
  if (localAge) {
    setBootState(BOOT_STATES.NEEDS_ONBOARDING); // ⚠️ skips community gate!
  } else {
    setBootState(BOOT_STATES.NEEDS_AGE);
  }
}

// AFTER — full three-way check, same logic as timeout fallback
} else if (error) {
  const localAge = getLocalAgeVerified();
  const localCommunity = getLocalCommunityAttested();
  if (localAge && localCommunity) {
    setBootState(BOOT_STATES.READY);              // ✅ both gates confirmed locally
  } else if (localAge) {
    setBootState(BOOT_STATES.NEEDS_COMMUNITY_GATE); // ✅ community gate still required
  } else {
    setBootState(BOOT_STATES.NEEDS_AGE);           // ✅ age gate required
  }
}
```

The same three-way check is now applied in:
- The `else if (error)` branch (was the bug)
- The `catch` block (was the same bug, now fixed)
- The timeout fallback (was already correct — used as reference)

---

### 2.2 `loadProfile` Hooks Ordering Violation

**Root cause:** `loadProfile` was a plain `async` function defined **after** the `useEffect` that
called it. In React, a `useEffect` with `[]` deps captures all variables at the time of first render.
Since `loadProfile` was not a `useCallback`, every render created a new function reference. The
`useEffect` closure captured the first-render reference while `refetchProfile` (a `useCallback`)
depended on a stale reference that never updated.

**Fix:** `loadProfile` is now a `useCallback([])` (stable reference — safe because it only closes over
React `useState` setters and module-level singletons, both of which are guaranteed stable). It is
defined **before** the `useEffect` that uses it. The `useEffect` now lists `[loadProfile]` in its
deps, and `refetchProfile` includes `loadProfile` in its dependency array.

```js
// BEFORE (anti-pattern)
useEffect(() => {
  // ... calls loadProfile() via stale closure
}, []);

const loadProfile = async (userId) => { ... }; // defined AFTER useEffect ⚠️

const refetchProfile = useCallback(async () => {
  await loadProfile(...);
}, [session?.user?.id, session?.user?.email]); // loadProfile missing from deps ⚠️

// AFTER (correct)
const loadProfile = useCallback(async (userId) => { ... }, []); // stable, defined first ✅

useEffect(() => {
  // ... calls loadProfile()
}, [loadProfile]); // loadProfile in deps ✅

const refetchProfile = useCallback(async () => {
  await loadProfile(...);
}, [session?.user?.id, loadProfile]); // loadProfile in deps ✅
```

---

### 2.3 Exponential-Backoff Retry for Transient Supabase Errors

**Root cause:** A single transient network error (e.g., Supabase cold start, brief connectivity loss)
would immediately fall through to the error path, potentially leaving a returning user stuck on an
incorrect boot state.

**Fix:** `fetchWithRetry()` helper wraps the Supabase profile query with up to 3 attempts, applying
exponential backoff (300 ms, 600 ms). PGRST116 (no-row) errors are never retried (they're definitive).

```js
async function fetchWithRetry(queryFn, maxAttempts = 3, baseDelayMs = 300) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await queryFn();
    if (!result.error || result.error.code === 'PGRST116') return result;
    if (attempt === maxAttempts) return result;
    const delay = baseDelayMs * 2 ** (attempt - 1);
    await new Promise((r) => setTimeout(r, delay));
  }
}
```

---

### 2.4 Confirmation Button Stuck State

**Root cause (primary):** `handleCommunityConfirm` in `OnboardingGate` called `completeOnboarding()`
and then `navigate('/')`. If `completeOnboarding()` failed (DB error), it returned `false` without
calling `refetchProfile()`. The BootGuard remained in `NEEDS_COMMUNITY_GATE`, and `BootRouter` re-rendered
`OnboardingGate` — so the user appeared stuck.

**Root cause (secondary):** The `useEffect` in `OnboardingGate` did not include
`profile?.community_attested_at` in its dependency array. If `onboarding_complete` was already `true`
and only `community_attested_at` changed, the effect never re-ran to navigate away from the gate.

**Fix:**
1. `handleCommunityConfirm` now calls `refetchProfile()` directly (not via `completeOnboarding`)
   so the BootGuard always sees the updated state — even on a DB error, because `localStorage` was
   already set as a fallback at the top of the function.
2. `profile?.community_attested_at` added to the `useEffect` dependency array.

```js
// BEFORE
const handleCommunityConfirm = useCallback(async () => {
  ...
  await completeOnboarding().catch(...); // if this fails, refetchProfile not called ⚠️
  navigate('/');                          // BootGuard still in NEEDS_COMMUNITY_GATE ⚠️
}, [session?.user?.id, completeOnboarding, navigate]);

// AFTER
const handleCommunityConfirm = useCallback(async () => {
  localStorage.setItem('hm_community_attested_v1', 'true'); // fallback first
  await supabase.from('profiles').update({ community_attested_at: ... });
  await refetchProfile().catch(...); // always refetch, even on DB error ✅
  navigate('/');                      // BootGuard is now READY (localStorage fallback) ✅
}, [session?.user?.id, refetchProfile, navigate]);
```

---

## 3. Boot State Machine (Full Reference)

```
supabase.auth.getSession()
    │
    ├── error / no session ───────────────────────────── UNAUTHENTICATED
    │
    └── session found
            │
            └── loadProfile(userId)
                    │
                    ├── PGRST116 (no profile row)
                    │       ├── localAge=false ──── NEEDS_AGE
                    │       └── localAge=true ───── NEEDS_ONBOARDING
                    │
                    ├── other DB error (after 3 retries)
                    │       ├── !localAge ──────────── NEEDS_AGE
                    │       ├── localAge only ──────── NEEDS_COMMUNITY_GATE  ← BUG FIXED
                    │       └── localAge+community ─── READY
                    │
                    ├── exception thrown
                    │       ├── !localAge ──────────── NEEDS_AGE
                    │       ├── localAge only ──────── NEEDS_COMMUNITY_GATE  ← BUG FIXED
                    │       └── localAge+community ─── READY
                    │
                    └── profile found
                            ├── !age_verified ──────── NEEDS_AGE
                            ├── !onboarding_complete ── NEEDS_ONBOARDING
                            ├── !display_name ──────── NEEDS_ONBOARDING (legacy guard)
                            ├── !community_at ──────── NEEDS_COMMUNITY_GATE
                            └── all ok ─────────────── READY
```

### localStorage fallback keys

| Key | Value | Meaning |
|-----|-------|---------|
| `hm_age_confirmed_v1` | `'true'` | User confirmed age locally |
| `hm_community_attested_v1` | `'true'` | User completed community attestation |

Both keys are cleared on `SIGNED_OUT` via `clearHotmessStorage()`.

---

## 4. Navigator Lock Deadlock (Pre-existing, Documented)

`supabase-js v2` holds the Navigator Lock during `_initialize()` → `_notifyAllSubscribers()`.
If an `onAuthStateChange` callback `await`s anything that calls `getSession()` (such as `loadProfile`),
a circular lock acquisition deadlock occurs, leaving the app stuck at `LOADING` forever.

The fix (already in place since a prior commit): the `onAuthStateChange` callback fires
`loadProfile()` with `void` (no `await`), allowing the lock to release before `loadProfile()`
acquires it for its own `getSession()` call.

```js
// DO NOT CHANGE THIS PATTERN
if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  setSession(newSession);
  void loadProfile(newSession.user.id); // ← no await
}
```

---

## 5. Ghosted Messaging Flow

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

### Sheet policy

Chat, video, and travel sheets are **gated**: they only open from `/ghosted` (or when a `profile`
sheet is already in the stack). Any other caller gets a toast and the sheet is blocked.
See `src/lib/sheetPolicy.ts` and `canOpenSheet()`.

### E2E prerequisites for two-user messaging tests

| Requirement | Status |
|-------------|--------|
| Both users complete onboarding → community gate | ✅ Boot flow handles this |
| Profile cards → `L2ProfileSheet` | ✅ `onOpenProfile` in GhostedMode |
| "Message" button → `L2ChatSheet` | ✅ `openSheet('chat', { toUid })` |
| UID → email resolution | ✅ `/api/resolve-user-email` |
| `chat_threads` creation on first message | ✅ `handleSend()` in L2ChatSheet |
| Realtime delivery | ✅ Supabase Realtime subscription per thread |
| Push notification | ⚠️ Requires VAPID keys in Supabase Edge Function secrets |
| CI integration tests | ⚠️ Requires `SUPABASE_SERVICE_ROLE_KEY` in GitHub CI secrets |

---

## 6. Test Coverage

### Unit tests (`src/__tests__/bootGuard.test.tsx`)

| # | Scenario | Expected state |
|---|----------|----------------|
| 1 | No session | `UNAUTHENTICATED` |
| 2 | PGRST116 + no localStorage | `NEEDS_AGE` |
| 3 | PGRST116 + localAge | `NEEDS_ONBOARDING` |
| 4 | Profile: `age_verified=false` | `NEEDS_AGE` |
| 5 | Profile: `onboarding_complete=false` | `NEEDS_ONBOARDING` |
| 6 | Profile: `display_name=''` | `NEEDS_ONBOARDING` |
| 7 | Profile: no `community_attested_at`, no localStorage | `NEEDS_COMMUNITY_GATE` |
| 8 | Fully complete profile | `READY` |
| 9 | DB error + no localStorage | `NEEDS_AGE` |
| 10 | DB error + localAge only | `NEEDS_COMMUNITY_GATE` ← **bug fix verified** |
| 11 | No `community_attested_at` in DB + localStorage flag | `READY` |
| 12 | DB error + localAge + localCommunity | `READY` |
| 13 | Exception + localAge only | `NEEDS_COMMUNITY_GATE` ← **bug fix verified** |
| 14 | Exception + localAge + localCommunity | `READY` |
| 15 | Transient error on attempt 1, success on attempt 2 | `READY` ← **retry verified** |

### E2E tests (`e2e/messaging.spec.ts`)

Tests have been rewritten to target `/ghosted` (the actual social route) instead of the
non-existent `/social`, `/messages`, `/chat`, `/connect`, `/profiles`, `/squad-chat`, `/community`
routes that the original tests used.

| Suite | Test |
|-------|------|
| Ghosted Grid | `/ghosted` loads without errors |
| Ghosted Grid | `/ghosted` shows grid or auth prompt |
| Ghosted Grid | No age-gate redirect with bypass flags |
| Ghosted Grid | Client-side navigation renders without crash |
| Sheet policy | `?sheet=chat` on `/ghosted` handled gracefully |
| Sheet policy | `?sheet=chat` on non-ghosted route handled gracefully |
| Boot-flow bypass | Without flags, `/ghosted` redirects to a gate |
| Boot-flow bypass | With both flags, `/ghosted` skips community gate |

---

## 7. Debugging Guide

### Enabling verbose boot logs

```bash
VITE_BOOT_DEBUG=true npm run dev
```

All `[BootGuard]` log lines are suppressed in production. They show:
- Session acquisition result
- Profile fetch attempts and retry delays
- State transitions with reason

### Common stuck-at-LOADING causes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Stuck on LOADING > 10s | `initAuth` hung | Boot timeout forces recovery |
| Stuck on LOADING > 8s after session found | `loadProfile` hung | Profile timeout forces recovery |
| Stuck in NEEDS_COMMUNITY_GATE after confirm | `refetchProfile` not called | Fixed in this PR |
| READY but immediately back to gate | `navigate('/')` fired before state update | Fixed in this PR |
| App stuck at LOADING forever | Navigator Lock deadlock | Never `await loadProfile()` in `onAuthStateChange` |
