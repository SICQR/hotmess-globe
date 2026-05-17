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

## Decision 1S02-A — Founding Partner tier pricing model

**Brief:** Sprint 1 #02 `02_partner_pitch_pack.md`.

**Cowork draft (awaiting Phil confirmation in chat before Stripe Products created):**

ONE-TIME FOUNDING PARTNER FEE for the first 50 of each tier (locked-in price, permanent pin), THEN monthly subscription for everyone after. Encourages early commit, predictable revenue tail.

The brief noted: "Recommend: ONE-TIME FOUNDING PARTNER FEE for the first 50 of each tier (locked-in price, permanent pin), THEN monthly subscription for everyone after. Encourages early commit, predictable revenue tail. **Cowork drafts this as the default; Phil overrides if wrong.**"

**Phil decision needed:** confirm or override before any Stripe Product/Price is created. No Stripe API calls fired from this thread until Phil's explicit confirmation.

## Decision 1S02-B — Tier prices

**Cowork draft (placeholders pending Phil confirmation):**

| Tier | One-time founding fee | Monthly subscription after cap |
|---|---|---|
| `founding_signal`    | £99      | TBC (likely £19/mo) |
| `founding_chain`     | £249     | TBC (likely £39/mo) |
| `founding_promoter`  | £499     | TBC (likely £49/mo) |
| `founding_wellness`  | £499     | TBC (likely £49/mo) |
| `founding_venue`     | £999     | TBC (likely £99/mo) |
| `founding_anchor`    | £2,499   | TBC (likely £249/mo) |

**Phil decision needed:** confirm or override each. The one-time numbers above were the brief's defaults. Monthly numbers I've drafted as 1/10 of the one-time (rough rule of thumb; please override if wrong).

**HARD constraint:** **No Stripe Product or Price will be created in this thread until Phil confirms numbers in chat.** The `STRIPE_PRICE_FOUNDING_*` env vars on `hotmess-founding` already exist (created 17h ago — see Sprint 0 brief 01 deliverable), so price IDs are already wired for tier-aware checkout. Whether those existing price IDs match Phil's intent is what's TBC.

## Decision 1S02-C — Application gate or direct purchase per tier

**Cowork draft:**

- **A (frictionless, direct Stripe Checkout):** `founding_signal`, `founding_chain`, `founding_promoter`, `founding_wellness`. Low-tier, friction-free.
- **B (application form → Phil reviews → approval sends Stripe Checkout link → pay → provisioned):** `founding_venue`, `founding_anchor`. High-tier, brand-fit matters more than speed.

**Phil decision needed:** confirm the split or move tiers between A and B.

---

**All three 1S02 decisions are draft-state.** Cowork will scaffold the landing page UI + outbound email template with placeholder prices and TBC tiers; the landing page goes LIVE only after Phil confirms.
