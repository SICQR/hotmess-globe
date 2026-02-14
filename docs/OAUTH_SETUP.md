# OAuth Authentication Setup Guide

## Overview

The HOTMESS platform supports multiple authentication methods:
- **Email/Password** - Traditional authentication
- **Google OAuth** - Sign in with Google
- **Telegram** - Sign in with Telegram

This guide covers the setup and configuration of OAuth providers.

## Prerequisites

- Active Supabase project
- Vercel deployment (or configured environment variables locally)
- Access to provider developer consoles (Google, Telegram)

---

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen if not already done:
   - User Type: External (for public apps)
   - Add app name, support email, and logo
   - Add authorized domains (e.g., `hotmess.london`, `vercel.app`)
   - Add scopes: email, profile, openid

### 2. Configure OAuth Client

**Application Type**: Web Application

**Authorized JavaScript Origins**:
```
https://your-domain.com
https://your-project.vercel.app
http://localhost:5173 (for development)
```

**Authorized Redirect URIs**:
```
https://your-supabase-project.supabase.co/auth/v1/callback
```

⚠️ **Important**: The redirect URI must match exactly what Supabase expects. Do not use custom callback URLs.

### 3. Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and enable it
4. Enter your OAuth credentials:
   - **Client ID**: From Google Console
   - **Client Secret**: From Google Console
5. Click **Save**

### 4. Test the Integration

1. Navigate to your app's auth page
2. Click "Continue with Google"
3. You should be redirected to Google's consent screen
4. After approval, you'll be redirected back to your app
5. Check that the session is established correctly

**Common Issues**:
- ❌ **Redirect URI mismatch**: Ensure Supabase callback URL is added to Google Console
- ❌ **Infinite loading**: Check browser console for errors, verify OAuth credentials
- ❌ **Access denied**: Verify OAuth consent screen is configured correctly

---

## Telegram OAuth Setup

### 1. Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Save your **Bot Token** (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Send `/setdomain` to BotFather
5. Enter your bot username
6. Enter your domain (e.g., `hotmess.london` or `your-project.vercel.app`)

### 2. Configure Environment Variables

Add these to your Vercel environment variables (or `.env.local` for development):

```env
# Telegram Bot Configuration
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

⚠️ **Important**: 
- `VITE_TELEGRAM_BOT_USERNAME` is exposed to the client (no `VITE_` prefix means server-only)
- `TELEGRAM_BOT_TOKEN` is server-only and should NEVER be exposed to the client

### 3. Configure Supabase (Optional)

Telegram authentication in this app uses a custom integration that:
1. Uses Telegram Login Widget on the frontend
2. Verifies the authentication on the backend via `/api/auth/telegram/verify`
3. Links Telegram accounts to existing users or creates new accounts

No Supabase provider configuration is needed as we handle it via custom endpoints.

### 4. Test the Integration

1. Navigate to your app's auth page
2. Click the Telegram button
3. Telegram Login Widget should appear
4. Complete authentication with Telegram
5. The app will link your account or prompt for email registration

**Common Issues**:
- ❌ **Bot not found**: Verify bot username is correct
- ❌ **Domain not allowed**: Ensure you set the domain with BotFather
- ❌ **Verification failed**: Check that `TELEGRAM_BOT_TOKEN` is set correctly

---

## Environment Variables Summary

### Client-Side (VITE_ prefix - exposed to browser)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_TELEGRAM_BOT_USERNAME=your_bot_username
```

### Server-Side (NO VITE_ prefix - serverless functions only)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## Security Best Practices

### 1. Secrets Management
- ✅ **DO**: Store secrets in Vercel Environment Variables
- ✅ **DO**: Use different credentials for development/staging/production
- ❌ **DON'T**: Commit secrets to git (even in `.env.local`)
- ❌ **DON'T**: Expose server-only secrets to the client

### 2. OAuth Configuration
- ✅ **DO**: Use HTTPS in production
- ✅ **DO**: Restrict authorized domains to your actual domains
- ✅ **DO**: Keep OAuth consent screen information up to date
- ❌ **DON'T**: Allow wildcard redirects
- ❌ **DON'T**: Use development credentials in production

### 3. Supabase RLS Policies
- ✅ **DO**: Enable Row Level Security on all tables
- ✅ **DO**: Test policies with different user roles
- ✅ **DO**: Restrict service role usage to backend only
- ❌ **DON'T**: Bypass RLS in production code
- ❌ **DON'T**: Grant blanket access to authenticated users

---

## Troubleshooting

### Google OAuth Issues

**Problem**: Infinite green loading spinner after redirect
- **Solution**: Check that the OAuth callback is being handled correctly
- **Check**: Browser console for errors
- **Verify**: Supabase auth state change listener is active
- **Test**: Try signing out and signing in again

**Problem**: "Access blocked" or "Error 400: redirect_uri_mismatch"
- **Solution**: Verify the redirect URI in Google Console matches Supabase exactly
- **Format**: `https://PROJECT_ID.supabase.co/auth/v1/callback`

### Telegram Issues

**Problem**: "Bot domain invalid"
- **Solution**: Use `/setdomain` with BotFather to set your domain
- **Note**: You can only set ONE domain per bot

**Problem**: Telegram auth fails silently
- **Solution**: Check `/api/auth/telegram/verify` endpoint is working
- **Debug**: Enable console logging in TelegramLogin component
- **Verify**: TELEGRAM_BOT_TOKEN is set in Vercel

### General Auth Issues

**Problem**: User authenticated but profile not created
- **Solution**: Check Supabase RLS policies on User table
- **Verify**: `user_insert_self` policy exists and is correct
- **Check**: Supabase logs for errors

**Problem**: "Session expired" immediately after login
- **Solution**: Check Supabase JWT settings
- **Verify**: Time synchronization on server
- **Test**: Check session expiry time in auth settings

---

## Testing Checklist

Before deploying to production, test all authentication flows:

- [ ] Email/Password sign up creates user profile
- [ ] Email/Password sign in works correctly
- [ ] Password reset email is received and works
- [ ] Google OAuth sign in creates/links user profile
- [ ] Google OAuth sign in redirects correctly after success
- [ ] Telegram authentication verifies correctly
- [ ] Telegram links to existing account if user is logged in
- [ ] Session persists across page reloads
- [ ] Sign out clears session completely
- [ ] Rate limiting works on auth endpoints
- [ ] Error messages are user-friendly

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Telegram Login Widget Documentation](https://core.telegram.org/widgets/login)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting) above
2. Review Supabase auth logs
3. Check browser console and network tab
4. Review server logs in Vercel dashboard
5. Open an issue on GitHub with detailed information
