# Hotmess Database Documentation

**Last Updated**: 2026-01-26  
**Database**: Supabase (PostgreSQL)  
**Schema Version**: 48 migrations (2026-01-03 to 2026-01-26)

## Table of Contents

1. [Overview](#overview)
2. [Schema Organization](#schema-organization)
3. [Core Tables](#core-tables)
4. [Migration Management](#migration-management)
5. [Row Level Security](#row-level-security)
6. [Real-time Features](#real-time-features)
7. [Storage Buckets](#storage-buckets)
8. [Database Functions](#database-functions)
9. [Maintenance](#maintenance)

## Overview

The Hotmess database powers a social event discovery and marketplace platform. It includes:

- **48 migration files** in chronological order
- **60+ tables** covering users, events, marketplace, social, messaging, gamification
- **Row Level Security (RLS)** enabled on all tables
- **Real-time subscriptions** for live updates
- **Storage buckets** for user uploads

### Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL                      │
├─────────────────────────────────────────────────────────────┤
│  Core                                                        │
│  ├── User (profiles, auth)                                  │
│  ├── Beacon (events/locations)                              │
│  └── EventRSVP (event attendance)                           │
├─────────────────────────────────────────────────────────────┤
│  Social                                                      │
│  ├── user_follows, user_friendships, user_vibes             │
│  ├── squads, squad_members                                  │
│  ├── messages, chat_threads, notifications                  │
│  └── community_posts, post_likes, post_comments             │
├─────────────────────────────────────────────────────────────┤
│  Marketplace                                                 │
│  ├── products, orders, order_items                          │
│  ├── cart_items, promotions                                 │
│  ├── seller_payouts, featured_listings                      │
│  └── xp_ledger, sweat_coins                                 │
├─────────────────────────────────────────────────────────────┤
│  Gamification                                                │
│  ├── achievements, user_achievements                        │
│  ├── daily_challenges, challenge_completions                │
│  ├── user_streaks, venue_kings                              │
│  └── beacon_checkins, sweat_coins                           │
├─────────────────────────────────────────────────────────────┤
│  Discovery & Analytics                                       │
│  ├── cities, user_intents, user_tribes, user_tags           │
│  ├── profile_views, product_views, event_views              │
│  └── user_interactions, activity_feed                       │
├─────────────────────────────────────────────────────────────┤
│  Safety & Moderation                                         │
│  ├── reports, user_blocks                                   │
│  ├── trusted_contacts, safety_checkins                      │
│  └── notification_outbox                                    │
└─────────────────────────────────────────────────────────────┘
```

## Schema Organization

### Core Tables

#### User (PascalCase)
**Purpose**: User profiles and authentication  
**Key Fields**: email (PK), auth_user_id, display_name, bio, avatar_url, city  
**Extended Fields**: vibes, hotmess_score, onboarding_completed, is_seller, is_organizer  
**RLS**: Authenticated users can read all (for discovery), write own only  
**Migration**: `20260103000000_create_user.sql`, enhanced in `20260107090000_hotmess_user_fields.sql`

```sql
CREATE TABLE "User" (
  email TEXT PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id),
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  city TEXT,
  vibes JSONB,
  hotmess_score INTEGER DEFAULT 0,
  is_seller BOOLEAN DEFAULT false,
  is_organizer BOOLEAN DEFAULT false,
  is_creator BOOLEAN DEFAULT false,
  -- ... many more fields
);
```

#### Beacon (PascalCase)
**Purpose**: Events and location markers  
**Key Fields**: id (UUID), title, latitude, longitude, event_date, organizer_email  
**Extended Fields**: capacity, ticket_url, cover_image, soundcloud_urn, vibe_tags  
**RLS**: Public read for published, owner write  
**Migration**: `20260103000002_create_beacon_eventrsvp.sql`, expanded in `20260115100000`

```sql
CREATE TABLE "Beacon" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  event_date TIMESTAMPTZ,
  organizer_email TEXT REFERENCES "User"(email),
  capacity INTEGER,
  vibe_tags TEXT[],
  -- ... many more fields
);
```

#### EventRSVP (PascalCase)
**Purpose**: Event attendance tracking  
**Key Fields**: id (UUID), user_email, beacon_id, status  
**RLS**: Authenticated users can read all, write own  
**Migration**: `20260103000002_create_beacon_eventrsvp.sql`

```sql
CREATE TABLE "EventRSVP" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT REFERENCES "User"(email),
  beacon_id UUID REFERENCES "Beacon"(id),
  status TEXT DEFAULT 'going',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Marketplace Tables

#### products
**Purpose**: Items for sale in marketplace  
**Key Fields**: id (UUID), title, price_pounds, seller_email, inventory  
**RLS**: Public read for active, seller write  
**Migration**: `20260104091000_create_marketplace_tables.sql`

#### orders
**Purpose**: Purchase orders  
**Key Fields**: id (UUID), buyer_email, seller_email, total_amount, status  
**RLS**: Party-only (buyer OR seller can access)  
**Critical**: Properly secured for financial data  
**Migration**: `20260104091000_create_marketplace_tables.sql`

#### order_items
**Purpose**: Line items in orders  
**Key Fields**: id (UUID), order_id, product_id, quantity, price_at_purchase  
**RLS**: Party-only (matches order buyer/seller)  
**Migration**: `20260104091000_create_marketplace_tables.sql`

#### cart_items
**Purpose**: Shopping cart  
**Key Fields**: id (UUID), user_email, product_id, quantity  
**RLS**: Owner-only  
**Migration**: `20260104140000_create_cart_items.sql`

#### xp_ledger
**Purpose**: Experience points tracking for gamification  
**Key Fields**: id (UUID), user_email, xp_amount, reason, related_entity  
**Migration**: `20260104091000_create_marketplace_tables.sql`

### Social & Communication Tables

#### messages
**Purpose**: Chat messages  
**Key Fields**: id (UUID), thread_id, sender_email, content  
**RLS**: Thread participant-only (secured 2026-01-26)  
**Critical**: Privacy-sensitive  
**Migration**: `20260104121500_create_messaging_notifications_storage.sql`, tightened in `20260126100000`

#### chat_threads
**Purpose**: Chat conversations  
**Key Fields**: id (UUID), participant_emails (TEXT[]), title  
**RLS**: Participant-only  
**Migration**: `20260104121500_create_messaging_notifications_storage.sql`

#### notifications
**Purpose**: User notifications  
**Key Fields**: id (UUID), user_email, type, title, body, read  
**RLS**: Owner-only (secured 2026-01-26)  
**Migration**: `20260104121500_create_messaging_notifications_storage.sql`

#### user_follows
**Purpose**: Follow relationships  
**Key Fields**: id (UUID), follower_email, following_email  
**RLS**: Public read (social discovery), authenticated write  
**Migration**: `20260104164500_create_user_follows_and_user_vibes.sql`

#### squads
**Purpose**: User groups/communities  
**Key Fields**: id (UUID), name, description, created_by  
**RLS**: Public read, member update, creator delete  
**Migration**: `20260104103000_create_social_core_tables.sql`

### Gamification Tables

#### achievements
**Purpose**: Achievement definitions  
**Key Fields**: id (UUID), name, description, icon, xp_reward  
**RLS**: Public read  
**Migration**: `20260104103000_create_social_core_tables.sql`

#### user_achievements
**Purpose**: User achievement progress  
**Key Fields**: id (UUID), user_email, achievement_id, unlocked_at  
**RLS**: Public read (for profile display)  
**Migration**: `20260104103000_create_social_core_tables.sql`

#### daily_challenges
**Purpose**: Daily challenge definitions  
**Key Fields**: id (UUID), challenge_date, title, description, xp_reward  
**RLS**: Public read  
**Migration**: `20260107091000_missing_feature_tables.sql`

#### beacon_checkins
**Purpose**: Beacon check-in tracking  
**Key Fields**: id (UUID), user_email, beacon_id, checked_in_at  
**RLS**: Authenticated read, owner write  
**Migration**: `20260107091000_missing_feature_tables.sql`

### Discovery & Taxonomy Tables

#### cities
**Purpose**: City taxonomy for discovery  
**Key Fields**: id (UUID), name, country, latitude, longitude  
**Migration**: `20260107091000_missing_feature_tables.sql`

#### user_tribes
**Purpose**: User community/tribe membership  
**Key Fields**: id (UUID), user_email, tribe_id, tribe_label  
**RLS**: Public read (discovery), self write  
**Note**: Two migrations (enhancement in `20260115100200` adds tribe_label)  
**Migration**: `20260108000000_create_user_tribes.sql`, enhanced `20260115100200`

#### user_tags
**Purpose**: User taxonomy tags  
**Key Fields**: id (UUID), user_email, tag_id, tag_label, category  
**RLS**: Public read (discovery)  
**Migration**: `20260104103000_create_social_core_tables.sql`, enhanced `20260115100100`

#### user_intents
**Purpose**: User intent/goal tracking  
**Key Fields**: id (UUID), user_email, intent_type, intent_value  
**Migration**: `20260107091000_missing_feature_tables.sql`

### Safety & Moderation Tables

#### reports
**Purpose**: Content/user reports  
**Key Fields**: id (UUID), reporter_email, reported_entity_type, reported_entity_id, reason  
**RLS**: Reporter can see own, admin can see all  
**Migration**: `20260104172500_create_reports_and_user_activity.sql`

#### user_blocks
**Purpose**: User blocking  
**Key Fields**: id (UUID), blocker_email, blocked_email  
**RLS**: Owner-only  
**Migration**: `20260107091000_missing_feature_tables.sql`

#### trusted_contacts
**Purpose**: Emergency contacts  
**Key Fields**: id (UUID), user_email, contact_name, contact_phone  
**RLS**: Owner-only  
**Migration**: `20260115100500_polish_notifications_memberships_gdpr.sql`

#### safety_checkins
**Purpose**: Safety check-ins  
**Key Fields**: id (UUID), user_email, beacon_id, checkin_time, status  
**RLS**: Owner and trusted contacts can see  
**Migration**: `20260115100500_polish_notifications_memberships_gdpr.sql`

### Analytics Tables

#### profile_views
**Purpose**: Profile view tracking  
**Key Fields**: id (UUID), viewer_email, viewed_email, viewed_at  
**Migration**: `20260107091000_missing_feature_tables.sql`

#### product_views
**Purpose**: Product view analytics  
**Key Fields**: id (UUID), product_id, viewer_email, viewed_at  
**Migration**: `20260115100000_expand_beacon_fields_and_shadow_rls.sql`

#### user_interactions
**Purpose**: User interaction tracking  
**Key Fields**: id (UUID), user_email, interaction_type, target_entity  
**Migration**: `20260115100300_create_user_interactions.sql`

#### activity_feed
**Purpose**: User activity feed items  
**Key Fields**: id (UUID), user_email, activity_type, content, created_at  
**Migration**: `20260115100400_create_activity_feed.sql`

### System Tables

#### UserActivity (PascalCase)
**Purpose**: Audit log of user actions  
**Key Fields**: id (UUID), user_email, action, details  
**Migration**: `20260104172500_create_reports_and_user_activity.sql`

#### notification_outbox
**Purpose**: Notification queue for delivery  
**Key Fields**: id (UUID), user_email, notification_type, status, payload  
**RLS**: Admin-only (secured 2026-01-15)  
**Migration**: `20260115100500_polish_notifications_memberships_gdpr.sql`

#### push_subscriptions
**Purpose**: Web push notification subscriptions  
**Key Fields**: id (UUID), user_email, endpoint, p256dh, auth  
**RLS**: Owner-only  
**Migration**: `20260108000001_create_push_subscriptions.sql`

## Migration Management

### Migration File Naming

Format: `YYYYMMDDHHMMSS_description.sql`

Example: `20260126100000_tighten_rls_policies.sql`

### Current Migrations (48 files)

#### Phase 1: Foundation (2026-01-03)
- `20260103000000_create_user.sql` - User table
- `20260103000001_rls_user_beacon_eventrsvp.sql` - Initial RLS
- `20260103000002_create_beacon_eventrsvp.sql` - Beacon & EventRSVP
- `20260103000003_user_auth_user_id.sql` - Auth integration

#### Phase 2: Core Features (2026-01-04)
- `20260104033500_create_right_now_status.sql` - Real-time status
- `20260104051500_add_soundcloud_urn.sql` - SoundCloud integration
- `20260104073000_add_release_fields_to_Beacon.sql` - Release features
- `20260104080000_add_get_server_time_rpc.sql` - Server time RPC
- `20260104091000_create_marketplace_tables.sql` - Full marketplace
- `20260104103000_create_social_core_tables.sql` - Social features
- `20260104121500_create_messaging_notifications_storage.sql` - Messaging
- `20260104140000_create_cart_items.sql` - Shopping cart
- `20260104150000_make_scanme_admin.sql` - Admin setup
- `20260104160000_create_uploads_bucket_and_rls.sql` - File storage
- `20260104164500_create_user_follows_and_user_vibes.sql` - Follows
- `20260104172500_create_reports_and_user_activity.sql` - Moderation

#### Phase 3: Refinements (2026-01-05 to 2026-01-07)
- Cart RLS fixes, Shopify integration, OAuth tables
- User field extensions, missing feature tables
- Marketplace field fixes

#### Phase 4: Advanced Features (2026-01-08 to 2026-01-26)
- Real-time publications, presence tracking
- Secure profile listing RPCs
- GDPR compliance, referrals, search analytics
- Extended beacon fields, user interactions, activity feed
- Support tickets, premium content, subscriptions
- **Security hardening**: `20260126100000_tighten_rls_policies.sql`

### Running Migrations

#### Option 1: Supabase CLI (Recommended)

```bash
# Initialize Supabase (first time only)
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Check migration status
supabase db diff

# Run all pending migrations
supabase db push

# Create a new migration
supabase migration new your_migration_name
```

#### Option 2: Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of each migration file (in order)
3. Execute one by one
4. Verify success before proceeding

#### Option 3: Manual SQL Execution

```bash
# Connect to database
psql "postgresql://user:pass@host:port/db"

# Run migrations in order
\i supabase/migrations/20260103000000_create_user.sql
\i supabase/migrations/20260103000001_rls_user_beacon_eventrsvp.sql
# ... and so on
```

### Migration Safety

**Before running migrations:**

1. **Backup database**: 
   ```bash
   pg_dump "postgresql://..." > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test on staging**: Run migrations on staging environment first

3. **Check dependencies**: Ensure migrations run in order (sorted by filename)

4. **Verify RLS**: After migrations, verify RLS policies are active

5. **Test real data**: Insert test records and verify access controls

## Row Level Security

All tables have RLS enabled. See `RLS_POLICY_ANALYSIS.md` for detailed security audit.

### RLS Categories

#### 🔒 Owner-Only
- cart_items, notifications, user_privacy_settings, user_private_profile
- Users can only access their own records

#### 🔒 Party-Only
- orders, order_items (buyer OR seller only)
- Critical for financial data security

#### 🔒 Participant-Only
- messages, chat_threads, bot_sessions
- Only conversation participants have access

#### ⚠️ Authenticated Read
- User profiles (for discovery)
- right_now_status (for "what's happening now")
- Social features (follows, vibes, tribes)
- Public content (posts, comments, reviews)

### Testing RLS

```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Should return 0 rows

-- List all policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

## Real-time Features

### Subscriptions

The app uses Supabase real-time subscriptions for live updates:

#### Globe.jsx - Beacon Updates
```javascript
base44.entities.Beacon.subscribe(
  { event: '*', schema: 'public', table: 'Beacon' },
  (payload) => {
    // Handle beacon insert/update/delete
  }
);
```

#### Connect.jsx - User Presence
```javascript
// Real-time presence tracking
channel.on('presence', { event: 'sync' }, () => {
  // Update nearby users list
});
```

### Real-time Configuration

Migration: `20260108090000_realtime_publication_user.sql`

```sql
-- Enable real-time for User table
ALTER PUBLICATION supabase_realtime ADD TABLE "User";
```

## Storage Buckets

### uploads Bucket
**Purpose**: User-generated content (avatars, photos, etc.)  
**RLS**: Authenticated users can upload, public can read  
**Migration**: `20260104160000_create_uploads_bucket_and_rls.sql`

```sql
-- Storage policies
CREATE POLICY "uploads_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "uploads_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'uploads');
```

### Usage in Code

```javascript
// Upload file
const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`avatars/${userId}.jpg`, file);

// Get public URL
const { data } = supabase.storage
  .from('uploads')
  .getPublicUrl('avatars/user123.jpg');
```

## Database Functions

### get_server_time()
**Purpose**: Get consistent server timestamp  
**Returns**: Current server time in UTC  
**Migration**: `20260104080000_add_get_server_time_rpc.sql`

```sql
SELECT get_server_time();
```

### list_profiles_secure()
**Purpose**: Get filtered user profiles for discovery  
**Returns**: Safe profile fields (hides sensitive data)  
**Migration**: `20260108101500_list_profiles_secure.sql`

```sql
SELECT * FROM list_profiles_secure(
  filters := '{"city": "London"}'::jsonb,
  limit_count := 50
);
```

### presence_locations()
**Purpose**: Get user presence locations  
**Returns**: Active user locations for map display  
**Migration**: `20260108093000_presence_locations_rpc.sql`

## Maintenance

### Routine Tasks

#### Daily
- Monitor notification_outbox for stuck notifications
- Check for failed payment/order processing

#### Weekly
- Review profile_views, product_views analytics
- Check user_blocks for patterns (abuse detection)
- Monitor xp_ledger for unusual activity

#### Monthly
- VACUUM ANALYZE (Supabase handles automatically)
- Review slow query logs
- Archive old notifications/activity_feed entries

### Performance Indexes

Key indexes created by migrations:

```sql
-- User lookups
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_city ON "User"(city);
CREATE INDEX idx_user_auth_user_id ON "User"(auth_user_id);

-- Beacon queries
CREATE INDEX idx_beacon_organizer ON "Beacon"(organizer_email);
CREATE INDEX idx_beacon_event_date ON "Beacon"(event_date);
CREATE INDEX idx_beacon_location ON "Beacon" USING GIST (
  ll_to_earth(latitude, longitude)
);

-- Orders
CREATE INDEX idx_orders_buyer ON orders(buyer_email);
CREATE INDEX idx_orders_seller ON orders(seller_email);
CREATE INDEX idx_orders_status ON orders(status);

-- Messages
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_sender ON messages(sender_email);
```

### Monitoring Queries

```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Slow queries (if enabled)
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Troubleshooting

### Common Issues

#### RLS Blocking Legitimate Access
**Symptoms**: Queries return empty results or permission denied  
**Solution**: Check RLS policies, verify JWT email matches expected pattern

```sql
-- Check user's email from JWT
SELECT auth.jwt() ->> 'email';

-- Test policy
SELECT * FROM orders WHERE buyer_email = (auth.jwt() ->> 'email');
```

#### Real-time Subscriptions Not Working
**Symptoms**: Live updates not appearing  
**Solution**: Verify table is added to realtime publication

```sql
-- Check realtime tables
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add table if missing
ALTER PUBLICATION supabase_realtime ADD TABLE your_table_name;
```

#### Table Not Found Errors
**Symptoms**: "relation does not exist"  
**Solution**: Check table name case sensitivity (User vs users)

The codebase uses fallback logic in `supabaseClient.jsx`:
```javascript
// Tries "User" first, falls back to "users"
await runWithTableFallback(['User', 'users'], queryFn);
```

## Additional Resources

- **Database Audit**: `DATABASE_AUDIT_REPORT.md` - Complete migration status
- **RLS Analysis**: `RLS_POLICY_ANALYSIS.md` - Security policy review
- **Verification Script**: `scripts/verify-database.js` - Automated checks
- **RLS Audit SQL**: `scripts/audit-rls-policies.sql` - Manual RLS verification
- **Supabase Docs**: https://supabase.com/docs

## Change Log

- **2026-01-26**: Added RLS_POLICY_ANALYSIS.md, tightened critical policies
- **2026-01-26**: Added premium content tables, Stripe subscription fields
- **2026-01-26**: Added support tickets table
- **2026-01-15**: Major schema expansion (tribes, interactions, activity_feed)
- **2026-01-10**: Added GDPR tables, search analytics, referrals
- **2026-01-08**: Added user_tribes, push_subscriptions, presence tracking
- **2026-01-07**: Added missing feature tables consolidation
- **2026-01-04**: Initial marketplace, social, messaging foundations
- **2026-01-03**: Database initialization with User, Beacon, EventRSVP
