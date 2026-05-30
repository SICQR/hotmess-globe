# Build decisions — Sprint 0 closeout brief #02 (reentry campaign)

## Decision 02-A — Email dispatch path

**Context:** Brief #02 says enqueue 153 rows into `notification_outbox` with
`status='paused'` + `scheduled_for='2026-05-18T07:00:00+00:00'` and let the
existing cron pick them up at Monday 07:00 UTC.

**Reality discovered:**
1. `notification_outbox_status_check` CHECK constraint allows only
   `queued | pending | sent | failed`. **'paused' is not a legal value.**
2. The existing `api/notifications/process.js` dispatcher hardcodes which
   notification_types get emails: `['emergency','sos','event_reminder',
   'order_confirmation','payment_received']`. **'reentry-invitation' would
   never trigger an email send.**
3. `sendEmailNotification` uses a single hardcoded HTML template (hot pink
   #ec4899, "HOTMESS Notification" subject prefix, `noreply@hotmess.london`
   FROM). **Cannot render Phil's personal apology copy from `phil@hotmessldn.com`.**

**Resolution applied:**
- Migration adds `'paused'` to the CHECK constraint (one-line ALTER).
- Outbox is used as a **paused audit trail only** — Phil can see the 153 rows
  in DB and read what's queued, but the existing cron will NOT pick them up
  because (a) status='paused' is filtered out, (b) notification_type isn't in
  the email-eligible list, (c) template is wrong anyway.
- Dispatch happens via a new one-off script `scripts/reentry-send.mjs` that
  reads paused outbox rows + renders MJML + sends via Resend + flips status
  to 'sent'. Cowork runs this on Phil's "ship it" reply.
- Phil preview goes via direct Resend (one-off API call), as the brief
  explicitly allows for the preview case.

**Question for Phil (decide whenever, not launch-blocking):**

> Long-term, should we (a) extend `notification_outbox` + `process.js` to
> support custom MJML templates + arbitrary FROM addresses (so future
> campaigns can use the same machinery), or (b) keep campaign emails on a
> separate code path that uses Resend directly + a campaigns table, leaving
> the outbox for transactional push/SMS/single-type emails?

This decision is deferred — neither option blocks Monday's launch because
the one-off script + paused-audit pattern works for this campaign.
