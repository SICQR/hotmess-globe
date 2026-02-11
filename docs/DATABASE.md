# HOTMESS — Database Schema Documentation

**Updated:** 2026-02-11  
**Database:** Supabase PostgreSQL  
**Schema Version:** Production (70+ migrations applied)

---

## Overview

The HOTMESS database is built on PostgreSQL with PostGIS for geospatial queries. It uses Supabase for authentication, Row-Level Security (RLS) for authorization, and real-time subscriptions for live features.

**Key Characteristics:**
- 70+ tables organized by feature domain
- Email-based and UUID-based RLS policies
- PostGIS geography columns for location queries
- TTL (time-to-live) patterns for ephemeral data
- Trigger-based capability synchronization
- Realtime publication for live updates

---

## Core Tables

### Identity & Authentication

#### `profiles`
**Purpose:** User profile data and capabilities

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK, links to `auth.users.id` |
| `email` | TEXT | User email (unique, indexed) |
| `username` | TEXT | Display name (unique, indexed) |
| `persona` | TEXT | listener \| social \| creator \| organizer |
| `avatar_url` | TEXT | Profile image |
| `bio` | TEXT | User bio |
| `tags` | TEXT[] | Searchable tags |
| `is_verified` | BOOLEAN | Identity verification status |
| `verification_level` | TEXT | none \| basic \| full |
| `age_verified_at` | TIMESTAMP | Age gate completion |
| `onboarding_complete` | BOOLEAN | First-time setup done |
| `can_go_live` | BOOLEAN | Computed: can broadcast presence |
| `can_sell` | BOOLEAN | Computed: can create product listings |
| `role_flags` | JSONB | Admin/moderator flags |
| `last_active_at` | TIMESTAMP | Last seen (updated on activity) |
| `created_at` | TIMESTAMP | Account creation |

**RLS Policies:**
- Public read: all authenticated users
- Write: own profile only (`id = auth.uid()`)
- Admin: bypass all policies

**Triggers:**
- `trg_sync_caps` → Auto-compute `can_go_live` / `can_sell` based on verification
- `on_auth_user_created` → Auto-create profile row on Supabase signup

---

### Real-Time Presence

#### `presence_locations` (or `presence`)
**Purpose:** Live location tracking with TTL expiry

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK to `profiles.id` |
| `mode` | TEXT | right_now \| at_event \| broadcast |
| `status` | TEXT | live \| expired |
| `lat` | NUMERIC | Latitude |
| `lng` | NUMERIC | Longitude |
| `geo` | GEOGRAPHY | PostGIS point (indexed) |
| `expires_at` | TIMESTAMP | TTL expiry (indexed) |
| `event_id` | UUID | Optional: FK to event beacon |
| `updated_at` | TIMESTAMP | Last location update |

**Indexes:**
- `presence_geo_idx` (GIST) → Spatial queries
- `presence_expires_at_idx` → TTL cleanup queries
- `presence_user_id_idx` → User lookup
- `presence_mode_idx` → Filter by mode

**RLS Policies:**
- Read: `status = 'live' AND expires_at > now()`
- Write: own user_id only

**Cleanup:** Run `expire_presence_and_beacons()` via cron every 5 minutes

---

#### `right_now_status`
**Purpose:** Simplified "I'm out" toggle (legacy alternative to presence)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_email` | TEXT | FK to `profiles.email` |
| `is_out` | BOOLEAN | Toggle state |
| `lat` | NUMERIC | Last location |
| `lng` | NUMERIC | Last location |

**RLS Policies:**
- Read: public (if `is_out = true`)
- Write: own email only

---

### Beacons (Map Markers)

#### `Beacon` (legacy) and `beacons`
**Purpose:** Geo-located markers for events, social presence, marketplace listings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `beacon_type` | TEXT | social \| event \| marketplace \| safety |
| `owner_id` | UUID | FK to `profiles.id` |
| `title` | TEXT | Beacon title |
| `description` | TEXT | Beacon description |
| `lat` | NUMERIC | Latitude |
| `lng` | NUMERIC | Longitude |
| `starts_at` | TIMESTAMP | Event start / listing active time |
| `ends_at` | TIMESTAMP | Event end / listing expiry |
| `visibility` | TEXT | public \| nearby \| verified_only |
| `metadata` | JSONB | Type-specific data |
| `is_active` | BOOLEAN | Active status |
| `created_at` | TIMESTAMP | Created |

**Types & Use Cases:**
- `social` → Live presence beacons (lime color)
- `event` → Event/party beacons (cyan color)
- `marketplace` → P2P product listings (gold color)
- `safety` → Panic button beacons (red color)

**Indexes:**
- `idx_beacon_active_status` → Active filtering
- `idx_beacon_kind_event_date` → Event discovery

**RLS Policies:**
- Read: `is_active = true AND visibility rules`
- Write: own owner_id only

**Realtime:** Published to `supabase_realtime` for live updates

---

### Events

#### `EventRSVP`
**Purpose:** Event attendance tracking

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `event_id` | UUID | FK to `Beacon.id` |
| `user_email` | TEXT | FK to `profiles.email` |
| `status` | TEXT | going \| interested \| not_going |
| `created_at` | TIMESTAMP | RSVP time |

**Indexes:**
- `idx_eventrsvp_event_user` (UNIQUE) → Prevent duplicate RSVPs

**RLS Policies:**
- Read: all authenticated users
- Write: own email only, unique constraint enforced

---

### Messaging

#### `chat_threads`
**Purpose:** DM conversations between users

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `participant_emails` | TEXT[] | Array of participant emails |
| `last_message_at` | TIMESTAMP | Last message time |
| `unread_count` | INTEGER | Unread message count |
| `metadata` | JSONB | Thread metadata |

**Indexes:**
- `idx_chat_threads_participants_gin` (GIN) → Array search

**RLS Policies:**
- Read/Write: `participant_emails @> ARRAY[auth.jwt() ->> 'email']`

---

#### `messages`
**Purpose:** Chat message content

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `thread_id` | UUID | FK to `chat_threads.id` |
| `sender_email` | TEXT | FK to `profiles.email` |
| `message_type` | TEXT | text \| image \| voice \| system |
| `content` | TEXT | Message text |
| `read_by` | TEXT[] | Array of emails who read |
| `created_at` | TIMESTAMP | Sent time |

**Indexes:**
- `messages_created_date` → Time-series queries

**RLS Policies:**
- Read: participant in thread
- Write: own sender_email only

**Realtime:** Published to `supabase_realtime` for live chat

---

### Commerce & Marketplace

#### `products`
**Purpose:** Creator marketplace listings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `seller_email` | TEXT | FK to `profiles.email` |
| `title` | TEXT | Product name |
| `description` | TEXT | Product description |
| `price_xp` | INTEGER | Price in XP points |
| `price_gbp` | NUMERIC | Price in GBP (Stripe) |
| `category` | TEXT | Product category |
| `status` | TEXT | draft \| active \| sold \| archived |
| `inventory_count` | INTEGER | Stock quantity |
| `images` | TEXT[] | Image URLs |
| `beacon_id` | UUID | Optional: FK to `beacons.id` |
| `created_at` | TIMESTAMP | Listed |

**Indexes:**
- `products_seller_email` → Seller lookup
- `products_status_idx` → Active listings

**RLS Policies:**
- Read: `status = 'active'` (public)
- Write: own seller_email only

**Integration:** 
- Gold beacons on Globe for visibility
- XP economy or Stripe payments

---

#### `orders`
**Purpose:** Purchase transactions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `buyer_email` | TEXT | FK to `profiles.email` |
| `seller_email` | TEXT | FK to `profiles.email` |
| `total_xp` | INTEGER | Total price in XP |
| `total_gbp` | NUMERIC | Total price in GBP |
| `status` | TEXT | pending \| paid \| fulfilled \| cancelled |
| `payment_method` | TEXT | xp \| stripe |
| `stripe_payment_intent_id` | TEXT | Stripe PI reference |
| `created_at` | TIMESTAMP | Order created |

**RLS Policies:**
- Read/Write: `buyer_email = auth.email OR seller_email = auth.email`

---

#### `order_items`
**Purpose:** Line items in orders

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `order_id` | UUID | FK to `orders.id` |
| `product_id` | UUID | FK to `products.id` |
| `quantity` | INTEGER | Quantity purchased |
| `price_at_purchase_xp` | INTEGER | Price snapshot |
| `price_at_purchase_gbp` | NUMERIC | Price snapshot |

---

#### `cart_items`
**Purpose:** Shopping cart (both Shopify and P2P)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_email` | TEXT | FK to `profiles.email` |
| `product_id` | UUID | Optional: FK to `products.id` |
| `shopify_variant_id` | TEXT | Optional: Shopify variant |
| `quantity` | INTEGER | Quantity |
| `added_at` | TIMESTAMP | Added to cart |

**RLS Policies:**
- Read/Write: own user_email only

---

### Gamification

#### `xp_ledger` (or `xp_transactions`)
**Purpose:** XP point transactions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_email` | TEXT | FK to `profiles.email` |
| `amount` | INTEGER | XP delta (+/-) |
| `reason` | TEXT | Transaction reason |
| `metadata` | JSONB | Additional context |
| `created_at` | TIMESTAMP | Transaction time |

**RLS Policies:**
- Read: own user_email only
- Write: server-side only (no direct inserts)

---

#### `user_achievements`
**Purpose:** Unlocked badges/achievements

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_email` | TEXT | FK to `profiles.email` |
| `achievement_id` | UUID | FK to `achievements.id` |
| `unlocked_at` | TIMESTAMP | Achievement unlock time |

---

### Safety & Moderation

#### `safety_incidents`
**Purpose:** Panic button activations

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK to `profiles.id` |
| `lat` | NUMERIC | Panic location |
| `lng` | NUMERIC | Panic location |
| `status` | TEXT | active \| resolved \| acked_by_admin |
| `notes` | TEXT | Admin notes |
| `created_at` | TIMESTAMP | Panic time |

**RLS Policies:**
- Read: admin only
- Write: own user_id for creation, admin for updates

**Functions:**
- `panic_start(lat, lng)` → Create incident + safety beacon
- `panic_resolve()` → User resolves own incident
- `admin_ack_incident(id)` → Admin acknowledge

---

#### `reports`
**Purpose:** User-reported content/users

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `reporter_email` | TEXT | FK to `profiles.email` |
| `reported_email` | TEXT | FK to `profiles.email` |
| `reason` | TEXT | Report reason |
| `description` | TEXT | Report details |
| `status` | TEXT | pending \| reviewed \| actioned |
| `created_at` | TIMESTAMP | Report time |

**RLS Policies:**
- Read: admin only
- Write: any authenticated user

---

### Notifications

#### `notifications` (or `notification_outbox`)
**Purpose:** User notifications queue

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_email` | TEXT | FK to `profiles.email` |
| `type` | TEXT | match \| message \| event \| system |
| `title` | TEXT | Notification title |
| `body` | TEXT | Notification body |
| `status` | TEXT | pending \| sent \| read |
| `sent_via` | TEXT[] | push \| email \| telegram |
| `metadata` | JSONB | Notification metadata |
| `created_at` | TIMESTAMP | Created |

**Indexes:**
- `notification_outbox_status_index` → Process pending

**RLS Policies:**
- Read: own user_email only
- Write: server-side only

---

### Subscriptions & Memberships

#### `subscriptions`
**Purpose:** Premium tier subscriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_email` | TEXT | FK to `profiles.email` |
| `tier` | TEXT | plus \| chrome |
| `status` | TEXT | active \| cancelled \| expired |
| `provider` | TEXT | stripe \| apple \| google |
| `provider_subscription_id` | TEXT | External sub ID |
| `current_period_end` | TIMESTAMP | Renewal date |
| `created_at` | TIMESTAMP | Subscribed |

**RLS Policies:**
- Read: own user_email only
- Write: server-side only (webhook updates)

---

## Database Functions (RPC)

### Presence Management

#### `rpc_go_live(mode TEXT, lat NUMERIC, lng NUMERIC, minutes INTEGER)`
**Purpose:** Create/update live presence with TTL

**Access:** Authenticated users only  
**Checks:**
- User must have `can_go_live = true`
- Deletes expired presence first
- Inserts new presence with `expires_at = NOW() + minutes`
- Returns presence record

---

#### `rpc_stop_live()`
**Purpose:** Expire user's live presence

**Access:** Authenticated users only  
**Action:** Sets `status = 'expired'` for user's presence

---

#### `expire_presence_and_beacons()`
**Purpose:** TTL cleanup (cron job)

**Access:** Admin or cron secret  
**Action:** 
- Deletes expired presence (`expires_at < NOW()`)
- Deletes expired beacons (`ends_at < NOW()`)

**Scheduling:** Run every 5 minutes via Vercel cron or Supabase pg_cron

---

### Safety

#### `panic_start(lat NUMERIC, lng NUMERIC)`
**Purpose:** Activate panic button

**Access:** Authenticated users only  
**Action:**
- Insert row in `safety_incidents` with status = 'active'
- Create safety beacon on map
- Notify trusted contacts (future)

---

#### `panic_resolve()`
**Purpose:** Deactivate panic button

**Access:** Authenticated users only  
**Action:** Set user's active incident to status = 'resolved'

---

#### `admin_ack_incident(incident_id UUID)`
**Purpose:** Admin acknowledge safety incident

**Access:** Admin only  
**Action:** Set incident status = 'acked_by_admin'

---

### User Discovery

#### `rpc_viewer_state()`
**Purpose:** Boot-time state check

**Returns:**
```json
{
  "age_verified": true,
  "consents_complete": true,
  "onboarding_complete": true,
  "can_go_live": false,
  "can_sell": false
}
```

**Access:** Authenticated users only

---

## Indexes & Performance

### Spatial Indexes
```sql
CREATE INDEX presence_geo_idx ON presence_locations USING GIST (geo);
```
**Purpose:** Fast proximity queries (<30km radius)

### Time-Series Indexes
```sql
CREATE INDEX messages_created_date ON messages (created_at DESC);
CREATE INDEX presence_expires_at_idx ON presence_locations (expires_at);
```
**Purpose:** Chronological queries, TTL cleanup

### Array Indexes (GIN)
```sql
CREATE INDEX idx_chat_threads_participants_gin 
  ON chat_threads USING GIN (participant_emails);
```
**Purpose:** Array contains queries (`participant_emails @> ARRAY[email]`)

### Composite Indexes
```sql
CREATE INDEX idx_beacon_active_status 
  ON beacons (is_active, beacon_type, starts_at);
```
**Purpose:** Filter active beacons by type and date

---

## RLS Patterns

### Email-Based Access Control
```sql
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ((auth.jwt() ->> 'email') = email);
```

### UUID-Based Access Control
```sql
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());
```

### Visibility Tiering
```sql
CREATE POLICY "Public beacons visible to all"
  ON beacons FOR SELECT
  USING (visibility = 'public' OR 
         (visibility = 'verified_only' AND auth.jwt() ->> 'is_verified' = 'true'));
```

### Two-Party Access
```sql
CREATE POLICY "Parties can view order"
  ON orders FOR SELECT
  USING ((auth.jwt() ->> 'email') = buyer_email OR 
         (auth.jwt() ->> 'email') = seller_email);
```

---

## Triggers

### Auto-Update Timestamps
```sql
CREATE TRIGGER trg_profiles_touch
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();
```

### Sync Capabilities
```sql
CREATE TRIGGER trg_sync_caps
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_capabilities();
```
**Purpose:** Auto-compute `can_go_live` and `can_sell` based on:
- `age_verified_at IS NOT NULL`
- `onboarding_complete = true`
- `is_verified = true`

### Presence → Beacon Sync
```sql
CREATE TRIGGER trg_presence_sync
  AFTER INSERT ON presence_locations
  FOR EACH ROW
  EXECUTE FUNCTION sync_presence_to_beacon();
```
**Purpose:** Auto-create 'social' beacon when user goes live

---

## Realtime Publications

**Tables Published to `supabase_realtime`:**
- `presence_locations` → Live user locations
- `beacons` → Map marker updates
- `messages` → Chat messages
- `safety_incidents` → Panic button activations
- `right_now_status` → "I'm out" toggles

**Client Subscription:**
```javascript
supabase
  .channel('presence')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'presence_locations' },
    (payload) => { /* handle new presence */ }
  )
  .subscribe()
```

---

## Migration Strategy

### Development
```bash
supabase db reset         # Reset local DB
supabase db push          # Push migrations to remote
```

### Production
1. Test migrations in staging environment first
2. Run migrations during low-traffic window
3. Monitor for errors in Supabase logs
4. Have rollback plan ready

### Rollback
```sql
-- Create reverse migration (e.g., DROP TABLE, ALTER TABLE DROP COLUMN)
-- Test in staging first
-- Apply to production if needed
```

---

## Backup & Recovery

**Supabase Pro:** Daily automated backups  
**Manual Backup:**
```bash
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

**Restore:**
```bash
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Security Best Practices

1. **Never expose service role key** to client
2. **Use RLS policies** on all tables
3. **Validate input** in database functions
4. **Use prepared statements** to prevent SQL injection
5. **Rotate Supabase keys** periodically
6. **Audit RLS policies** for data leaks
7. **Monitor slow queries** and add indexes

---

## Common Queries

### Find Nearby Users
```sql
SELECT p.*, pr.username, pr.avatar_url
FROM presence_locations p
JOIN profiles pr ON p.user_id = pr.id
WHERE p.status = 'live'
  AND p.expires_at > NOW()
  AND ST_DWithin(
    p.geo::geography,
    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
    30000  -- 30km radius
  )
ORDER BY p.geo <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
LIMIT 50;
```

### Get User's Unread Messages
```sql
SELECT m.*, ct.participant_emails
FROM messages m
JOIN chat_threads ct ON m.thread_id = ct.id
WHERE ct.participant_emails @> ARRAY[:user_email]
  AND NOT (m.read_by @> ARRAY[:user_email])
ORDER BY m.created_at DESC;
```

### Get Active Events
```sql
SELECT *
FROM "Beacon"
WHERE beacon_type = 'event'
  AND is_active = true
  AND starts_at > NOW()
  AND visibility = 'public'
ORDER BY starts_at ASC
LIMIT 20;
```

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [API Endpoints](./SERVER_ROUTES.md)
- [Agent Tasks](./AGENT_TASKS.md)
- Supabase Docs: https://supabase.com/docs

**Built with 🖤 for the queer nightlife community.**
