# Supabase Migration & Deployment Checklist

This document provides a checklist to ensure all Supabase configurations are properly deployed and synchronized.

## Migration Status

Total migrations in repository: **83 migrations**

Location: `/supabase/migrations/`

## Deployment Checklist

### 1. Database Migrations

#### Production (Supabase Dashboard)

- [ ] Go to your [Supabase Dashboard](https://app.supabase.com/)
- [ ] Select your project (klsywpvncqqglhnhrjbh)
- [ ] Navigate to **Database** → **Migrations**
- [ ] Verify all 83 migrations are listed and applied
- [ ] Check the latest migrations include:
  - [ ] Check if GitHub integration is set up (Project Settings → Integrations)
  - [ ] If no GitHub integration, manually apply migrations via SQL Editor

#### Local Development (Supabase CLI)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Initialize local Supabase (if not done)
supabase start

# Apply all migrations
supabase db reset

# Verify migrations
supabase migration list
```

### 2. OAuth Provider Configuration

#### Google OAuth Setup

- [ ] **Google Cloud Console**:
  - [ ] Created OAuth 2.0 Client ID
  - [ ] Added authorized redirect URI: `https://klsywpvncqqglhnhrjbh.supabase.co/auth/v1/callback`
  - [ ] Saved Client ID and Client Secret
  
- [ ] **Supabase Dashboard**:
  - [ ] Navigate to **Authentication** → **Providers**
  - [ ] Enable **Google** provider
  - [ ] Enter Client ID
  - [ ] Enter Client Secret
  - [ ] Click **Save**

#### Site URL & Redirect URLs

- [ ] Navigate to **Authentication** → **URL Configuration**
- [ ] Set **Site URL** to production domain: `https://hotmess.london`
- [ ] Add **Redirect URLs**:
  - [ ] `https://hotmess.london`
  - [ ] `https://hotmess.london/auth`
  - [ ] Any staging/preview URLs if needed
- [ ] Click **Save**

### 3. Environment Variables

#### Vercel (or Deployment Platform)

Verify these are set in **Vercel** → **Project Settings** → **Environment Variables**:

- [ ] `VITE_SUPABASE_URL` = `https://klsywpvncqqglhnhrjbh.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY` = Your anon key
- [ ] `SUPABASE_URL` = `https://klsywpvncqqglhnhrjbh.supabase.co` (for server functions)
- [ ] `SUPABASE_ANON_KEY` = Your anon key (for server functions)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (for admin operations)

**Note**: Google OAuth credentials are configured in Supabase Dashboard, NOT in Vercel env vars.

#### Local Development

Create `.env.local` (never commit this file):

```bash
# Supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your_local_anon_key

# Google OAuth (for local Supabase only)
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

### 4. Storage Buckets

Verify storage buckets are created:

- [ ] Navigate to **Storage** in Supabase Dashboard
- [ ] Verify `uploads` bucket exists (for user-uploaded files)
- [ ] Check RLS policies are applied (see migration `20260104160000_create_uploads_bucket_and_rls.sql`)

### 5. Row Level Security (RLS)

Verify RLS policies are enabled:

- [ ] Navigate to **Authentication** → **Policies**
- [ ] Check key tables have RLS enabled:
  - [ ] `User` / `users` table
  - [ ] `Beacon` / `beacons` table
  - [ ] `Event` / `events` table
  - [ ] `cart_items` table
  - [ ] `marketplace_products` table
  - [ ] All other tables per migration files

### 6. Realtime Subscriptions

Verify realtime is enabled for key tables:

- [ ] Navigate to **Database** → **Replication**
- [ ] Enable realtime for:
  - [ ] `beacons` (for Globe updates)
  - [ ] `presence` (for "Right Now" feature)
  - [ ] `messages` (for real-time messaging)
  - [ ] `threads` (for social feed)

### 7. Edge Functions (if applicable)

- [ ] Navigate to **Edge Functions**
- [ ] Verify no legacy functions conflict with `/api/*` serverless functions
- [ ] The repo uses Vercel Serverless Functions (`/api/*`), not Supabase Edge Functions

### 8. Verification Tests

#### Test Authentication
- [ ] Visit `/auth` page
- [ ] Test email/password sign-up
- [ ] Test email/password sign-in
- [ ] Test Google OAuth sign-in
- [ ] Verify user is created in `User` table

#### Test OAuth Callback
- [ ] Click "Continue with Google"
- [ ] Complete Google sign-in
- [ ] Verify redirect back to app with user authenticated
- [ ] Check browser console for errors

#### Test Database Operations
- [ ] Create a test beacon/event
- [ ] Verify it appears in the database
- [ ] Test RLS by trying to access another user's private data
- [ ] Verify realtime updates work (e.g., Globe updates)

### 9. Monitoring & Logs

- [ ] Enable **Logs** in Supabase Dashboard
- [ ] Monitor **Auth** logs for OAuth attempts
- [ ] Check **Database** logs for errors
- [ ] Review **API** logs for failed requests

## Migration List

All migrations in order:

1. `001_os_state_and_presence.sql` - Core OS state tables
2. `20260103000000_create_user.sql` - User table
3. `20260103000001_rls_user_beacon_eventrsvp.sql` - RLS policies
4. `20260103000002_create_beacon_eventrsvp.sql` - Beacons and events
5. `20260103000003_user_auth_user_id.sql` - Auth user ID linkage
6. `20260104033500_create_right_now_status.sql` - Right Now feature
7. `20260104051500_add_soundcloud_urn.sql` - SoundCloud integration
8. `20260104073000_add_release_fields_to_Beacon.sql` - Music releases
9. `20260104074500_seed_release_launch_beacons.sql` - Seed data
10. `20260104080000_add_get_server_time_rpc.sql` - Server time RPC
11. `20260104091000_create_marketplace_tables.sql` - Marketplace
12. `20260104103000_create_social_core_tables.sql` - Social features
13. `20260104121500_create_messaging_notifications_storage.sql` - Messaging
14. `20260104140000_create_cart_items.sql` - Shopping cart
15. `20260104150000_make_scanme_admin.sql` - Admin setup
16. `20260104160000_create_uploads_bucket_and_rls.sql` - File uploads
17. `20260104164500_create_user_follows_and_user_vibes.sql` - Social graph
18. `20260104172500_create_reports_and_user_activity.sql` - Moderation
19. `20260105025000_cart_items_rls_auth_uid.sql` - Cart RLS
20. `20260105093000_cart_items_shopify_variants.sql` - Shopify integration
21. `20260105100000_create_soundcloud_oauth_tables.sql` - SoundCloud OAuth
22. `20260106090000_connect_routing_presence.sql` - Connect feature
23. `20260106150000_rls_user_select_all_authenticated.sql` - User RLS
24. `20260107090000_hotmess_user_fields.sql` - Extended user fields
25. `20260107091000_missing_feature_tables.sql` - Additional features
26. `20260107092000_marketplace_order_field_fixes.sql` - Order fixes
27. `20260108000000_create_user_tribes.sql` - User tribes/groups

## Troubleshooting

### Migrations not applying
- Check migration file syntax (valid SQL)
- Look for dependency issues (e.g., table must exist before adding FK)
- Check Supabase logs for specific errors
- Try applying migrations one by one manually

### OAuth not working
- See [SUPABASE_OAUTH_SETUP.md](./SUPABASE_OAUTH_SETUP.md)
- Verify redirect URIs exactly match
- Check Site URL is set correctly
- Ensure CSP headers allow `accounts.google.com`

### RLS blocking queries
- Verify user is authenticated (check JWT token)
- Review RLS policies in migration files
- Test with service role key to bypass RLS (debugging only)
- Check `auth.uid()` matches expected user ID

## Next Steps

After completing this checklist:

1. Run automated tests (if available)
2. Perform manual QA testing
3. Monitor logs for 24 hours after deployment
4. Document any issues or edge cases discovered

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- Internal team: See project README for contact info
