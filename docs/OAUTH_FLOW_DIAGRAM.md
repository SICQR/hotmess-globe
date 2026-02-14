# Google OAuth Flow - Before and After Fix

## BEFORE FIX ❌

```
User clicks "Sign in with Google"
         ↓
Auth.jsx calls: auth.signInWithGoogle("/auth/callback")
         ↓
Redirects to: Google OAuth page
         ↓
User signs in with Google
         ↓
Google redirects to: https://your-app.com/auth/callback?code=...
         ↓
❌ 404 ERROR - Route doesn't exist!
         ↓
User sees: Page Not Found
         ↓
Authentication FAILS
```

**Problem:** The `/auth/callback` route was never defined in the application router.

## AFTER FIX ✅

```
User clicks "Sign in with Google"
         ↓
Auth.jsx calls: auth.signInWithGoogle("/auth?next=/profile")
         ↓
Redirects to: Supabase Auth → Google OAuth page
         ↓
User signs in with Google
         ↓
Google redirects to: Supabase Auth Callback
         ↓
Supabase exchanges code for access token
         ↓
Supabase redirects to: https://your-app.com/auth?next=/profile#access_token=...
         ↓
Auth.jsx detects OAuth callback (access_token in URL hash)
         ↓
Auth.jsx calls: auth.getSession()
         ↓
✅ Session established, user authenticated
         ↓
Auth.jsx redirects to: /profile (from 'next' parameter)
         ↓
User is SUCCESSFULLY logged in!
```

**Solution:** Redirect to `/auth` page which already exists and has OAuth callback handling logic.

## Technical Details

### URL Structure

**Supabase OAuth Callback (handled by Supabase):**
```
https://your-project-id.supabase.co/auth/v1/callback
```
This is where Google redirects after authentication. Supabase handles this automatically.

**App Callback (handled by your app):**
```
https://your-app.com/auth?next=/destination#access_token=...&refresh_token=...
```
This is where Supabase redirects after processing. Your Auth.jsx page handles this.

### Code Changes

**Before:**
```javascript
// Auth.jsx line 446
await auth.signInWithGoogle(`${window.location.origin}/auth/callback`);

// supabaseClient.jsx line 1546
redirectTo: redirectTo || `${window.location.origin}/auth/callback`
```

**After:**
```javascript
// Auth.jsx line 446
const redirectUrl = `${window.location.origin}/auth${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ''}`;
await auth.signInWithGoogle(redirectUrl);

// supabaseClient.jsx line 1546
redirectTo: redirectTo || `${window.location.origin}/auth`
```

### OAuth Callback Detection

Auth.jsx detects OAuth callbacks by checking the URL:

```javascript
// Check if this is an OAuth callback
const hash = window.location.hash || '';
const hasOAuthToken = hash.includes('access_token=') || hash.includes('code=');

if (hasOAuthToken) {
  // Exchange token and authenticate
  const { data, error } = await auth.getSession();
  if (data?.session) {
    // Success! Redirect to intended page
    const redirect = nextUrl || '/';
    window.location.href = redirect;
  }
}
```

## Configuration Required

### 1. Google Cloud Console

**Authorized Redirect URIs must include:**
```
https://your-project-id.supabase.co/auth/v1/callback
```

**NOT:**
```
❌ https://your-app.com/auth/callback  (This is wrong!)
```

### 2. Supabase Dashboard

**Site URL:**
```
https://your-app.com
```

**Redirect URLs:**
```
https://your-app.com
https://your-app.com/auth
http://localhost:5173
http://localhost:5173/auth
```

### 3. Supabase Config (Local Dev)

In `supabase/config.toml`:
```toml
[auth]
site_url = "http://127.0.0.1:5173"
additional_redirect_urls = [
  "http://127.0.0.1:5173/auth",
  "http://localhost:5173",
  "http://localhost:5173/auth"
]

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_OAUTH_CLIENT_ID)"
secret = "env(GOOGLE_OAUTH_CLIENT_SECRET)"
skip_nonce_check = true
```

## Security Considerations

1. **Redirect URLs must be allowlisted** in Supabase Dashboard
2. **Client Secret never exposed** to client-side code
3. **OAuth state parameter** prevents CSRF attacks (handled by Supabase)
4. **Token exchange** happens on Supabase's servers (not in browser)
5. **HTTPS required** in production

## Common Issues

### Issue: "Invalid redirect URL"
**Cause:** App redirect URL not in Supabase allowlist
**Fix:** Add URL to Supabase Dashboard → Auth → URL Configuration

### Issue: "Redirect URI mismatch"
**Cause:** Google OAuth redirect doesn't match Supabase callback URL
**Fix:** Ensure Google Console has: `https://your-project-id.supabase.co/auth/v1/callback`

### Issue: "OAuth provider not enabled"
**Cause:** Google OAuth not configured in Supabase Dashboard
**Fix:** Enable in Authentication → Providers → Google

### Issue: User authenticated but redirected to wrong page
**Cause:** `next` parameter not preserved
**Fix:** Code now preserves `next` parameter through OAuth flow

## Testing Checklist

- [ ] Click "Continue with Google" on `/auth` page
- [ ] Verify redirect to Google sign-in page
- [ ] Sign in with Google account
- [ ] Verify redirect back to app at `/auth`
- [ ] Verify user is authenticated (check auth state)
- [ ] Verify redirect to correct destination page
- [ ] Test with `next` parameter: `/auth?next=/profile`
- [ ] Verify no console errors
- [ ] Check Network tab for proper API calls

## Resources

- [Google OAuth Setup Guide](./SUPABASE_OAUTH_SETUP.md)
- [Deployment Checklist](./SUPABASE_DEPLOYMENT_CHECKLIST.md)
- [Implementation Summary](./GOOGLE_OAUTH_FIX_SUMMARY.md)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
