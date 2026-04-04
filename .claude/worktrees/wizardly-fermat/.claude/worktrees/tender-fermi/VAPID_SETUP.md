# VAPID Key Setup for Push Notifications

Keys were generated on 2026-03-07 via `npx web-push generate-vapid-keys`.

```
VAPID_PUBLIC_KEY  = BFWgyAvJsZf4wZavZ-6X6c934k13RiYwjeEEIgQeOK0PyrBbvcJrqLL9llzV2Phee9GDOLpSVPSvGIja5eyr5WY
VAPID_PRIVATE_KEY = qHyNgVNkoOu8LRVSF6iqFY_PCXcqDqfCGTAwHpQkwpY
VAPID_SUBJECT     = mailto:admin@hotmess.london
```

## What's already done (no action required)

- `.env.local` has `VITE_VAPID_PUBLIC_KEY` set (local dev works)
- `usePushNotifications.ts` falls back to the real public key hardcoded
  → **Client-side push subscriptions work in production right now**
- `send-push` Edge Function v3 reads `VAPID_*` from `Deno.env` (deployed)

## What needs manual setup

### 1. Supabase — Edge Function secrets (REQUIRED for sending pushes)

Go to: https://supabase.com/dashboard/project/klsywpvncqqglhnhrjbh/settings/vault

Or via CLI (needs your Supabase PAT):
```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="BFWgyAvJsZf4wZavZ-6X6c934k13RiYwjeEEIgQeOK0PyrBbvcJrqLL9llzV2Phee9GDOLpSVPSvGIja5eyr5WY" \
  VAPID_PRIVATE_KEY="qHyNgVNkoOu8LRVSF6iqFY_PCXcqDqfCGTAwHpQkwpY" \
  VAPID_SUBJECT="mailto:admin@hotmess.london" \
  --project-ref klsywpvncqqglhnhrjbh
```

### 2. Vercel — Environment variable (nice-to-have, already has hardcoded fallback)

Go to: https://vercel.com/phils-projects-59e621aa/hotmess-globe/settings/environment-variables

Add for **Production + Preview + Development**:
```
Name:  VITE_VAPID_PUBLIC_KEY
Value: BFWgyAvJsZf4wZavZ-6X6c934k13RiYwjeEEIgQeOK0PyrBbvcJrqLL9llzV2Phee9GDOLpSVPSvGIja5eyr5WY
```

## Test after Supabase secrets are set

```js
// In browser console on hotmess.app:
const sw = await navigator.serviceWorker.ready;
const sub = await sw.pushManager.getSubscription();
console.log(sub?.endpoint); // should show a push endpoint
```

Then trigger a test notification via the send-push Edge Function:
```bash
curl -X POST https://klsywpvncqqglhnhrjbh.supabase.co/functions/v1/send-push \
  -H "Authorization: Bearer <your-supabase-anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<your-uuid>","title":"Test","body":"Push works!"}'
```
