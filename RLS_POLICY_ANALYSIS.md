# RLS Policy Security Analysis

**Generated**: 2026-01-26  
**Status**: ✅ GOOD - Most critical policies tightened, some intentionally permissive for discovery

## Executive Summary

- ✅ **Critical tables secured**: orders, messages, cart_items, notifications properly restricted
- ✅ **Recent hardening**: `20260126100000_tighten_rls_policies.sql` tightened messaging & notifications
- ⚠️ **Intentionally permissive**: User, right_now_status, achievements (for discovery features)
- ⚠️ **Review needed**: Some social tables may be too permissive (62 instances of `using (true)`)

## RLS Status by Category

### 🔒 SECURE - Critical Financial/Private Tables

#### Orders & Payments
**Status**: ✅ EXCELLENT - Party-only access

```sql
-- orders: Only buyer OR seller can access
using (
  (auth.jwt() ->> 'email') = buyer_email
  OR (auth.jwt() ->> 'email') = seller_email
)

-- order_items: Same party-only logic
-- promotions: seller-only access
-- seller_payouts: seller-only access
```

**Assessment**: Production-ready. Only transaction parties have access.

#### Cart Items
**Status**: ✅ SECURE - Owner-only access

```sql
-- cart_items: User can only see/modify their own cart
using ((auth.jwt() ->> 'email') = user_email)
```

**Assessment**: Production-ready. Users can only access their own carts.

#### Subscriptions & Billing
**Status**: ✅ LIKELY SECURE - Verify implementation

Tables: `subscriptions`, `billing_receipts`

**Recommendation**: Verify these have owner-only policies similar to cart_items.

### 🔒 SECURE - Communication Tables

#### Messages
**Status**: ✅ EXCELLENT - Participant-only (as of 2026-01-26)

```sql
-- messages: Can only see messages in threads where user is participant
using (
  EXISTS (
    SELECT 1 FROM public.chat_threads
    WHERE chat_threads.id = messages.thread_id
    AND (auth.jwt() ->> 'email') = ANY(chat_threads.participant_emails)
  )
)

-- Insert: Must be sender and participant in thread
with check (
  sender_email = (auth.jwt() ->> 'email')
  AND EXISTS (SELECT 1 FROM chat_threads WHERE ...)
)
```

**Assessment**: Production-ready. Properly restricts to thread participants.

#### Chat Threads
**Status**: ✅ EXCELLENT - Participant-only

```sql
using ((auth.jwt() ->> 'email') = ANY(participant_emails))
```

**Assessment**: Production-ready. Only thread participants can access.

#### Notifications
**Status**: ✅ EXCELLENT - Owner-only (as of 2026-01-26)

```sql
-- notifications: Users can only see their own notifications
using (user_email = (auth.jwt() ->> 'email'))
```

**Assessment**: Production-ready. Users only see their own notifications.

#### Bot Sessions
**Status**: ✅ EXCELLENT - Participant-only

```sql
using (
  initiator_email = (auth.jwt() ->> 'email')
  OR target_email = (auth.jwt() ->> 'email')
)
```

**Assessment**: Production-ready. Only session participants have access.

### ⚠️ INTENTIONALLY PERMISSIVE - Discovery Features

#### User Profiles
**Status**: ⚠️ PERMISSIVE BY DESIGN

```sql
-- User: Authenticated users can read ALL profiles
for select to authenticated using (true);
```

**Purpose**: Required for:
- Connect discovery page
- Nearby People feature
- User search
- Profile viewing

**Security Notes**:
- Intentionally exposes profile data (including email) to authenticated users
- Required for social discovery features
- Migration notes suggest future improvement: "Tighten later by switching to a public view/RPC that only returns safe fields"

**Recommendations**:
1. ✅ **Accept for MVP**: This is a common pattern for social apps
2. 🔄 **Future enhancement**: Create a public view/RPC that filters sensitive fields:
   - Expose: display_name, avatar, bio, city, vibes, interests
   - Hide: email (or hash/obscure), private_profile fields, admin flags
3. 📝 **Document**: Clearly state in privacy policy that profiles are visible to authenticated users

#### Right Now Status
**Status**: ⚠️ PERMISSIVE FOR SELECT (intentional)

```sql
-- SELECT: All authenticated users can see statuses (discovery)
for select to authenticated using (true);

-- INSERT/UPDATE/DELETE: Own records only (secured as of 2026-01-26)
for insert/update/delete using (user_email = (auth.jwt() ->> 'email'))
```

**Assessment**: Intentional. This is a public "what I'm doing right now" feature.

### ⚠️ REVIEW NEEDED - Social Features

The following tables have `using (true)` policies and should be reviewed:

#### Social Discovery Tables (Likely OK)
- **user_follows**: All authenticated can see who follows whom (typical for social networks)
- **user_vibes**: Public vibe compatibility data (discovery feature)
- **user_tribes**: Public tribe membership (discovery/matching)
- **user_interactions**: Tracking table (may need restrictions)
- **achievements**: Public achievement definitions (gamification)
- **user_achievements**: Public user achievements (profile display)

#### Content Tables (Likely OK)
- **community_posts**: Public posts (social feature)
- **post_likes**: Public likes (engagement metrics)
- **post_comments**: Public comments (social interaction)
- **beacon_comments**: Public beacon comments (event discussion)
- **reviews**: Public reviews (marketplace)
- **marketplace_reviews**: Public product reviews

#### Analytics Tables (Review)
- **profile_views**: Who viewed my profile? (might want to restrict)
- **product_views**: Product analytics (might restrict to seller)
- **event_views**: Event analytics (might restrict to organizer)

#### Challenge/Gamification (Likely OK)
- **daily_challenges**: Public challenges (everyone can see)
- **challenge_completions**: Public completions (leaderboards)
- **user_streaks**: Public streaks (gamification)
- **venue_kings**: Public leaderboard (competition feature)

### 🔍 NEED VERIFICATION

The following critical tables should be manually verified:

1. **subscriptions** - Should be owner-only
2. **billing_receipts** - Should be owner-only
3. **payment_methods** - Should be owner-only (if exists)
4. **user_privacy_settings** - Should be owner-only
5. **user_private_profile** - Should be owner-only
6. **gdpr_requests** - Should be owner-only

## Permissive Policies Breakdown

Found 62 instances of `using (true)` or `with check (true)` across migrations:

### By File:
- `20260107091000_missing_feature_tables.sql`: 15 instances
- `20260104121500_create_messaging_notifications_storage.sql`: 14 instances (⚠️ FIXED in later migration)
- `20260104103000_create_social_core_tables.sql`: 11 instances
- `20260104033500_create_right_now_status.sql`: 4 instances
- `20260103000001_rls_user_beacon_eventrsvp.sql`: 2 instances
- Others: Various (user_tribes, user_follows, user_vibes, etc.)

## Recommendations by Priority

### 🔴 CRITICAL (Do before production)

1. **Verify payment tables** (subscriptions, billing_receipts)
   - Ensure owner-only access
   - Test with authenticated users trying to access others' data

2. **Verify privacy tables** (user_privacy_settings, user_private_profile)
   - Must be owner-only
   - Critical for GDPR compliance

### 🟡 MEDIUM (Consider for production)

3. **Review analytics tables**
   - `profile_views`: Consider restricting to profile owner
   - `product_views`: Consider restricting to product seller
   - `event_views`: Consider restricting to event organizer
   - Decision: Balance analytics features vs. privacy

4. **Enhance User profile security**
   - Create filtered view/RPC for safe public profile fields
   - Hide email or use hashed/obfuscated version for public display
   - Keep full access via `list_profiles_secure` RPC (already exists!)

5. **Review social discovery tables**
   - Document intentional permissive policies
   - Consider privacy settings to opt-out of discovery
   - Ensure user_blocks is properly enforced

### 🟢 LOW (Nice to have)

6. **Audit user_interactions table**
   - Determine if tracking should be restricted
   - Consider aggregated views instead of raw data

7. **Add RLS check RPC**
   ```sql
   CREATE OR REPLACE FUNCTION check_rls_status()
   RETURNS TABLE(tablename text, rowsecurity boolean) AS $$
     SELECT tablename, rowsecurity 
     FROM pg_tables 
     WHERE schemaname = 'public'
     ORDER BY rowsecurity DESC, tablename;
   $$ LANGUAGE sql SECURITY DEFINER;
   ```

## Testing Checklist

Before production deployment, test:

- [ ] **Orders**: User A cannot see User B's orders
- [ ] **Messages**: User A cannot see User B's private messages
- [ ] **Cart**: User A cannot see User B's cart items
- [ ] **Notifications**: User A cannot see User B's notifications
- [ ] **Subscriptions**: User A cannot see User B's subscription status
- [ ] **Profile discovery**: Authenticated users CAN see other profiles (intentional)
- [ ] **User blocks**: Blocked users cannot interact/see content
- [ ] **Admin access**: Admin role can access necessary tables
- [ ] **Unauthenticated access**: Anonymous users cannot access protected data

## SQL Testing Queries

Run these queries to verify RLS (as different users):

```sql
-- Test 1: Try to access another user's orders (should return empty)
SELECT * FROM orders WHERE buyer_email != (auth.jwt() ->> 'email');

-- Test 2: Try to see another user's messages (should return empty or error)
SELECT * FROM messages WHERE sender_email != (auth.jwt() ->> 'email');

-- Test 3: Verify you CAN see other users' profiles (intentional)
SELECT email, display_name FROM "User" WHERE email != (auth.jwt() ->> 'email');

-- Test 4: Try to update another user's profile (should fail)
UPDATE "User" SET bio = 'hacked' WHERE email != (auth.jwt() ->> 'email');
```

## Migration History

### 2026-01-26: Major RLS Tightening
Migration: `20260126100000_tighten_rls_policies.sql`

**Tightened**:
- ✅ notifications: from `using (true)` → owner-only
- ✅ chat_threads: from `using (true)` → participant-only
- ✅ messages: from `using (true)` → thread participant-only
- ✅ bot_sessions: from `using (true)` → session participant-only
- ✅ right_now_status: Tightened INSERT/UPDATE/DELETE to owner-only (SELECT remains open)
- ✅ squads: Tightened UPDATE to members, DELETE to creator
- ✅ venue_kings: Tightened UPDATE to king only

**Note**: Migration explicitly documents that SELECT policies with `using (true)` are intentional for public discovery features (achievements, reviews, posts, comments).

### 2026-01-06: User Profile Discovery
Migration: `20260106150000_rls_user_select_all_authenticated.sql`

**Added**: Authenticated users can view all User profiles
**Purpose**: Enable Connect discovery, messaging, Nearby People
**Note**: Documented as needing future tightening via view/RPC

## Conclusion

✅ **Production-ready status**: GOOD with caveats

**Strengths**:
- Critical financial tables (orders, cart_items) properly secured
- Communication tables (messages, notifications) properly secured (as of 2026-01-26)
- Recent security audit and tightening completed

**Caveats**:
- User profiles intentionally expose email to authenticated users (document in privacy policy)
- Some analytics tables may be too permissive (consider restricting)
- Need to verify payment/subscription table policies

**Action items before production**:
1. Verify payment-related table RLS (subscriptions, billing_receipts)
2. Verify privacy-related table RLS (user_privacy_settings, user_private_profile)
3. Test RLS with multiple users (use testing queries above)
4. Document intentional permissive policies in privacy policy
5. Consider implementing filtered profile view/RPC for enhanced privacy

**Overall assessment**: The database has good RLS coverage with recent security hardening. The permissive policies are largely intentional for social discovery features, which is appropriate for a social networking app. Main concern is ensuring payment/privacy tables are properly secured before production.
