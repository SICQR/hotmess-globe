# HOTMESS Backup & Recovery Plan

## Overview

This document outlines the backup procedures, data retention policies, and disaster recovery plan for the HOTMESS platform.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Data Retention Policies](#data-retention-policies)
3. [Disaster Recovery Plan](#disaster-recovery-plan)
4. [Recovery Procedures](#recovery-procedures)
5. [Testing & Verification](#testing--verification)

---

## Backup Strategy

### Database Backups (Supabase)

Supabase provides automatic database backups:

| Plan | Backup Frequency | Retention |
|------|------------------|-----------|
| Free | Daily | 7 days |
| Pro | Daily | 7 days |
| Team | Daily + Point-in-time recovery | 7 days |
| Enterprise | Continuous | 30 days |

**Accessing Backups:**
1. Log into Supabase Dashboard
2. Navigate to Project Settings → Database
3. Select "Backups" tab
4. Download or restore from available snapshots

### Manual Backup Procedures

For additional safety, perform manual backups weekly:

```bash
# Export critical tables using Supabase CLI
supabase db dump -p <password> > backup_$(date +%Y%m%d).sql

# Or via pg_dump directly
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql
```

**Critical Tables to Backup:**
- `User` - User accounts and profiles
- `Beacon` - Events and locations
- `message` - User messages
- `marketplace_order` - Transaction records
- `support_tickets` - Support history
- `gdpr_consents` - Compliance records

### File Storage Backups

User-uploaded files are stored in Supabase Storage buckets:

**Buckets:**
- `avatars` - Profile pictures
- `uploads` - User media
- `products` - Marketplace images

**Backup Procedure:**
```bash
# List all files in a bucket
supabase storage list avatars

# Download files (scripted backup)
for file in $(supabase storage list avatars --json | jq -r '.[].name'); do
  supabase storage cp "avatars/$file" "./backup/avatars/$file"
done
```

### Code Repository

- **Primary:** GitHub (private repository)
- **Frequency:** Every commit
- **Branches:** `main` (production), `develop` (staging)

### Environment Variables

Store copies of environment variables securely:

**Required Variables:**
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
```

**Storage Location:**
- Primary: Vercel Environment Variables
- Backup: Encrypted password manager (e.g., 1Password)

---

## Data Retention Policies

### Active Data

| Data Type | Retention Period | Notes |
|-----------|-----------------|-------|
| User profiles | Duration of account | Deleted with account |
| Messages | Duration of account | Cascade delete |
| Transactions | 7 years | Legal requirement |
| Support tickets | 3 years | Customer service |
| Analytics | 2 years | Aggregated |

### Deleted Account Data

When a user deletes their account:

1. **Immediate Deletion (30 days):**
   - Profile information
   - Messages
   - Social connections
   - Preferences

2. **Retained for Legal/Compliance:**
   - Transaction records (7 years)
   - GDPR consent records (3 years)
   - Safety/moderation records (3 years)

3. **Anonymized:**
   - Events created (transferred to "deleted_user")
   - Analytics data (aggregated only)

### Log Retention

| Log Type | Retention | Location |
|----------|-----------|----------|
| Application logs | 30 days | Vercel |
| Database logs | 7 days | Supabase |
| Security logs | 1 year | Separate storage |
| Error tracking | 90 days | Sentry (if configured) |

---

## Disaster Recovery Plan

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database corruption | Low | Critical | Automatic backups, replicas |
| Hosting outage (Vercel) | Low | High | Status monitoring, DNS failover |
| DDoS attack | Medium | High | Rate limiting, CDN |
| Data breach | Low | Critical | Encryption, access controls |
| Accidental deletion | Medium | Medium | Backups, soft deletes |

### Recovery Time Objectives

| Scenario | RTO (Recovery Time) | RPO (Data Loss) |
|----------|---------------------|-----------------|
| Minor outage | 1 hour | 0 |
| Database restore | 4 hours | Up to 24 hours |
| Full disaster | 24 hours | Up to 24 hours |
| Security breach | 48 hours | Case-dependent |

### Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Technical Lead | [TBD] | 24/7 |
| Database Admin | Supabase Support | Business hours |
| Hosting Support | Vercel Support | 24/7 |
| Security Lead | [TBD] | 24/7 |

---

## Recovery Procedures

### Procedure 1: Database Restore from Backup

**When to use:** Database corruption, accidental data deletion

```
1. Access Supabase Dashboard
2. Navigate to Project Settings → Database → Backups
3. Select appropriate backup point
4. Click "Restore"
5. Wait for restore completion (may take 30+ minutes)
6. Verify data integrity
7. Update DNS/connections if needed
8. Notify users if extended downtime occurred
```

### Procedure 2: Application Rollback

**When to use:** Buggy deployment, broken features

```bash
# Via Vercel Dashboard
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

# Via CLI
vercel rollback [deployment-url]
```

### Procedure 3: Environment Variable Recovery

**When to use:** Compromised credentials, lost access

```
1. Generate new credentials:
   - Supabase: Settings → API → Generate new key
   - Stripe: Dashboard → Developers → API keys → Roll key
   - Resend: Dashboard → API Keys → Create new key

2. Update Vercel environment variables:
   - Vercel Dashboard → Project → Settings → Environment Variables

3. Redeploy application

4. Test all integrations

5. Document incident
```

### Procedure 4: Complete Platform Recovery

**When to use:** Catastrophic failure, total loss

```
1. ASSESS
   - Identify scope of damage
   - Document current state
   - Notify stakeholders

2. RESTORE INFRASTRUCTURE
   - Create new Supabase project (if needed)
   - Restore from latest backup
   - Run all migrations: npx supabase db push

3. RESTORE APPLICATION
   - Clone repository from GitHub
   - Update environment variables
   - Deploy to Vercel: vercel --prod

4. RESTORE INTEGRATIONS
   - Update Stripe webhook endpoints
   - Verify email service connectivity
   - Test payment flows

5. VERIFY
   - Test critical user flows
   - Verify data integrity
   - Check all integrations

6. COMMUNICATE
   - Status page update
   - User notification (if extended outage)
   - Incident report
```

---

## Testing & Verification

### Monthly Backup Verification

- [ ] Download a backup snapshot
- [ ] Restore to test environment
- [ ] Verify data integrity (random sampling)
- [ ] Document results

### Quarterly Recovery Drill

- [ ] Simulate a failure scenario
- [ ] Execute recovery procedure
- [ ] Measure actual RTO/RPO
- [ ] Identify improvements
- [ ] Update documentation

### Backup Verification Checklist

```markdown
Date: ___________
Performed by: ___________

[ ] Database backup downloaded successfully
[ ] Backup size is reasonable (compared to previous)
[ ] Test restore completed
[ ] Critical tables verified:
    [ ] User table has expected row count
    [ ] Recent transactions present
    [ ] Messages intact
[ ] File storage backup verified
[ ] Environment variables documented
[ ] Recovery procedures reviewed

Notes:
___________
```

---

## Monitoring & Alerts

### Health Checks

Set up monitoring for:

- **Uptime:** UptimeRobot, Pingdom, or similar
  - Check: `https://hotmess.london/api/health`
  - Frequency: Every 5 minutes
  - Alert: Email + Slack

- **Database:** Supabase Dashboard
  - Monitor: Connection count, CPU, Memory
  - Alert: When > 80% capacity

- **Payments:** Stripe Dashboard
  - Monitor: Webhook delivery, payment success rate
  - Alert: Failure rate > 5%

### Alert Escalation

| Severity | Response Time | Notification |
|----------|---------------|--------------|
| Critical | Immediate | Phone + Slack |
| High | 30 minutes | Slack + Email |
| Medium | 2 hours | Email |
| Low | Next business day | Email |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial backup & recovery plan |

---

## Quick Reference Card

### Emergency Steps

1. **Check Status**
   - Vercel: status.vercel.com
   - Supabase: status.supabase.com
   - Stripe: status.stripe.com

2. **Diagnose**
   - Check Vercel logs
   - Check Supabase logs
   - Check error tracking

3. **Communicate**
   - Update status page
   - Notify team via Slack/email

4. **Recover**
   - Follow appropriate procedure above
   - Document actions taken

5. **Post-Incident**
   - Write incident report
   - Identify improvements
   - Update procedures if needed

---

*Review this document quarterly. Last review: [Date]*
