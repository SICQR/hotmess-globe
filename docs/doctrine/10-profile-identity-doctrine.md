# Doctrine 10 — Profile Identity

**Locked 2026-05-28. Phil Gizzie + Claude.**
Authority: this doctrine sits above all profile / photo / visibility code.
No PR that violates these rules may merge. Sacred Invariants are immutable
without a doctrine revision.

---

## Why this doctrine exists

Profile identity is the core product surface — once the photo carousel
ships it becomes the room every member spends time in. Other queer
platforms (Grindr, Scruff, Sniffies) optimise this surface for swipe
throughput and inventory pressure. HOTMESS does not.

The category default is a body catalog. HOTMESS is a presence.

This doctrine encodes the rules the surface must obey to remain HOTMESS
rather than collapsing into the category default.

---

## Sacred Invariants

These are immutable. Any PR that breaks one fails the doctrine check.

1. **Presence outranks inventory.** A profile is a person curating
   presence. It is not a catalog of attributes for filtering.
2. **Identity outranks consumption.** Photos exist to express who someone
   is, not to maximise time-on-surface or engagement metrics.
3. **Reveals happen through pacing, never automatically.** Visibility
   escalation requires deliberate human action. No tier-purchase, no
   contact-add, no algorithmic event grants reveal.
4. **Reveals are reversible.** Any visibility state a user grants can be
   revoked by them at any time without consequence to the recipient.
5. **System orthogonality is structural.** Safety trust does not unlock
   intimacy. Mutual attraction does not unlock safety. Tier purchase
   does not unlock either. The systems below MUST stay separate.
6. **Relationship signals outrank monetisation.** A paid tier never
   grants visibility a free relationship would not. Money amplifies
   atmosphere; it does not override consent.

---

## System orthogonality (the architectural spine)

Five systems exist. Each controls one thing. No hidden coupling between
them is permitted.

| System              | Controls          | Granted by                       |
| ------------------- | ----------------- | -------------------------------- |
| Safety Suite        | who protects you  | TRUSTED CONTACT add (opt-in)     |
| Ghosted Visibility  | who sees you      | PUBLIC / CONNECTED / SHARED      |
| Messaging           | who can reach you | Mutual boo + has_messaging tier  |
| CONNECT state       | mutual attraction | Reciprocal boo                   |
| TRUSTED CONTACT     | emergency trust   | Manual safety-contact assignment |

**Forbidden coupling examples** (these would each break the doctrine):

- Adding a TRUSTED CONTACT for SOS unlocks SHARED photos for them. ❌
- Reaching a mutual boo unlocks SHARED photos automatically. ❌
- Paying for a tier auto-reveals SHARED photos to anyone. ❌
- Marking someone as TRUSTED CONTACT requires they be CONNECTED first. ❌

The architectural test: if removing one of these systems would change
the behaviour of another, the coupling is illegal.

---

## Photo Visibility model

Three states. Each controlled per-photo. Reversible at any time.

| State     | Meaning                                          |
| --------- | ------------------------------------------------ |
| PUBLIC    | Visible to everyone in Ghosted grid + profile    |
| CONNECTED | Visible only after mutual boo with the viewer    |
| SHARED    | Visible only to specific people the owner chose  |

**SHARED is per-image, per-person.** Not a system-wide setting. The
owner deliberately reveals image X to viewer Y through a manual
gesture. The reveal is recorded; it can be revoked individually
without affecting other shares.

**SHARED is not PRIVATE.** Earlier drafts used the word "private";
that was rejected because PRIVATE implies shame or secrecy. SHARED is
warm and intentional — an act of relationship, not concealment.

**Default state:** the first photo a user uploads is PUBLIC. Subsequent
photos default to the same state as the most-recently-added photo
(reduces decision fatigue, respects observed user preference).

---

## Motion doctrine

The way the surface moves is part of the identity. Slow and tactile
beats fast and snappy on every gesture this surface owns.

- **Easing.** Cubic-bezier soft-out. No linear, no aggressive ease-in.
  `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) is the house curve for
  photo transitions and reveals.
- **Drag weight.** Heavy damping (≥22), low stiffness (≤400). Snap-back
  springs at ≥0.5s.
- **Haptic feedback.** Every successful gesture (swipe to next photo,
  set as cover, reveal, revoke) fires `navigator.vibrate(8)`. Failed
  gestures (tap-and-hold below threshold) fire `vibrate(20)` distinct
  warning. Mobile-only; silently no-op on desktop.
- **No bounce.** Carousel overshoots are visual lies. Snap precisely
  to grid.
- **No autoplay.** Photo carousels never auto-advance. The user moves
  through reveals at their own pace.
- **Cinematic over feed-like.** Transition durations 350–650ms. Anything
  faster than 200ms is rejected as feed-style fidget rhythm.

---

## Visibility doctrine — what the UI must always communicate

The viewer and the owner must both always know who can see what. No
ambiguous exposure states. No silent state changes.

- **Owner-side affordance.** Every photo in Edit Profile shows its
  current visibility as a visible badge. State changes require a
  deliberate tap, never a long-press swipe-gesture combo.
- **Viewer-side affordance.** When a viewer sees a CONNECTED or SHARED
  photo, they see a subtle indicator that the photo was revealed to
  them specifically (one-line copy: "Shared with you" or "You connected").
- **Revocation is silent.** When an owner revokes SHARED access, the
  viewer is not notified. The photo simply disappears on next load.
  No "X removed a photo you could see" — that would be an engagement
  bait notification.
- **Trust-mark separation.** The owner never sees "X has trusted you as
  an SOS contact" framed alongside any profile visibility state.
  Safety relationships render in the Safety Suite UI only.

---

## Emotional sequencing (guidance, not enforcement)

Photos in order tell a story. The first six slots in Edit Profile have
placeholder copy that disappears on upload. The last two slots are
blank (uncoaxed — for the photos a user wants to add that don't fit
any prompt).

| Slot | Placeholder copy                       |
| ---- | -------------------------------------- |
| 1    | How you'd introduce yourself           |
| 2    | The room you're in                     |
| 3    | The body, if you want                  |
| 4    | A night you remember                   |
| 5    | Soft side                              |
| 6    | Where you are right now                |
| 7    | (blank)                                |
| 8    | (blank)                                |

The placeholders are invitations, not requirements. A user who skips
them gets the same result. A user who follows them curates presence by
accident. Neither path is rewarded or punished.

---

## Anti-patterns explicitly refused

These mechanics are common in the category. HOTMESS does not ship them.
Any PR that introduces one is rejected on doctrine grounds.

- "X people viewed your photos today" notifications
- "Your profile is X% complete" gamification
- Profile-view counters visible to the owner
- Photo upload streak mechanics
- Photo-level reactions / emoji responses
- Story-style ephemeral photo features (auto-delete after 24h)
- Tinder-style swipe-stack discovery
- Autoplay video carousels
- Sponsored profile insertions in the grid
- Profile "boost" tier that surfaces a user above non-paid users
  (legacy `profile_bump` is grandfathered with restraint — never to
  be expanded into infinite-pay-to-win)
- Tier purchase that auto-reveals SHARED photos

---

## Locked decisions (Phil 2026-05-28)

| Decision                  | Resolution                                  |
| ------------------------- | ------------------------------------------- |
| Max photos per profile    | 8                                           |
| Visibility ladder         | PUBLIC / CONNECTED / SHARED                 |
| Persona-specific photos   | NO for v1                                   |
| Auto-moderation           | DEFER — manual queue is enough for beta     |
| Visibility language       | SHARED (not PRIVATE)                        |
| Photo order               | User-controlled, drag-to-reorder            |
| Default new-photo state   | Match most-recently-added photo's state     |

---

## V1 shipping scope

**PR-A · Visual upgrade.** Hero full-bleed dvh. Carousel renders even
with 1 photo. Skeleton on load (gold pulse). Parallax. Indicator dots.
Motion doctrine baked in from first commit.

**PR-B · Multi-upload + reorder.** File picker multiple=true. Parallel
uploads with progress. Browser-side compression (1080px / 80% jpeg).
Long-press + drag reorder. Tap-to-set-cover action sheet. Live carousel
preview at top of edit sheet.

**PR-C · Lightbox + visibility states.** Tap photo on profile →
full-screen lightbox. Pinch zoom. Swipe horizontal. Swipe-down
dismiss. Per-photo visibility column on profile_photos.
PUBLIC/CONNECTED render; SHARED v1 = owner-only.

**PR-D · Active state overlays.** Active beacon pill on hero (gold,
"ON THE FLOOR @ [venue]"). Mutual-boo ring (thin gold around hero).
Aftercare ring (cream).

---

## Deferred mechanics (post-v1, captured to not be forgotten)

**SHARED v2 — per-person reveal gesture.** From a viewer's profile
sheet, the photo owner can tap "Reveal a photo with them" → select
which SHARED photo → it becomes visible to that one viewer only.
Backed by a `photo_shares` table (`photo_id, viewer_id, shared_at,
shared_by`). Revocable per-row. This is the truer expression of
"reveals happen through pacing" — ship when v1 has settled and the
gesture has been UX-designed.

**Per-photo persona tagging.** When personas earn their own scope
(post-v1), photos can be tagged to one or more personas so MAIN/SECOND
present different photo sets.

**Auto-moderation.** Photo upload triggers AI image moderation (nudity
classifier + face detection for verification). Replaces manual queue
for the common case; manual queue stays for edge cases.

**Reaction tap (NOT reactions).** A single per-photo "this landed"
gesture distinct from a boo — a soft signal without commitment.
Phil instinct call required before this ships; could violate
"presence over inventory" if misdesigned.

---

## Cross-references

- `docs/doctrine/01-sacred-invariants.md` — #4 (never sells symbolic
  capability), #6 (system never pretends activity), #7 (no exact
  tracking, fuzzy ≤200m).
- `docs/doctrine/07-visual-hierarchy.md` — monetisation may amplify
  atmosphere, must never override relational truth.
- `docs/doctrine/08-visibility-state-architecture.md` — visibility-state
  spec (related but separate — that doctrine covers user-online-state;
  this doctrine covers per-photo permission).

---

## Final note

Once this doctrine ships, profile identity becomes the core product
surface of HOTMESS. Every photo decision after this point will be
measured against these rules. If the rules need to change, they
change through doctrine revision (a PR that amends this file), not
through implementation drift.

Phil's snap on the TRUSTED-CONTACT-vs-TRUSTED-VISIBILITY conflation
is the kind of catch this doctrine exists to make routine. Future
collapses should be impossible because the orthogonality table is now
the contract everyone reads first.

— end doctrine 10 —
