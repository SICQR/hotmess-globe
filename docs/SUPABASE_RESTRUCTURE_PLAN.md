# HOTMESS — Supabase Restructure Plan
**Generated:** 2026-02-26

---

## CURRENT ARCHITECTURE

Two Supabase projects:

| Role | Project ID | Used For |
|------|-----------|---------|
| **Frontend** | `klsywpvncqqglhnhrjbh` | Anon key for auth + data in browser |
| **Backend** | `axxwdjmbwkvqhcpwters` | Service role for server-side API functions |

This split is intentional and correct. The frontend project handles auth state (sessions, JWTs). The backend project handles privileged operations via service role.

---

## APPLIED MIGRATIONS (107 total)

Key recent migrations:
| Migration | Purpose |
|-----------|---------|
| `20260226000070_community_gate.sql` | `profiles.community_attested_at` column |
| `20260226000080_rls_critical_fixes.sql` | 4 RLS holes patched + INSERT policies + user_favorites |
| `20260226000085_emergency_contacts.sql` | `emergency_contacts` table |
| `20260226000090_taps.sql` | `taps` / woofs system |
| `20260226000095_push_subscriptions.sql` | `push_subscriptions` table |

---

## KNOWN SCHEMA ISSUES

### 🔴 CRITICAL: `beacons` is a VIEW (not a table)
- Cannot use `ALTER TABLE beacons`
- `title`, `description`, `address`, `image_url` are stored in `metadata` JSONB
- Use `metadata->>'title'` in SQL queries
- Use `owner_id` (not `user_id`), `starts_at`/`ends_at` (not `start_time`/`end_time`)

### 🟠 MEDIUM: `right_now_status` split-brain
- Old code wrote to `profiles.right_now_status` (JSONB column that does NOT exist)
- Correct: write to `right_now_status` TABLE
- Recent migrations and code fixes address this; audit any remaining `profiles.right_now_status` references
- **Check:** `grep -r "profiles.right_now_status\|right_now_status" src/ api/ | grep -v "node_modules"`

### 🟠 MEDIUM: `profile_overrides` RLS wrong FK
- Known issue in CLAUDE.md — RLS policy references wrong FK
- Impact: medium severity, not data-leaking but policy may not enforce correctly
- **Fix:** Write migration to correct the FK reference in the RLS policy

### 🟡 LOW: SQL syntax error in migration `20260214010000`
- `IF EXISTS IF EXISTS` duplicate syntax (cosmetic error)
- Low priority — migration already applied, no runtime impact

### 🟡 LOW: Multiple auth listeners (6 instances)
- Production: no issue
- Development (hot-reload): subscriptions multiply
- Known files: BootGuardContext, NowSignalContext, viewerState.ts, Auth.jsx, supabaseClient.jsx, bootGuard.ts
- Do not add more auth listeners without removing one

---

## TABLES IN DB BUT NO UI YET

| Table | Purpose | Priority |
|-------|---------|---------|
| `achievements` | Badge/milestone system | 🟡 Medium |
| `user_checkins` | Venue check-in history | 🟡 Medium |
| `venue_kings` | Top check-in leaderboard | 🟡 Medium |
| `squads` + `squad_members` | Group/squad system | 🟡 Medium |
| `sweat_coins` | Alternative currency? | 🟠 Low (purpose unclear) |
| `community_posts` | Community feed | 🟡 Medium |
| `creator_subscriptions` | Creator fan subscriptions | 🔴 High (revenue) |
| `collaboration_requests` | Creator collabs | 🟡 Medium |
| `user_highlights` | Profile highlights | 🟡 Medium |
| `trusted_contacts` | Trusted contacts (vs emergency) | 🟡 Medium |

City amplification system (live in DB, no UI):
- `get_amplification_price()` RPC
- `calculate_business_heat()` RPC
- Cadence escalation system

---

## DB SYSTEMS READY TO BUILD UI FOR

Priority order based on product value:

### 1. Creator Subscriptions (HIGH)
- Table: `creator_subscriptions`
- Revenue-generating feature
- Stripe is already integrated
- UI: Add subscription tier to ProfileMode + creator dashboard

### 2. Community Posts (MEDIUM-HIGH)
- Table: `community_posts`
- Feeds feature (posts from community)
- UI: Add community feed section to HomeMode

### 3. Achievements + Venue Kings (MEDIUM)
- Tables: `achievements`, `user_checkins`, `venue_kings`
- Gamification — DB-complete
- UI: Add to ProfileMode + Ghosted grid

### 4. Squads (MEDIUM)
- Tables: `squads`, `squad_members`
- Group feature
- Needs design spec before building

---

## RECOMMENDED SCHEMA IMPROVEMENTS

### Fix 1: `profile_overrides` RLS (do soon)

```sql
-- Migration to fix wrong FK in profile_overrides RLS policy
-- (specific fix depends on actual schema — audit first)
ALTER POLICY ... ON profile_overrides USING (user_id = auth.uid());
```

### Fix 2: Add indexes for performance

```sql
-- Messages queries by thread
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);

-- Taps queries by tapped_email
CREATE INDEX IF NOT EXISTS idx_taps_tapped_email ON taps(tapped_email);

-- Nearby profiles query by GPS
CREATE INDEX IF NOT EXISTS idx_user_location ON "User" USING gist(location);
```

### Fix 3: Confirm `beacons` view definition

```sql
-- Check what the beacons view actually selects from
SELECT view_definition FROM information_schema.views WHERE table_name = 'beacons';
```

---

## SECRETS ROTATION PLAN

Following git history exposure of Postgres credentials:

1. Go to `axxwdjmbwkvqhcpwters` Supabase dashboard → Settings → Database → Reset database password
2. Update `POSTGRES_URL`, `POSTGRES_PASSWORD`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING` in Vercel:
   ```bash
   vercel env rm POSTGRES_PASSWORD production && vercel env add POSTGRES_PASSWORD production
   vercel env rm POSTGRES_URL production && vercel env add POSTGRES_URL production
   # etc for all POSTGRES_* vars
   ```
3. Update `.env.local` locally:
   ```bash
   vercel env pull .env.local
   ```
4. Test: `npm run dev` and verify Supabase connects

Also consider rotating:
- `SUPABASE_SERVICE_ROLE_KEY` — if the git-exposed doc included this
- `SUPABASE_JWT_SECRET` — if exposed

---

## AUTH AUDIT

### Supabase Auth Providers (confirm in dashboard):
- Email + magic link ✅
- Google OAuth ✅
- Telegram (custom verify endpoint) ✅

### Auth flow robustness:
- `localStorage` key `hm_age_confirmed_v1` bypasses age/onboarding gates even if DB sync fails
- Community attestation stores `community_attested_at` timestamp in DB
- Both mechanisms tested with localStorage fallback
