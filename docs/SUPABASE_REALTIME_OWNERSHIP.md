# HOTMESS Supabase Realtime Ownership

**Version:** 1.0  
**Date:** 2026-02-20  
**Purpose:** Enumerate all realtime channels and assign ownership + cleanup rules

> **Note:** Channel names and locations are derived from ripgrep at time of writing. Re-run verification commands before making changes.

---

## 1. Current State (Problem)

Realtime channels are created ad-hoc across 20+ locations with:
- No clear ownership
- Inconsistent cleanup (memory leaks)
- Potential duplicate subscriptions on navigation
- No centralized management for logout cleanup

---

## 2. Channel Inventory

### Globe Module Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `beacons-realtime` | `src/pages/Globe.jsx` | Beacon CRUD events | Component mount/unmount |
| `user-activities-realtime` | `src/pages/Globe.jsx` | User activity events | Component mount/unmount |
| `presence-beacons` | `src/components/globe/useRealtimeBeacons.js` | Presence beacon changes | Hook mount/unmount |
| `events-beacons` | `src/components/globe/useRealtimeBeacons.js` | Event beacon changes | Hook mount/unmount |
| `presence-count` | `src/components/globe/useRealtimeBeacons.js` | Presence count updates | Hook mount/unmount |
| `globe-activities` | `src/components/globe/ActivityStream.jsx` | Activity feed | Component mount/unmount |
| `globe-checkins` | `src/components/globe/ActivityStream.jsx` | Check-in events | Component mount/unmount |
| `globe-rightnow` | `src/components/globe/ActivityStream.jsx` | Right Now updates | Component mount/unmount |
| `globe-messages` | `src/components/globe/ActivityStream.jsx` | Message notifications | Component mount/unmount |
| `globe-orders` | `src/components/globe/ActivityStream.jsx` | Order notifications | Component mount/unmount |
| `globe-rsvps` | `src/components/globe/ActivityStream.jsx` | RSVP notifications | Component mount/unmount |
| `globe-beacons` | `src/hooks/useGlobeBeacons.js` | Beacon updates | Hook mount/unmount |

### WorldPulse Module Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `world-pulse-beacons` | `src/contexts/WorldPulseContext.jsx` | Global beacon pulse | Provider mount/logout |
| `world-pulse-checkins` | `src/contexts/WorldPulseContext.jsx` | Global check-in pulse | Provider mount/logout |

### NowSignal Module Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `now-signal-follows-{userId}` | `src/contexts/NowSignalContext.jsx` | Follow updates | Auth state change |
| `now-signal-venues-{userId}` | `src/contexts/NowSignalContext.jsx` | Venue updates | Auth state change |

### Notifications Module Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `notifications-realtime` | `src/components/notifications/NotificationCenter.jsx` | User notifications | Component mount/unmount |
| `notifications-admin-realtime` | `src/components/notifications/NotificationCenter.jsx` | Admin notifications | Component mount/unmount |

### Safety Module Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `safety-incidents` | `src/lib/safety.ts` | Safety incident alerts | Module init/logout |
| `location-share-{shareId}` | `src/components/safety/LiveLocationShare.jsx` | Live location sharing | Share start/stop |

### Chat/Messaging Module Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `ticket-chat-{threadId}` | `src/pages/tickets/TicketChat.jsx` | Ticket thread messages | Component mount/unmount |
| `typing:{channelName}` | `src/components/messaging/TypingIndicator.jsx` | Typing indicators | Component mount/unmount |
| `call-{callId}` | `src/components/video/VideoCallRoom.jsx` | Video call signaling | Call start/end |

### Business Module Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `presence-{businessId}` | `src/hooks/useBusiness.js` | Business presence | Hook mount/unmount |

### Core/Shared Channels

| Channel Name | File | Purpose | Lifecycle |
|--------------|------|---------|-----------|
| `home-release-beacons` | `src/pages/Home.jsx` | Home page beacons | Component mount/unmount |
| `realtime-nearby-invalidate` | `src/hooks/useRealtimeNearbyInvalidation.js` | Cache invalidation | Hook mount/unmount |
| `presence-changes` | `src/core/presence.ts` | Presence state changes | Module init/cleanup |
| `beacons:{table}` | `src/core/beacons.ts` | Beacon table changes | Module init/cleanup |

---

## 3. Ownership Assignment

### Owner: GlobeModule
**Channels:**
- `beacons-realtime`
- `user-activities-realtime`
- `presence-beacons`
- `events-beacons`
- `presence-count`
- `globe-*` (all globe- prefixed)
- `realtime-nearby-invalidate`

**Cleanup:** On GlobeProvider unmount (should rarely happen — globe is persistent)

### Owner: WorldPulseContext
**Channels:**
- `world-pulse-beacons`
- `world-pulse-checkins`

**Cleanup:** On provider unmount OR on logout event

### Owner: NowSignalContext
**Channels:**
- `now-signal-follows-{userId}`
- `now-signal-venues-{userId}`

**Cleanup:** On auth state change (logout) or provider unmount

### Owner: NotificationCenter
**Channels:**
- `notifications-realtime`
- `notifications-admin-realtime`

**Cleanup:** On component unmount

### Owner: SafetyModule
**Channels:**
- `safety-incidents`
- `location-share-{shareId}`

**Cleanup:** 
- `safety-incidents`: On logout
- `location-share-*`: On share stop/component unmount

### Owner: ChatModule
**Channels:**
- `ticket-chat-{threadId}`
- `typing:{channelName}`
- `call-{callId}`

**Cleanup:** On thread/call close or component unmount

### Owner: BusinessModule
**Channels:**
- `presence-{businessId}`

**Cleanup:** On hook unmount

### Owner: HomeModule (Candidate for removal)
**Channels:**
- `home-release-beacons`

**Note:** This may duplicate `beacons-realtime` or `globe-beacons`. Investigate before keeping.

### Owner: CorePresence
**Channels:**
- `presence-changes`
- `beacons:{table}`

**Cleanup:** On module cleanup (app shutdown or logout)

---

## 4. Contract D: Realtime Manager

```typescript
// src/lib/realtime.ts

import { supabase } from '@/components/utils/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ChannelOwner = 
  | 'globe'
  | 'worldPulse'
  | 'nowSignal'
  | 'notifications'
  | 'safety'
  | 'chat'
  | 'business'
  | 'core';

interface ChannelRegistration {
  channel: RealtimeChannel;
  owner: ChannelOwner;
  createdAt: number;
}

class RealtimeManager {
  private channels: Map<string, ChannelRegistration> = new Map();
  
  /**
   * Register and subscribe to a channel
   */
  subscribe(
    channelName: string,
    owner: ChannelOwner,
    configFn: (channel: RealtimeChannel) => RealtimeChannel
  ): () => void {
    // Check for duplicate
    if (this.channels.has(channelName)) {
      console.warn(`[Realtime] Channel ${channelName} already exists, owned by ${this.channels.get(channelName)?.owner}`);
      // Return no-op unsubscribe
      return () => {};
    }
    
    // Create channel
    const channel = supabase.channel(channelName);
    
    // Apply configuration (on, postgres_changes, etc.)
    const configuredChannel = configFn(channel);
    
    // Subscribe
    configuredChannel.subscribe((status) => {
      console.log(`[Realtime] ${channelName}: ${status}`);
    });
    
    // Register
    this.channels.set(channelName, {
      channel,
      owner,
      createdAt: Date.now(),
    });
    
    // Return unsubscribe function
    return () => this.unsubscribe(channelName);
  }
  
  /**
   * Unsubscribe from a specific channel
   */
  unsubscribe(channelName: string): void {
    const registration = this.channels.get(channelName);
    if (!registration) return;
    
    supabase.removeChannel(registration.channel);
    this.channels.delete(channelName);
  }
  
  /**
   * Unsubscribe all channels for a specific owner
   */
  unsubscribeAll(owner: ChannelOwner): void {
    for (const [name, registration] of this.channels) {
      if (registration.owner === owner) {
        supabase.removeChannel(registration.channel);
        this.channels.delete(name);
      }
    }
  }
  
  /**
   * Called on logout — clean up all channels
   */
  cleanup(): void {
    for (const [name, registration] of this.channels) {
      supabase.removeChannel(registration.channel);
    }
    this.channels.clear();
  }
  
  /**
   * Debug: list active channels
   */
  getActiveChannels(): Array<{ name: string; owner: ChannelOwner; age: number }> {
    const now = Date.now();
    return Array.from(this.channels.entries()).map(([name, reg]) => ({
      name,
      owner: reg.owner,
      age: now - reg.createdAt,
    }));
  }
}

export const realtimeManager = new RealtimeManager();
```

---

## 5. Usage Example

```typescript
// In GlobeProvider or useGlobeBeacons
import { realtimeManager } from '@/lib/realtime';

useEffect(() => {
  const unsubscribe = realtimeManager.subscribe(
    'presence-beacons',
    'globe',
    (channel) => channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'presence_beacons',
      }, (payload) => {
        handleBeaconChange(payload);
      })
  );
  
  return () => unsubscribe();
}, []);
```

---

## 6. Logout Cleanup

```typescript
// In BootGuardContext or AuthContext

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      // Clean up ALL realtime channels
      realtimeManager.cleanup();
    }
  });
  
  return () => subscription.unsubscribe();
}, []);
```

---

## 7. Migration Checklist

### Phase 1: Create Manager
- [ ] Create `src/lib/realtime.ts` with RealtimeManager class
- [ ] Export singleton `realtimeManager`

### Phase 2: Migrate Globe Channels
- [ ] `src/pages/Globe.jsx` — Use realtimeManager
- [ ] `src/components/globe/useRealtimeBeacons.js` — Use realtimeManager
- [ ] `src/components/globe/ActivityStream.jsx` — Use realtimeManager
- [ ] `src/hooks/useGlobeBeacons.js` — Use realtimeManager

### Phase 3: Migrate Context Channels
- [ ] `src/contexts/WorldPulseContext.jsx` — Use realtimeManager
- [ ] `src/contexts/NowSignalContext.jsx` — Use realtimeManager

### Phase 4: Migrate Feature Channels
- [ ] `src/components/notifications/NotificationCenter.jsx` — Use realtimeManager
- [ ] `src/lib/safety.ts` — Use realtimeManager
- [ ] `src/components/safety/LiveLocationShare.jsx` — Use realtimeManager
- [ ] `src/pages/tickets/TicketChat.jsx` — Use realtimeManager
- [ ] `src/components/messaging/TypingIndicator.jsx` — Use realtimeManager
- [ ] `src/components/video/VideoCallRoom.jsx` — Use realtimeManager
- [ ] `src/hooks/useBusiness.js` — Use realtimeManager

### Phase 5: Add Logout Cleanup
- [ ] Add `realtimeManager.cleanup()` call on SIGNED_OUT event

### Phase 6: Verify
- [ ] No duplicate channel warnings in console
- [ ] Channels cleaned up on logout
- [ ] No memory leaks (channel count stable during navigation)
- [ ] Globe realtime still works
- [ ] Notifications still work
- [ ] Chat typing indicators still work

---

## 8. Verification Commands

```bash
# Find all channel creations
rg "\.channel\(" -n src

# Find all subscribe calls
rg "\.subscribe\(" -n src

# Find cleanup/unsubscribe calls
rg "removeChannel|unsubscribe" -n src

# Find auth state change handlers (should call cleanup)
rg "onAuthStateChange" -n src

# Count total realtime usages
rg "\.channel\(|\.subscribe\(" -c src
```

---

## 9. Common Issues

### Channel Multiplication
**Symptom:** Console shows multiple subscriptions to same channel after navigation.  
**Cause:** Component remounts without cleanup, or duplicate subscriptions in useEffect.  
**Fix:** Use realtimeManager.subscribe() which guards against duplicates.

### Channels Not Cleaning Up
**Symptom:** Channels remain active after logout.  
**Cause:** No cleanup on SIGNED_OUT event.  
**Fix:** Add `realtimeManager.cleanup()` to auth state change handler.

### Presence Not Broadcasting
**Symptom:** User presence doesn't appear for other users.  
**Cause:** Tables not added to `supabase_realtime` publication.  
**Fix:** Run SQL to add tables to publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE presence_beacons;
ALTER PUBLICATION supabase_realtime ADD TABLE beacons;
-- etc.
```

### High CPU on Client
**Symptom:** Browser becomes slow, high memory usage.  
**Cause:** Too many active channels or duplicate subscriptions.  
**Fix:** Use `realtimeManager.getActiveChannels()` to debug, ensure cleanup.
