# Supabase OAuth Setup Guide

This guide explains how to configure Google OAuth authentication for the HOTMESS app on Supabase.

## Overview

The app uses Supabase Auth for authentication, including OAuth providers like Google. This requires configuration in both:
1. **Google Cloud Console** - to create OAuth credentials
2. **Supabase Dashboard** - to enable and configure the provider

## Prerequisites

- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to your [Supabase Dashboard](https://app.supabase.com/)
- Your Supabase project URL (e.g., `https://your-project-id.supabase.co`)
  - Find this in Supabase Dashboard → Project Settings → API

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **HOTMESS**
   - User support email: Your email
   - Authorized domains: Your production domain (e.g., `hotmess.london`)
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **HOTMESS Production** (or similar)
   - Authorized redirect URIs:
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
     Replace `your-project-id` with your actual Supabase project ID
     
     **Example for this project:**
     ```
     https://klsywpvncqqglhnhrjbh.supabase.co/auth/v1/callback
     ```
7. Click **Create** and save the:
   - **Client ID** (e.g., `123456789-abc.apps.googleusercontent.com`)
   - **Client Secret** (e.g., `GOCSPX-abc123...`)

## Step 2: Configure Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (find your project ID in Project Settings → API)
3. Navigate to **Authentication** → **Providers**
4. Find **Google** in the list and click to expand
5. Enable the provider and fill in:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
   - **Authorized Client IDs**: Leave empty unless using specific features
6. Click **Save**

## Step 3: Configure Site URL and Redirect URLs

Still in the Supabase Dashboard:

1. Navigate to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain:
   ```
   https://your-domain.com
   ```
   **Example for this project:** `https://hotmess.london`
   
   Or for local testing:
   ```
   http://localhost:5173
   ```
3. Add **Redirect URLs** (one per line):
   ```
   https://your-domain.com
   https://your-domain.com/auth
   http://localhost:5173
   http://localhost:5173/auth
   ```
4. Click **Save**

## Step 4: Verify Environment Variables

Ensure these variables are set in **Vercel** (or your deployment platform):

```bash
# Supabase (already set)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Google OAuth (not needed in Vercel - configured in Supabase Dashboard)
# These are ONLY needed for local Supabase development
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

**Note**: OAuth credentials are configured in the Supabase Dashboard for production. You do NOT need to add `GOOGLE_OAUTH_*` to Vercel environment variables.

## Step 5: Test the Integration

1. Deploy your changes or run locally
2. Navigate to the `/auth` page
3. Click **Continue with Google**
4. You should be redirected to Google's sign-in page
5. After signing in, you should be redirected back to your app and authenticated

## Troubleshooting

### "OAuth provider not enabled" error
- Verify Google OAuth is enabled in Supabase Dashboard
- Check that Client ID and Secret are correctly entered
- Ensure you saved the configuration

### "Redirect URI mismatch" error
- Verify the redirect URI in Google Cloud Console matches:
  ```
  https://your-project.supabase.co/auth/v1/callback
  ```
- Check that your Supabase project URL is correct
- Ensure no typos or extra spaces

### "Invalid redirect URL" error
- Add your app's URL to the Redirect URLs list in Supabase Dashboard
- Include both the base URL and `/auth` path
- Save the configuration

### OAuth popup blocked
- Ensure pop-ups are not blocked by the browser
- Try in an incognito window to rule out extensions
- Check browser console for specific errors

## Local Development Setup

For local development with Supabase CLI:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

3. Create a `.env.local` file:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=your_client_id
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
   ```

4. The local redirect URI will be:
   ```
   http://127.0.0.1:54321/auth/v1/callback
   ```
   Add this to your Google OAuth authorized redirect URIs

5. Configure `supabase/config.toml` (already done in this repo)

## Migration Status

All necessary database migrations are in `/supabase/migrations/`. To apply them:

**Production (Supabase Dashboard):**
1. Go to **Database** → **Migrations**
2. The migrations should auto-sync from your Git repo if linked
3. Or manually run each `.sql` file in order

**Local (Supabase CLI):**
```bash
supabase db reset
```

## Security Notes

- **Never commit OAuth secrets** to Git
- Keep Client Secret secure and rotate if compromised
- Use environment variables or Supabase Dashboard for credentials
- Restrict OAuth scopes to only what's needed (email, profile)
- Monitor OAuth usage in Google Cloud Console

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
