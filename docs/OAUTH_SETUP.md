# OAuth Provider Setup Guide

This document provides instructions for setting up OAuth providers (Google, GitHub, etc.) with Supabase authentication.

## Current Status

### ✅ Implemented
- **Email/Password Authentication**: Fully functional via Supabase Auth
- **Magic Links**: Email-based passwordless login
- **Telegram Authentication**: Verification endpoint implemented at `/api/auth/telegram/verify`
  - Verifies Telegram widget auth data using HMAC-SHA256
  - Links Telegram accounts to existing users or prompts registration

### ⚠️ Partially Implemented
- **Google OAuth**: UI button exists but requires Supabase configuration
- **Telegram Proxy**: Returns 501 (Not Implemented) - see limitations below

### ❌ Not Configured
- **GitHub OAuth**: Not configured in Supabase
- **Other OAuth Providers**: Apple, Discord, etc. are available but not configured

## Google OAuth Setup

Google OAuth is already integrated in the UI (`src/pages/Auth.jsx` line 337-360) but requires Supabase configuration.

### Frontend Implementation
```javascript
// Already implemented in src/pages/Auth.jsx
const { error } = await auth.signInWithGoogle(
  `${window.location.origin}/auth/callback`
);
```

### Backend Configuration Required

#### 1. Supabase Dashboard Setup
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com):
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
5. Copy Client ID and Client Secret to Supabase

#### 2. Local Development Configuration
If testing locally with Supabase CLI, update `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_OAUTH_CLIENT_ID)"
secret = "env(GOOGLE_OAUTH_SECRET)"
redirect_uri = ""  # Leave empty to use default
skip_nonce_check = true  # Required for local development
```

#### 3. Environment Variables
Add to `.env.local` (local) or Vercel (production):
```bash
# Not needed in frontend - Supabase handles OAuth server-side
# Only needed if you're running Supabase locally
GOOGLE_OAUTH_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_OAUTH_SECRET=your_client_secret_here
```

## Telegram Authentication Setup

### Current Implementation Status

#### ✅ Working Components
1. **Telegram Login Widget** (`src/components/auth/TelegramLogin.jsx`)
   - Renders official Telegram login button
   - Handles auth callback from Telegram
   - Links Telegram accounts to existing users

2. **Verification Endpoint** (`api/auth/telegram/verify.js`)
   - Verifies Telegram auth data using HMAC-SHA256
   - Validates auth_date (must be within 24 hours)
   - Checks signature against bot token

#### ⚠️ Limitations
**Telegram Proxy** (`functions/telegramProxy.ts`) returns **501 Not Implemented**
- This function is a stub that needs real Telegram Bot API integration
- Current message: "Telegram proxy is not wired to Telegram"
- Decision needed: Either implement or remove Telegram messaging features

### Required Configuration
```bash
# Frontend - Bot username for login widget
VITE_TELEGRAM_BOT_USERNAME=your_bot_username

# Backend - Bot token for verification
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
```

### Setup Steps
1. Create bot via [@BotFather](https://t.me/BotFather)
2. Use `/setdomain` to authorize your domain
3. Add environment variables to Vercel
4. Test login widget on Auth page

### Telegram Messaging Integration
If you want full Telegram integration (not just login):
1. Implement real Telegram Bot API in `functions/telegramProxy.ts`
2. Set up webhook: `https://api.telegram.org/bot<token>/setWebhook`
3. Handle incoming messages and route to chat threads
4. Send messages via Bot API

**OR** disable Telegram messaging features:
1. Remove Telegram messaging UI elements
2. Keep only authentication (which works)
3. Document that only login is supported

## GitHub OAuth Setup

GitHub OAuth is not currently implemented but can be added easily.

### Frontend Changes Required
Add GitHub button to `src/pages/Auth.jsx`:

```javascript
<button
  onClick={async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error.message || 'GitHub sign in failed');
      setLoading(false);
    }
  }}
  disabled={loading}
  className="w-full bg-[#24292e] hover:bg-[#1b1f23] text-white font-medium py-3 px-4 flex items-center justify-center gap-3 mb-3 transition-colors"
>
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
  Continue with GitHub
</button>
```

### Backend Configuration
1. Create OAuth App in [GitHub Settings](https://github.com/settings/developers)
2. Set callback URL: `https://<project>.supabase.co/auth/v1/callback`
3. Enable in Supabase dashboard
4. Update `supabase/config.toml` if using local Supabase

## Testing Authentication

### Manual Testing Checklist
- [ ] Email/password signup creates new user
- [ ] Email/password login works for existing user
- [ ] Password reset email sends successfully
- [ ] Magic link login works
- [ ] Google OAuth redirects correctly (after setup)
- [ ] Telegram login widget loads
- [ ] Telegram auth verifies successfully
- [ ] GitHub OAuth works (after setup)
- [ ] Auth redirects to correct page after login

### Automated Testing
Create test script: `scripts/test-auth.mjs`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('Testing authentication...');
  
  // Test 1: Email signup
  const testEmail = `test-${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'TestPass123!',
  });
  
  if (error) {
    console.error('❌ Signup failed:', error.message);
  } else {
    console.log('✅ Signup successful');
  }
  
  // Test 2: Login
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: 'TestPass123!',
  });
  
  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
  } else {
    console.log('✅ Login successful');
  }
  
  // Test 3: Get session
  const { data: { session } } = await supabase.auth.getSession();
  console.log(session ? '✅ Session retrieved' : '❌ No session');
  
  // Cleanup
  await supabase.auth.signOut();
}

testAuth();
```

## Security Considerations

### Required for Production
1. **OAuth Secrets**: Never commit OAuth secrets to git
2. **HTTPS Only**: OAuth redirects require HTTPS in production
3. **Redirect URI Validation**: Whitelist exact redirect URIs
4. **Rate Limiting**: Implement rate limits on auth endpoints
5. **Email Verification**: Consider enabling `enable_confirmations` in Supabase
6. **Session Security**: 
   - Set appropriate session timeouts
   - Use secure cookies in production
   - Implement CSRF protection

### Current Security Measures
- ✅ Supabase Row Level Security (RLS) enabled
- ✅ Service role key not exposed to client
- ✅ Telegram auth uses HMAC-SHA256 verification
- ✅ Password minimum length enforced (6 characters)
- ✅ Rate limiting implemented in `api/middleware/rateLimiter.js`

### Recommendations
1. Enable email confirmations for new signups
2. Implement 2FA/MFA for sensitive accounts
3. Add session activity logging
4. Monitor for suspicious auth patterns
5. Implement account lockout after failed attempts

## Troubleshooting

### Google OAuth Issues
**Problem**: "OAuth error: redirect_uri_mismatch"
- **Solution**: Verify redirect URI in Google Console matches Supabase callback URL exactly

**Problem**: "Invalid credentials" on local development
- **Solution**: Set `skip_nonce_check = true` in Supabase config for local dev

### Telegram Issues
**Problem**: Telegram widget not loading
- **Solution**: Check VITE_TELEGRAM_BOT_USERNAME is set and bot domain is authorized

**Problem**: "Not implemented" error when messaging
- **Solution**: This is expected - Telegram messaging proxy needs implementation

### General Auth Issues
**Problem**: "Invalid JWT" errors
- **Solution**: Check Supabase URL and anon key are correct in environment variables

**Problem**: Users stuck in unconfirmed state
- **Solution**: Disable email confirmations in Supabase or implement email service

## Next Steps

1. **Immediate**: Configure Google OAuth in Supabase dashboard
2. **Short-term**: Decide on Telegram messaging implementation vs removal
3. **Optional**: Add GitHub OAuth for developer users
4. **Future**: Consider Apple Sign In for iOS users
5. **Testing**: Create comprehensive auth test suite

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Telegram Login Widget](https://core.telegram.org/widgets/login)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
