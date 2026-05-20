# Notification surface audit

**Date:** 2026-05-20 · **Mode:** investigation only, no fixes · **Input to:** next notification/dispatcher sprint.
Repos: `hotmess-globe` (app) + `hotmess-founding` (brand/founding site). Prod Supabase `rfoftonnlwudilafhfkl`.

| # | Surface | Channel | Trigger event | Code path (file · function) | Status | Never Silent (user confirmation?) |
|---|---|---|---|---|---|---|
| 1 | Member welcome email | Email (Resend) | Successful member signup | `hotmess-founding/app/api/members/signup/route.ts` · `POST` → `send()` (`lib/resend.ts`) | **working** — verified this session: signup returned 200 + row created; Resend wired with `welcome@hotmessldn.com`. Inbox delivery itself unverified from sandbox. | **Y** — form shows "In. Welcome email from welcome@hotmessldn.com is on the way — check spam." |
| 2 | Founder ping | Email (Resend) | Every successful member signup | `hotmess-founding/app/api/members/signup/route.ts` · founder-ping block → `send()` to `phil@hotmessldn.com` | **working** (fire-and-forget, fail-soft; subject `New member: {username} ({email}) — {tier}`) | **N/A to member** (internal). For Phil it IS the confirmation. No separate member-facing state. |
| 3 | Daily brief email | Email | Scheduled daily | No registered cron — `send-daily-brief` absent from `cron.job` (confirmed in PRE_RELEASE audit §4.2). `os-morning-brief` is a Cowork session skill, not a scheduled user email. `api/whatsapp/daily-summary.js` is WhatsApp, not email. | **not implemented** (as a scheduled email) | **N/A** |
| 4 | Partner / order confirmation email | Email (Resend) | Stripe checkout webhook | `hotmess-founding/app/api/stripe/webhook/route.ts` → `send()` | **unverified** — handler loads (returns valid stripe-signature errors, not ERR_MODULE_NOT_FOUND), but full webhook→email path not exercised end-to-end. | **unverified** |
| 5 | In-app bell | In-app (`notifications` table) | Any notification row insert | Producers across app; consumers: `src/modes/OSBottomNav.tsx` (badge via `useNotifCount`), `src/components/sheets/L2NotificationInboxSheet.tsx` (list), `src/components/shell/TopHUD.tsx` | **working** — badge count + inbox list render from `notifications`. | **Y** — unread badge + readable inbox. |
| 6 | Push notifications | Web Push (VAPID) | pushNotify() calls | `src/lib/pushNotify.ts` · `pushNotify()` → notify-push edge fn (host `axxwdjmbwkvqhcpwters`) → `web-push@3.6.7` → SW handler `public/sw.js:298` `addEventListener('push')` | **unverified / partial** — VAPID set, SW handler present, but end-to-end delivery not confirmed; safety log shows push frequently `skipped` (no device token). | **N (partial)** — best-effort; no in-app confirmation a push was delivered. |
| 7 | Ghosted — boo received | In-app + Push | Someone boos you | `src/hooks/useTaps.ts` · `sendTap()` non-mutual branch → insert `notifications` (type `boo`) + `pushNotify()` | **working** (DB insert) / push **unverified** | **Y** for recipient (bell + push); sender sees `toast('Boo sent')`. |
| 8 | Ghosted — mutual match | In-app + Push + overlay | Reciprocal boo | `src/hooks/useTaps.ts` · `sendTap()` mutual branch → `notifications` (type `match`) + `pushNotify()`; UI `MatchOverlay` | **working** | **Y** — MatchOverlay (immediate) + notification + push. |
| 9 | Ghosted — new message | In-app + Push | Message sent to a mutual | `src/components/sheets/L2ChatSheet.jsx` / `src/components/messaging/ChatThread.jsx` send paths → `notifications` (type `message`) + `pushNotify()` | **working** (DB) / push **unverified** | **Y** recipient bell; sender sees send state in chat. Read-receipts partial (`metadata.read_by`). |
| 10 | Safety dispatch — SMS | SMS (Twilio) | SOS / check-in escalation | `api/notifications/dispatcher.js` · `dispatchSafetyEvent()` (Mode A fan-out) → `api/safety/sos.js` | **BROKEN** — 10 sent / 8 failed / 4 skipped in `safety_delivery_log`, but `delivered_at` + `acked_at` NULL on ALL 82 rows. No Twilio status callback wired. | **N** — no delivery/ACK confirmation. Gates `VITE_SOS_ENABLED=false`. |
| 11 | Safety dispatch — WhatsApp | WhatsApp (Meta) | SOS / check-in escalation | `api/notifications/dispatcher.js` (same) · Meta send | **BROKEN** — 8 sent / 14 failed, no delivery receipts written back to `safety_delivery_log`. | **N** — no delivery confirmation. |
| 12 | HNH Mess order updates | Email / in-app | Order status change | Generic plumbing exists: `api/email/notify.js`, `api/notifications/process.js`, `api/email/templates.js`; consumers `src/components/sheets/L2OrderSheet.jsx`, `L2MyOrdersSheet.jsx` | **unverified / likely not-wired for HNH specifically** — generic order-notification scaffolding present; no confirmed HNH-Mess-specific order-update trigger. | **unverified** |

## Cross-cutting findings

- **Safety dispatch (rows 10–11) is the one confirmed-broken surface.** Sends fire but no provider callbacks update `delivered_at`/`acked_at`, and `safety_events.delivery_status` stays NULL. This is the Glen-incident signature and the reason `VITE_SOS_ENABLED` stays false. Fix is the queued SOS dispatcher sprint (escalation.ts + Twilio statusCallback + WhatsApp delivery-receipt branch).
- **Push (row 6) is the largest unverified gap.** It is wired end-to-end in code but never confirmed delivering in prod; many sends `skipped` for missing device tokens. Recommend a device-token coverage check + one confirmed test push.
- **Daily brief email (row 3) does not exist** as a scheduled job. If founding emails imply a daily brief, that's a copy mismatch.
- **HNH order updates (row 12)** need a dedicated trace before any HNH commerce launch.

## Next-sprint inputs (priority order)

1. Safety SMS + WhatsApp delivery callbacks (rows 10–11) — already scoped in the SOS dispatcher sprint.
2. Push delivery verification + device-token coverage (row 6).
3. HNH order-update trigger trace (row 12).
4. Stripe→email confirmation E2E (row 4).
5. Decide whether a scheduled daily-brief email (row 3) is in scope at all.

_No fixes applied. Audit only._
