# Cowork Brief — Make D25 §21 (Soft Entry, asymmetrical memory) true on `taps`

**Repo:** SICQR/hotmess-globe · **Supabase:** rfoftonnlwudilafhfkl (prod, only project)
**Doctrine of record:** D25 §21 (esp. §21.2, §21.3, §21.6), D24 §3.1, D17 §3.3
**Type:** one migration + reaper + sender-cooldown logic + tests. One PR. Fully autonomous.

## Why
D25 §21 defines soft entry as a single-shot, **asymmetrically-decaying** signal on `taps`. Prod enforces neither decay nor anti-spam: boos accumulate forever, a sender can boo a recipient unlimited times (immediately or spread across days), and nothing remembers that a sender "already reached." This brief implements the asymmetrical-memory model: **recipient forgets, sender is cooled, attraction record is destroyed.**

## Substrate facts (verified)
- `taps (id, tapper_email, tapped_email, tap_type, created_at, from_user_id, to_user_id)`. Types in use: `boo`, `save`. No CHECK on tap_type. No `expires_at`. No unique constraint. RLS on.
- `is_mutual_boo(p_a,p_b)` / `has_mutual_boo*` read bidirectional boo pairs off `taps`.
- 8 functions read `taps`: get_platform_health, delete_user_data, has_mutual_boo, cockpit_stats, should_render_beacon, is_mutual_boo, should_show_profile_for_viewer, get_inbox_for_viewer. **None may change signature or output shape.**
- `save` is a private bookmark — OUT OF SCOPE. Touch `boo` only.

## Scope (do exactly this)

### 1. Recipient-side fade — destroy, don't archive
- Add `taps.expires_at timestamptz NULL`. For existing `boo` rows backfill `created_at + interval '24h'`. New `boo` inserts default `now() + interval '24h'` (BEFORE INSERT trigger, `tap_type='boo'` only; `save` → NULL).
- **Reaper `expire_soft_entry_boos()`:** DELETE `boo` rows where `expires_at < now()` AND the pair is **not** mutual (`is_mutual_boo(from_user_id,to_user_id)=false`). The faded boo is destroyed — no "inactive" flag, no lingering attraction row (D25 §21.3 — that row is a safety liability). Wire into the daily cron beside `expire_off_grid_boosts`. Fire-and-forget; never throw into cron.

### 2. CRITICAL — mutual boos never decay
A reciprocated boo is a D24 trust event gating a live chat (D25 §4.1). Expiring half a mutual pair silently closes a converged conversation.
- At reciprocation, set `expires_at = NULL` on both rows (so they leave the reaper's WHERE permanently). The reaper additionally guards with `is_mutual_boo=false`. Belt and braces; comment why.
- Test: A boos B, B boos A, advance past 24h, run reaper → **both rows survive**, `is_mutual_boo(A,B)` stays true, chat stays open.

### 3. Sender-side cooldown — private, recipient-invisible, escalating
- New table `boo_cooldowns (from_user_id uuid, to_user_id uuid, last_sent_at timestamptz, attempt_count int, cooldown_until timestamptz, primary key (from_user_id,to_user_id))`. RLS: **owner (from_user_id) can read their own rows; the recipient can NEVER read it.** No policy exposes it to `to_user_id`.
- On each boo insert toward a recipient: upsert the cooldown row, increment `attempt_count`, set `cooldown_until` by the escalating schedule below.
- Block a new boo while `now() < cooldown_until` (insert path returns a soft no-op + a reason code the client maps to non-rejection copy — "already reached" / "cooling down"). Never surface expired/declined/ignored/blocked.
- **Escalating schedule (TUNING, not doctrine — make these named constants, easy to change):**
  - attempt 1 → cooldown 7d
  - attempt 2 → 14d
  - attempt 3 → 30d
  - attempt 4+ → require fresh mutual context (e.g. genuine co-presence within geofence/time window) before another boo; never a permanent hard block, never a humiliation surface.
- On reciprocation (mutual), DELETE the cooldown row (the path is now a conversation, not a cooldown).

### 4. Anti-spam at the substrate
- Partial unique index on `taps (from_user_id,to_user_id,tap_type) WHERE tap_type='boo'` so at most one LIVE un-reciprocated boo row exists per pair. De-dupe existing first (keep earliest; only 56 rows). Insert path uses ON CONFLICT DO NOTHING → silent no-op, not a 500.

### 5. Care/safety exclusion
The cooldown + anti-spam mechanism applies to `tap_type='boo'` ONLY. It must never gate D24 §3.3 care pairings, §3.4 safety/SOS pairings, or D25 §20 Safety/Care-moded surfaces (these live in their own tables, not `taps` — keep it that way). Add a test asserting a care/safety reach-out is never rate-limited by this code path.

## Done criteria
- Faded un-reciprocated boos are DELETED (not archived); recipient sees them for 24h then nothing.
- Mutual boos never decay; converged chats never close from this reaper (proven by test).
- `boo_cooldowns` is sender-private (RLS proven by test: recipient cannot select it); escalating cooldown enforced; re-boo during cooldown is a soft no-op with non-rejection reason code.
- Partial unique boo index live; duplicate insert is a silent no-op.
- Care/safety paths provably unaffected.
- 8 consumer functions unchanged in signature/shape; migration logs dedupe count.

## Scope boundary (do NOT)
- No content/text column on `taps` (D25 §21.2 — structurally no composer).
- No Requests UI, notifications, or frontend — schema + reaper + cooldown logic + tests only.
- No `conversations`/`messages` or §20 mode changes.
- No send-side animation/sound/counters (D25 §21.5 — quiet to send).
- No "you crossed paths N times" / co-location aggregation (D25 §21.5, D48).
- No rejection/seen/expired/declined/blocked language anywhere user-facing.

## Eye-test note for Phil
User-visible effect is nil until the Requests surface ships. Under the hood after merge: boos fade for recipients and are destroyed; senders are silently cooled with escalating windows; nobody can spam, nobody gets a "rejected" surface, care/safety untouched. The Requests UI that reads pending boos is a separate, later brief.
