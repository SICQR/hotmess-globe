# Agent Task List — Production Readiness

**Updated:** 2026-02-11  
**Purpose:** Ordered task list for production deployment. Complete in sequence.

---

## Phase 0: Database (BLOCKER — must be first)

### Task 0.1: Run Mega-Migration
**File:** `supabase/migrations/*.sql` (all migration files)  
**Where:** Client project SQL Editor: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql`  
**Action:** Run migrations in order (they're timestamped) or use Supabase CLI:
```bash
supabase db push
```
**Done when:** No errors. Verify with:
```sql
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Should return 60+ tables
```

### Task 0.2: Verify All Core Tables Exist
**Where:** Supabase SQL Editor  
**Action:** Run verification query:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'profiles', 'presence_locations', 'Beacon', 'EventRSVP',
  'products', 'orders', 'messages', 'chat_threads',
  'notifications', 'xp_ledger', 'right_now_status',
  'reports', 'user_activity', 'bot_sessions',
  'push_subscriptions', 'cart_items', 'music_releases'
)
ORDER BY table_name;
```
**Done when:** Returns at least 17 core tables.

### Task 0.3: Verify RLS Policies
**Action:** Check that RLS is enabled on critical tables:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'messages', 'products', 'orders')
ORDER BY tablename;
```
**Done when:** All rows show `rowsecurity = true`.

### Task 0.4: Verify Functions Exist
**Action:** Check for required database functions:
```sql
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```
**Done when:** Functions include `get_server_time`, `list_profiles_secure`, etc.

### Task 0.5: Enable Realtime (Manual)
**Where:** Supabase Dashboard → Database → Replication  
**Action:** Ensure these tables are in the `supabase_realtime` publication:
- `presence_locations`
- `Beacon`
- `messages`
- `right_now_status`

**Done when:** Tables appear in Replication settings and real-time events fire.

---

## Phase 1: Environment Variables

### Task 1.1: Set Vercel Environment Variables
**Where:** Vercel Dashboard → Project → Settings → Environment Variables  
**Action:** Set all required variables (see [ENV_VARS.md](./ENV_VARS.md))

**Critical Variables:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

**Set for:** Production, Preview, and Development environments  
**Done when:** All variables set, preview deployment succeeds.

### Task 1.2: Verify Third-Party API Keys
**Shopify:**
- Test Storefront Access Token with a GraphQL query
- Verify checkout domain is configured

**Stripe:**
- Verify webhook secret is set
- Test webhook endpoint with Stripe CLI

**Google Maps:**
- Verify API key has Directions API enabled
- Test with a sample route request

**Done when:** All integrations return valid responses.

---

## Phase 2: GitHub Setup

### Task 2.1: Verify Git Repository
```bash
cd /path/to/hotmess-globe
git remote -v
# Should show correct origin
```

### Task 2.2: Verify .gitignore
**File:** `.gitignore` (should already exist)  
**Verify it includes:**
```
.env
.env.local
.env.*.local
node_modules/
dist/
.vercel
*.log
```
**Done when:** No secrets or build artifacts are committed.

### Task 2.3: Verify .env.example
**File:** `.env.example` (should already exist)  
**Verify it includes:** All required variables with placeholder values  
**Done when:** New developers can copy and configure locally.

### Task 2.4: Push Latest Changes
```bash
git status
git add .
git commit -m "Production readiness: Add agent handoff documentation"
git push origin main
```
**Done when:** All documentation files visible on GitHub.

---

## Phase 3: Vercel Deployment

### Task 3.1: Connect GitHub to Vercel
**Where:** Vercel Dashboard → New Project → Import Git Repository  
**Settings:**
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Node Version: 18.x

**Done when:** Auto-deploy triggers on push to `main`.

### Task 3.2: Verify vercel.json
**File:** `vercel.json` (already exists)  
**Verify configuration includes:**
- Rewrites: `/api/*` → edge functions, `/*` → `index.html` (SPA)
- Security headers: CSP, nosniff, XSS protection
- Asset caching: 1 year immutable for `/assets/*`
- Cron jobs: `/api/events/cron` every 6 hours

**Done when:** Configuration matches requirements.

### Task 3.3: First Deployment
**Action:** Push to `main` triggers auto-deploy  
**Monitor:** Vercel dashboard for deployment status  
**Done when:** 
- Deployment succeeds
- Production URL loads the app
- No console errors related to configuration

### Task 3.4: Verify API Edge Functions
**Action:** Test key endpoints:
```bash
# Health check
curl https://YOUR_DOMAIN.vercel.app/api/health

# Nearby (requires auth)
curl -H "Authorization: Bearer YOUR_JWT" \
  https://YOUR_DOMAIN.vercel.app/api/nearby?lat=51.5074&lng=-0.1278

# AI Chat
curl -X POST https://YOUR_DOMAIN.vercel.app/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is PrEP?", "userId": null}'
```
**Done when:** All endpoints return valid responses.

---

## Phase 4: Auth Flow Verification

### Task 4.1: Test Sign Up
**Action:** 
1. Open app in incognito window
2. Navigate to sign-up flow
3. Create test user with email

**Verify:**
- User created in `auth.users`
- Profile row created in `profiles` table
- Email verification sent (if enabled)

**Done when:** User can sign up and profile is created.

### Task 4.2: Test Boot Flow
**Action:** Walk through first-time user experience:
1. Sign Up
2. Age Gate (18+ verification)
3. Username setup
4. Consents (terms, privacy, data)
5. Persona selection
6. Globe loads

**Done when:** 
- Globe renders
- HUD is visible
- Bottom navigation works
- No errors in console

### Task 4.3: Test Sign In
**Action:** 
1. Sign out
2. Sign back in with same credentials

**Verify:**
- Session restores
- Boot flow skips completed gates
- User lands on Globe

**Done when:** Returning user experience is smooth.

### Task 4.4: Test Telegram Auth (Optional)
**If Telegram integration is configured:**
1. Test Telegram Login Widget
2. Verify chat_id is stored in profile
3. Test bot command response

**Done when:** Telegram auth works end-to-end.

---

## Phase 5: Feature Verification

### Task 5.1: Globe Rendering
**Verify:** 
- Three.js globe or Mapbox globe renders
- No "Multiple instances of Three.js" warning
- Beacons appear in correct locations
- City zoom works

**Check:** Browser console for errors  
**Done when:** Globe is interactive and performant.

### Task 5.2: Right Now Presence
**Verify:** 
1. Toggle "I'm out" in app
2. Check `presence_locations` table for new row
3. Verify lime beacon appears on Globe
4. Other users can see your presence

**Done when:** Real-time presence broadcasting works.

### Task 5.3: Events & Beacons
**Verify:** 
1. Navigate to /events
2. Beacons appear on Globe (cyan for events)
3. Tap beacon → detail sheet opens
4. RSVP button works
5. Check `EventRSVP` table for new row

**Done when:** Event discovery and RSVP work end-to-end.

### Task 5.4: Marketplace
**Verify:** 
1. Navigate to /market
2. Shopify products display
3. Add to cart works
4. Cart drawer opens
5. Checkout redirect works

**Done when:** Commerce flow is functional.

### Task 5.5: Creator P2P
**Verify:** 
1. Creator user creates product
2. Gold beacon appears on Globe
3. Product shows in /market (creators tab)
4. Purchase flow works

**Done when:** P2P marketplace works end-to-end.

### Task 5.6: AI Chat
**Verify:** 
1. Open ChatSheet
2. Send message
3. AI responds
4. Crisis detection triggers safety resources (test with "I feel unsafe")
5. Tool calling works (ask "What events are happening tonight?")

**Done when:** AI chat is functional with safety features.

### Task 5.7: Messaging
**Verify:** 
1. Send DM to another user
2. Real-time message delivery
3. Message appears in recipient's inbox
4. Telegram notification (if configured)

**Done when:** Messaging works with real-time updates.

---

## Phase 6: Cron & Background Jobs

### Task 6.1: Verify Event Scraper Cron
**Where:** Vercel Dashboard → Project → Settings → Cron Jobs  
**Configuration:** (already in `vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/events/cron",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Manual Test:**
```bash
curl https://YOUR_DOMAIN.vercel.app/api/events/cron
```

**Done when:** Cron runs and populates events in database.

### Task 6.2: Verify Notification Processor
**If notifications cron is configured:**
```bash
curl https://YOUR_DOMAIN.vercel.app/api/notifications/process
```

**Done when:** Pending notifications are dispatched.

### Task 6.3: Set Up TTL Cleanup (Optional)
**If Supabase Pro plan with pg_cron:**
```sql
SELECT cron.schedule(
  'cleanup-expired', 
  '*/5 * * * *',
  $$DELETE FROM presence_locations WHERE updated_at < NOW() - INTERVAL '15 minutes'$$
);
```

**Alternative (Free plan):** Set up external cron service  
**Done when:** Stale presence records are automatically cleaned.

---

## Phase 7: Production Hardening

### Task 7.1: Enable Error Monitoring
**Recommended:** Sentry  
**Setup:**
1. Create Sentry project
2. Add DSN to Vercel env vars
3. Install `@sentry/react`
4. Initialize in `src/main.jsx`

**Done when:** Errors are captured in Sentry dashboard.

### Task 7.2: Enable Analytics
**Recommended:** Mixpanel or Google Analytics  
**Setup:**
1. Add tracking ID to env vars
2. Install SDK
3. Track key events (sign up, RSVP, purchase)

**Done when:** User activity is tracked in analytics dashboard.

### Task 7.3: Security Audit
**Action:** 
- Run `npm audit` and fix vulnerabilities
- Review RLS policies for data leaks
- Test rate limiting on API endpoints
- Verify CSP headers in production
- Check for exposed API keys in client bundle

**Done when:** No critical security issues remain.

### Task 7.4: Performance Audit
**Action:** 
- Run Lighthouse audit on production URL
- Target: Performance score > 80
- Optimize images (lazy loading, WebP)
- Enable service worker caching
- Review bundle size

**Done when:** Lighthouse performance score > 80.

### Task 7.5: GDPR Compliance
**Verify:** 
- GDPR export functionality works
- Delete account flow works
- Data retention policies are documented
- Cookie consent banner (if needed)

**Priority:** High for EU launch  
**Done when:** GDPR features are functional.

---

## Phase 8: Content & Community

### Task 8.1: Seed Initial Data
**Events:**
```bash
# Run event scraper manually
curl https://YOUR_DOMAIN.vercel.app/api/events/scrape
```

**Venues:**
- Add venue data to database (if not already seeded)
- Verify venue search works

**Done when:** Users see real events and venues.

### Task 8.2: Radio Schedule
**Action:** 
- Populate `radio_shows` table with real schedule
- Verify radio stream URL is correct
- Test live radio playback

**Done when:** Radio feature works with live content.

### Task 8.3: Test with Real Users
**Action:** 
1. Invite beta testers
2. Monitor for bugs and UX issues
3. Collect feedback
4. Prioritize fixes

**Done when:** App is stable with real user traffic.

---

## Quick Reference: Verification Queries

### Count All Tables
```sql
SELECT count(*) 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Check Profiles Columns
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public' 
ORDER BY column_name;
```

### Check RLS Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Check Realtime Publications
```sql
SELECT * 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### Check Active Presence
```sql
SELECT count(*) 
FROM presence_locations 
WHERE updated_at > NOW() - INTERVAL '15 minutes';
```

### Check Recent Events
```sql
SELECT title, event_date, venue_name 
FROM "Beacon" 
WHERE beacon_type = 'event' 
AND event_date > NOW() 
ORDER BY event_date 
LIMIT 10;
```

---

## Deployment Checklist

Before going live, verify:

- [x] All migrations applied
- [x] Environment variables set in Vercel
- [x] Domain configured and SSL active
- [x] Auth flow works (sign up, sign in, sign out)
- [x] Globe renders without errors
- [x] Events display and RSVP works
- [x] Marketplace products load
- [x] Real-time presence works
- [x] API endpoints respond correctly
- [x] Cron jobs are scheduled
- [x] Error monitoring is active
- [ ] Performance optimized (Lighthouse > 80)
- [ ] Security audit complete
- [ ] GDPR compliance verified (if applicable)
- [ ] Beta testing complete
- [ ] Rollback plan documented

---

## Rollback Plan

If production deployment fails:

1. **Revert Vercel deployment:**
   ```bash
   # In Vercel dashboard: Deployments → Previous Deployment → Promote to Production
   ```

2. **Revert database migrations:**
   ```sql
   -- Create rollback migration that drops new tables/columns
   -- Test in staging first!
   ```

3. **Restore environment variables:**
   - Keep backup of working env var configuration
   - Restore from backup if needed

4. **Notify users:**
   - Post status update on social media
   - Send email if critical data loss occurred

---

## Post-Launch Monitoring

### Week 1
- Monitor error rates (target: <1%)
- Check API response times (target: <500ms)
- Verify cron jobs are running
- Review user feedback

### Week 2-4
- Analyze user behavior in analytics
- Identify drop-off points in onboarding
- Optimize slow queries
- Plan feature iterations

---

## Support Resources

- [Architecture Documentation](./ARCHITECTURE.md)
- [Database Schema](./DATABASE.md)
- [API Endpoints](./SERVER_ROUTES.md)
- [Environment Variables](./ENV_VARS.md)
- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard

---

**Built with 🖤 for the queer nightlife community.**
