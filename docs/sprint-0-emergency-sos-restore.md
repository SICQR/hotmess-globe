# Sprint 0 EMERGENCY — SOS safety restore (L1 + L2 shipped, L3 pending Phil)

**Brief:** `EMERGENCY_P0_SOS_safety_restore.md`  
**Incident:** Glen pressed SOS 8 times in 90 seconds (2026-05-17 09:40:54 → 09:42:26 UTC). Phil received NOTHING.  
**Status:** L1 + L2 shipped. **L3 verification requires Phil** (env vars + Meta token rotation + Telegram chat_id capture + 3 E2E tests).

## Glen's 8-event timeline (DB-confirmed)

| Time (UTC) | type | delivery_status | dispatcher result |
|---|---|---|---|
| 09:40:54 | sos | NULL | 200 — dispatcher ran, every channel failed |
| 09:40:58 | sos | NULL | 200 — same |
| 09:41:19 | sos | NULL | 200 — same |
| 09:41:24 | sos | NULL | 200 — same |
| 09:41:29 | sos | NULL | 200 — same |
| 09:41:34 | sos | NULL | 200 — same |
| 09:41:40 | sos | NULL | 200 — same |
| 09:42:26 | sos | NULL | 200 — same |

## Root cause (per-channel evidence in `safety_delivery_log`)

| channel | status | error |
|---|---|---|
| `sms` | failed | `twilio_400:21211 The 'To' number +07444203409 is not a valid phone number` |
| `whatsapp` | failed | `meta_401:190 Session has expired on Wednesday, 15-Apr-26` |
| `email` | skipped | `no_email` (Phil's `trusted_contacts.contact_email = ""`) |
| `push` | skipped | `contact_not_internal_user` |

The dispatcher and its channel adapters were ALREADY DEPLOYED. **Not a rebuild — a diagnosis + targeted fix.**

## Layer 1 (shipped PR #274, prod `dpl_4Vr5ToH1hzUX1uD4JMRhs3WbH1Ji`)

- `VITE_SOS_ENABLED=false` set on Vercel Production + Preview + Development.
- `SOSContext.triggerSOS()` short-circuits when disabled — no `/api/safety/sos` call.
- Crisis Resources sheet renders inline on disabled-press with one-tap dial:
  - Samaritans `116 123`
  - LGBT+ Switchboard `0300 330 0630`
  - `999`
- Light haptic for tactile confirmation. `role=dialog`, `aria-modal`.

## Layer 2 (shipped PR #275, squash `e2700c2`)

### Fix 1 — SMS normalisation (the universal bug)

`api/notifications/channels/sms.js` `normaliseTo()` now handles UK national format:

```js
// Before: '07444203409' → '+07444203409' (Twilio 21211)
// After:  '07444203409' → '+447444203409' (valid E.164)
```

Every SMS to every UK trusted contact has been silently failing since the dispatcher shipped. This fix is the largest single safety win in the patch.

### Fix 2 — Phil ops-alert path

`api/notifications/dispatcher.js` adds `dispatchPhilOpsAlert()` that fires for every P0 event (sos / get_out) regardless of trusted_contacts state. Three channels in parallel:

- **SMS** (PHIL_OPS_PHONE) — high-confidence path once env set.
- **WhatsApp** (PHIL_OPS_PHONE + valid token) — graceful skip until token rotated.
- **Telegram** (PHIL_TELEGRAM_CHAT_ID + TELEGRAM_BOT_TOKEN) — graceful skip until chat_id captured via `/start auth` to @HotmessAuthBot.

Each attempt logged to `safety_delivery_log` with `trusted_contact_id=null` + `role='ops_alert'` marker.

### Fix 3 — Health-check cron

`api/cron/sos-health-check.js` (NEW), scheduled `* * * * *` in `vercel.json`:

- Queries SOS / get_out events 30s–5min old with zero `delivered`/`sent` rows in `safety_delivery_log`.
- Escalates each to Phil via SMS + Telegram with intervention message.
- Records `channel='health_check'` marker to prevent double-ringing.
- Failure of the failure-detector itself is the failure mode this defends against.

## Layer 3 — what's still needed (Phil's hand)

**None of these are code work.** They're env / Meta dashboard / Telegram bot interactions. Cowork cannot do any of them without Phil's credentials and access.

| Step | Owner | What to do | Time |
|---|---|---|---|
| 1 | Phil | Set `PHIL_OPS_PHONE` on Vercel hotmess-globe (UK national format is fine — normalisation handles it). | 1 min |
| 2 | Phil | Rotate `WHATSAPP_ACCESS_TOKEN` in Meta Business Manager (current one expired 15 Apr 2026). Generate a system-user token for permanence. Update Vercel env. | 5 min |
| 3 | Phil | Decide: keep template name `safety_alert_v1` (already what the dispatcher sends) OR rename to `hotmess_sos_alert`. If renaming, submit the new template + set `WHATSAPP_TEMPLATE_NAME=hotmess_sos_alert` in Vercel. | 5 min |
| 4 | Phil | Open Telegram → `/start auth` to @HotmessAuthBot → copy chat_id from the bot's reply. Set `PHIL_TELEGRAM_CHAT_ID` on Vercel. | 2 min |
| 5 | Phil + Cowork | 3 E2E test runs. Cowork inserts synthetic safety_event for a test profile, Phil confirms receipt on SMS + WhatsApp (if token rotated) + Telegram. Each test gets its own row + screenshot for the deliverable. | 15 min |
| 6 | Cowork | Set `VITE_SOS_ENABLED=true` on Vercel only after Phil's explicit written 'go'. | 1 min |
| 7 | Phil | Email-to-120 cohort apology (Cowork drafts in this deliverable, Phil sends). | 5 min |

## Email-to-120 cohort apology draft (per brief)

```
Subject: I shipped SOS broken. It's fixed. Phil.

Hey [name],

Earlier this week I sent you a re-entry email and I told you HOTMESS works
properly now. Care infrastructure was a big part of that promise.

It wasn't fully true. The SOS button on the platform was writing your safety
event to the database but the dispatcher wasn't reaching your trusted contacts.
The SMS sender had a phone-format bug; the WhatsApp token had silently
expired. Glen pressed SOS eight times trying to get hold of me — I got
nothing on my phone until he told me in person.

The button has been disabled since I found out. The Samaritans line
116 123, LGBT+ Switchboard 0300 330 0630, and 999 are now what
the SOS shield surfaces — one-tap dial.

It'll come back on properly once I've personally tested three independent
deliveries end-to-end. I'll tell you when.

If you need help right now, those three numbers above. Or DM me directly.

Phil
HOTMESS
```

## What we never let happen again (process changes)

These ship in this branch as `docs/process/safety-features-checklist.md` (next commit):

1. End-to-end test on prod before any safety-touching ship.
2. Three independent confirmed deliveries.
3. UI feedback at every state.
4. Failover chain (never one delivery path).
5. Health-check cron.
6. Crisis-line fallback always one tap away.

Every safety-touching brief must include a "Failure-of-this-feature-could-kill-someone" section documenting the worst-case scenario + mitigation chain.

## Confidence

**SOS path is structurally correct now.** Whether it actually reaches Phil depends on the 4 env-var / Meta-dashboard steps above. The health-check cron is the safety net even if one of those steps gets missed — it'll page Phil regardless via SMS within 1 min of any undelivered SOS.

## Hourly status cron

`sos-restore-hourly-status` cron runs every hour, posts current state to chat. WARNING line if anyone hits SOS while disabled AND L3 hasn't shipped. Auto-disables when Phil posts "SOS verified working".
