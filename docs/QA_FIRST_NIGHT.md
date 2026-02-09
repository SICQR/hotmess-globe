# QA TEST SCRIPT — FIRST NIGHT LIVE USE

**Purpose:** Run this before any real event to verify system integrity.  
**Time:** ~45 minutes  
**Required:** Test device, Supabase access, admin account

---

## Phase 0 — Preflight (15 min)

### Boot Guard

- [ ] New user cannot mount OS without `age_verified`
- [ ] New user cannot mount OS without `username`
- [ ] New user cannot mount OS without `onboarding_complete`
- [ ] Google login lands in `profiles` table
- [ ] Telegram login lands in `profiles` table
- [ ] Same user with both providers = same profile row

### Deep Links

- [ ] `/now` redirects to age gate if not verified
- [ ] `/events/xyz` redirects to onboarding if incomplete
- [ ] No route bypasses bootGuard

---

## Phase 1 — Presence Reality Check

### Go Live Flow

- [ ] User taps "Go Live"
- [ ] UI shows "Connecting…" immediately
- [ ] `presence` row appears in Supabase within 3s
- [ ] Social beacon (LIME) appears on Globe
- [ ] Countdown matches `expires_at` from DB
- [ ] Beacon disappears exactly when TTL expires

### Fail Conditions

- ❌ UI shows "live" without DB row
- ❌ Beacon lingers after expiry
- ❌ User can go live without verification

---

## Phase 2 — Social Safety

### Two-User Test

- [ ] User A goes live
- [ ] User B goes live nearby
- [ ] Both see each other on Globe
- [ ] Distance shows band ("very close", "nearby"), NOT meters

### Handshake

- [ ] Chat button disabled before handshake
- [ ] Handshake creates `connections` row
- [ ] Chat enabled after handshake

### Block

- [ ] Block removes user from Globe immediately
- [ ] Blocked user cannot handshake

---

## Phase 3 — Event Night

### Event Beacon

- [ ] Event beacon (CYAN) appears at `starts_at` time
- [ ] RSVP increases beacon intensity
- [ ] Check-in button only appears when event is live

### Wetter Watch

- [ ] Density indicator updates as users check in
- [ ] Count matches actual `presence` rows

---

## Phase 4 — Commerce

### Shopify (Official)

- [ ] Product loads from Shopify
- [ ] Checkout completes in Shopify drawer
- [ ] No Shopify data written to Supabase

### P2P (Market)

- [ ] Listing creates GOLD beacon
- [ ] Sale removes beacon
- [ ] Item appears in seller's Vault
- [ ] Item appears in buyer's Vault

---

## Phase 5 — SAFETY (CRITICAL)

### Panic Trigger

- [ ] Press & hold Safety for 3s
- [ ] UI locks to RED immediately
- [ ] `safety_incidents` row created
- [ ] `beacons` row created with `type='safety'`

### Visibility

- [ ] Safety beacon visible to admin
- [ ] Safety beacon NOT visible to other users
- [ ] RLS enforces `visibility='admin_only'`

### Resolution

- [ ] Admin can acknowledge incident
- [ ] User must enter PIN to resolve
- [ ] Resolved incident removes beacon

### Fail Conditions (AUTO-BLOCK RELEASE)

- ❌ Panic can be triggered with tap
- ❌ Panic can be dismissed accidentally
- ❌ Safety beacon visible to non-admin
- ❌ UI unlocks without explicit resolve

---

## Phase 6 — Reload & Recovery

### Presence Recovery

- [ ] Reload during live presence restores countdown
- [ ] Countdown continues from correct time

### Safety Recovery

- [ ] Reload during panic restores RED lock
- [ ] User still needs PIN to exit

### Network Recovery

- [ ] Network drop during panic shows "Reconnecting…"
- [ ] Panic state persists locally
- [ ] Reconnect syncs with DB

---

## Sign-Off

| Phase | Pass/Fail | Tester | Notes |
|-------|-----------|--------|-------|
| 0 - Preflight | | | |
| 1 - Presence | | | |
| 2 - Social | | | |
| 3 - Events | | | |
| 4 - Commerce | | | |
| 5 - Safety | | | |
| 6 - Recovery | | | |

**All phases must pass before live event.**

---

## Emergency Contacts

- **Ops Lead:** _______________
- **Engineering:** _______________
- **Admin Access:** _______________
