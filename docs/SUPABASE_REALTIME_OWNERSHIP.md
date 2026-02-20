# Supabase Realtime Ownership
**Version:** 1.0  
**Date:** 2026-02-20  
**Status:** Stage 1 intelligence — audit only, defines Contract D

---

## Purpose

Enumerate every `onAuthStateChange` listener and every Supabase realtime channel subscription. Assign each to one owning module with lifecycle and cleanup rules.

---

## 1. `onAuthStateChange` Listener Registry

| # | File | Line | Role | Cleanup | Notes |
|---|------|------|------|---------|-------|
| 1 | `src/contexts/BootGuardContext.jsx` | 84 | **Canonical boot FSM** — drives LOADING → READY states | ✅ `subscription.unsubscribe()` in useEffect cleanup | **Primary authority** |
| 2 | `src/pages/Auth.jsx` | 98 | Refreshes UI on sign-in / sign-up complete | ✅ cleanup returned | Subordinate — reads `event` type only |
| 3 | `src/lib/bootGuard.ts` | 272 | Standalone utility — forces page refresh on auth change | ✅ cleanup returned | **Potentially unused at runtime** — verify no runtime mount |
| 4 | `src/core/viewerState.ts` | 160 | Updates internal viewer state singleton | ✅ cleanup returned | Subordinate — may be redundant with BootGuardContext |
| 5 | `src/contexts/NowSignalContext.jsx` | 139 | Re-subscribes realtime channels when session changes | ✅ cleanup returned | Subordinate — acceptable with cleanup |

### Rules for auth listeners

1. **`BootGuardContext` is the only boot authority**. All other listeners are subordinate and must not modify boot state.
2. Before Stage 4: audit whether `bootGuard.ts` (listener #3) is mounted at runtime. If it is not instantiated, no action needed; if it is, remove it.
3. All subordinate listeners must unsubscribe on component unmount. This is currently done correctly for all 5 listeners.
4. No listener may call `mergeGuestCartToUser` — that is owned by `AuthContext` (Ring 1).

---

## 2. Realtime Channel Registry

### Legend
- **Owner**: the component/module that creates and must clean up this channel.
- **Cleanup**: ✅ = has `supabase.removeChannel(channel)` or `.unsubscribe()` in cleanup; ❌ = missing or unverified.
- **Risk**: ⚠️ = potential multiplication on re-render or navigation.

---

### 2.1 Globe / Beacon channels

| Channel name | File | Table | Owner | Cleanup | Risk |
|-------------|------|-------|-------|---------|------|
| `beacons-realtime` | `src/pages/Globe.jsx:104` | `beacons` | Globe page | ✅ | ⚠️ Overlaps with `globe-beacons` and `presence-beacons` |
| `user-activities-realtime` | `src/pages/Globe.jsx:164` | `right_now_status` | Globe page | ✅ | OK |
| `presence-beacons` | `src/components/globe/useRealtimeBeacons.js:126` | `beacons` | Globe module | ✅ | ⚠️ Same table as `beacons-realtime` — possible duplication |
| `events-beacons` | `src/components/globe/useRealtimeBeacons.js:155` | `events` | Globe module | ✅ | OK |
| `presence-count` | `src/components/globe/useRealtimeBeacons.js:225` | `presence` | Globe module | ✅ | OK |
| `globe-beacons` | `src/hooks/useGlobeBeacons.js:107` | `beacons` | Globe module (hook) | ✅ | ⚠️ Third subscription to `beacons` table |
| `globe-activities` | `src/components/globe/ActivityStream.jsx:350` | unknown | Globe UI | ❌ verify | ⚠️ |
| `globe-checkins` | `src/components/globe/ActivityStream.jsx:371` | `user_checkins` | Globe UI | ❌ verify | OK |
| `globe-rightnow` | `src/components/globe/ActivityStream.jsx:389` | `right_now_status` | Globe UI | ❌ verify | ⚠️ Overlaps with `user-activities-realtime` |
| `globe-messages` | `src/components/globe/ActivityStream.jsx:412` | messages | Globe UI | ❌ verify | OK |
| `globe-orders` | `src/components/globe/ActivityStream.jsx:428` | orders | Globe UI | ❌ verify | OK |
| `globe-rsvps` | `src/components/globe/ActivityStream.jsx:444` | `event_rsvps` | Globe UI | ❌ verify | OK |

**Globe target (Stage 4):** Merge `beacons-realtime` (Globe.jsx), `presence-beacons` (useRealtimeBeacons.js), and `globe-beacons` (hooks/useGlobeBeacons.js) into a single channel owned by one hook (`useRealtimeBeacons`). Confirm `ActivityStream` cleanup.

---

### 2.2 Ambient / WorldPulse channels

| Channel name | File | Table | Owner | Cleanup | Risk |
|-------------|------|-------|-------|---------|------|
| `world-pulse-beacons` | `src/contexts/WorldPulseContext.jsx` | `beacons` | `WorldPulseContext` | ✅ | Intentional — anonymised; different purpose from globe channels |
| `world-pulse-checkins` | `src/contexts/WorldPulseContext.jsx` | `user_checkins` | `WorldPulseContext` | ✅ | OK |

**Note:** These are intentionally separate from Globe channels — they drive the ambient atmosphere (anonymised, abstract), not the interactive beacon map. Keep as-is.

---

### 2.3 Social / Signal channels

| Channel name | File | Table/event | Owner | Cleanup | Risk |
|-------------|------|-------------|-------|---------|------|
| `now-signal-follows-{userId}` | `src/contexts/NowSignalContext.jsx` | `user_follows` | `NowSignalContext` | ✅ | OK — user-scoped key |
| `now-signal-venues-{userId}` | `src/contexts/NowSignalContext.jsx` | venue events | `NowSignalContext` | ✅ | OK — user-scoped key |
| `presence-changes` | `src/core/presence.ts:255` | `presence` | Presence utility | ✅ | ⚠️ Overlaps with `presence-count` |

**Stage 4 target:** Check if `presence.ts` and `useRealtimeBeacons.js` subscribe to the same `presence` table. If so, merge into one channel.

---

### 2.4 Notification channels

| Channel name | File | Table | Owner | Cleanup | Risk |
|-------------|------|-------|-------|---------|------|
| `notifications-realtime` | `src/components/notifications/NotificationCenter.jsx` | unknown | NotificationCenter | ❌ verify | ⚠️ Component mounts on every Layout render |
| `notifications-admin-realtime` | `src/components/notifications/NotificationCenter.jsx` | unknown | NotificationCenter | ❌ verify | ⚠️ Admin-only channel mounted for all users? |

**Stage 4 target:** Verify cleanup. Gate admin channel behind role check before subscription.

---

### 2.5 Messaging / Communication channels

| Channel name | File | Table/event | Owner | Cleanup | Risk |
|-------------|------|-------------|-------|---------|------|
| `typing:{channelName}` | `src/components/messaging/TypingIndicator.jsx` | broadcast | TypingIndicator | ✅ (`channelRef.current`) | OK — stable key |
| `ticket-chat-{threadId}` | `src/pages/tickets/TicketChat.jsx` | `ticket_chat_messages` | TicketChat page | ✅ verify | OK — thread-scoped |
| `call-{callId}` | `src/components/video/VideoCallRoom.jsx` | broadcast | VideoCallRoom | ✅ verify | OK — call-scoped |

---

### 2.6 Safety channels

| Channel name | File | Table | Owner | Cleanup | Risk |
|-------------|------|-------|-------|---------|------|
| `safety-incidents` | `src/lib/safety.ts:228` | `safety_incidents` | Safety utility | ✅ verify | ⚠️ Admin-only data — verify RLS prevents leaking |
| `location-share-{id}` | `src/components/safety/LiveLocationShare.jsx` | broadcast | LiveLocationShare | ✅ (`channelRef.current`) | OK — session-scoped |

---

### 2.7 Business / other channels

| Channel name | File | Table/event | Owner | Cleanup | Risk |
|-------------|------|-------------|-------|---------|------|
| `presence-{businessId}` | `src/hooks/useBusiness.js:88` | presence broadcast | useBusiness hook | ✅ verify | OK — business-scoped |
| `realtime-nearby-invalidate` | `src/hooks/useRealtimeNearbyInvalidation.js:20` | `beacons` (insert) | Nearby hook | ✅ verify | ⚠️ Another `beacons` table subscriber |
| `home-release-beacons` | `src/pages/Home.jsx` | `beacons` | Home page | ✅ verify | ⚠️ Another `beacons` table subscriber |
| `beacons:{table}` | `src/core/beacons.ts:256` | `Beacon`/`beacons` | Beacons utility | ✅ verify | ⚠️ Table name varies (dual-cased) |

---

## 3. Collision Summary

### Critical: `beacons` table over-subscribed

The following channels ALL subscribe to the `beacons` (or `Beacon`) table:

1. `beacons-realtime` — `Globe.jsx`
2. `presence-beacons` — `useRealtimeBeacons.js`
3. `globe-beacons` — `hooks/useGlobeBeacons.js`
4. `world-pulse-beacons` — `WorldPulseContext` (intentional, anonymised)
5. `realtime-nearby-invalidate` — `useRealtimeNearbyInvalidation.js`
6. `home-release-beacons` — `Home.jsx`
7. `beacons:{table}` — `core/beacons.ts`

**Channels 1–3 are direct duplicates** and must be consolidated into one.
Channels 5–7 may have valid distinct purposes but need audit.
Channel 4 (`WorldPulseContext`) is intentionally separate.

### Moderate: `presence` table over-subscribed

1. `presence-count` — `useRealtimeBeacons.js`
2. `presence-changes` — `core/presence.ts`

Both subscribe to `presence` table. Consolidate or confirm distinct purposes.

### Moderate: `right_now_status` table over-subscribed

1. `user-activities-realtime` — `Globe.jsx`
2. `globe-rightnow` — `ActivityStream.jsx`

Both subscribe to what appears to be the right-now status table.

---

## 4. Target Ownership Model (Contract D)

After Stage 4:

| Domain | Owner module | Channels | Notes |
|--------|-------------|---------|-------|
| Beacon pins on map | `useRealtimeBeacons.js` | ONE `beacons` channel | Merged from 3 subscribers |
| Ambient globe atmosphere | `WorldPulseContext` | `world-pulse-beacons`, `world-pulse-checkins` | Keep — different purpose |
| Presence/activity stream | `ActivityStream.jsx` | `globe-rightnow` ONLY | Merge `user-activities-realtime` into this |
| Nearby invalidation | `useRealtimeNearbyInvalidation.js` | Reuse `useRealtimeBeacons` subscription | Remove separate channel |
| Social signals | `NowSignalContext` | `now-signal-follows-*`, `now-signal-venues-*` | Keep |
| Presence tracking | `core/presence.ts` | ONE `presence` channel | Merge `presence-count` |
| Notifications | `NotificationCenter.jsx` | `notifications-realtime` | Verify cleanup; gate admin channel |
| Chat | `TypingIndicator`, `TicketChat` | Per-thread channels | OK |
| Safety | `src/lib/safety.ts` | `safety-incidents` | Verify admin-only RLS |
| Business | `useBusiness.js` | Per-business channels | OK |

---

## 5. Lifecycle Rules

### On mount

- Each owning hook/component subscribes **once**.
- Channel key must include a stable ID (user ID, thread ID, business ID) where relevant to prevent cross-user subscription.
- Use a `ref` or `useEffect` with stable deps to prevent re-subscription on re-render.

### On unmount

- `supabase.removeChannel(channel)` must be called in the `useEffect` cleanup function.
- If the owner is a context (like `WorldPulseContext`), cleanup happens when the context unmounts (app close/refresh) — acceptable.

### On logout

1. `BootGuardContext` receives `SIGNED_OUT` event via `onAuthStateChange`.
2. Boot state transitions back to `UNAUTHENTICATED`.
3. Each module that has auth-gated channels must react to `UNAUTHENTICATED` and call `removeChannel`.
4. `NowSignalContext` already does this correctly (re-subscribes on auth change).
5. `Globe.jsx` does NOT currently gate channels on auth — audit required.

### On login

1. `BootGuardContext` transitions to `READY`.
2. Modules subscribe once in `useEffect(() => { ... }, [session])`.
3. Stable deps prevent double-subscribe.

---

## 6. Definition of Done (Stage 4 Gate)

- [ ] `beacons` table has ONE owning channel per scope (Globe map vs WorldPulse are separate scopes — OK)
- [ ] `presence` table has ONE owning channel
- [ ] `right_now_status` has ONE owning channel
- [ ] All `ActivityStream.jsx` channels have verified cleanup
- [ ] `NotificationCenter.jsx` channels have verified cleanup; admin channel gated by role
- [ ] `Globe.jsx` channels close on logout
- [ ] No channel opens more than once per navigation loop (verify with browser dev tools)
- [ ] Auth listener count remains 5 or fewer, all with cleanup
