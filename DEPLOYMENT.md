# Deployment Checklist & Guide

## 🚀 Overview

This document provides a comprehensive checklist and guide for deploying the HOTMESS platform to production environments.

**Deployment Method**: The project uses **automated deployment via GitHub Actions** to Vercel. Pushing to the `main` branch automatically triggers deployment after all CI checks pass.

For CI/CD setup details, see [CI_CD_SETUP.md](./CI_CD_SETUP.md).

## ⚙️ Pre-Deployment Checklist

### 1. Code Quality & Testing
- [ ] All tests pass (when tests are implemented)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Build completes successfully (`npm run build`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Code review completed
- [ ] All TODO/FIXME items addressed or documented

### 2. Security
- [ ] **CRITICAL**: No secrets committed to repository
- [ ] All environment variables configured in deployment platform
- [ ] `.env` and `.env.local` are NOT deployed (use platform env vars)
- [ ] API keys are valid for production environment
- [ ] HTTPS is enabled and enforced
- [ ] CORS configured correctly
- [ ] Rate limiting implemented on sensitive endpoints
- [ ] Authentication flows tested
- [ ] File upload restrictions in place
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] Error messages don't expose sensitive information

### 3. Environment Configuration

**Note**: With automated deployment, environment variables should be configured in two places:
- **GitHub Secrets**: For build-time variables used during CI
- **Vercel Dashboard**: For runtime variables used by the deployed application

- [ ] GitHub Secrets configured (for CI/CD):
  - [ ] `VERCEL_TOKEN` (deployment authentication)
  - [ ] `VERCEL_ORG_ID` (Vercel organization ID)
  - [ ] `VERCEL_PROJECT_ID` (Vercel project ID)
  - [ ] `VITE_BASE44_APP_ID` (if needed during build)
  - [ ] `VITE_BASE44_APP_BASE_URL` (if needed during build)
- [ ] Vercel environment variables set (in Vercel dashboard):
  - [ ] `VITE_BASE44_APP_ID`
  - [ ] `VITE_BASE44_APP_BASE_URL`
  - [ ] `VITE_MAPBOX_ACCESS_TOKEN`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
  - [ ] Any additional backend-only secrets (without VITE_ prefix)
- [ ] `NODE_ENV=production` is set (automatically set by Vercel)
- [ ] Production database configured
- [ ] CDN/Storage for media files configured
- [ ] Email service configured (if applicable)

### 3a. Event Scraper (Vercel + Supabase)

The event scraper runs via **Vercel Serverless Functions**:

- Manual run: Admin → Event Scraper (calls `POST /api/events/scrape` using the current Supabase session token).
- Scheduled run: Vercel Cron hits `GET /api/events/cron` daily (configured in `vercel.json`).

Required server env vars in Vercel:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Scrape input configuration:
- Set `EVENT_SCRAPER_SOURCES_JSON` as JSON mapping city → list of JSON feed URLs, or POST `events[]` directly to `/api/events/scrape`.

Security note:
- `/api/events/scrape` requires an authenticated admin bearer token.
- `/api/events/cron` should be protected via `EVENT_SCRAPER_CRON_SECRET` when used outside Vercel Cron.

### 3b. Stripe Webhooks (Required for Subscriptions)

Stripe webhooks enable subscription lifecycle handling (upgrades, cancellations, payment failures).

**Endpoint:** `https://your-domain.vercel.app/api/stripe/webhook`

**Setup in Stripe Dashboard:**

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.vercel.app/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click "Add endpoint" and copy the **Signing secret** (starts with `whsec_`)

**Vercel Environment Variables (required):**

- `STRIPE_SECRET_KEY` - Your Stripe secret key (`sk_test_*` or `sk_live_*`)
- `STRIPE_WEBHOOK_SECRET` - The signing secret from step 5 (`whsec_*`)
- `VITE_STRIPE_PLUS_PRICE_ID` - Price ID for Plus tier (create in Stripe Products)
- `VITE_STRIPE_CHROME_PRICE_ID` - Price ID for Chrome tier (create in Stripe Products)

**Testing webhooks locally:**

Use Stripe CLI to forward events to your local dev server:

```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

Copy the webhook signing secret from the CLI output and use it locally.

### 4. Performance
- [ ] Bundle size analyzed (`npm run build`)
- [ ] Images optimized
- [ ] Lazy loading implemented for heavy components
- [ ] Code splitting configured
- [ ] Caching headers configured
- [ ] CDN configured for static assets
- [ ] Database queries optimized

### 5. Monitoring & Logging
- [ ] Error tracking service configured (Sentry recommended)
- [ ] Application monitoring set up (uptime, performance)
- [ ] Log aggregation configured
- [ ] Alerts configured for critical errors
- [ ] Analytics configured (if applicable)

### 6. Documentation
- [ ] README.md is up to date
- [ ] SECURITY.md reviewed
- [ ] API documentation complete
- [ ] Deployment notes documented
- [ ] Rollback procedure documented

### 7. Compliance & Legal
- [ ] Privacy policy in place
- [ ] Terms of service in place
- [ ] Cookie consent (if applicable)
- [ ] GDPR compliance (if applicable)
- [ ] Age verification (18+) implemented
- [ ] Data retention policies implemented

## 🏗️ Automated Deployment

### Current Setup: GitHub Actions + Vercel

The project uses **automated deployment** through GitHub Actions. When you push to `main`, the deployment happens automatically.

#### Why This Approach?
- ✅ Automated CI checks before deployment
- ✅ No manual deployment steps needed
- ✅ Consistent deployment process
- ✅ Audit trail of all deployments
- ✅ Easy rollback via Git

#### How It Works:

1. **Push to main**: Developer pushes code to the `main` branch
2. **CI checks run**: lint, typecheck, build, security
3. **All checks pass**: Deployment job starts automatically
4. **Deploy to Vercel**: Application deploys to production using Vercel CLI

#### Initial Setup Required:

Before automated deployment works, you need to:

1. **Set up Vercel project** (one-time setup):
   ```bash
   npm install -g vercel@latest
   vercel login
   vercel link
   ```

2. **Configure GitHub Secrets** (Settings > Secrets and variables > Actions):
   - `VERCEL_TOKEN` - Get from https://vercel.com/account/tokens
   - `VERCEL_ORG_ID` - From `.vercel/project.json` or Vercel dashboard
   - `VERCEL_PROJECT_ID` - From `.vercel/project.json` or Vercel dashboard

3. **Set Vercel environment variables** (Vercel Dashboard > Project Settings > Environment Variables):
   - Add all `VITE_*` variables needed by your app
   - These are used during the Vercel build process

4. **Test the workflow**:
   - Create a PR and ensure CI checks pass
   - Merge to `main` to trigger your first automated deployment
   - Monitor in GitHub Actions tab and Vercel dashboard

For detailed setup instructions, see [CI_CD_SETUP.md](./CI_CD_SETUP.md).

### Manual Deployment (Optional)

If you need to deploy manually (e.g., for testing), you can use Vercel CLI:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```
   - Set bucket policy for public read access

3. **Configure CloudFront**:
   - Create distribution pointing to S3 bucket
## 🧪 Deployment Testing

### Post-Deployment Checks:

1. **Functional Testing**:
   - [ ] Homepage loads correctly
   - [ ] Authentication works
   - [ ] Navigation works
   - [ ] Forms submit successfully
   - [ ] File uploads work
   - [ ] Real-time features work (if applicable)
   - [ ] Payment processing works (use test mode first)

2. **Performance Testing**:
   - [ ] Lighthouse score > 90
   - [ ] First Contentful Paint < 2s
   - [ ] Time to Interactive < 3s
   - [ ] Page load time < 3s

3. **Security Testing**:
   - [ ] HTTPS enforced
   - [ ] Security headers present (check with securityheaders.com)
   - [ ] XSS protection verified
   - [ ] CSRF protection verified
   - [ ] No sensitive data in client-side code

4. **Browser Testing**:
   - [ ] Chrome (latest)
   - [ ] Firefox (latest)
   - [ ] Safari (latest)
   - [ ] Edge (latest)
   - [ ] Mobile browsers (iOS Safari, Chrome Mobile)

5. **Monitoring Verification**:
   - [ ] Error tracking receives test error
   - [ ] Logs are being collected
   - [ ] Alerts are working

## 🚨 Rollback Procedure

### Option 1: Vercel Dashboard (Fastest)
1. Go to Deployments in Vercel Dashboard
2. Find the last stable deployment
3. Click the three dots menu
4. Select "Promote to Production"

### Option 2: Git Revert (Recommended for Tracking)
1. Revert the problematic commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Automated deployment will trigger with the reverted code
3. This creates a history of the rollback in Git

### Option 3: Redeploy Previous Commit
1. Find the last stable commit SHA
2. Create a new branch from that commit:
   ```bash
   git checkout -b rollback-to-stable <commit-sha>
   git push origin rollback-to-stable
   ```
3. Create a PR and merge to `main` after verification

### Emergency Rollback:
- Use Vercel dashboard's instant rollback (Option 1)
- Investigate issue offline
- Deploy fix when ready using normal process (PR → merge to main)

## 📊 Post-Deployment Monitoring

### First 24 Hours:
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Monitor resource usage
- [ ] Check logs for issues

### First Week:
- [ ] Review error logs daily
- [ ] Monitor user engagement
- [ ] Check for performance degradation
- [ ] Review security alerts

## 🔧 Troubleshooting Common Issues

### Deployment Fails:
- Check GitHub Actions logs for specific errors
- Verify all required secrets are configured in GitHub
- Ensure `VERCEL_TOKEN` hasn't expired
- Check that `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Review Vercel dashboard for deployment errors

### Build Fails in CI:
- Check Node.js version matches development (v18+)
- Verify all dependencies are in `package.json`
- Check environment variables are set correctly
- Review GitHub Actions logs for specific errors
- Ensure no secrets are hardcoded in the code

### Environment Variables Not Working:
- Ensure variables are prefixed with `VITE_` for client-side access
- Verify variables are set in both GitHub Secrets (for CI) and Vercel (for runtime)
- Rebuild application after adding variables
- Check variable names match exactly (case-sensitive)

### App Loads but Features Don't Work:
- Check browser console for errors
- Verify API endpoints are accessible
- Check CORS configuration
- Verify authentication is working
- Check network requests in DevTools

### Deployment Doesn't Trigger:
- Verify you pushed to `main` branch (not a PR)
- Check that all CI jobs passed (lint, typecheck, build, security)
- Review workflow conditions in `.github/workflows/ci.yml`
- Check GitHub Actions tab for workflow status

### Performance Issues:
- Enable CDN caching (Vercel does this automatically)
- Optimize images
- Implement code splitting
- Check for memory leaks
- Review bundle size with `npm run build`

## 📝 Environment-Specific Configuration

### Development:
```env
NODE_ENV=development
VITE_DEBUG_MODE=true
VITE_BASE44_APP_BASE_URL=https://dev-api.base44.app
```

### Staging:
```env
NODE_ENV=staging
VITE_DEBUG_MODE=false
VITE_BASE44_APP_BASE_URL=https://staging-api.base44.app
```

### Production:
```env
NODE_ENV=production
VITE_DEBUG_MODE=false
VITE_BASE44_APP_BASE_URL=https://api.base44.app
```

## 🎯 Best Practices

1. **Use Pull Requests**: Always create PRs to run CI checks before merging to `main`
2. **Monitor First Deployment**: Watch the GitHub Actions logs and Vercel dashboard closely
3. **Test in Vercel Preview**: Vercel creates preview deployments for PRs automatically
4. **Have a Rollback Plan**: Know how to revert deployments (see below)
5. **Keep Dependencies Updated**: Run `npm audit` and update regularly
6. **Review Security**: Check npm audit findings before deployment
7. **Test After Deployment**: Always verify the production site after deployment
8. **Set Branch Protection**: Require CI checks to pass before merging to `main`

## 📞 Emergency Contacts

- **DevOps Lead**: [Contact Info]
- **Security Team**: security@sicqr.com (update)
- **Platform Support**: support@vercel.com (or appropriate platform)

---

**Last Updated**: 2026-01-03
**Maintained By**: DevOps Team
