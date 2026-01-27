# Database Migration Guide

**For**: Hotmess Globe Application  
**Last Updated**: 2026-01-26

## Overview

This guide provides step-by-step instructions for applying database migrations safely in development, staging, and production environments.

## Prerequisites

- Access to Supabase project
- Supabase CLI installed (recommended) or SQL Editor access
- Database backup capability
- Migration files in `supabase/migrations/` directory

## Quick Start

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Check migration status
supabase db diff

# Apply all pending migrations
supabase db push
```

## Migration Methods

### Method 1: Supabase CLI (Recommended)

**Pros**: Automatic tracking, rollback support, version control  
**Cons**: Requires CLI installation

```bash
# 1. Initialize (first time only)
supabase init

# 2. Link to project
supabase link --project-ref abc123xyz

# 3. Check current migration status
supabase db diff

# 4. Review pending migrations
ls -la supabase/migrations/

# 5. Apply migrations
supabase db push

# 6. Verify success
supabase db diff  # Should show no pending migrations
```

### Method 2: Supabase Dashboard

**Pros**: No CLI needed, visual interface  
**Cons**: Manual tracking, no automatic rollback

```bash
# 1. Open Supabase Dashboard
# 2. Navigate to: SQL Editor
# 3. Open migration files in order (by timestamp)
# 4. Copy contents and execute
# 5. Verify each migration before proceeding
```

**IMPORTANT**: Execute migrations in chronological order (sorted by filename)!

### Method 3: Direct SQL Connection

**Pros**: Full control, scripting support  
**Cons**: Manual tracking, requires database credentials

```bash
# 1. Get connection string from Supabase dashboard
CONNECTION_STRING="postgresql://postgres.xxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# 2. Connect with psql
psql "$CONNECTION_STRING"

# 3. Run migrations in order
\i supabase/migrations/20260103000000_create_user.sql
\i supabase/migrations/20260103000001_rls_user_beacon_eventrsvp.sql
# ... continue in order

# 4. Exit
\q
```

## Pre-Migration Checklist

Before applying migrations to any environment:

### 1. Review Migration Files

```bash
# List all migrations in order
ls -1 supabase/migrations/*.sql | sort

# Check for conflicts
grep -h "CREATE TABLE" supabase/migrations/*.sql | sort | uniq -c
# Look for counts > 1 (indicates duplicate table creation)
```

### 2. Backup Database

**Development**: Optional but recommended  
**Staging**: Required  
**Production**: **ABSOLUTELY REQUIRED**

```bash
# Method A: Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Method B: pg_dump
pg_dump "$CONNECTION_STRING" > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### 3. Notify Stakeholders

**Production migrations**: Notify team before running migrations that:
- May cause downtime
- Affect critical features
- Change RLS policies

### 4. Plan Rollback Strategy

Identify rollback steps for each migration:

```sql
-- Example: If migration adds a column
-- Rollback: ALTER TABLE table_name DROP COLUMN column_name;

-- Example: If migration creates a table
-- Rollback: DROP TABLE IF EXISTS table_name;
```

## Migration Execution

### Development Environment

```bash
# 1. Pull latest code
git pull origin main

# 2. Link to dev database (if not already linked)
supabase link --project-ref YOUR_DEV_PROJECT

# 3. Apply migrations
supabase db push

# 4. Verify
npm run dev  # Test the application

# 5. Run verification script
node scripts/verify-database.js
```

### Staging Environment

```bash
# 1. Create backup
supabase db dump -f staging_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Link to staging database
supabase link --project-ref YOUR_STAGING_PROJECT

# 3. Review pending migrations
supabase db diff

# 4. Apply migrations
supabase db push

# 5. Verify RLS policies
# Run scripts/audit-rls-policies.sql in SQL Editor

# 6. Test critical paths
# - User signup/login
# - Profile discovery
# - Order creation
# - Message sending
# - Real-time updates

# 7. Run verification script
SUPABASE_URL=$STAGING_URL \
SUPABASE_SERVICE_ROLE_KEY=$STAGING_KEY \
node scripts/verify-database.js
```

### Production Environment

**⚠️ CRITICAL: Follow this process exactly**

#### Pre-Flight (1 day before)

1. **Announce maintenance window** (if needed)
2. **Review all changes** with team
3. **Test rollback procedure** on staging
4. **Prepare monitoring** (watch error logs, user reports)

#### Execution Day

```bash
# 1. Enable maintenance mode (if applicable)
# Update Vercel env var or deploy maintenance page

# 2. Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
supabase db dump -f production_backup_$TIMESTAMP.sql

# 3. Verify backup
ls -lh production_backup_*.sql
# Check file size is reasonable

# 4. Download backup to safe location
cp production_backup_$TIMESTAMP.sql ~/backups/
# Or upload to S3/cloud storage

# 5. Link to production database
supabase link --project-ref YOUR_PRODUCTION_PROJECT

# 6. Review pending migrations one last time
supabase db diff

# 7. Apply migrations
supabase db push

# Watch for errors. If any error occurs, STOP and rollback immediately.

# 8. Verify tables created
# Run in SQL Editor:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

# 9. Verify RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
# Should return 0 rows!

# 10. Run verification script
SUPABASE_URL=$PRODUCTION_URL \
SUPABASE_SERVICE_ROLE_KEY=$PRODUCTION_KEY \
node scripts/verify-database.js

# 11. Test critical paths manually
# - User login
# - Profile viewing
# - Create order (with test payment)
# - Send message
# - Real-time updates (Globe view)

# 12. Monitor for 15-30 minutes
# - Watch Sentry/error logs
# - Check Supabase dashboard for errors
# - Monitor user activity metrics

# 13. Disable maintenance mode
# Deploy app, update env vars

# 14. Announce completion
```

## Post-Migration Verification

### Automated Checks

```bash
# Run full verification suite
node scripts/verify-database.js

# Expected output:
# ✅ Migration files
# ✅ Database tables
# ✅ RLS policies
# ✅ Storage buckets
# ✅ Connections
```

### Manual Checks

Run `scripts/audit-rls-policies.sql` in Supabase SQL Editor:

```sql
-- Check RLS coverage
\i scripts/audit-rls-policies.sql

-- Look for:
-- ✅ All tables have RLS enabled
-- ✅ Critical tables have proper policies
-- ⚠️ No overly permissive policies (except intentional)
```

### Application Testing

**Critical User Paths**:

1. **Authentication**
   - [ ] User can sign up
   - [ ] User can log in
   - [ ] User can log out

2. **Profile Discovery**
   - [ ] Can view Connect page
   - [ ] Can see other user profiles
   - [ ] Can update own profile

3. **Events**
   - [ ] Can view beacons on globe
   - [ ] Can create new beacon
   - [ ] Can RSVP to event

4. **Marketplace**
   - [ ] Can browse products
   - [ ] Can add to cart
   - [ ] Can complete checkout

5. **Messaging**
   - [ ] Can send message
   - [ ] Can view chat threads
   - [ ] Receive real-time messages

6. **Real-time**
   - [ ] Globe updates live when beacon created
   - [ ] Presence shows active users
   - [ ] Notifications appear in real-time

## Troubleshooting

### Migration Fails

**Error**: "relation already exists"

```sql
-- Solution: Migration creating duplicate table
-- Check if table exists:
SELECT * FROM pg_tables WHERE tablename = 'table_name';

-- If using CREATE TABLE IF NOT EXISTS, migration should succeed
-- If not, manually skip that statement or drop table first (⚠️ dangerous)
```

**Error**: "column already exists"

```sql
-- Solution: Migration adding duplicate column
-- Check if column exists:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'table_name';

-- Use ALTER TABLE IF NOT EXISTS (PostgreSQL 9.6+)
-- Or add IF NOT EXISTS check:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'table_name' AND column_name = 'column_name'
  ) THEN
    ALTER TABLE table_name ADD COLUMN column_name TEXT;
  END IF;
END $$;
```

**Error**: "permission denied" or RLS blocking query

```sql
-- Solution: RLS policy too restrictive or query running as wrong user
-- Check current user:
SELECT current_user, (auth.jwt() ->> 'email') as email_from_jwt;

-- Temporarily disable RLS for debugging (⚠️ dev only!):
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
-- Test query
-- Re-enable:
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Rollback Procedure

**If migration fails mid-execution:**

```bash
# 1. STOP immediately - don't apply more migrations

# 2. Assess damage
# - Which migration failed?
# - What was created before failure?
# - What's the error message?

# 3. Restore from backup
pg_restore -d "$CONNECTION_STRING" -c backup_TIMESTAMP.sql

# Or with psql:
psql "$CONNECTION_STRING" < backup_TIMESTAMP.sql

# 4. Verify restoration
# Check critical tables exist and have data

# 5. Fix migration file
# Correct the error in the migration file

# 6. Re-attempt migration after fix
```

**If migration succeeded but app is broken:**

```bash
# 1. Enable maintenance mode

# 2. Restore database
psql "$CONNECTION_STRING" < backup_TIMESTAMP.sql

# 3. Verify restoration
node scripts/verify-database.js

# 4. Disable maintenance mode

# 5. Investigate issue
# - Check application logs
# - Verify RLS policies
# - Test with service role key (bypasses RLS)
```

## Migration Development

### Creating New Migrations

```bash
# Use Supabase CLI to auto-generate timestamp
supabase migration new your_migration_description

# This creates:
# supabase/migrations/20260126153045_your_migration_description.sql

# Edit the file and add your SQL
```

### Migration Best Practices

1. **Use IF NOT EXISTS** for idempotency:
   ```sql
   CREATE TABLE IF NOT EXISTS table_name (...);
   CREATE INDEX IF NOT EXISTS index_name ON table_name (...);
   ```

2. **Enable RLS immediately**:
   ```sql
   CREATE TABLE users (...);
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   -- Add policies immediately after
   ```

3. **Add helpful comments**:
   ```sql
   -- hotmess-globe: create user_tribes table
   -- Referenced by: EditProfile.jsx, Connect.jsx
   -- Purpose: Track user community membership for discovery
   ```

4. **Test rollback**:
   ```sql
   -- At top of migration, document rollback:
   -- ROLLBACK: DROP TABLE IF EXISTS table_name;
   ```

5. **Keep migrations atomic**:
   - One logical change per migration
   - Don't mix schema changes with data changes
   - Easier to debug and rollback

6. **Avoid destructive operations**:
   ```sql
   -- ❌ BAD: Drops data
   ALTER TABLE users DROP COLUMN old_field;
   
   -- ✅ GOOD: Preserve data, mark deprecated
   -- Add new column, migrate data, deprecate old
   ALTER TABLE users ADD COLUMN new_field TEXT;
   UPDATE users SET new_field = old_field;
   -- Later migration can drop old_field after verification
   ```

## Monitoring & Maintenance

### After Migration Checklist

- [ ] All migrations applied successfully
- [ ] Verification script passes
- [ ] RLS audit shows no critical issues
- [ ] Application tests pass
- [ ] No errors in application logs
- [ ] Real-time subscriptions working
- [ ] Storage uploads working
- [ ] Performance acceptable (no slow queries)

### Ongoing Monitoring

**Daily**: Check Supabase dashboard for:
- Error rate spikes
- Slow query alerts
- Unusual database size growth

**Weekly**: Review:
- New user signups (data flowing correctly)
- Order completions (marketplace working)
- Message activity (real-time functioning)

**Monthly**: 
- Review and archive old data
- Optimize slow queries
- Update documentation

## Emergency Contacts

**Database Issues**:
- Supabase Support: support@supabase.com
- Dashboard: https://app.supabase.com
- Status Page: https://status.supabase.com

**Application Issues**:
- Check application logs in Vercel/hosting platform
- Review Sentry error tracking
- Check #dev-alerts Slack channel

## Additional Resources

- **Database Schema**: `DATABASE.md`
- **RLS Security**: `RLS_POLICY_ANALYSIS.md`
- **Audit Report**: `DATABASE_AUDIT_REPORT.md`
- **Verification Script**: `scripts/verify-database.js`
- **RLS Audit SQL**: `scripts/audit-rls-policies.sql`
- **Supabase Docs**: https://supabase.com/docs/guides/cli

## Appendix: Complete Migration List

See `DATABASE.md` for complete list of all 48 migrations and their purposes.

Quick reference:
- **2026-01-03**: Foundation (User, Beacon, EventRSVP)
- **2026-01-04**: Core features (marketplace, social, messaging)
- **2026-01-05 to 2026-01-07**: Refinements and extensions
- **2026-01-08 to 2026-01-26**: Advanced features and security hardening

---

**Remember**: Always backup before migrating production! 🚨
