# Cowork Master Brief — D25 §21 Soft Entry: doctrine, migration, surface reconciliation

**Author context:** Phil + Claude strategic session, 2026-06-02. Fully autonomous — everything you need is here; do not ask Phil to re-explain.
**Repo:** SICQR/hotmess-globe · **Supabase:** rfoftonnlwudilafhfkl (prod, only project)
**Working style:** scoped, self-verifying, single coherent PR per part. Three parts, ordered. Part A is doctrine docs (safe, no code risk). Part B is the migration. Part C reconciles already-shipped code that currently violates the doctrine.

---

## 0. Why this exists (the whole story in one read)

Phil asked to "define the doctrine for Ghosted." Investigating the repo + prod surfaced that **Ghosted was built but never doctrined**, and that the thing everyone called "Ghosted chat" is actually the **platform-wide messaging substrate** (`conversations`/`conversation_members`/`messages`) shared by beacons, Preloved, tickets, orders, vault, live, and Ghosted alike — already governed by **D25**, not a Ghosted feature.

That exposed a real **constitutional conflict**: D25 §4.1 said chat opens only after a mutual boo (`converged`), but Ghosted/beacons/Preloved all let one person signal another on a single tap *before* any mutual boo. Both could not be true.

**The resolution** (this whole session) is the **three-state communication model**, written as **D25 §21**:

| State | Meaning | Inbox? | Owner |
|---|---|---|---|
| **Ambient** | "I can see you exist" | none | D17 (the field), D08 |
| **Soft entry** | "I want to acknowledge you" | a *request*, not a thread | **D25 §21 (new)** |
| **Converged** | "we acknowledged each other" | a persistent thread | D25 §1–§20 (unchanged) |

Soft entry is **a bounded, decaying, single-shot state in front of the gate — not a hole in it.** The boo-gate is untouched; we only named the doorway.

Key rulings reached, and *why each one matters* (so you enforce intent, not just letter):

1. **One signal, structurally text-free.** A soft-entry signal is one `taps` row (`tap_type='boo'`). It carries no composer, because `taps` has **no content column** — the anti-spam guarantee is architectural, not policy. The moment soft entry gains free text it becomes mini-DMs / pickup-line spam / a moderation burden, and the whole model collapses to Grindr-lite.

2. **Single signal type — boo only.** `save` is a *private bookmark* (no notification to the saved party, ever). `view` is not contact (D17 §0: looking is not contact). Neither is a soft-entry signal. The soft-entry set is closed at one member; adding a wave/poke is a future amendment, never config.

3. **Asymmetrical memory — the subtle core.** A naive "boo disappears after 24h" frees the recipient (good) but also frees the *sender*, silently re-enabling low-frequency pestering (a fresh boo every day). Fix: **recipient forgets, sender is cooled.**
   - The faded boo is **deleted from the substrate** (a lingering "who-wanted-whom" row is a pattern-of-attraction *safety* liability on a queer nightlife platform — destroy it).
   - What survives is a **sender-private, recipient-invisible cooldown marker** that only rate-limits re-booing. It carries **no** "seen/declined/ignored" semantics. Memory without humiliation; the system may remember something without socially surfacing it.

4. **Beautiful to receive, quiet to send.** A boo may glow/animate on the *recipient's* surface. Sending must be *quiet* — no streaks, counters, sound-on-send, or any reward loop. Rewarding the sender optimises for volume of un-consented intent, which is the exact spam §21 suppresses. The asymmetry is constitutional.

5. **No movement inference.** No "you crossed signals 3 times tonight," no co-location/repeat-overlap aggregation. Romantic framing does not launder surveillance (D17 §0, D48).

6. **Care/safety is a separate system and must never be touched by any of this.** Cooldown/anti-spam apply to `boo` only — never to care-role or safety-contact pairings or Safety/Care-moded threads. This matches Phil's existing 2026-05-20 ruling (see §1 below).

Two older, unrelated gaps were also found and are flagged for separate work (NOT in this brief): the **age-verification backfill** (158 profiles with `age_verified_at` set but NULL method — a live UK OSA exposure) and the **photo scan pipeline** never actually gating uploads. Track these separately; they are not soft-entry.

---

## 1. Reconciliation with already-merged code (READ BEFORE PART B)

`origin/main` already contains migration `20260520120000_boo_first_mutual_rls.sql` (live in prod). Its header states Phil's 2026-05-20 doctrine, and two lines govern how you proceed:

- `-- taps — must stay open; this IS the consent action` — taps must remain **insertable** (placing a boo is itself the consent gesture). **Your migration must not break insertability.** A partial UNIQUE constraint and a cooldown no-op are compatible: a user can still insert a boo; they simply cannot create a *duplicate live* boo or spam during cooldown. State this compatibility explicitly in the migration comment so it isn't read as a contradiction.
- `-- Ghosted trust model = mutual boo; Safety trust model = explicit temp consent; these are SEPARATE systems and must stay separate.` — this is exactly §21's care/safety exclusion. Your cooldown logic touches `boo` only and must not reach `location_shares`, `trusted_contacts`, or any safety table.

`has_mutual_boo(uuid,uuid)` and `is_mutual_boo` already exist and read bidirectional boo pairs off `taps`. Reuse them; do not redefine them.

There is also an open branch `fix/boo-write-silent-failure`. Before Part B, check whether it is merged or in-flight and whether it changes the boo insert path — your cooldown logic hooks that same path, so coordinate rather than collide.

---

## PART A — Land the doctrine docs (no code risk)

Place these five files (provided by Phil from the session outputs) and commit on a `docs/` branch:

- `docs/doctrine/17-ghosted-doctrine.md` (new — D17 Ghosted: field + albums; chat deferred to D25; conflict marked resolved)
- `docs/doctrine/25-in-app-messaging-doctrine.md` (amended — adds §21 soft entry)
- `docs/doctrine/24-contextual-trust-weighting-doctrine.md` (patched — §3.1: a single boo is a soft-entry signal, not a trust event)
- `docs/briefs/COWORK_BRIEF_taps_soft_entry.md` (Part B spec, detailed)
- `docs/briefs/COWORK_BRIEF_requests_surface.md` (Part C spec, detailed)

**Do NOT `git add -A`.** Phil's working tree has ~18 unrelated modified files and untracked WIP. Add only the five doc paths explicitly:
```
git checkout -b docs/d17-ghosted-d25-soft-entry
git add docs/doctrine/17-ghosted-doctrine.md docs/doctrine/25-in-app-messaging-doctrine.md docs/doctrine/24-contextual-trust-weighting-doctrine.md docs/briefs/COWORK_BRIEF_taps_soft_entry.md docs/briefs/COWORK_BRIEF_requests_surface.md
git commit -m "docs(doctrine): D17 Ghosted + D25 §21 soft entry (asymmetrical memory) + D24 §3.1 patch"
```
Open as PR. Doc-only; safe to merge once Phil eye-tests.

---

## PART B — Make §21 true on `taps` (the migration)

Full spec in `docs/briefs/COWORK_BRIEF_taps_soft_entry.md`. Summary of done state:

1. **Recipient-side fade, destroy not archive.** Add `taps.expires_at` (boo inserts default `now()+24h`; `save` → NULL). Reaper `expire_soft_entry_boos()` DELETEs expired, **non-mutual** boos. Wire into daily cron beside `expire_off_grid_boosts`. Faded boo is destroyed, never flipped to "inactive."
2. **Mutual boos never decay** (they gate a live chat). On reciprocation set `expires_at=NULL` both rows; reaper also guards `is_mutual_boo=false`. Test: A↔B mutual, advance past 24h, run reaper → both rows survive, chat stays open.
3. **Sender-private cooldown.** New table `boo_cooldowns(from_user_id, to_user_id, last_sent_at, attempt_count, cooldown_until, pk(from,to))`. RLS: owner reads own; recipient can **never** read it. Escalating windows as **named constants (tuning, not doctrine)**: 7d → 14d → 30d → require fresh mutual context. Never a permanent hard block. Re-boo during cooldown = soft no-op + reason code. Clear the row on reciprocation.
4. **Anti-spam.** Partial unique index `taps(from_user_id,to_user_id,tap_type) WHERE tap_type='boo'`; de-dupe existing (keep earliest; 56 rows total); insert path `ON CONFLICT DO NOTHING`. **Does not break taps insertability** (see §1).
5. **Care/safety untouched** (see §1). Test that a care/safety reach-out is never rate-limited.
6. The 8 functions reading `taps` keep their signatures/shapes. Migration logs dedupe count.

---

## PART C — Bring shipped inbox code into §21 compliance (LIVE VIOLATION)

Full spec in `docs/briefs/COWORK_BRIEF_requests_surface.md`. **This fixes doctrine violations that are live in prod right now.**

`get_inbox_for_viewer` (the inbox RPC) currently emits **every tap type as a signal with a count** (`GROUP BY from_user_id, tap_type, count(*)`), and `InboxCellSignal.tsx` renders:
- **"X BOO'd you · 3 times"** (repeat-count surfacing — forbidden §21.5)
- **"saved your profile"** (notifying the saved party — forbidden §21.2; `save` is private)
- **"viewed your profile"** (surfacing passive views as contact — forbidden D17 §0)

Fix:
1. **RPC:** signals come from `tap_type='boo'` only; drop `save` and `view`; remove `count`; exclude faded boos (`expires_at IS NULL OR > now()`); exclude mutual pairs (those are conversations, not signals). Keep the return shape — do not change the signature (8 consumers depend on it).
2. **`InboxCellSignal.tsx`:** delete the `count > 1` "· N times" branch; reduce glyph map to `boo` only; keep tap→`/ghosted` routing.
3. **Sender cooldown copy — LOCK THIS VOCABULARY.** Allowed: "Signal already sent" / "You already reached" / "Let the night move" / "Signal resting" / "Cooling down" / "Waiting on another crossing." **Forbidden anywhere in this path (CI grep test, hard fail):** expired, declined, ignored, rejected, unanswered, seen, read, blocked, failed, no response. Recipient is shown nothing about a sender's re-attempt.
4. **Field button states** in `GhostedMode`: active → resting(disabled, microcopy) → converged(opens chat) → cooling(disabled, microcopy, no punishment countdown).

**Not in scope (anywhere in B or C):** the receive-side *beauty* of a boo (glow/motion/arrival animation) — that's a later design pass, deliberately deferred so the semantics are correct before the feel is built. Also out: L2RequestSheet / the `request` category (album/video/location/SOS — separate doctrine), `conversations`/`messages`/§20 modes, age-verification, photo scan pipeline.

---

## Ordering & done criteria

A (docs) → B (migration) → C (surface). C depends on B's `expires_at` + `boo_cooldowns`.

Whole thing is done when: doctrine is on main; boos fade for recipients and are destroyed; senders are silently cooled with escalating windows and non-rejection copy; nobody can spam; care/safety paths are provably untouched; and the inbox Signals tab shows only real live boos — no "3 times", no "viewed you", no "saved your profile". Verify Part C against prod by reading `get_inbox_for_viewer` output for a seeded recipient before and after.

If anything here conflicts with code you find on main that post-dates this brief (esp. `fix/boo-write-silent-failure`), STOP and surface the conflict to Phil rather than guessing — the boo path is being touched by multiple workstreams.
