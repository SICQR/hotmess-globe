# D17 — HOTMESS Ghosted Doctrine

**The field, the soft-entry chat, and the private album.**
**What it means to be seen without being tracked, and to be intimate without being archived.**

**Status:** Draft for Phil's sign-off
**Written:** 2026-06-01
**Author:** Phil
**Inherits from:** D06 (media moderation), D08 (visibility state), D11 (arrival state), D15 (care language), D16 (surface layer), D20 (identity), D22 (temporal), D33 (memory & permanence), D48 (spatial identity exposure).
**Inherited by:** D21 (payment & payout), D25 (in-app messaging), D32 (AI & automation), all future Ghosted surfaces.
**Schema of record:** `20260508000001_ghosted_g1_schema.sql` (G1, applied to prod 2026-05-08). Forward-compat plan G1 → G6 (CCBill XXX gate) is constitutional; do not break `has_xxx_access(uuid)`'s signature.

---

## §0. Sacred Ghosted Rules

Three sentences sit above the rest of this doctrine. All three are constitutional, and all three answer to the Sacred Invariants (Safety > Truth > Trust > … > Monetization) without exception.

> **Ghosted shows presence, never position.** A face on the field is proof someone is near. It is never proof of where.

> **Nothing in Ghosted is permanent unless both people choose it.** Threads are disposable by default. Albums are private by default. Access is revocable always.

> **Adult content is gated by verified age and paid intent — never by self-attestation, never by a checkbox, never by "just this once."**

If any other doc — growth, monetisation, partner ask — contradicts these three, this doc loses to the Sacred Invariants and wins over everything else.

---

## §1. What Ghosted is

Ghosted is **two surfaces** that share one emotional register — *soft-entry, low-pressure, contextual, safely disposable* — plus a **shared substrate it consumes but does not own**.

1. **The Field** — a grid of nearby/recent/live people rendered as cards. The ambient "who is around" layer. (`useGhostedGrid`, `GhostedMode.tsx`.)
2. **Ghosted Albums** — private, share-gated photo sets, with an optional XXX tier behind verified age + paid access. (`ghosted_albums`, `ghosted_album_photos`, `ghosted_album_shares`.)

**Chat is not a Ghosted surface.** The messaging substrate (canonical `conversations` + `conversation_members` + `messages`; legacy `chat_threads`/`chat_messages` deprecated 2026-05-07 and *scheduled* for drop 2026-05-21 but **still present in prod** — accessed through the `src/lib/chat/canonical.ts` adapter) is **platform-wide**. The same substrate is opened from beacons, Preloved/Market, tickets, orders, vault, live mode, and the Ghosted field alike. It is governed by **D25 (in-app messaging)**, not here. D17 says only how Ghosted *enters* that substrate (§3); it never redefines what chat is, what it persists, or how it decays — that is D25's job.

What Ghosted is **not**: a feed, a follower graph, a public gallery, or a tracking surface. The field never accumulates, never ranks people for entertainment, never fakes a crowd.

---

## §2. The Field

### §2.1 The field always feels inhabited — honestly

The grid must never collapse to one person when the system has data. But the fix is **blend, not fabrication** (Truth invariant: *the system never pretends there is activity when there is not*).

- When ≥ `MIN_INHABITED` (default **12**) nearby users exist, the field shows **only** nearby. No leakage of distant users into a local view.
- When nearby is sparse, remaining slots are filled from `recent`, de-duped by id, nearby-first. A blended `recent` card carries `isNearby: false` and **must not** render a fake distance ("0.4 km away"). It shows whatever distance signal `recent` carries — typically none.
- When **both** nearby and recent are empty, the empty state renders honestly and compassionately: *"Field quiet · pull to refresh"* — never *"no one near you."* (D15.) A quiet field is a valid state, not a failure.

This blend is invisible to the user. There is no mode-chip toggle (removed 2026-05-26 — the grid works on location anyway). Reference: `slices/ghosted-nearby-blend.md`.

### §2.2 Presence without position

The field expresses **that** someone is around. It must never expose **where**.

- Distances round to the nearest 10 m before they ever reach the client (`roundDistance`).
- No exact timestamps. No "last seen 3 minutes ago" precision that enables pattern-of-life inference.
- No persistent presence markers, no trails (Sacred Invariant 2 & 3 — anti-stalking is structural).
- The field respects the D08 visibility snapshot. Off-grid users stay off-grid in nearby, recent, and live. The blend does **not** bypass `get_renderable_beacons_for_viewer`. Invisible (`user_privacy_settings`) and blocked (`blocks`) users are filtered server-side in every mode.

### §2.3 No churn, no fake heat

The grid must not flicker many → 1 → many while GPS resolves. Show recent throughout the GPS-pending window, or a skeleton — never a visible collapse. Boosted users (`user_active_boosts`) may gain prominence within D04/D24 limits; a boost can improve placement but can **never** manufacture presence on a field where the person is not actually around.

---

## §3. How Ghosted enters chat

Chat itself belongs to D25. This section governs only the **entry contract**: what Ghosted is allowed to do when it hands a user into the shared substrate. Ghosted must add no affordance that D25 forbids.

### §3.1 Entry is contextual, not a cold inbox

When chat opens from the field or a Ghosted card, it opens **from a moment**, not from a search of strangers. The conversation inherits its context (and, for album shares, its `conversation_id`) from the surface that spawned it. Ghosted never creates a standing inbox relationship as a side-effect of looking at the field — looking is not contact.

### §3.2 Disposability is honoured, not redefined

Either side can ghost without penalty, retaliation, or third-party alert. Walking away is a first-class action, not a failure state — no "seen" shaming, no read-receipt coercion. *How* a conversation decays and persists is D25 + D22's ruling, not D17's; Ghosted only commits never to fight disposability with dark-pattern retention on its own surfaces.

### §3.3 The boo-gate question is now resolved in D25 §21

The earlier tension — Ghosted's field appears to open communication on a tap, before any mutual boo, while D25 §4.1 gates chat behind convergence — is resolved by **D25 §21 (soft entry)**. A tap on the field is a *soft-entry signal*: single-shot, decaying within 24h, no thread, no composer, no media, no read state. It does **not** open a conversation. A conversation opens only when the recipient boos back and the pair reaches D24 `converged` (§4.1, unchanged). Ghosted gets the spark; D25 still holds the conversation behind mutual acknowledgement. D17 grants no exception of its own — it inherits §21.

### §3.4 Media inherits D06 wholesale

Voice notes and video DMs in any conversation Ghosted opened are governed entirely by **D06** — CONNECT-or-TRUSTED minimum, per-relationship first-time opt-in, global opt-out, 24 h ephemeral default, sender recall before first play. Ghosted adds nothing that bypasses D06. A block promotes to a relationship block and severs every media channel between the pair.

---

## §4. Ghosted Albums

This is the surface where HOTMESS's care-and-provocation register meets UK Online Safety Act obligations. The architecture below is **schema of record**, not aspiration — it is applied in prod.

### §4.1 Private by default, share-gated always

- An album (`ghosted_albums`) is owned by one person. Owner-only RLS (`owner_id = auth.uid()`) is the baseline. No album is ever public.
- A recipient sees an album **only** through an active, non-revoked, non-expired share (`ghosted_album_shares`, enforced by `has_active_album_share`). Shares are per-recipient, optionally expiring, always revocable (`revoked_at`). Revoking is instant and silent.
- Photos are never hot-linked. Every view mints a **5-minute signed URL** through `/api/ghosted/photo-signed-url` after server-side access re-check. The bucket (`ghosted-photos`) is private RLS; there is no public read path.
- Every successful mint is written to `ghosted_photo_access_log` (hashed IP with daily salt, truncated UA) — forensics, fire-and-forget, never blocking. This is the audit spine for abuse and NCII response.

### §4.2 The two-key XXX gate

Regular albums require only an active share. XXX albums (`is_xxx = true`) require **both keys**, enforced in RLS *and* re-checked at signing time:

1. **Active share** to the recipient (`has_active_album_share`), AND
2. **`has_xxx_access(user_id)`** — which today means *paid `hotmess`+ tier active* **AND** *audit-grade age verification* (`profiles.age_verified_at IS NOT NULL`).

`has_xxx_access` is **forward-compatible by constitutional design**: G6 will swap its body to *additionally* require an active CCBill `xxx_addon` subscription. **The signature never changes** — every RLS policy and the signing endpoint depend on it. This is how the Stripe/CCBill split is honoured at the data layer: Stripe (Smash Daddys Ltd) gates the `hotmess` membership; CCBill will gate the XXX add-on. Stripe bans adult content — the two payment rails must never merge.

### §4.3 Age verification is audit-grade, not a checkbox

Three distinct age concepts must not be confused:

| Field | Meaning | Sufficient for XXX? |
|---|---|---|
| `age_verified` (boolean) | self-attestation at onboarding | **No** |
| `verified_at` | general profile verification (#226) | No |
| `age_verified_at` + `age_verification_method` | audit-grade: timestamp + method (`yoti` \| `community` \| `manual_admin`) | **Yes — required** |

A NULL `age_verified_at` is **UK OSA / HEAA non-compliant** for adult content and the XXX gate refuses it regardless of payment. Yoti (~£0.15/check) is the intended populator via webhook (G4). Self-attestation alone never unlocks XXX.

> **⚠ Live-state warning (2026-06-01).** G4 is not built, and prod is currently mis-aligned with this rule: **158 of 224 profiles carry a non-NULL `age_verified_at` but a NULL `age_verification_method`.** A timestamp with no method is a backfill, not audit-grade verification — by the schema's own contract those two columns must be NULL or non-NULL together. As written, `has_xxx_access` will currently pass 158 people on the strength of a backfilled timestamp that proves nothing. **This is a compliance gap, not a doctrine ambiguity.** Until G4 lands, either (a) the backfilled `age_verified_at` values are cleared, or (b) `has_xxx_access` additionally requires `age_verification_method IS NOT NULL`. The doctrine's position is that audit-grade means *method-backed*; a bare timestamp does not satisfy it.

### §4.4 Moderation is mandatory and pre-delivery

Every uploaded photo lands `scan_status = 'pending'` and is **invisible to recipients** until `scan_status = 'approved'` (enforced in RLS *and* re-checked at signing). The scan pipeline (G3 upload edge function) runs NudeNet (self-hosted RunPod), PhotoDNA, and StopNCII; results land in `scan_results` JSONB.

- `rejected` / `quarantined` photos are never signable, never delivered.
- A PhotoDNA / StopNCII hash hit is a **hard stop** with the response path defined by the Sacred Invariants and child-safety policy — not a soft flag. CSAM and NCII are not moderation edge cases; they are the reason this pipeline is non-negotiable.
- Moderation is structural, not policy: the RLS `scan_status = 'approved'` predicate means an un-scanned photo *cannot* be served even if the application layer has a bug.

### §4.5 Albums are forgettable

Per D22 / D33, an album is archivable (`archived_at`) — once archived, both album-level and photo-level RLS stop serving it and the signing endpoint 404s it. Owner deletion cascades (`on delete cascade`) through photos and shares. The right to become unknown again applies here too: a person can withdraw their intimacy from the system entirely, and the system must comply.

---

## §5. The free / paid / XXX surface (Ghosted XXX album product)

The monetisation surface sits **below** every rule above (Monetization is invariant rank 8).

| Layer | Who sees it | Gate |
|---|---|---|
| Regular photos | anyone with an active share | share only |
| Full Ghosted album | `hotmess`+ paid (Stripe, Smash Daddys Ltd) | share + tier |
| XXX photos | `hotmess`+ paid **and** age-verified **and** (G6) CCBill XXX add-on | two-key `has_xxx_access` |

Upgrade prompts on this surface are **invitational, not transactional** (D04). The XXX tier is never sold as the headline; it is access behind care, age, and intent — in that order.

---

## §6. What Ghosted refuses to do

- No public galleries, no follower counts, no "popular near you" leaderboards. (Gamification is permanently dropped.)
- No fabricated presence, no synthetic activity, no fake heat on the field.
- No exact location, ever — presence without position is absolute.
- No persistent inbox accumulation as a default; disposability is the default.
- No adult content on the Stripe rail; no XXX without verified age; no XXX gate that trusts self-attestation.
- No serving of un-scanned, rejected, quarantined, or hash-flagged media under any circumstance.
- No bypass of D08 visibility — off-grid is off-grid across all three surfaces.

---

## §7. Implementation status — live-verified against prod `rfoftonnlwudilafhfkl` (2026-06-01)

| Piece | State (verified) |
|---|---|
| Field grid + nearby/recent/live | shipped (`useGhostedGrid`, `GhostedMode.tsx`) |
| Sparse-blend (`MIN_INHABITED`) | scoped, not built (`slices/ghosted-nearby-blend.md`) |
| Chat substrate | **canonical `conversations`/`conversation_members`/`messages` live** — 29 conversations, 56 members, 56 messages. Governed by D25. |
| Legacy `chat_threads` / `chat_messages` | **DROP overdue** — scheduled 2026-05-21, both tables still present. `canonical.ts` adapter routes new reads/writes to canonical tables. Cleanup PR outstanding. |
| `conversations.is_group` | column exists (permits group), but **all 29 conversations are `is_group=false`** — per-pair holds in practice. Drift risk vs D25 §2.1; flag, don't rely on it. |
| G1 schema (albums/photos/shares + helpers) | **applied & verified** — all 4 tables + `has_xxx_access` + `has_active_album_share` present in prod. |
| Ghosted album data | **6 albums (all `is_xxx=true`), 7 photos (all `scan_status='approved'`), 0 shares, 0 access-log rows.** These are seed/recon rows — no real share flow has run; auto-approved photos mean no scan actually gated them. |
| Signed-URL endpoint + forensics log | shipped (`api/ghosted/photo-signed-url.js`); log table empty (no real views yet). |
| G3 upload + scan pipeline (NudeNet/PhotoDNA/StopNCII) | **not enforced in prod** — every existing photo is `approved` with no scan having run. Build/verify before any real upload path opens. |
| G4 Yoti age-verification webhook | **not built.** 158/224 profiles have a backfilled `age_verified_at` with NULL method — non-compliant (see §4.3 warning). |
| G6 CCBill XXX add-on (swap `has_xxx_access` body) | not built — signature reserved. |

Doctrine fit confirmed against D06, D08, D11, D15, D16, D22, D25, D33, D48 and the Sacred Invariants.

---

## §8. Open conflicts this doctrine surfaces (for Phil's ruling)

1. **Soft-entry vs the boo-gate — RESOLVED 2026-06-01 in D25 §21.** The conflict (beacon/Ghosted/Preloved tap-to-signal vs D25's convergence-gated chat) is settled by the three-state model: Ambient (D17 field) → Soft entry (D25 §21: one decaying signal, no thread) → Converged (D25 §4.1: full chat). Ghosted inherits §21; no surface-doctrine exception. **Build items this generated** (tracked in §7): un-reciprocated-boo decay/expiry on `taps`, and the one-boo-per-recipient anti-spam constraint — both currently unimplemented.
2. **`is_group` permits what D25 forbids.** The column should be constrained or the per-pair invariant enforced at write time, so the schema can't drift into group chat by accident.
3. **The age-verification backfill** (§4.3) is the highest-priority item: a live OSA exposure, not a roadmap gap.
