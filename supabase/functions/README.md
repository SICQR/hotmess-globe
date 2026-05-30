# Supabase Edge Functions

Tiny set on purpose. Anything that can live as a Vercel `/api/*` route does —
co-locates with the auth helpers, ships in the same deploy pipeline, and avoids
a second runtime to monitor. Edge Functions are reserved for code that genuinely
needs Supabase service-role credentials at request time without a round-trip to
Vercel.

## Active functions

| Slug          | Purpose                                                                                                                          |
|---------------|----------------------------------------------------------------------------------------------------------------------------------|
| `notify-push` | Web Push fan-out from a user JWT. Looks up `push_subscriptions`, sends VAPID-signed payloads, prunes 410/404 expired endpoints.  |
| `panic-alert` | SOS dispatcher. Reads `trusted_contacts` for the caller, fans Twilio SMS out (UK Alpha Sender), records each attempt in `safety_alerts` for audit. WhatsApp path gated on `TWILIO_WA_CONTENT_SID`. |

## Removed (MEGA-2.3, 2026-05-07)

The Supabase project previously hosted 18 deployed functions. 16 were ghosts —
deployed once, never (or no longer) called from the codebase. Each was triaged
via `grep -r '<slug>' src/ api/` before undeploy.

### Replaced by Vercel `/api/*` routes (in-repo source deleted, undeployed)

| Slug                       | Replacement                                  |
|----------------------------|----------------------------------------------|
| `cancel-subscription`      | `api/stripe/cancel-subscription.js`          |
| `create-checkout-session`  | `api/stripe/create-checkout.js`              |
| `push-processor`           | `api/notifications/dispatch.js`              |
| `send-push`                | `api/notifications/dispatch.js` (push channel) |
| `stripe-webhook`           | `api/stripe/webhook.js`                      |
| `send-email`               | `api/email/send.js` (also dropped unused `src/utils/emailService.jsx`) |

### Phantom functions (no in-repo source — undeployed via `supabase functions delete`)

| Slug                          | Reason                                                                                  |
|-------------------------------|-----------------------------------------------------------------------------------------|
| `make-server-3645ca2d`        | Make.com integration leftover, externally triggered, unmonitored.                       |
| `make-server-3139dffd`        | Make.com leftover.                                                                      |
| `make-server-a670c824`        | Make.com leftover; legacy `kv_store_a670c824` user of the old panic-alert stub.         |
| `make-server-3932b677`        | Make.com leftover (`verify_jwt=false` — public surface, security risk).                 |
| `make-server-b656305e`        | Make.com leftover.                                                                      |
| `make-server-f739775c`        | Make.com leftover.                                                                      |
| `make-server-44c3cb77`        | Make.com leftover.                                                                      |
| `right-now`                   | Replaced by direct Supabase writes to `right_now_status` table from the frontend.       |
| `right-now-create`            | Same — frontend writes directly.                                                        |
| `right-now-feed`              | Same — frontend reads directly.                                                         |
| `right-now-reply`             | Same — frontend writes directly.                                                        |
| `right-now-test`              | Test fixture, never used in production paths.                                           |
| `hotmess-concierge`           | Concierge moved to Telegram bot (server-side) — Edge Function never reached production. |
| `get-signed-url`              | Replaced by direct `supabase.storage.from(...).createSignedUrl(...)` from clients.      |
| `server`                      | Generic catch-all, no callers.                                                          |
| `chat-utils`                  | Chat upload flow now uses `supabase.storage` directly (`src/components/utils/uploadToStorage.ts`). |

## Adding a new function

Before deploying anything new, ask:

1. Can a Vercel `/api/*` route do this? If yes, do it there. Edge Functions are
   the exception, not the default.
2. Does it need Supabase service-role credentials at request time without a
   round-trip to Vercel? (e.g. a secured webhook from a partner that posts
   directly to Supabase.)
3. Is there an in-repo source file that lives next to the deploy command? If
   not, you are creating tomorrow's ghost.

If the answers are *no / yes / yes*, scaffold under `supabase/functions/<slug>/index.ts`,
add a row to the table above, deploy, and link the deploy in the PR description.

## Deployment

```bash
supabase functions deploy <slug> --project-ref rfoftonnlwudilafhfkl
```

CI/CD: edge function deploys are intentionally **not** wired into the Vercel
build. The release path is a deliberate human action so secret rotations and
schema changes can land in lockstep.

## Secrets

Set via `supabase secrets set --project-ref rfoftonnlwudilafhfkl --env-file .env`
or the Supabase Studio. Do not duplicate into Vercel — these run on Supabase's
runtime and read `Deno.env.get(...)`.

Required for `panic-alert`: `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`,
`TWILIO_API_KEY_SECRET`, `TWILIO_MESSAGING_SERVICE_SID`. Optional:
`TWILIO_WA_CONTENT_SID` to enable the WhatsApp fallback path once template
approval clears.

Required for `notify-push`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`.
