# Vercel Deployment Guide for HOTMESS Globe

## 🚀 Quick Start

This guide will help you deploy the HOTMESS Globe application to Vercel with Supabase backend.

## Prerequisites

- [ ] Vercel account (https://vercel.com)
- [ ] Vercel CLI installed: `npm install -g vercel`
- [ ] Supabase project (https://supabase.com)
- [ ] Git repository access

## ✅ Pre-Deployment Checklist

### Code Quality (All Passing ✅)
- [x] Linting: **PASSED** (0 errors)
- [x] Type checking: **PASSED** (0 errors)
- [x] Build: **PASSED** (29MB dist/)
- [x] Tests: **PASSED** (126/126 tests)
- [x] Security audit: **PASSED** (0 vulnerabilities)

### Configuration Files
- [x] `vercel.json` - Valid JSON, properly configured
- [x] `package.json` - Node >=20, all scripts defined
- [x] `.env.production` - Client-side vars configured
- [x] `.gitignore` - Secrets excluded

## 🔐 Environment Variables Setup

### 1. Client-Side Variables (Build Time)

These are already in `.env.production` (safe to commit):

```bash
VITE_SUPABASE_URL=https://klsywpvncqqglhnhrjbh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Server-Side Variables (Vercel Dashboard Only)

⚠️ **CRITICAL**: Never commit these! Set them in Vercel Dashboard:

#### Required (Core Functionality)
```bash
SUPABASE_URL=https://klsywpvncqqglhnhrjbh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### Recommended (Enhanced Features)
```bash
GOOGLE_MAPS_API_KEY=your_google_maps_key
TICKET_QR_SIGNING_SECRET=random_secret_string
OUTBOX_CRON_SECRET=random_secret_string
RATE_LIMIT_CLEANUP_SECRET=random_secret_string
EVENT_SCRAPER_CRON_SECRET=random_secret_string
```

#### Optional (Integrations)
```bash
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=sk_live_...
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_token
SOUNDCLOUD_CLIENT_ID=your_client_id
```

## 📋 Deployment Steps

### Step 1: Link Project to Vercel

```bash
# Navigate to project directory
cd /path/to/hotmess-globe

# Login to Vercel
vercel login

# Link project (follow prompts)
vercel link
```

This creates `.vercel/project.json` with your project ID and org ID.

### Step 2: Configure Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add each variable from the "Server-Side Variables" section above:
1. Click "Add New"
2. Enter variable name (e.g., `SUPABASE_SERVICE_ROLE_KEY`)
3. Enter variable value
4. Select environment: **Production** (and Preview if desired)
5. Click "Save"

### Step 3: Deploy to Vercel

#### Option A: Automatic Deployment (Recommended)

```bash
# Push to main branch
git push origin main
```

Vercel will automatically:
1. Detect the push
2. Run build process
3. Deploy to production
4. Assign a production URL

#### Option B: Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Step 4: Verify Deployment

After deployment completes:

1. **Check Build Logs**
   - Go to Vercel Dashboard → Deployments → Latest
   - Review build output for errors

2. **Test Production URL**
   - Visit your production URL (e.g., `https://hotmess-globe.vercel.app`)
   - Test authentication (Telegram login)
   - Test API endpoints (e.g., `/api/health`)
   - Check browser console for errors

3. **Verify Cron Jobs**
   - Go to Vercel Dashboard → Your Project → Cron Jobs
   - Confirm these are scheduled:
     - `/api/events/cron` - Daily at 3 AM
     - `/api/notifications/process` - Every 5 minutes
     - `/api/notifications/dispatch` - Every 5 minutes
     - `/api/admin/cleanup/rate-limits` - Daily at 4:20 AM

4. **Test Core Features**
   - [ ] Globe renders correctly
   - [ ] User authentication works
   - [ ] Profile creation/editing
   - [ ] Event listings
   - [ ] Marketplace/shopping
   - [ ] Real-time features (beacons, chat)

## 🔍 Vercel Configuration Details

### Build Configuration

From `vercel.json`:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: >=20 (from `package.json`)

### Serverless Functions

API routes in `/api/*` are automatically deployed as serverless functions:
- **Max Duration**: 10 seconds
- **Memory**: 1024 MB
- **Runtime**: Node.js 20+

### Cron Jobs

Four automated tasks are configured:
1. **Event Scraper**: Daily at 3 AM UTC
2. **Notification Processor**: Every 5 minutes
3. **Notification Dispatcher**: Every 5 minutes
4. **Rate Limit Cleanup**: Daily at 4:20 AM UTC

### Security Headers

All routes include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000`
- Content Security Policy (CSP) with allowed domains

### Caching

Static assets in `/assets/*` are cached for 1 year:
- `Cache-Control: public, max-age=31536000, immutable`

## 🚨 Troubleshooting

### Build Fails

**Problem**: Build fails with module not found
```bash
Error: Cannot find module 'some-package'
```

**Solution**: Ensure all dependencies are in `package.json`:
```bash
npm install
npm run build  # Test locally
```

### Environment Variables Not Working

**Problem**: API returns errors about missing env vars

**Solutions**:
1. Verify variables are set in Vercel Dashboard
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding new variables
4. For client-side vars, ensure `VITE_` prefix

### 404 on API Routes

**Problem**: `/api/*` routes return 404

**Solution**: Verify `vercel.json` routing configuration:
```json
{
  "src": "/api/(.*)",
  "dest": "/api/$1"
}
```

### Cron Jobs Not Running

**Problem**: Scheduled tasks aren't executing

**Solutions**:
1. Check Vercel Dashboard → Cron Jobs to see if they're enabled
2. Verify endpoints exist and return 200
3. Check logs for errors during execution

### Supabase Connection Issues

**Problem**: "Could not connect to Supabase"

**Solutions**:
1. Verify all three Supabase env vars are set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Check Supabase project is active
3. Verify API keys are correct (copy from Supabase Dashboard → Settings → API)

## 🔄 Rolling Back a Deployment

### Method 1: Vercel Dashboard (Instant)

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "⋮" menu → "Promote to Production"

### Method 2: Git Revert (Tracked)

```bash
# Revert the problematic commit
git revert HEAD
git push origin main

# Or revert to a specific commit
git revert <commit-sha>
git push origin main
```

This creates a history of the rollback.

## 📊 Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor error rates in Vercel Dashboard
- [ ] Check function invocations and duration
- [ ] Review browser console for client errors
- [ ] Monitor Supabase dashboard for unusual activity

### Ongoing

- Set up alerts for:
  - Build failures
  - Function errors
  - Unusual traffic patterns
  - Cron job failures

## 🔗 Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Project README**: [README.md](./README.md)
- **Full Deployment Docs**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Security Policy**: [SECURITY.md](./SECURITY.md)

## ✅ Deployment Complete!

Once deployed, your HOTMESS Globe app will be live at:
- Production: `https://your-project.vercel.app`
- Custom Domain: Configure in Vercel Dashboard → Settings → Domains

---

**Last Updated**: 2026-02-14  
**Maintained By**: SICQR Team
