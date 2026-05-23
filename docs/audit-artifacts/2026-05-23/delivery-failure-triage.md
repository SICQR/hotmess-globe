# Delivery failure triage — 2026-05-23

Read-only triage of every `failed` row in `safety_delivery_log` (96 rows total) and `notification_outbox` (141 rows). Phone numbers scrubbed in queries. **Headline: the failures are overwhelmingly historical and already resolved or intentional — with one real, ongoing gap (invalid contact phone numbers).**

## `safety_delivery_log` (SOS → trusted contacts)

| Channel | Failure reason | Count | Last | Status now |
|---|---|---|---|---|
| SMS | `twilio_400:21211` — "The 'To' number […] is not a valid phone number" | 8 | 2026-05-17 | ⚠️ **ongoing data-quality gap** — some `trusted_contacts` hold invalid numbers; 15 SMS *sent* OK (last 05-21) so the channel works. |
| email | `resend_403` — "send.hotmessldn.com domain is not verified" | 6 | 2026-05-18 | ✅ resolved — 4 emails *sent* OK on 2026-05-20; domain was verified ~05-19. |
| WhatsApp | `meta_401:190` — "Session has expired on 15-Apr-26" (access-token expiry) | 14 | 2026-05-17 | ✅ resolved — 13 WhatsApp *sent* OK (last 05-21); token refreshed ~05-18–21. |

## `notification_outbox`

| Channel / type | Failure reason | Count | Last | Status now |
|---|---|---|---|---|
| email / reentry-invitation | `429 daily_quota_exceeded` (Resend daily cap) | 8 | 2026-05-17 | ⚠️ operational — Resend plan cap hit during a reentry campaign. |
| whatsapp+push / safety types | `cancelled_2026-05-07 outbox recovery — Phil chose C, no replay of stale safety alerts` | 10 | 2026-05-02 | ✅ intentional — deliberately cancelled by Phil during the 05-07 recovery; not a bug. |
| email / trusted_contact_alert | `violates check constraint notification_outbox_status_check` | 1 | 2026-05-11 | ⚠️ one-off — a status value outside the allowed enum; worth a glance. |

## What this means for Q4 (SOS delivery receipts)

- The "dangerous gap" Phil flagged (failed safety deliveries) is **mostly historical**: the Resend domain-verification and the Meta/WhatsApp token-expiry both broke safety delivery for weeks (WhatsApp since ~15 Apr) but are **now sending again**. This refines audit Closeout 1: BLK-03 email was *actually failing* ("domain not verified") through 2026-05-18, then started working ~05-19 — so it was broken more recently than the DNS-only check implied.
- The **one real ongoing gap is data quality**: trusted-contact phone numbers that Twilio rejects as invalid. A user can believe they have a safety contact who in fact cannot be reached. Recommended in Sprint 1 alongside Q4: (a) validate/normalise phone numbers on entry (E.164), (b) one-off sweep of existing `trusted_contacts` for invalid numbers and prompt those users to fix.
- **Monitoring follow-on:** the Meta WhatsApp token expired silently and stayed broken ~1 month. Recommend a long-lived/system token + an expiry alert so safety WhatsApp doesn't silently die again.
