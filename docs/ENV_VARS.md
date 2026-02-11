# HOTMESS — Environment Variables Reference

**Updated:** 2026-02-11  
**Purpose:** Complete reference for all environment variables

---

## Overview

HOTMESS uses environment variables for configuration across local development, preview deployments, and production. Variables are managed differently depending on their scope:

- **Client-side (exposed to browser):** Prefix with `VITE_`
- **Server-side (Vercel functions only):** No prefix

---

## Quick Start

### Local Development
```bash
# Copy the example file
cp .env.example .env.local

# Fill in your values
# Never commit .env.local!
```

### Vercel Production
```
Vercel Dashboard → Project → Settings → Environment Variables
→ Add all required variables for Production, Preview, Development
```

---

## Required Variables

### Supabase (Database & Auth)

#### Client-Side (Frontend)
```bash
# Your Supabase project URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase anonymous key (safe to expose)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Server-Side (API Routes)
```bash
# Same URL as above (for server-side clients)
SUPABASE_URL=https://your-project.supabase.co

# Same anon key (for RLS queries)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ NEVER EXPOSE TO CLIENT
# Service role key bypasses RLS (admin operations only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to Find:**
- Supabase Dashboard → Project Settings → API
- URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api`

---

### Google Maps (Routing & ETAs)

```bash
# Google Maps API key with Directions API enabled
GOOGLE_MAPS_API_KEY=AIzaSyC...

# Optional: Enable traffic-aware routing for drive mode
GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE=false
```

**Where to Get:**
- Google Cloud Console → APIs & Services → Credentials
- Enable: Directions API, Geocoding API, Places API

**Required Permissions:**
- Directions API
- Geocoding API (for address → lat/lng)
- Places API (for venue search)

---

## Optional but Recommended

### Shopify (Commerce Integration)

```bash
# Your Shopify store domain
SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com

# Storefront API access token (public queries)
SHOPIFY_STOREFRONT_ACCESS_TOKEN=shpat_...

# Admin API access token (server-side only, for order sync)
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...

# Webhook signing secret (verify webhook authenticity)
SHOPIFY_WEBHOOK_SECRET=whsec_...

# Custom checkout domain (branded checkout)
SHOPIFY_CHECKOUT_DOMAIN=shop.hotmessldn.com

# Optional: API version (defaults to 2024-10)
SHOPIFY_STOREFRONT_API_VERSION=2024-10

# Optional: Product handle allowlist (comma-separated)
SHOPIFY_ALLOWED_PRODUCT_HANDLES=hnh-mess-lube-250ml,hnh-mess-lube-50ml
```

**Where to Find:**
- Shopify Admin → Apps → Develop apps
- Create private app with Storefront API and Admin API access

---

### Stripe (Payments & Subscriptions)

#### Client-Side
```bash
# Stripe publishable key (safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Subscription price IDs
VITE_STRIPE_PLUS_PRICE_ID=price_...
VITE_STRIPE_CHROME_PRICE_ID=price_...
```

#### Server-Side
```bash
# ⚠️ NEVER EXPOSE TO CLIENT
# Stripe secret key (server-side only)
STRIPE_SECRET_KEY=sk_live_...

# Webhook signing secret (verify webhook authenticity)
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Where to Find:**
- Stripe Dashboard → Developers → API keys
- Webhook secret: Developers → Webhooks → Add endpoint

---

### OpenAI (AI Chat & Scene Scout)

```bash
# OpenAI API key (server-side only)
OPENAI_API_KEY=sk-...

# Optional: Model override (default: gpt-4o-mini)
OPENAI_MODEL=gpt-4o-mini
```

**Where to Get:**
- OpenAI Platform → API keys
- URL: `https://platform.openai.com/api-keys`

---

### SoundCloud (Music Integration)

```bash
# SoundCloud OAuth app credentials
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret

# OAuth redirect URI (must match SoundCloud app settings)
SOUNDCLOUD_REDIRECT_URI=https://hotmess.london/api/soundcloud/callback

# Optional: OAuth scope
SOUNDCLOUD_SCOPE=non-expiring
```

#### Client-Side (for uploader allowlist)
```bash
# Comma-separated list of emails allowed to upload music
VITE_MUSIC_UPLOAD_EMAILS=dj@hotmess.london,admin@hotmess.london
```

**Where to Get:**
- SoundCloud → Developers → Register new app
- URL: `https://developers.soundcloud.com/`

---

### Telegram (Notifications & Auth)

```bash
# Telegram bot username (for Login Widget)
VITE_TELEGRAM_BOT_USERNAME=hotmessbot

# Telegram bot token (server-side only, for API calls)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
```

**Where to Get:**
- Talk to `@BotFather` on Telegram
- Use `/newbot` command to create bot
- Copy token and username

---

## Cron Job Protection

These secrets protect cron endpoints from unauthorized access.

```bash
# Event scraper cron protection
EVENT_SCRAPER_CRON_SECRET=random_secret_string

# Notification processor cron protection
OUTBOX_CRON_SECRET=random_secret_string

# Rate limit cleanup cron protection
RATE_LIMIT_CLEANUP_SECRET=random_secret_string
```

**Usage:**
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" \
  https://hotmess.london/api/events/cron
```

**Generate Random Secret:**
```bash
openssl rand -hex 32
```

---

## Event Scraper Configuration

```bash
# JSON object mapping cities to event feed URLs
EVENT_SCRAPER_SOURCES_JSON={"London":["https://example.com/london.json"],"Berlin":["https://example.com/berlin.json"]}

# Maximum events to import per city per run
EVENT_SCRAPER_MAX_EVENTS_PER_CITY=15

# Enable web search fallback if feeds fail
EVENT_SCRAPER_USE_WEB_SEARCH=false
```

---

## Ticket System

```bash
# Secret for signing ticket QR codes
TICKET_QR_SIGNING_SECRET=random_secret_string
```

**Purpose:** JWT signature for secure ticket validation

---

## Email Notifications (Future)

```bash
# Resend API key (not yet implemented)
RESEND_API_KEY=re_...

# From email address
EMAIL_FROM=HOTMESS <noreply@hotmess.london>
```

---

## Push Notifications (Future)

```bash
# VAPID public key (client-side, for push subscription)
VITE_VAPID_PUBLIC_KEY=BG...

# VAPID keys (server-side, for sending push notifications)
VAPID_PUBLIC_KEY=BG...
VAPID_PRIVATE_KEY=...
```

**Generate VAPID Keys:**
```bash
npx web-push generate-vapid-keys
```

---

## Feature Flags

```bash
# Enable XP purchasing feature
VITE_XP_PURCHASING_ENABLED=false

# Enable membership system
MEMBERSHIPS_ENABLED=false
```

---

## Analytics & Monitoring

```bash
# Google Analytics 4 Measurement ID (client-side)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Mixpanel token (client-side)
VITE_MIXPANEL_TOKEN=...

# Sentry DSN (client-side)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Sentry DSN (server-side)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Admin & Operations

```bash
# Comma-separated list of admin emails
ADMIN_EMAIL_ALLOWLIST=admin@hotmess.london,scanme@sicqr.com

# Server-side allowlist for music uploads (fallback)
MUSIC_UPLOAD_EMAILS=dj@hotmess.london,admin@hotmess.london
```

---

## E2E Testing (Local Only)

```bash
# Test user credentials (for Playwright e2e tests)
E2E_EMAIL=test.user@example.com
E2E_PASSWORD=test_password_123

# Enable test data seeding
E2E_SEED=true

# Seed location
E2E_SEED_LAT=51.5074
E2E_SEED_LNG=-0.1278

# Number of test users to seed
E2E_SEED_COUNT=12

# Spread radius in meters
E2E_SEED_SPREAD_M=3000
```

⚠️ **Never set these in production!**

---

## Variable Precedence

Vite resolves variables in this order:
1. `.env.local` (highest priority, never commit)
2. `.env.production` (if `NODE_ENV=production`)
3. `.env.development` (if `NODE_ENV=development`)
4. `.env` (defaults)

---

## Security Best Practices

### ✅ DO:
- Use `VITE_` prefix ONLY for values that MUST be client-side
- Keep API secret keys server-side (no `VITE_` prefix)
- Use `.env.local` for local secrets (gitignored)
- Set production secrets in Vercel environment variables
- Rotate keys immediately if accidentally committed
- Use restricted/scoped API keys when possible

### ❌ DON'T:
- Commit `.env` or `.env.local` files
- Put secret keys in client-side code (VITE_ variables)
- Share keys in plaintext (Slack, email, etc.)
- Use production keys in development
- Hardcode any credentials in source code

---

## Vercel Configuration

### Setting Environment Variables

1. Go to: `https://vercel.com/dashboard`
2. Select your project
3. Settings → Environment Variables
4. Add each variable with appropriate scope:
   - **Production:** Live site
   - **Preview:** Pull request deployments
   - **Development:** Local development (optional)

### Encrypted Variables
Vercel automatically encrypts all environment variables at rest.

---

## Validation Checklist

Before deploying, verify:

- [ ] All `VITE_` variables are safe to expose
- [ ] Service role keys are server-side only
- [ ] Webhook secrets match third-party settings
- [ ] API keys have correct permissions/scopes
- [ ] Production keys are different from development
- [ ] Cron secrets are strong random strings
- [ ] `.env.local` is in `.gitignore`

---

## Debugging

### Check if Variable is Set (Client)
```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
```

### Check if Variable is Set (Server)
```javascript
console.log(process.env.SUPABASE_URL);
```

### Common Issues

**"Variable is undefined in client"**
- Check if variable is prefixed with `VITE_`
- Restart dev server after adding variable

**"Variable is undefined in server"**
- Check if variable is set in Vercel environment variables
- Redeploy after adding variable

**"Auth is not working"**
- Verify Supabase URL and keys are correct
- Check if RLS policies are enabled
- Verify JWT token is being sent in Authorization header

---

## Environment Templates

### Minimal Setup (.env.local)
```bash
# Supabase (required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Maps (optional, but recommended for routing)
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Full Production Setup
See `.env.example` in repository root for complete template.

---

## References

- [Architecture Documentation](./ARCHITECTURE.md)
- [Database Schema](./DATABASE.md)
- [API Endpoints](./SERVER_ROUTES.md)
- Vercel Docs: https://vercel.com/docs/environment-variables
- Supabase Docs: https://supabase.com/docs/guides/cli/config

---

## Support

If you encounter issues with environment variables:

1. Check variable names match exactly (case-sensitive)
2. Verify scope is set correctly (Production/Preview/Development)
3. Redeploy after adding new variables
4. Check Vercel build logs for errors
5. Test locally with `.env.local` first

**Built with 🖤 for the queer nightlife community.**
