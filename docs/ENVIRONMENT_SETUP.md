# Environment Configuration Guide

This document details all required and optional environment variables for the HOTMESS application.

## Quick Start

1. Copy `.env.example` to `.env.local` for local development
2. Set required Supabase credentials (see below)
3. Configure optional services as needed
4. Never commit `.env.local` to git

## Required Environment Variables

### Supabase (REQUIRED)

These are **mandatory** for the application to function.

#### Client-Side (Exposed to Browser)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find:**
- Supabase Dashboard → Project Settings → API
- URL: "Project URL"
- Anon Key: "Project API keys" → "anon" (public)

#### Server-Side (Vercel Functions Only)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ CRITICAL**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client (no `VITE_` prefix)

**Where to find:**
- Service Role Key: Supabase Dashboard → Project Settings → API → "service_role" key

## Optional But Recommended

### Cron Job Protection

Protect scheduled tasks from unauthorized access:

```bash
OUTBOX_CRON_SECRET=generate_random_secret_here
RATE_LIMIT_CLEANUP_SECRET=generate_random_secret_here
EVENT_SCRAPER_CRON_SECRET=generate_random_secret_here
```

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Used by:**
- `/api/notifications/process` (notification dispatcher)
- `/api/rate-limit/cleanup` (rate limit cleanup)
- `/api/events/scraper/cron` (event scraper)

### Google Maps (Routing & ETAs)

Required for location-based features:

```bash
GOOGLE_MAPS_API_KEY=AIzaSy...
GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE=true
```

**Where to get:**
- [Google Cloud Console](https://console.cloud.google.com)
- Enable: Maps JavaScript API, Routes API, Directions API

**Features enabled:**
- Travel time estimates
- Route optimization
- Traffic-aware routing
- Location autocomplete

### Email (Resend)

Required for notifications and alerts:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=HOTMESS <noreply@hotmess.london>
```

**Where to get:**
- [Resend Dashboard](https://resend.com/api-keys)

**Used by:**
- `/api/email/send` - Send transactional emails
- `/api/email/notify` - Notification emails
- Password reset emails
- Welcome emails

### Ticket QR Code Signing

Secure ticket generation:

```bash
TICKET_QR_SIGNING_SECRET=generate_random_secret_here
```

**Generate with:**
```bash
openssl rand -hex 32
```

## OAuth Providers (Optional)

### Google OAuth

Already integrated in UI, requires Supabase configuration:

**Frontend** (no env needed - handled by Supabase)

**Supabase Setup:**
1. Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Add OAuth credentials from Google Cloud Console
4. Redirect URI: `https://<project>.supabase.co/auth/v1/callback`

**Local Development** (if using Supabase CLI):
```bash
# In supabase/config.toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_OAUTH_CLIENT_ID)"
secret = "env(GOOGLE_OAUTH_SECRET)"
skip_nonce_check = true  # For local dev only
```

### Telegram Authentication

```bash
# Client-side (public)
VITE_TELEGRAM_BOT_USERNAME=hotmess_london_bot

# Server-side (secret)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz...
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

**Where to get:**
- Create bot via [@BotFather](https://t.me/BotFather)
- Use `/setdomain` to authorize your domain

**Current Status:**
- ✅ Authentication working (`/api/auth/telegram/verify`)
- ⚠️ Messaging proxy not implemented (`functions/telegramProxy.ts` returns 501)

## E-Commerce & Payments

### Shopify Integration

```bash
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_...
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_ALLOWED_PRODUCT_HANDLES=handle-1,handle-2,handle-3
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
SHOPIFY_CHECKOUT_DOMAIN=checkout.yourdomain.com
SHOPIFY_STOREFRONT_API_VERSION=2024-10
```

**Where to get:**
- Shopify Admin → Apps → Develop apps
- Create custom app with Storefront API and Admin API access

**Used by:**
- `/api/shopify/import` - Import products
- `/api/shopify/sync` - Sync inventory
- `/api/shopify/cart` - Cart operations
- `/api/shopify/webhooks` - Webhook handler

### Stripe Payments

```bash
# Client-side (public)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Subscription tier price IDs
VITE_STRIPE_PLUS_PRICE_ID=price_...
VITE_STRIPE_CHROME_PRICE_ID=price_...

# Server-side (secret)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Where to get:**
- [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

**⚠️ CRITICAL**: Never expose secret or webhook keys

## Additional Services

### SoundCloud Integration

For music upload features:

```bash
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret
SOUNDCLOUD_REDIRECT_URI=https://your-domain.com/api/soundcloud/callback
SOUNDCLOUD_SCOPE=non-expiring

# Restrict who can upload
VITE_MUSIC_UPLOAD_EMAILS=admin@example.com,artist@example.com
MUSIC_UPLOAD_EMAILS=admin@example.com,artist@example.com
```

### OpenAI (AI Chat & Event Scraping)

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
```

**Where to get:**
- [OpenAI Platform](https://platform.openai.com/api-keys)

**Used by:**
- AI chat features
- Event description enhancement
- Content moderation

### Push Notifications (Web Push API)

```bash
# Client-side (public)
VITE_VAPID_PUBLIC_KEY=BG7xW9...

# Server-side (secret)
VAPID_PUBLIC_KEY=BG7xW9...  # Same as above
VAPID_PRIVATE_KEY=Zq4Q...
```

**Generate keys:**
```bash
npx web-push generate-vapid-keys
```

### Event Scraper Configuration

```bash
EVENT_SCRAPER_SOURCES_JSON={"London":["https://example.com/london.json"]}
EVENT_SCRAPER_MAX_EVENTS_PER_CITY=15
EVENT_SCRAPER_USE_WEB_SEARCH=false
```

## Feature Flags

### XP Purchasing

```bash
VITE_XP_PURCHASING_ENABLED=false
MEMBERSHIPS_ENABLED=false
```

## Analytics & Monitoring (Optional)

### Google Analytics

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Mixpanel

```bash
VITE_MIXPANEL_TOKEN=your_mixpanel_token
```

### Sentry Error Tracking

```bash
VITE_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your_org
SENTRY_PROJECT=your_project
```

## Testing Environment Variables

For E2E tests:

```bash
E2E_EMAIL=test.user@example.com
E2E_PASSWORD=TestPassword123!
E2E_SEED=true
E2E_SEED_LAT=51.5074
E2E_SEED_LNG=-0.1278
E2E_SEED_COUNT=12
E2E_SEED_SPREAD_M=3000
```

## Deployment Configuration

### Vercel

1. Go to project settings → Environment Variables
2. Add all required variables
3. Set appropriate scopes:
   - Production: Live environment
   - Preview: Branch deploys
   - Development: Local development

### Environment Variable Priority

1. `.env.local` (local dev only, gitignored)
2. `.env.production` (production build)
3. `.env` (defaults)

**⚠️ Never commit secrets to any `.env.*` files!**

## Validation

Check if required env vars are set:

```javascript
// Check in browser console
console.log({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'
});

// Check server-side (in API route)
console.log({
  supabaseUrl: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'
});
```

## Troubleshooting

### "Missing VITE_SUPABASE_URL" Error

**Cause**: Environment variables not loaded

**Solutions:**
1. Ensure `.env.local` exists in project root
2. Restart dev server after adding env vars
3. Check variable names are exactly as specified
4. In Vercel: Add to project settings → Environment Variables

### "Invalid JWT" or Auth Errors

**Cause**: Wrong Supabase keys

**Solutions:**
1. Verify URL and keys from Supabase dashboard
2. Ensure no extra spaces or newlines
3. Check you're using the right project
4. Regenerate keys if compromised

### API Routes Failing

**Cause**: Server-side env vars not set in Vercel

**Solutions:**
1. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env vars
2. Don't use `VITE_` prefix for server-only vars
3. Redeploy after adding env vars

### OAuth Not Working

**Cause**: Redirect URI mismatch or provider not enabled

**Solutions:**
1. Check Supabase provider settings
2. Verify redirect URI is correct
3. For local dev: Use `skip_nonce_check = true`
4. Check OAuth credentials are valid

## Security Best Practices

1. ✅ Use different keys for dev/staging/production
2. ✅ Rotate secrets regularly
3. ✅ Never log sensitive env vars
4. ✅ Use Vercel's secret encryption
5. ✅ Audit who has access to env vars
6. ✅ Use read-only keys where possible
7. ✅ Implement rate limiting
8. ✅ Monitor for leaked secrets (GitHub secret scanning)

## Next Steps

1. Set up required Supabase credentials
2. Configure OAuth providers (Google recommended)
3. Set up email service (Resend)
4. Add cron secrets for security
5. Configure payment processing (Stripe)
6. Enable monitoring (Sentry recommended)
7. Test all integrations
8. Document any custom env vars added

## Support

For questions about:
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs/environment-variables
- Stripe: https://stripe.com/docs/keys
- Resend: https://resend.com/docs
