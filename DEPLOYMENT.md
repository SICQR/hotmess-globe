# Deployment Checklist & Guide

## 🚀 Overview

This document provides a comprehensive checklist and guide for deploying the HOTMESS platform to production environments.

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
- [ ] Production environment variables set:
  - [ ] `VITE_BASE44_APP_ID`
  - [ ] `VITE_BASE44_APP_BASE_URL`
  - [ ] `VITE_MAPBOX_ACCESS_TOKEN`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
  - [ ] Any additional backend-only secrets (without VITE_ prefix)
- [ ] `NODE_ENV=production` is set
- [ ] Production database configured
- [ ] CDN/Storage for media files configured
- [ ] Email service configured (if applicable)

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

## 🏗️ Deployment Platforms

### Recommended: Vercel

#### Why Vercel?
- ✅ Optimized for Vite applications
- ✅ Automatic HTTPS
- ✅ Built-in CDN
- ✅ Easy environment variable management
- ✅ Preview deployments for PRs
- ✅ Serverless functions support

#### Deployment Steps:

1. **Install Vercel CLI** (optional):
   ```bash
   npm install -g vercel
   ```

2. **Connect Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Connect to GitHub repository
   - Select `SICQR/hotmess-globe`

3. **Configure Project**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables**:
   - In Vercel Dashboard → Project → Settings → Environment Variables
   - Add all required `VITE_*` variables
   - Add backend-only secrets (without `VITE_` prefix)

5. **Deploy**:
   - Push to `main` branch for automatic deployment
   - Or use `vercel --prod` CLI command

### Alternative: Netlify

#### Deployment Steps:

1. **Create `netlify.toml`**:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Connect Repository**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Import from Git"
   - Select repository

3. **Configure Environment Variables**:
   - In Netlify Dashboard → Site Settings → Environment Variables
   - Add all `VITE_*` variables

4. **Deploy**:
   - Automatic deployment on push to `main`

### Alternative: AWS S3 + CloudFront

#### Deployment Steps:

1. **Build Application**:
   ```bash
   npm run build
   ```

2. **Create S3 Bucket**:
   - Enable static website hosting
   - Set bucket policy for public read access

3. **Configure CloudFront**:
   - Create distribution pointing to S3 bucket
   - Set up SSL certificate
   - Configure cache behaviors

4. **Deploy**:
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

## 🔄 CI/CD Pipeline Setup

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run security audit
        run: npm audit --audit-level=high
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Build application
        run: npm run build
        env:
          VITE_BASE44_APP_ID: ${{ secrets.VITE_BASE44_APP_ID }}
          VITE_BASE44_APP_BASE_URL: ${{ secrets.VITE_BASE44_APP_BASE_URL }}
          # Add other VITE_ environment variables
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

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

### Vercel:
1. Go to Deployments in Vercel Dashboard
2. Find the last stable deployment
3. Click the three dots menu
4. Select "Promote to Production"

### Manual Rollback:
1. Revert the commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Automatic deployment will trigger

### Emergency Rollback:
1. Use deployment platform's instant rollback feature
2. Investigate issue offline
3. Deploy fix when ready

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

### Build Fails:
- Check Node.js version matches development (v18+)
- Verify all dependencies installed correctly
- Check environment variables are set
- Review build logs for specific errors

### Environment Variables Not Working:
- Ensure variables are prefixed with `VITE_` for client-side access
- Verify variables are set in deployment platform
- Rebuild application after adding variables
- Check variable names match exactly (case-sensitive)

### App Loads but Features Don't Work:
- Check browser console for errors
- Verify API endpoints are accessible
- Check CORS configuration
- Verify authentication is working
- Check network requests in DevTools

### Performance Issues:
- Enable CDN caching
- Optimize images
- Implement code splitting
- Check for memory leaks
- Review bundle size

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

1. **Never deploy directly to production** - Use staging first
2. **Deploy during low-traffic hours** when possible
3. **Have a rollback plan** ready before deployment
4. **Monitor closely** after deployment
5. **Keep deployment notes** for future reference
6. **Test thoroughly** in staging environment
7. **Communicate** with team before major deployments

## 📞 Emergency Contacts

- **DevOps Lead**: [Contact Info]
- **Security Team**: security@sicqr.com (update)
- **Platform Support**: support@vercel.com (or appropriate platform)

---

**Last Updated**: 2026-01-03
**Maintained By**: DevOps Team
