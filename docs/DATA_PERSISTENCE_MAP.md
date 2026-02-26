# HOTMESS OS — Data Persistence Map
**Generated:** 2026-02-26
**Status:** Live Production

---

## OVERVIEW

All data persists in **Supabase** across two projects:

| Project | Role | Project ID |
|---------|------|------------|
| **Frontend** | Auth, client queries | `klsywpvncqqglhnhrjbh` |
| **Backend** | Service role, API functions | `axxwdjmbwkvqhcpwters` |

---

## STORAGE BUCKETS

### `uploads` (Primary bucket)

| Content | Path Pattern | Used By |
|---------|--------------|---------|
| **Profile avatars** | `avatars/{user_id}/{filename}` | L2EditProfileSheet, OnboardingGate |
| **Profile photos** | `photos/{user_id}/{filename}` | L2PhotosSheet |
| **Chat images** | `chat/{thread_id}/{filename}` | L2ChatSheet |
| **Product images** | `products/{user_id}/{filename}` | L2SellSheet |
| **Story media** | `stories/{user_id}/{filename}` | Stories.jsx |
| **Event images** | `events/{event_id}/{filename}` | L2CreateEventSheet |
| **Beacon images** | `beacons/{beacon_id}/{filename}` | L2BeaconSheet |

**Public URL pattern:**
```
https://klsywpvncqqglhnhrjbh.supabase.co/storage/v1/object/public/uploads/{path}
```

---

## DATABASE TABLES (Production)

### Core User Data

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | email, display_name, avatar_url, bio, location, xp |
| `profile_photos` | Gallery photos | user_email, photo_url, order_index |
| `profile_overrides` | Persona-specific settings | user_id, persona, overrides JSONB |
| `user_preferences` | App preferences | user_email, preferences JSONB |

### Social / Matching

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `taps` | Likes/Woofs | tapper_email, tapped_email, tap_type |
| `matches` | Mutual taps | user1_email, user2_email, matched_at |
| `profiles_blocked` | Block list | blocker_email, blocked_email |
| `user_favorites` | Saved profiles | user_email, favorite_email |

### Messaging

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `chat_threads` | Conversation metadata | id, participants[], unread_count JSONB |
| `messages` | Chat messages | thread_id, sender_email, content, media_url |

### Globe / Beacons

| Table | Purpose | Key Columns | Realtime? |
|-------|---------|-------------|-----------|
| `beacons` | **VIEW** on Beacon table | owner_id, metadata JSONB, lat, lng, starts_at | ✅ |
| `Beacon` | Actual beacon data | Same as above | ✅ |
| `right_now_status` | Live presence | user_email, is_active, location | ✅ |

**⚠️ IMPORTANT:** `beacons` is a VIEW, not a table. Use `metadata->>'title'` for beacon title.

### Events

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `events` | Event listings | title, description, venue, starts_at, image_url |
| `event_rsvps` | Attendance | event_id, user_email, status |
| `user_checkins` | Venue check-ins | user_email, venue_id, checked_in_at |
| `venue_kings` | Check-in leaderboard | venue_id, user_email, count |

### Commerce

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `orders` | Purchase orders | user_email, items JSONB, total, stripe_payment_id |
| `preloved_listings` | P2P marketplace | seller_email, title, price, images[], status |
| `seller_payouts` | Payout requests | seller_email, amount, status |
| `creator_subscriptions` | Fan subscriptions | creator_id, subscriber_id, stripe_subscription_id |

### Gamification

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `achievements` | Achievement catalog | id, name, description, icon, criteria |
| `user_achievements` | User unlocks | user_email, achievement_id, unlocked_at |
| `sweat_coins` | Transaction ledger | user_email, amount, transaction_type, balance_after |
| `xp_ledger` | XP transactions | user_email, amount, reason |

### Community

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `community_posts` | Community feed | user_email, content, category, like_count |
| `squads` | Groups | id, name, description, avatar_url, created_by |
| `squad_members` | Memberships | squad_id, user_email, role, joined_at |

### Safety

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `emergency_contacts` | SOS contacts | user_email, contact_name, contact_phone |
| `trusted_contacts` | Trusted people | user_email, trusted_email |
| `location_shares` | Live location | user_email, lat, lng, shared_with[], expires_at |

### Notifications

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `notifications` | In-app notifs | user_email, type, title, body, read_at |
| `notification_outbox` | Push queue | user_email, payload JSONB, sent_at |
| `push_subscriptions` | Web Push | user_email, endpoint, keys JSONB |

---

## REALTIME SUBSCRIPTIONS

The globe and live features use Supabase Realtime:

| Channel | Table | Events | Context |
|---------|-------|--------|---------|
| `world-pulse-beacons` | beacons | INSERT, UPDATE, DELETE | WorldPulseContext |
| `world-pulse-checkins` | user_checkins | INSERT | WorldPulseContext |
| `now-signal-follows-{userId}` | right_now_status | UPDATE | NowSignalContext |
| `now-signal-venues-{userId}` | right_now_status | UPDATE | NowSignalContext |
| `typing-{threadId}` | N/A (broadcast only) | - | useTypingIndicator |

**Globe beacon flow:**
```
User creates beacon
       │
       ▼
INSERT into Beacon table
       │
       ▼
Realtime broadcasts to all clients
       │
       ▼
WorldPulseContext receives event
       │
       ▼
GlobeBeacons.updateBeacons() called
       │
       ▼
Three.js mesh added to globe
```

---

## IMAGE PERSISTENCE FLOW

```
User selects image
       │
       ▼
Resize/compress (client-side)
       │
       ▼
supabase.storage.from('uploads').upload(path, file)
       │
       ▼
Supabase stores in S3-compatible storage
       │
       ▼
Get public URL: supabase.storage.from('uploads').getPublicUrl(path)
       │
       ▼
Store URL in database (e.g., profiles.avatar_url)
       │
       ▼
UI renders <img src={publicUrl} />
```

**CDN URL:**
```
https://klsywpvncqqglhnhrjbh.supabase.co/storage/v1/object/public/uploads/avatars/123/avatar.jpg
```

---

## RPC FUNCTIONS (Stored Procedures)

| Function | Purpose | Returns |
|----------|---------|---------|
| `get_amplification_price(city, category)` | Dynamic pricing | price decimal |
| `calculate_business_heat(business_id)` | Business analytics | heat_score int |
| `get_nearby_users(lat, lng, radius)` | Proximity search | users[] |
| `match_profiles(user_id)` | Matching algorithm | scored_profiles[] |

---

## EXTERNAL INTEGRATIONS

| Service | Purpose | Data Stored |
|---------|---------|-------------|
| **Stripe** | Payments | `stripe_customer_id` in profiles, `stripe_payment_id` in orders |
| **Shopify** | Products | External (not in Supabase), accessed via Storefront API |
| **RadioKing** | Radio stream | No persistence, live stream only |
| **Google Maps** | Location | Geocoded addresses stored in events, beacons |
| **Telegram** | Auth | `telegram_id` in profiles |
| **SoundCloud** | Music uploads | OAuth tokens in `soundcloud_oauth_tokens` |

---

## BACKUP & RECOVERY

Supabase provides:
- **Point-in-time recovery** (PITR) for Pro+ plans
- **Daily backups** for all plans
- **Manual backups** via `pg_dump`

**Critical tables to never lose:**
- `profiles` — user accounts
- `messages` — chat history
- `orders` — purchase records
- `creator_subscriptions` — active subscriptions

---

## MIGRATIONS

All schema changes live in:
```
supabase/migrations/
├── 20260107091000_missing_feature_tables.sql
├── 20260226000070_community_gate.sql
├── 20260226000080_rls_critical_fixes.sql
├── 20260226000085_emergency_contacts.sql
├── 20260226000090_taps.sql
├── 20260226000095_push_subscriptions.sql
└── ... (107 total)
```

Apply with: `supabase db push`

---

## QUICK REFERENCE

**Get user avatar:**
```javascript
const { data } = supabase.storage.from('uploads').getPublicUrl(`avatars/${userId}/avatar.jpg`);
```

**Get beacons for globe:**
```javascript
const { data } = await supabase
  .from('beacons')
  .select('id, owner_id, metadata, lat, lng, starts_at')
  .gte('ends_at', new Date().toISOString());
```

**Subscribe to beacon updates:**
```javascript
supabase
  .channel('world-pulse-beacons')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'Beacon' }, handler)
  .subscribe();
```
