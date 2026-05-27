# 06 — Media Moderation Doctrine

**Status:** LOCKED — Phil 2026-05-27. Required before voice notes / video DMs ship.

**Purpose:** voice and video carry harassment risk, evidence-retention questions, and consent edge-cases that text doesn't. This doc is the gate they have to pass.

> Voice and video are HOTMESS-only when they make care **safer**, not when they make access easier.

---

## What this doctrine covers

1. **Voice notes** (CLOSE+ entitlement, asynchronous, in chat)
2. **30-second video DMs** (CLOSE+ entitlement, asynchronous, in chat — replaces stub video-call)
3. **Future: live video calls** (not yet scoped)

---

## Sender / recipient consent model

- **Voice + video** are NEVER cold-sendable. Both require the relationship to be **CONNECT or TRUSTED** (mutual boo at minimum).
- **First-time toggle per relationship.** First voice note or first video to a given recipient requires recipient's per-relationship opt-in: *"SMASH wants to send you voice notes. Allow?"* Once allowed, no re-prompt — sticky until block or revoke.
- **Per-user global opt-out.** Anywhere in /settings: "Block all voice notes" and "Block all video DMs" toggles. Override any per-relationship allow.
- **Consent decisions survive tier downgrade.** A user who opted-in to receive voice notes from someone at CLOSE keeps that opt-in even if their tier lapses.

---

## Ephemeral by default

- **Voice notes:** retained on server **24 hours**, with one-tap "Save to thread" option (preserves indefinitely for both sides).
- **Video DMs:** retained on server **24 hours**, never saveable client-side. After 24h, file purged; thread shows "video expired" placeholder.
- **Both sides see the expiry timer** on the message itself.
- **Sender can revoke before view.** One-tap "Recall" available until first play. After recall, the message no longer exists, and recipient sees only "recalled by SMASH."

---

## Abuse prevention

| Layer | Mechanism |
|---|---|
| **Rate limit (sender)** | Max 5 unsolicited voice/video to recipients who haven't engaged yet within 24h. After 5, sender is silently throttled to 1/hr until any recipient engages. |
| **Block escalation** | Recipient block on voice/video auto-promotes to relationship block (MESS revert). Single block can't be "just for voice." |
| **Auto-mod on transcription** | Voice notes are server-side transcribed (Whisper or equivalent). Transcript scanned for slurs / threats / self-harm keywords. **Hits flag the message in admin queue for review within 1h.** Message still delivers — admin can retroactively suspend sender. |
| **Video pre-check** | First frame analysis flags for safety review IF the recipient blocks the sender within 10 sec of opening (signal of bad-faith content). |
| **Report → escalation** | Reports on voice/video route to `/admin/safety-review`. Sender notified that "a message was reviewed by our safety team" — never which one, never by whom. |

---

## Server-side retention rules

| Asset | Storage | Encryption | Backup | Deletion trigger |
|---|---|---|---|---|
| Voice file (sent) | Supabase storage `voice-notes` bucket, private RLS | at-rest AES-256 | nightly (24h retention) | 24h after send OR sender revoke OR mutual block OR mod removal |
| Video file (sent) | Supabase storage `video-dm` bucket, private RLS | at-rest AES-256 | NO BACKUP (intimacy default) | 24h after send OR sender revoke OR mutual block OR mod removal |
| Transcript (voice only) | DB row, references file | at-rest in Postgres | included in DB backup | nightly cron: purge after 30 days (independent of file purge — text only) |
| Mod review record | Permanent | DB encrypted | yes | retained 12 months for pattern detection |

---

## Block / report integration

- Existing `blocked_users` table is the source of truth. Any block on a relationship immediately:
  - Halts pending voice/video delivery (file uploaded but not delivered → recipient never knows)
  - Purges any 24h-pending media from storage
  - Severs all future media channels between the pair
- Reports on voice / video create entries in existing `safety_reports` table with `media_type='voice'` or `'video'` and `message_id` reference.
- Repeated reports against the same sender (3+ unique reporters in 30 days) auto-suspend voice/video privileges for 30 days. Account stays — just media muted.

---

## What CONVICT does NOT unlock

To preserve the consent-native posture, CONVICT does NOT grant:

- Bypass for first-time recipient opt-in
- Higher unsolicited rate-limit
- Override of recipient global block
- Permanent retention without recipient consent
- Reduced moderation review

Paying more does not buy reduced friction in intimacy. That principle is sacred (see `02-membership-entitlement-matrix.md` §Money buys capability + status).

---

## What we explicitly defer

- **Live video calls** — out of scope until voice + async video have run with feedback for 60 days. Live calls require additional doctrine (CSAM concerns, recording detection, harassment mid-call).
- **Group voice/video** — out of scope. v1 is 1:1 only.
- **AI voice transformation / filters** — out of scope. Voice should be voice.

---

## Implementation gap

| Surface | Today | Locked |
|---|---|---|
| Voice notes | not built | new feature, behind feature flag `voice_notes_v1`, CLOSE+ gate |
| Video DMs | stub video-call scoped, not built | replace stub; new feature `video_dm_v1`, CLOSE+ gate |
| `voice-notes` storage bucket | not created | private, RLS, 24h TTL cron |
| `video-dm` storage bucket | not created | private, RLS, 24h TTL cron, no backup |
| Per-relationship media opt-in table | not created | new `media_consents` table |
| Per-user global media opt-out | not in /settings | add toggles |
| Transcription pipeline | not built | OpenAI Whisper API or self-host; queue via existing notification stack |
| Auto-mod queue | not built | `media_review_queue` table + `/admin/safety-review` page |
| Block→media purge cron | not built | runs every 5min, processes block-deltas |

---

## Cross-references

- `00-canonical-naming.md`
- `01-relationship-permissions-matrix.md` — media gated on CONNECT/TRUSTED state
- `02-membership-entitlement-matrix.md` — media gated on CLOSE+ tier
- `05-downgrade-and-grace-period-doctrine.md` — consent decisions sticky on downgrade
