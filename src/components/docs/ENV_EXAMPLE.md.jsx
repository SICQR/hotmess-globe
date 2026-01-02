# Environment Variables Template

> **Copy this content to `.env.example` in your repository root**

```env
# Base44 Configuration
# These are automatically provided by Base44 platform
BASE44_APP_ID=auto-provided-by-base44
BASE44_API_URL=auto-provided-by-base44

# Stripe Payment Processing
# Get from: https://dashboard.stripe.com/apikeys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
stripe_key=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase Storage
# Get from: https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
supabase_key=your-service-role-key-here

# Shopify Integration (Optional)
# Get from: https://admin.shopify.com/store/your-store/settings/apps/development
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_your_access_token

# Mapbox (for enhanced maps)
# Get from: https://account.mapbox.com/access-tokens
VITE_MAPBOX_TOKEN=pk.your_mapbox_token

# Telegram Bot (for handshake connections)
# Get from: @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# SoundCloud API (for RAW Convict Records)
# Get from: https://soundcloud.com/you/apps
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_client_secret
SOUNDCLOUD_REDIRECT_URI=https://your-domain.com/callback

# OpenAI (for AI features)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your_openai_key

# Email Service (Optional - if not using Base44 built-in)
# Get from your email provider
SENDGRID_API_KEY=SG.your_sendgrid_key
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
   - Get Base44 credentials from your Base44 dashboard
   - Generate Stripe keys from Stripe dashboard
   - Create Supabase project and get keys
   - Set other optional services as needed

3. **Never commit `.env`**:
   - Ensure `.env` is in your `.gitignore`
   - Use Base44 dashboard for production secrets

## Required for Basic Functionality

Minimum required environment variables:
- `BASE44_APP_ID` - Auto-provided by Base44
- `VITE_STRIPE_PUBLISHABLE_KEY` - For marketplace payments
- `stripe_key` - For server-side payment processing
- `supabase_key` - For file storage

## Setting Production Secrets

### In Base44 Dashboard

1. Go to Settings → Environment Variables
2. Add secrets without `VITE_` prefix (server-side only)
3. Restart the app after adding secrets

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