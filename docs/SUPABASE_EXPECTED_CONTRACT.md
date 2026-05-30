# HOTMESS Expected Supabase Contract

**Derived from:** Code analysis of `src/`  
**Generated:** 2026-02-20

## Direct `.from()` Table References

These tables are directly referenced via Supabase queries in the codebase.

### Tables Code Expects (from `.from()` calls)

| Table | Live Status | Action Needed |
|-------|-------------|---------------|
| `account_deletion_requests` | ❌ MISSING | Create table |
| `age_verifications` | ❌ MISSING | Create table |
| `Beacon` | ⚠️ Case mismatch | Create view alias for `beacons` |
| `beacon_checkins` | ❌ MISSING | Create table (or use beacon_scans) |
| `beacon_purchases` | ❌ MISSING | Create table |
| `beacon_tiers` | ❌ MISSING | Create table |
| `beacons` | ✅ EXISTS | Missing: `kind`, `mode` columns |
| `business_amplifications` | ❌ MISSING | Create table |
| `business_analytics_daily` | ❌ MISSING | Create table |
| `business_presence` | ❌ MISSING | Create table |
| `business_profiles` | ❌ MISSING | Create table |
| `business_signals` | ❌ MISSING | Create table |
| `businesses` | ❌ MISSING | Create table |
| `cart_items` | ❌ MISSING | Create table |
| `city_cadence` | ❌ MISSING | Create table |
| `city_readiness` | ❌ MISSING | Create table |
| `creator_content` | ❌ MISSING | Create table |
| `creator_products` | ❌ MISSING | Create table |
| `creator_profiles` | ❌ MISSING | Create table |
| `custom_content_requests` | ❌ MISSING | Create table |
| `data_export_requests` | ❌ MISSING | Create table |
| `event_scraper_runs` | ❌ MISSING | Create table |
| `EventRSVP` | ⚠️ Case mismatch | Create view (table is `event_rsvps` or similar) |
| `events` | ✅ EXISTS | Missing: `starts_at`, `ends_at` for range queries |
| `globe_heat_tiles` | ❌ MISSING | Create table |
| `handshake` | ❌ MISSING | Create table |
| `location_shares` | ❌ MISSING | Create table |
| `marketplace_order` | ❌ MISSING | Create table |
| `media` | ❌ MISSING | Create table |
| `message` | ⚠️ Singular | Use `messages` (exists) |
| `moderation_appeals` | ❌ MISSING | Create table |
| `notification` | ⚠️ Singular | Use `notifications` (exists) |
| `notification_outbox` | ❌ MISSING | Create table |
| `notification_preferences` | ❌ MISSING | Create table |
| `notifications` | ✅ EXISTS | OK |
| `personas` | ✅ EXISTS | OK |
| `preloved_listings` | ❌ MISSING | Create table |
| `presence` | ⚠️ Name mismatch | Create view for `user_presence` |
| `product_orders` | ❌ MISSING | Create table |
| `product_saves` | ❌ MISSING | Create table |
| `products` | ❌ MISSING | Create table |
| `profile_embeddings` | ❌ MISSING | Create table |
| `profiles` | ✅ EXISTS | OK |
| `push_subscriptions` | ❌ MISSING | Create table |
| `radio_listeners` | ❌ MISSING | Create table |
| `radio_shows` | ✅ EXISTS | OK |
| `radio_signals` | ❌ MISSING | Create table |
| `referrals` | ❌ MISSING | Create table |
| `rtc_signals` | ❌ MISSING | Create table |
| `safety_checkins` | ❌ MISSING | Create table |
| `safety_incidents` | ❌ MISSING | Create table |
| `search_analytics` | ❌ MISSING | Create table |
| `sellers` | ✅ EXISTS | OK |
| `stories` | ❌ MISSING | Create table |
| `support_tickets` | ❌ MISSING | Create table |
| `ticket_chat_messages` | ❌ MISSING | Create table |
| `ticket_chat_threads` | ❌ MISSING | Create table |
| `ticket_listings` | ❌ MISSING | Create table |
| `ticket_purchases` | ❌ MISSING | Create table |
| `ticket_responses` | ❌ MISSING | Create table |
| `trusted_contacts` | ❌ MISSING | Create table |
| `uploads` | ❌ MISSING | Create table |
| `User` | ⚠️ Case mismatch | Create view alias for `users` |
| `user_activity` | ❌ MISSING | Create table |
| `user_follows` | ❌ MISSING | Create table |
| `user_interactions` | ❌ MISSING | Create table |
| `user_streaks` | ❌ MISSING | Create table |
| `user_vibes` | ❌ MISSING | Create table |
| `venues` | ✅ EXISTS | OK |
| `video_calls` | ❌ MISSING | Create table |
| `xp_transactions` | ❌ MISSING | Create table (use `xp_ledger`?) |

---

## Entity Tables (from base44.entities)

These are accessed via the base44 entity system in `supabaseClient.jsx`.

| Entity Name | Expected Table | Live Status |
|-------------|----------------|-------------|
| `Achievement` | `achievements` | ❌ MISSING |
| `ActivityFeed` | `activity_feed` | ❌ MISSING |
| `AudioMetadata` | `audio_metadata` | ❌ MISSING |
| `Beacon` | `beacons` | ✅ EXISTS |
| `BeaconBookmark` | `beacon_bookmarks` | ❌ MISSING |
| `BeaconCheckin` | `beacon_checkins` | ❌ MISSING |
| `BeaconComment` | `beacon_comments` | ❌ MISSING |
| `Bookmark` | `bookmarks` | ❌ MISSING |
| `BotSession` | `bot_sessions` | ❌ MISSING |
| `CartItem` | `cart_items` | ❌ MISSING |
| `ChallengeCompletion` | `challenge_completions` | ❌ MISSING |
| `ChatMessage` | `chat_messages` | ❌ MISSING |
| `ChatThread` | `chat_threads` | ❌ MISSING |
| `City` | `cities` | ✅ EXISTS |
| `CommunityPost` | `community_posts` | ❌ MISSING |
| `ContentUnlock` | `content_unlocks` | ❌ MISSING |
| `DailyChallenge` | `daily_challenges` | ❌ MISSING |
| `Event` | `events` | ✅ EXISTS |
| `EventRsvp` | `event_rsvps` | ❌ MISSING |
| `EventView` | `event_views` | ❌ MISSING |
| `FeaturedListing` | `featured_listings` | ❌ MISSING |
| `Like` | `likes` | ❌ MISSING |
| `MarketplaceReview` | `marketplace_reviews` | ❌ MISSING |
| `Message` | `messages` | ✅ EXISTS |
| `Notification` | `notifications` | ✅ EXISTS |
| `NotificationOutbox` | `notification_outbox` | ❌ MISSING |
| `Order` | `orders` | ❌ MISSING |
| `OrderDispute` | `order_disputes` | ❌ MISSING |
| `OrderItem` | `order_items` | ❌ MISSING |
| `PostComment` | `post_comments` | ❌ MISSING |
| `PostLike` | `post_likes` | ❌ MISSING |
| `PremiumUnlock` | `premium_unlocks` | ❌ MISSING |
| `Product` | `products` | ❌ MISSING |
| `ProductFavorite` | `product_favorites` | ❌ MISSING |
| `ProductOffer` | `product_offers` | ❌ MISSING |
| `ProductView` | `product_views` | ❌ MISSING |
| `ProfileBadge` | `profile_badges` | ❌ MISSING |
| `ProfileView` | `profile_views` | ❌ MISSING |
| `Promotion` | `promotions` | ❌ MISSING |
| `Report` | `reports` | ✅ EXISTS |
| `Review` | `reviews` | ❌ MISSING |
| `RightNowStatus` | `right_now_status` | ❌ Use `right_now_posts` |
| `SafetyCheckin` | `safety_checkins` | ❌ MISSING |
| `SellerPayout` | `seller_payouts` | ❌ MISSING |
| `SellerRating` | `seller_ratings` | ❌ MISSING |
| `Squad` | `squads` | ❌ MISSING |
| `SquadChallenge` | `squad_challenges` | ❌ MISSING |
| `SquadMember` | `squad_members` | ❌ MISSING |
| `Subscription` | `subscriptions` | ❌ MISSING |
| `TrustedContact` | `trusted_contacts` | ❌ MISSING |
| `User` | `users` | ✅ EXISTS |
| `UserAchievement` | `user_achievements` | ❌ MISSING |
| `UserActivity` | `user_activities` | ❌ MISSING |
| `UserBlock` | `user_blocks` | ❌ MISSING |
| `UserFollow` | `user_follows` | ❌ MISSING |
| `UserHighlight` | `user_highlights` | ❌ MISSING |
| `UserIntent` | `user_intents` | ❌ MISSING |
| `UserInteraction` | `user_interactions` | ❌ MISSING |
| `UserStreak` | `user_streaks` | ❌ MISSING |
| `UserTag` | `user_tags` | ❌ MISSING |
| `UserTribe` | `user_tribes` | ❌ MISSING |
| `UserVibe` | `user_vibes` | ❌ MISSING |
| `VenueKing` | `venue_kings` | ❌ MISSING |
| `XpLedger` | `xp_ledger` | ✅ EXISTS |

---

## Required Column Filters (from console errors)

| Table | Filter | Expected Column | Status |
|-------|--------|-----------------|--------|
| `beacons` | `.eq('kind', 'event')` | `kind` | ❌ MISSING |
| `beacons` | `.eq('mode', 'radio')` | `mode` | ❌ MISSING |
| `beacons` | `.eq('active', true)` | `active` | ✅ EXISTS |
| `beacons` | `.eq('status', 'published')` | `status` | ✅ EXISTS |
| `users` | `.order('created_date')` | `created_date` | ❌ Use `created_at` |
| `cities` | `.order('created_date')` | `created_date` | ❌ Use `created_at` |
| `events` | `.gte('starts_at', ...)` | `starts_at` | ❌ MISSING |
| `events` | `.lte('ends_at', ...)` | `ends_at` | ❌ MISSING |
| `right_now_status` | `.eq('active', true)` | table missing | ❌ MISSING |
| `presence` | `.gt('expires_at', ...)` | `expires_at` | ❌ MISSING |

---

## Priority Fixes (Critical Path)

### P0 - Immediate (Blocking Production)

1. **Add `kind` and `mode` columns to `beacons`** - or alias `type` → `kind`
2. **Create view `right_now_status`** - alias for `right_now_posts` with `active` column
3. **Create view `presence`** - alias for `user_presence` with `expires_at`
4. **Create table `beacon_checkins`** - for check-in tracking
5. **Create views for PascalCase tables** - `Beacon`, `User`, `City`

### P1 - High (Core Features)

- `user_activities` table
- `user_intents` table
- `user_follows` table
- `cart_items` table
- `preloved_listings` table

### P2 - Medium (Extended Features)

- All marketplace tables
- Creator tables
- Business tables
- Safety tables
