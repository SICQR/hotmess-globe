# Password Recovery Setup

This document describes the required configuration to make the **Forgot Password / Reset Password** flow work on Vercel preview and production deployments.

---

## Required Vercel Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase project anon/public key |

Both variables must be set for **every** Vercel environment (Production, Preview, Development).

---

## Supabase Dashboard Configuration

### 1. Site URL

In **Authentication → URL Configuration**, set the **Site URL** to your primary production domain:

```
https://hotmess.london
```

### 2. Additional Redirect URLs

Under **Authentication → URL Configuration → Redirect URLs**, add every domain that should be allowed to receive the recovery redirect. This must include:

- Your production domain: `https://hotmess.london/**`
- Your primary Vercel domain: `https://<your-project>.vercel.app/**`
- Vercel preview domains (wildcard): `https://*-<your-team>.vercel.app/**`
- Local development: `http://localhost:5173/**`

> ⚠️ Supabase will **reject** any `redirectTo` URL that is not listed here. The reset email will not contain a working link if the originating domain is not allowlisted.

### 3. Email Templates (optional but recommended)

In **Authentication → Email Templates → Reset Password**, ensure the template uses `{{ .ConfirmationURL }}`. The app appends `?mode=reset` as a query parameter via the `redirectTo` argument when calling `resetPasswordForEmail`, so the link will look like:

```
https://hotmess.london/auth?mode=reset#access_token=...&type=recovery
```

---

## How the Flow Works

1. User clicks **Forgot Password?** on `/auth`.
2. User enters their email and clicks **Send Reset Link**.
3. The app calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })` where `redirectTo` is `<current origin>/auth?mode=reset`.
4. Supabase sends an email containing the recovery link.
5. User clicks the link. They land on `/auth?mode=reset#access_token=...&type=recovery`.
6. The app detects the `PASSWORD_RECOVERY` auth event (or `mode=reset` / `type=recovery` in the URL) and shows the **Set New Password** form.
7. User enters a new password and clicks **Update Password**.
8. The app calls `supabase.auth.updateUser({ password })` then signs the user out.
9. User is returned to the sign-in screen.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Reset email arrives but link returns 404 | `redirectTo` domain is not in Supabase redirect URL allowlist |
| Clicking **Send Reset Link** does nothing (no network call visible) | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing or empty |
| "Set New Password" form doesn't appear after clicking the link | The Supabase project is using PKCE and the `type=recovery` hash is absent — ensure `PASSWORD_RECOVERY` event handling is present in `onAuthStateChange` (already fixed) |
| "Invalid or expired link" error on password update | The session was not established before `updateUser` was called; check that the recovery token is valid and not expired (default: 1 hour) |
