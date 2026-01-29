# Premium Features Quick Start Guide

**TL;DR**: Set `VITE_XP_PURCHASING_ENABLED=true` and run the migration!

## What Are Premium Features?

Premium features enable creators to monetize their content using the platform's XP currency system:

- **Premium Profiles** - Creators can mark content as premium
- **Content Unlocking** - Users spend XP to unlock individual premium items
- **Subscriptions** - Users subscribe monthly for full access to a creator's premium content
- **Seller Listings** - Marketplace features for selling products with XP

## Quick Setup (2 Steps)

### Step 1: Enable the Feature Flag

Add to your `.env.local` file:
```env
VITE_XP_PURCHASING_ENABLED=true
```

Or in Vercel: **Project → Settings → Environment Variables**

### Step 2: Run the Database Migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open `supabase/migrations/20260128000001_premium_content.sql` in your editor
5. Copy the entire file contents
6. Paste into Supabase SQL Editor
7. Click **Run**

**Verify it worked:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscriptions', 'premium_unlocks', 'premium_content', 'xp_transactions');
```

You should see all 4 tables listed.

## What the Migration Creates

| Table | Purpose |
|-------|---------|
| `subscriptions` | Tracks creator subscription relationships |
| `premium_unlocks` | Records individual content unlock purchases |
| `premium_content` | Metadata for premium content items |
| `xp_transactions` | Audit log for all XP transactions |

Plus RLS policies and helper functions (`has_unlocked_content`, `get_subscriber_count`, `expire_subscriptions`)

## Using Premium Features

### 1. Set a User's Profile Type

```sql
-- Make a user a premium creator
UPDATE "User" 
SET profile_type = 'premium' 
WHERE email = 'creator@example.com';
```

Valid profile types: `'standard'`, `'seller'`, `'creator'`, `'organizer'`, `'premium'`

### 2. Mark Content as Premium

Add to user's photos array:
```json
{
  "url": "https://...",
  "is_premium": true,
  "price_xp": 50,
  "id": "photo_1"
}
```

### 3. Set Subscription Price

```sql
UPDATE "User" 
SET subscription_price_xp = 500 
WHERE email = 'creator@example.com';
```

## API Endpoints

Once enabled, these endpoints become active:

### Unlock Content
```http
POST /api/premium/unlock
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "owner_email": "creator@example.com",
  "unlock_type": "photo",
  "item_id": "photo_1",
  "price_xp": 50
}
```

### Subscribe to Creator
```http
POST /api/premium/subscribe
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "creator_email": "creator@example.com",
  "price_xp": 500
}
```

## Profile Types & Views

Each profile type gets a specialized view:

| Type | Component | Features |
|------|-----------|----------|
| **Standard** | `StandardProfileView.jsx` | Basic social features, photos, tags |
| **Seller** | `SellerProfileView.jsx` | Product listings, shop stats, ratings |
| **Creator** | `CreatorProfileView.jsx` | Music releases, shows, streaming links |
| **Organizer** | `OrganizerProfileView.jsx` | Events, stats, venue partnerships |
| **Premium** | `PremiumProfileView.jsx` | Premium content, subscriptions, unlocks |

## Troubleshooting

### Feature flag not working
- Check spelling: `VITE_XP_PURCHASING_ENABLED=true` (not `false`)
- Restart dev server after changing `.env.local`
- In Vercel, redeploy after setting environment variable

### Migration failed
- Check Supabase SQL Editor for error messages
- Ensure you have proper permissions on your Supabase project
- Tables might already exist - check with:
  ```sql
  SELECT * FROM premium_unlocks LIMIT 1;
  ```

### Content not unlocking
- Verify user has sufficient XP
- Check authentication token is being sent
- Verify migration created RLS policies:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'premium_unlocks';
  ```

### Subscriptions not working
- Ensure `subscription_price_xp` is set on creator profile
- Check subscription hasn't expired (`expires_at` column)
- Verify user's XP balance

## XP Transaction Flow

1. User initiates purchase (unlock or subscribe)
2. API validates user has sufficient XP
3. XP deducted from buyer: `buyer.xp - price_xp`
4. Platform fee calculated (20%): `price_xp * 0.20`
5. Creator credited: `creator.xp + (price_xp - platform_fee)`
6. Transaction logged in `xp_transactions` table
7. Record created in `premium_unlocks` or `subscriptions`

## Need Help?

- See main [README.md](../README.md) for full documentation
- Check [Supabase README](../supabase/README.md) for migration info
- Review migration file: `supabase/migrations/20260128000001_premium_content.sql`
- Check component implementations in `src/components/profile/`

## Quick Reference Commands

```bash
# Enable feature flag locally
echo "VITE_XP_PURCHASING_ENABLED=true" >> .env.local

# Test creator profile locally (after setting profile_type in DB)
npm run dev
# Navigate to: http://localhost:5173/profile/creator@example.com

# Verify tables in Supabase
# (Run in SQL Editor)
\dt premium_*
\dt subscriptions
\dt xp_transactions
```

---

**✅ You're ready!** Premium features should now be fully functional.
