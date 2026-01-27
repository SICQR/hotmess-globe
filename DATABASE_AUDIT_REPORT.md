# Database Audit Report

**Generated**: 2026-01-26  
**Status**: ✅ GOOD - All migrations consolidated, all tables present

## Executive Summary

- ✅ All 48 migration files are properly located in `supabase/migrations/`
- ✅ All 40+ entity tables referenced in code have migrations
- ⚠️ One duplicate: `user_tribes` migration exists twice (20260108000000 and 20260115100200)
- ⚠️ One duplicate: `user_tribes` listed twice in entityTables array (lines 1196 and 1200)
- 🔍 RLS policies need production security audit
- 🔍 Need to test migrations on fresh database

## Migration Files (48 total)

### Core Tables (Jan 3-4, 2026)
- `20260103000000_create_user.sql` - User table with profile fields
- `20260103000001_rls_user_beacon_eventrsvp.sql` - Initial RLS policies
- `20260103000002_create_beacon_eventrsvp.sql` - Beacon & EventRSVP tables
- `20260103000003_user_auth_user_id.sql` - Auth user_id field

### Feature Tables (Jan 4-7, 2026)
- `20260104033500_create_right_now_status.sql` - Real-time status
- `20260104051500_add_soundcloud_urn.sql` - SoundCloud integration
- `20260104073000_add_release_fields_to_Beacon.sql` - Release functionality
- `20260104074500_seed_release_launch_beacons.sql` - Seed data
- `20260104080000_add_get_server_time_rpc.sql` - Server time function
- `20260104091000_create_marketplace_tables.sql` - Products, orders, XP, etc.
- `20260104103000_create_social_core_tables.sql` - Achievements, squads, tags
- `20260104121500_create_messaging_notifications_storage.sql` - Chat & notifications
- `20260104140000_create_cart_items.sql` - Shopping cart
- `20260104150000_make_scanme_admin.sql` - Admin setup
- `20260104160000_create_uploads_bucket_and_rls.sql` - Storage bucket
- `20260104164500_create_user_follows_and_user_vibes.sql` - Social following
- `20260104172500_create_reports_and_user_activity.sql` - Reports & activity

### Refinements (Jan 5-7, 2026)
- `20260105025000_cart_items_rls_auth_uid.sql` - Cart RLS fix
- `20260105093000_cart_items_shopify_variants.sql` - Shopify variants
- `20260105100000_create_soundcloud_oauth_tables.sql` - OAuth tables
- `20260106090000_connect_routing_presence.sql` - Routing & presence
- `20260106150000_rls_user_select_all_authenticated.sql` - User discovery RLS
- `20260107090000_hotmess_user_fields.sql` - Extended User fields
- `20260107091000_missing_feature_tables.sql` - Many missing tables added
- `20260107092000_marketplace_order_field_fixes.sql` - Order field updates

### Recent Additions (Jan 8-26, 2026)
- `20260108000000_create_user_tribes.sql` - ⚠️ Tribes (v1)
- `20260108000001_create_push_subscriptions.sql` - Push notifications
- `20260108090000_realtime_publication_user.sql` - Real-time pub
- `20260108093000_presence_locations_rpc.sql` - Presence RPC
- `20260108101500_list_profiles_secure.sql` - Secure profile listing
- `20260108113200_bot_sessions_add_token_expires.sql` - Bot token expiry
- `20260108123000_list_profiles_secure_auth_meta.sql` - Auth metadata
- `20260109000000_notification_outbox_status_index.sql` - Notification index
- `20260110000000_create_gdpr_tables.sql` - GDPR compliance
- `20260110100000_create_search_analytics.sql` - Search tracking
- `20260110200000_create_referrals.sql` - Referral system
- `20260115100000_expand_beacon_fields_and_shadow_rls.sql` - Extended Beacon fields
- `20260115100100_user_tags_add_label_category_visibility.sql` - Tag enhancements
- `20260115100200_create_user_tribes.sql` - ⚠️ Tribes (v2 - adds tribe_label)
- `20260115100300_create_user_interactions.sql` - Interaction tracking
- `20260115100400_create_activity_feed.sql` - Activity feed
- `20260115100500_polish_notifications_memberships_gdpr.sql` - Notification polish
- `20260115100600_seed_bible_demo_data.sql` - Demo data
- `20260115100700_tighten_notification_outbox_admin_policy.sql` - Admin policy
- `20260116143000_beacon_checkins_dedupe_key.sql` - Check-in deduplication
- `20260126000000_create_support_tickets.sql` - Support system
- `20260126100000_add_stripe_subscription_fields.sql` - Stripe subscriptions
- `20260126100000_tighten_rls_policies.sql` - RLS hardening
- `20260126200000_create_search_functions.sql` - Search functions
- `20260126300000_create_premium_content_tables.sql` - Premium content

## Entity Tables Status

All 40+ tables in `entityTables` array have migrations:

### ✅ Marketplace & Gamification
- orders, order_items, xp_ledger, sweat_coins, promotions, seller_payouts, featured_listings
- cart_items, products (from marketplace migration)

### ✅ Social Features
- user_achievements, achievements, user_friendships, user_follows, user_vibes
- squads, squad_members, user_tags, user_tribes, user_interactions

### ✅ Activity & Engagement
- beacon_checkins, right_now_status, event_rsvps (EventRSVP table)
- user_highlights, profile_views, activity_feed

### ✅ Communication
- messages, chat_threads, bot_sessions, notifications, notification_outbox

### ✅ Moderation & Safety
- reports, user_blocks, trusted_contacts, safety_checkins

### ✅ Content & Discovery
- beacon_comments, daily_challenges, challenge_completions
- cities, user_intents, beacon_bookmarks

### ✅ Community Features
- community_posts, post_likes, post_comments

### ✅ Reviews & Analytics
- reviews, marketplace_reviews, product_views, event_views
- product_favorites, user_streaks, venue_kings, seller_ratings

## Issues Found

### 1. Duplicate user_tribes Migration
**Severity**: LOW (won't cause errors due to IF NOT EXISTS)

Two migrations create the same table:
- `20260108000000_create_user_tribes.sql` - Initial version
- `20260115100200_create_user_tribes.sql` - Enhanced version (adds `tribe_label`, update policy)

**Recommendation**: Keep both (the second enhances the first), or consolidate into single migration if starting fresh.

### 2. Duplicate user_tribes in entityTables
**Severity**: LOW (redundant but harmless)

In `src/components/utils/supabaseClient.jsx`:
- Line 1196: Listed under "Tags and Tribes"
- Line 1200: Listed under "Social/AI interaction tracking"

**Recommendation**: Remove duplicate from line 1200.

### 3. RLS Policy Audit Needed
**Severity**: MEDIUM (security concern)

Some migrations note "intentionally minimal" policies. Need to verify:
- User table: Currently allows authenticated users to read all (for discovery) ✅ Intentional
- EventRSVP: Authenticated users can read all ⚠️ Should limit to event participants/hosts
- Orders: Should only be accessible to buyer/seller ✅ Verify implementation
- Messages: Should only be accessible to participants ✅ Verify implementation
- Cart items: Should only be accessible to owner ✅ Verify implementation

## Tables Created by Migration

| Table Name | Migration File | Purpose |
|------------|----------------|---------|
| User | 20260103000000 | User profiles & auth |
| Beacon | 20260103000002 | Events/locations |
| EventRSVP | 20260103000002 | Event attendees |
| right_now_status | 20260104033500 | Real-time user status |
| products | 20260104091000 | Marketplace products |
| orders | 20260104091000 | Marketplace orders |
| order_items | 20260104091000 | Order line items |
| xp_ledger | 20260104091000 | Experience points |
| achievements | 20260104103000 | Achievement definitions |
| user_achievements | 20260104103000 | User achievements earned |
| squads | 20260104103000 | Groups/squads |
| squad_members | 20260104103000 | Squad membership |
| user_tags | 20260104103000 | User taxonomy tags |
| messages | 20260104121500 | Chat messages |
| chat_threads | 20260104121500 | Chat conversations |
| notifications | 20260104121500 | User notifications |
| bot_sessions | 20260104121500 | AI bot sessions |
| cart_items | 20260104140000 | Shopping cart |
| user_follows | 20260104164500 | Following relationships |
| user_vibes | 20260104164500 | Vibe compatibility |
| reports | 20260104172500 | Content reports |
| UserActivity | 20260104172500 | User activity log |
| user_tribes | 20260108000000 | Community tribes |
| push_subscriptions | 20260108000001 | Web push subscriptions |
| sweat_coins | 20260107091000 | Sweat coin currency |
| beacon_checkins | 20260107091000 | Beacon check-ins |
| user_friendships | 20260107091000 | Friendship connections |
| user_highlights | 20260107091000 | Profile highlights |
| profile_views | 20260107091000 | Profile view tracking |
| user_blocks | 20260107091000 | Blocked users |
| beacon_comments | 20260107091000 | Beacon comments |
| daily_challenges | 20260107091000 | Daily challenges |
| challenge_completions | 20260107091000 | Challenge tracking |
| user_interactions | 20260115100300 | User interaction tracking |
| activity_feed | 20260115100400 | Activity feed items |
| community_posts | 20260115100500 | Community posts |
| post_likes | 20260115100500 | Post reactions |
| post_comments | 20260115100500 | Post comments |
| cities | 20260107091000 | City taxonomy |
| user_intents | 20260107091000 | User intent tracking |
| beacon_bookmarks | 20260115100000 | Saved beacons |
| product_favorites | 20260115100000 | Saved products |
| reviews | 20260115100000 | General reviews |
| marketplace_reviews | 20260115100000 | Product reviews |
| product_views | 20260115100000 | Product analytics |
| event_views | 20260115100000 | Event analytics |
| user_streaks | 20260115100000 | Activity streaks |
| venue_kings | 20260115100000 | Venue leaderboards |
| seller_ratings | 20260115100000 | Seller ratings |
| promotions | 20260104091000 | Promotional codes |
| seller_payouts | 20260104091000 | Seller payments |
| featured_listings | 20260104091000 | Featured products |
| trusted_contacts | 20260115100500 | Emergency contacts |
| safety_checkins | 20260115100500 | Safety check-ins |
| notification_outbox | 20260115100500 | Notification queue |

## Storage Buckets

- `uploads` - Created in `20260104160000_create_uploads_bucket_and_rls.sql`
  - RLS policies for authenticated upload/download
  - Used for user-generated content

## Next Steps

### 1. Code Cleanup (15 minutes)
- [ ] Remove duplicate `user_tribes` from entityTables array (line 1200)

### 2. RLS Security Audit (2-3 hours)
- [ ] Review all RLS policies for production appropriateness
- [ ] Tighten EventRSVP policies (limit to event participants)
- [ ] Verify orders/messages policies enforce party-only access
- [ ] Document security decisions

### 3. Migration Testing (2 hours)
- [ ] Create fresh Supabase project for testing
- [ ] Run all migrations in sequence
- [ ] Verify all tables created successfully
- [ ] Test sample data insertion
- [ ] Verify RLS policies work as expected

### 4. Database Connection Testing (1-2 hours)
- [ ] Test all base44.entities.* methods
- [ ] Verify real-time subscriptions work
- [ ] Test storage upload/download
- [ ] Verify table fallback logic (User vs users, etc.)

### 5. Documentation (1 hour)
- [ ] Create DATABASE.md with schema overview
- [ ] Document migration execution process
- [ ] Document rollback procedures
- [ ] Create ER diagram

## Conclusion

✅ **The database migrations are in EXCELLENT shape:**
- All migrations properly organized
- All expected tables have migrations
- No missing tables identified
- Only minor cleanup needed (duplicate entityTables entry)

⚠️ **Security audit is the highest priority:**
- RLS policies need production review
- Some policies may be too permissive for production

🚀 **Ready for production after:**
1. RLS security audit and hardening
2. Fresh database migration test
3. Connection testing validation
