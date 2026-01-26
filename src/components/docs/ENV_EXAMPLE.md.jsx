# Environment Variables Template

> **Copy this content to `.env.example` in your repository root**

```env
# Supabase (Client)
# Get from: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Stripe Payment Processing
# Get from: https://dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase (Server)
# Use in Vercel serverless functions only
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Shopify Integration (Optional)
# Get from: https://admin.shopify.com/store/your-store/settings/apps/development
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here

# Mapbox (for enhanced maps)
# Get from: https://account.mapbox.com/access-tokens
VITE_MAPBOX_TOKEN=pk.your_mapbox_token

# Google Maps Platform (Routing)
# Server-only: used by /api/nearby and /api/routing/etas
GOOGLE_MAPS_API_KEY=your_google_maps_platform_key
# Optional: traffic-aware driving ETA using Routes API v2
GOOGLE_ROUTES_DRIVE_TRAFFIC_AWARE=false

# Telegram Bot (for handshake connections)
# Get from: @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# SoundCloud API (for RAW Convict Records)
# Get from: https://soundcloud.com/you/apps
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret
SOUNDCLOUD_REDIRECT_URI=https://your-domain.com/api/soundcloud/callback

# OpenAI (for AI features)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Email Service (Optional)
# Get from your email provider
SENDGRID_API_KEY=your_sendgrid_api_key_here
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_password

# Environment
NODE_ENV=development

# Feature Flags (Optional)
VITE_ENABLE_AI_MATCHMAKING=true
VITE_ENABLE_MARKETPLACE=true
VITE_ENABLE_RADIO=true
VITE_ENABLE_SAFETY_FEATURES=true
VITE_ENABLE_ANALYTICS=true

# Analytics (Optional)
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=your_mixpanel_token

# Rate Limiting (Backend Functions)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
# Generate with: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# External APIs (Optional)
WEATHER_API_KEY=your_weather_api_key
GEOCODING_API_KEY=your_geocoding_api_key
```

## Setup Instructions

1. **Copy this file**:
   ```bash
   cp .env.example .env
   ```

2. **Fill in required values**:
   - Create a Supabase project and get keys
   - Generate Stripe keys from Stripe dashboard
   - Create Supabase project and get keys
   - Set other optional services as needed

3. **Never commit `.env`**:
   - Ensure `.env` is in your `.gitignore`
   - Use Base44 dashboard for production secrets

## Required for Basic Functionality

Minimum required environment variables:
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` - Frontend auth + reads
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side privileged writes (Vercel only)
- `VITE_STRIPE_PUBLISHABLE_KEY` + `stripe_key` - Payments

## Setting Production Secrets

### In Vercel Project Settings

1. Go to Project → Settings → Environment Variables
2. Add server secrets without `VITE_` prefix
3. Redeploy after adding secrets

### Secret Naming Convention

- `VITE_*` - Client-side (publicly visible)
- No prefix - Server-side only (secure)

## Security Notes

⚠️ **Never commit secrets to Git**
⚠️ **Use different keys for dev/staging/production**
⚠️ **Rotate keys regularly**
⚠️ **Grant minimal permissions**

## Testing Environment Variables

```bash
# Check if required variables are set
npm run check-env

# Validate environment configuration
npm run validate-env
```

## Troubleshooting

### Missing Variables Error

If you see "Environment variable not defined":
1. Check `.env` file exists
2. Verify variable name matches exactly
3. Restart development server
4. Check Base44 dashboard for production

### VITE_ Variables Not Loading

- Must start with `VITE_` to be accessible in frontend
- Restart dev server after adding
- Clear browser cache if needed