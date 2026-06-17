# Cowork Brief — Reconcile the Inbox Signals/Requests surface with D25 §21

**Repo:** SICQR/hotmess-globe · **Supabase:** rfoftonnlwudilafhfkl (prod)
**Doctrine of record:** D25 §21 (esp. §21.2, §21.3, §21.5), D17 §0 / §2.2
**Type:** RPC patch + 2 cell patches + sender-cooldown copy + tests. One PR. Autonomous.
**Prereq:** lands AFTER the taps soft-entry migration (COWORK_BRIEF_taps_soft_entry) — this brief assumes `expires_at` and `boo_cooldowns` exist.

## Why — this is a correction, not a greenfield build
The inbox surface is already built (7 categories, `InboxFilterChips`, typed D266 cells, `get_inbox_for_viewer`). But the Signals path **currently violates D25 §21 in shipped code.** This brief brings it into doctrine compliance. Three concrete violations exist today:

1. **`get_inbox_for_viewer` (lines ~51–66)** emits every tap as a signal via `GROUP BY from_user_id, tap_type, count(*) AS cnt` and payload `{tap_type, count}`. It (a) counts repeated boos, (b) surfaces ALL tap types including `save` and `view`.
2. **`InboxCellSignal.tsx`** renders `count > 1` as **"· 3 times"** (comment cites "Q17 '3 times'"), and maps `save` → "saved your profile" and `view` → "viewed your profile".
3. Net effect: the surface exposes repeat-signal counts (forbidden §21.5), notifies the saved party of a private bookmark (forbidden §21.2 — `save` is private, no notification), and surfaces passive profile views as contact (forbidden D17 §0 — looking is not contact).

## Scope (do exactly this)

### 1. RPC `get_inbox_for_viewer` — boo-only, no count, fade-aware
Patch the taps CTE (lines ~51–66):
- **Only `tap_type='boo'`.** Drop `save` and `view` from the signal source entirely. `save` is a private bookmark (no recipient notification, ever). `view` is not contact and must never produce an inbox item.
- **No `count`.** Remove `count(*) AS cnt`. By §21.2 there is at most one live un-reciprocated boo per (from→to) anyway; emit one signal item per sender, payload `{tap_type:'boo'}` with no count field.
- **Fade-aware.** Exclude faded boos: `WHERE expires_at IS NULL OR expires_at > now()`. (NULL = reciprocated/mutual, which surfaces as conversation, not signal — see next bullet.)
- **No mutual boos in Signals.** A reciprocated boo is a conversation (D25 §4.1), surfaced by the conversation path, not as a signal. Exclude pairs where `is_mutual_boo(from_user_id, p_viewer_id)` is true from the signal CTE so a converged pair never double-renders as both a signal and a chat.
- Keep `item_id` stable (`'sig:'||from_user_id||':boo'`) and the existing return shape — do NOT change the function signature (8 consumers + the cell depend on the column set).

### 2. `InboxCellSignal.tsx` — strip count + non-boo verbs
- Remove the `count > 1` → "· N times" rendering entirely (the `count` payload field is gone; delete the branch, don't just hide it).
- Reduce `tapTypeGlyph` to `boo` only ("BOO'd you", Ghost glyph). Remove `save` and `view` cases — they can no longer arrive, and leaving them invites regression.
- Keep the existing tap-to-`/ghosted` routing and auto-read behaviour.

### 3. Recipient-side fade in the UI
- The Signals list shows a live un-reciprocated boo for its 24h window then it's simply gone (the RPC fade filter handles this; no client timer needed). No "expired"/"missed"/"you didn't respond" affordance anywhere. A faded boo leaves no row, no backlog, no count.

### 4. Sender-side cooldown copy — LOCK THIS VOCABULARY
When a sender tries to re-boo during cooldown (the insert is a soft no-op from the migration's `boo_cooldowns` logic), the field surface (`GhostedMode` / the boo button in the profile sheet) shows non-rejection microcopy. **Approved vocabulary — use these, rotate if you like, never invent outside this set:**
- "Signal already sent"
- "You already reached"
- "Let the night move"
- "Signal resting"
- "Cooling down"
- "Waiting on another crossing"

**FORBIDDEN words anywhere in this path** (hard fail in review): expired, declined, ignored, rejected, unanswered, seen, read, blocked, failed, no response. The recipient must be shown NOTHING about a re-attempt — the cooldown is sender-private (`boo_cooldowns` RLS already enforces this; do not add any read path for the recipient).

### 5. Field button state (`GhostedMode`, the per-card boo control)
The profile card already has `isBood`/`isMutual` from `useTaps`. Add a cooled state:
- not booed, not cooling → boo control active ("BOO")
- booed, awaiting → quiet resting state, control disabled, microcopy from §4 set
- mutual → "Converged" / opens chat (existing path)
- cooling (cooldown_until > now) → disabled + microcopy, never a countdown timer that reads as punishment. A soft "resting" state, not a sentence being served.

## Done criteria
- `get_inbox_for_viewer` emits signals for **live un-reciprocated boos only**: no `save`, no `view`, no `count`, no mutual pairs. Verified by a query test against seeded taps.
- `InboxCellSignal` has no "N times" rendering and no save/view verbs.
- No user-facing string in the boo/signal/cooldown path contains any forbidden word (grep test in CI).
- Recipient cannot observe a sender's re-attempt or cooldown (RLS test).
- Mutual boo renders as a conversation, never as a signal (no double-render).
- The 8 RPC consumers unchanged in signature/shape.

## Scope boundary (do NOT)
- Do NOT build L2RequestSheet or change the `request` category (album/video/location/SOS requests are a separate doctrine; this brief is the `signal` category + boo flow only).
- Do NOT add send-side animation, sound, streaks, or counters (§21.5 — quiet to send; beauty is RECEIVE-side only and is a separate design pass).
- Do NOT add "crossed paths N times" / co-location aggregation (§21.5, D48). Note: removing `count` from signals is partly what kills this — do not reintroduce any counting.
- Do NOT touch `conversations`/`messages` or §20 modes.
- Do NOT expose `save` or `view` as any kind of notification on any surface.

## Eye-test note for Phil
After merge: the Signals tab shows only real, live boos — one per person, no "3 times" spam-counter, no "so-and-so viewed you", no "saved your profile". Senders who re-boo see a soft "you already reached", never a rejection. The receive-side *beauty* of a boo (glow/motion/arrival) is deliberately NOT in this brief — that's the design pass once the semantics are correct. Get the meaning right first, then make it breathe.
