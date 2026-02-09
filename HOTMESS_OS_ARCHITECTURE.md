# HOTMESS Globe OS Architecture

## 🎯 What Changed

HOTMESS has been transformed from a **page-based website** into a **state-driven spatial operating system**.

**Before:**
- 112 separate page files
- Page-based navigation
- UI-only state
- Manual auth checks everywhere

**After:**
- Single OS runtime with boot guards
- Mode-based navigation (HOME, PULSE, LIVE, SHOP, APPS)
- Supabase as single source of truth
- Automatic gate enforcement

---

## 📐 Architecture Layers

```
L0 — Globe Runtime (always mounted after gate)
L1 — System HUD (radio, mode bar, safety)
L2 — Modes (HOME / PULSE / LIVE / SHOP / APPS)
L3 — Sheets (profile, event, product, chat, safety)
L4 — Interrupts (panic, verification, countdown)
```

---

## 🚪 Boot States & Gates

### Boot State Machine

The OS follows a strict boot sequence via `BootGuardContext`:

```
LOADING → Check auth session
  ↓
UNAUTHENTICATED → Public shell (age, auth, legal)
  ↓ (after auth)
NEEDS_AGE → Redirect to /age
  ↓ (age_confirmed = true)
NEEDS_ONBOARDING → Redirect to /onboarding
  ↓ (all consents given)
READY → Mount OS runtime
```

### LAW 1: Profile Gates

OS runtime **MUST NOT** mount unless:
- `profiles.age_confirmed = true`
- `profiles.onboarding_complete = true`
- `profiles.consent_location = true`
- `profiles.consent_safety = true`
- `profiles.is_suspended = false`

**CRITICAL:** Unauthenticated users are NOT gated. Only enforce flags after auth session exists.

**Files:**
- `/src/contexts/BootGuardContext.jsx` - Boot state machine
- `/src/components/shell/PublicShell.jsx` - Pre-auth routes
- `/src/components/shell/OSShell.jsx` - Full OS runtime (post-auth)
- `/supabase/migrations/20260209000000_add_profile_boot_flags.sql` - Database schema

---

## 🎭 Presence System (Right Now)

### LAW 2: Right Now = Presence Rows with TTL

**NOT a UI toggle.** Right Now is a database row with `expires_at`:

```js
// Go Right Now (creates presence + social beacon)
import { presenceAPI } from '@/api/presence';

await presenceAPI.goRightNow({
  intent: 'explore',
  timeframe: 'tonight',
  ttlMinutes: 60  // Auto-expires in 60 minutes
});

// Stop Right Now (deactivates immediately)
await presenceAPI.stopRightNow();

// Get active Right Now users
const users = await presenceAPI.getActivePresence();

// Subscribe to realtime changes
const unsubscribe = presenceAPI.subscribeToPresence((payload) => {
  console.log('Presence changed:', payload);
});
```

**Key Points:**
- If row exists with `expires_at > now` → user is visible
- If `expires_at` passes → user disappears **automatically**
- No manual "turn off" required (but supported)
- Globe subscribes to presence via realtime

**Files:**
- `/src/api/presence.js` - Presence API
- `/supabase/migrations/20260209000001_enhance_right_now_ttl.sql` - TTL cleanup

---

## 🌍 Globe & Beacons

### Unified Beacon System

Globe renders **only** beacons. All live objects write to the `Beacon` table with a `type`:

**Beacon Types:**
- `social` - Right Now presence (ephemeral, TTL-based)
- `event` - Events, parties, concerts
- `market` - Marketplace products (Shopify + P2P)
- `radio` - Live shows, broadcasts
- `safety` - Safety beacons, panic alerts

```js
import { beaconAPI } from '@/api/beacons';

// Get all active beacons
const beacons = await beaconAPI.getActiveBeacons();

// Get beacons by type
const events = await beaconAPI.getActiveBeacons({ type: 'event' });

// Subscribe to realtime beacon changes
const unsubscribe = beaconAPI.subscribeToBeacons((payload) => {
  console.log('Beacon changed:', payload);
});
```

**Key Points:**
- Presence automatically creates social beacons
- Beacons with `expires_at` auto-deactivate
- Globe uses realtime subscriptions for live updates
- No component should directly manipulate Globe visuals

**Files:**
- `/src/api/beacons.js` - Beacon API
- `/supabase/migrations/20260209000002_unify_beacon_types.sql` - Beacon type system

---

## 🛡️ Safety (LAW 3)

### Safety Overrides Everything

Panic is a **system interrupt**, not a page.

**When triggered:**
1. UI locks (navigation disabled)
2. Safety beacon is created (`type='safety'`)
3. `safety_incidents` row is created
4. Admin is notified
5. Trusted contacts are notified
6. User must explicitly resolve

**Safety ignores:**
- Current mode
- Current route
- Navigation state

**TODO:** Implement safety interrupt system (Phase 5)

---

## 📄 Page Classification (Phase 4)

### Current State

112 legacy pages still exist under `/src/pages/`. They currently render as full pages.

### Target State

Pages should be **collapsed** into:
- **Public pages** - Legal, contact (stay as pages)
- **Mode entries** - Home, Pulse, Events, Music (become mode switches)
- **Sheet openers** - Profile, EventDetail, ProductDetail (open sheets)

### Migration Strategy

1. **Keep routes alive** - Don't break inbound links
2. **Open sheets instead** - Route handlers open sheets, not pages
3. **Delete page layouts** - Gradually remove page UI after migration

**Example:**
```js
// Before: /events/:id renders EventDetail page
<Route path="/events/:id" element={<EventDetailPage />} />

// After: /events/:id opens EventSheet
<Route path="/events/:id" element={<OpenEventSheet />} />
```

---

## 🧑‍💻 Developer Guidelines

### ❌ DO NOT

- **Add new pages** - Use modes + sheets instead
- **Mount Globe early** - Respect boot gates
- **Add UI-only state** - Use Supabase truth
- **Bypass gates** - Never skip profile checks
- **Create manual presence toggles** - Use presenceAPI

### ✅ DO

- **Use BootGuard context** - Respect boot state
- **Use presenceAPI** - For Right Now features
- **Use beaconAPI** - For Globe rendering
- **Subscribe to realtime** - Keep UI live
- **Unsubscribe on unmount** - Prevent leaks

### Code Examples

**✅ Good: Respect boot gates**
```jsx
import { useBootGuard } from '@/contexts/BootGuardContext';

function MyComponent() {
  const { isReady, bootState } = useBootGuard();
  
  if (!isReady) {
    return <div>Not ready yet (state: {bootState})</div>;
  }
  
  return <div>OS is ready!</div>;
}
```

**❌ Bad: Mount Globe without checks**
```jsx
function MyComponent() {
  return <Globe />; // NO! Bypasses boot gates
}
```

**✅ Good: Use presence API**
```jsx
import { presenceAPI } from '@/api/presence';

async function goRightNow() {
  await presenceAPI.goRightNow({
    intent: 'explore',
    ttlMinutes: 60
  });
}
```

**❌ Bad: Manual UI toggle**
```jsx
const [isRightNow, setIsRightNow] = useState(false); // NO! Not source of truth
```

---

## 🗂️ File Structure

```
src/
├── contexts/
│   └── BootGuardContext.jsx        # Boot state machine (LAW 1)
├── components/
│   ├── shell/
│   │   ├── PublicShell.jsx         # Pre-auth routes
│   │   └── OSShell.jsx             # OS runtime (post-auth)
│   ├── sheets/                     # Bottom drawers (replace pages)
│   ├── modes/                      # Mode UIs (TODO)
│   └── interrupts/                 # System interrupts (TODO)
├── api/
│   ├── presence.js                 # Right Now presence (LAW 2)
│   └── beacons.js                  # Unified beacon system
├── pages/                          # Legacy (to be collapsed)
└── App.jsx                         # Root (uses BootGuard)

supabase/migrations/
├── 20260209000000_add_profile_boot_flags.sql      # Profile gates
├── 20260209000001_enhance_right_now_ttl.sql       # Presence TTL
└── 20260209000002_unify_beacon_types.sql          # Beacon types
```

---

## 🧪 Testing

### Boot State Testing

```js
// Test boot guard states
test('unauthenticated users see public shell', async () => {
  // Mock no session
  const { bootState } = renderWithBootGuard();
  expect(bootState).toBe('UNAUTHENTICATED');
});

test('authenticated users without age see age gate', async () => {
  // Mock session but age_confirmed = false
  const { bootState } = renderWithBootGuard();
  expect(bootState).toBe('NEEDS_AGE');
});
```

### Presence Testing

```js
// Test presence TTL
test('presence expires automatically', async () => {
  await presenceAPI.goRightNow({ ttlMinutes: 0.01 }); // 0.6 seconds
  
  await wait(1000);
  
  const active = await presenceAPI.getActivePresence();
  expect(active).toHaveLength(0); // Should be expired
});
```

---

## 🚀 Deployment

### Database Migrations

Run migrations in order:
```bash
# 1. Profile gates
psql -f supabase/migrations/20260209000000_add_profile_boot_flags.sql

# 2. Presence TTL
psql -f supabase/migrations/20260209000001_enhance_right_now_ttl.sql

# 3. Beacon types
psql -f supabase/migrations/20260209000002_unify_beacon_types.sql
```

### Environment Variables

Required:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

Server-only (for `/api/*`):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Background Jobs (Cron)

Add these to your cron scheduler:

```js
// Cleanup expired presence rows (every 5 minutes)
SELECT cleanup_expired_right_now();

// Cleanup expired beacons (every 15 minutes)
SELECT cleanup_expired_beacons();
```

---

## 📚 Further Reading

- **HOTMESS LONDON OS BIBLE v1.5** - `/docs/HOTMESS-LONDON-OS-BIBLE-v1.5.md`
- **Custom Instructions** - `.github/agents/copilot-instructions.md`
- **Test Setup** - `TEST_SETUP.md`

---

## 🆘 Troubleshooting

### "Stuck in age gate loop"
- ✅ **Fixed in Phase 1** - BootGuard now syncs local age confirmation after auth
- Check `sessionStorage.getItem('age_verified')` - should be `'true'`
- Check `profiles.age_confirmed` in database

### "Right Now not disappearing"
- Check `expires_at` timestamp in `right_now_status` table
- Run `SELECT cleanup_expired_right_now();` manually
- Check browser console for realtime subscription errors

### "Globe not rendering beacons"
- Check `active=true` and `status='published'` in Beacon table
- Check `expires_at` hasn't passed for TTL beacons
- Subscribe to beacon realtime channel in browser console

---

**Last Updated:** 2026-02-09  
**Version:** Phase 3 Complete
