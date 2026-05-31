# D25 — In-App Messaging Doctrine

**Status:** canonical. Established 2026-05-31.
**Inherits from:** D08 (Visibility), D15 (Care Language), D17 (Surface Layer), D20 (Identity), D22 (Temporal), D24 (Contextual Trust Weighting), D32 (AI & Automation), D33 (Memory & Permanence), D34 (Trajectory).
**Inherited by:** future doctrines for synchronous voice/video/media communication.

---

## §0 Why this doctrine exists

The constitutional substrate layer (D33 + D21 + D31 + D32 + D24) defines what HOTMESS is structurally incapable of becoming. The convergence slice established the user-facing chat surface that opens off the hybrid sheet after a boo. What the doctrine layer has not yet written is the explicit contract for **what chat is, what shape it has, what it persists, what it never becomes.**

Without D25, the chat substrate would drift into the shapes platforms historically reach for: group threads, broadcast announcements, reaction-driven engagement loops, model-mediated "smart replies," persistent thread archives, public reply chains, in-chat commerce, push-frequency optimisation. Each is a category of feature that, once shipped, mutates chat from "a per-pair conversation between two converged users" into "a feed engineered to retain attention."

D25 binds the chat substrate to the constitutional layer it inherits from, so the messaging surface remains a per-pair conversation under D24 gate, D22 decay, D32 model discipline, and D34 trajectory framing — and never becomes the kind of system that incentivises constant return.

The single sentence: **chat is a bounded conversation between two converged users, not a feed.**

---

## §1 Scope

D25 governs:

- The per-pair chat substrate that opens after the D24 §4.4 `converged` rung is reached.
- The composer, the message types, the read/delivery surface, the inbox surface.
- The persistence and decay of message content.
- The convergence-context banner the chat surface displays when opened from L2HybridExchangeSheet.
- Notification dispatch initiated by chat events.

D25 does NOT govern:

- The boo flow that produces the §3.1 mutual-boo primitive event (governed by D24 + existing boo doctrine).
- The L2HybridExchangeSheet convergence surface (governed by D19 + D20 + D34 + the convergence slice).
- SOS routing through Telegram contacts (governed by D24 §3.4 + existing SOS doctrine).
- Operator-to-user broadcast — forbidden entirely per D31 §6, not just absent from this doctrine.
- Voice or video synchronous communication — out of D25 scope; future doctrine if ever introduced.

---

## §2 Core principle: chat is bounded conversation

**§2.1 — Chat is per-pair.** A chat is a conversation between two specific users. There is no group chat, no chat with three or more users, no "room," no thread shareable to a third user. The pair shape is constitutional, not a default — adding a third party requires a new doctrinal artefact.

**§2.2 — Chat is gate-gated, never permission-gated.** The chat opens when the pair reaches D24 §4.4 `converged` and stays open while the gate condition holds. A user does not "follow" or "friend" another user to gain chat access; the gate is the mutual primitive event from D24. There is no chat-request flow, no pending-message inbox, no "they need to accept your message" state.

**§2.3 — Chat is not a destination.** Per D34 §3.5. Chat exists to resolve a convergence back into movement. Sessions that linger past the original beacon's life are not the platform's optimisation target. The product does not produce surfaces that draw users back into chats they have already resolved.

**§2.4 — Chat is bounded in time.** Per D22 §3 inheritance, individual messages decay through the same tier model that trajectory does, with adjusted thresholds per §5. A chat thread is not an archive; it is a working surface that ages out.

**§2.5 — Chat is symmetric.** Per D20 + D34. Both parties see the same composer, the same message types, the same convergence context, the same decay state. There is no "premium chat" tier with extra affordances, no "verified user gets read receipts," no operator-side enhanced view.

---

## §3 The chat substrate

**§3.1 — Per-pair partition.** The persistence layer stores messages keyed by an ordered pair `(lower_user_id, higher_user_id)` to canonicalise the pair regardless of which user initiated. Cross-pair queries are explicitly forbidden by §11 — the substrate's read paths are per-pair-only.

**§3.2 — Content shape is typed and locked.** A message is one of: `text`, `reaction`, `media-attachment`, `convergence-resolution-marker`, `decay-system-notice`. Adding a content type requires doctrinal review. Specifically forbidden as content types: `rich-embed`, `link-preview` (renders raw URL only), `payment-request` (settlement is negotiated at the agree-to-amount surface per D21 §8, not inside chat), `model-suggested-reply`, `operator-broadcast`.

**§3.3 — Append-only, with decay.** Messages are not edited or deleted by the sender. The user-visible affordance is "retract" which marks the message as retracted and removes the content from rendering; the substrate marks the row but does not store the original content past retraction. This satisfies D24 §3.6 retraction semantics for any conversational content the user wishes to walk back, without producing a "censor history" surface.

**§3.4 — Per-pair, not per-user.** There is no `user.chat_count`, `user.last_message_at`, `user.unread_count` denormalised column. Per-pair counters live on the per-pair substrate and are reconstructed at query time for the pair the requesting user is viewing.

**§3.5 — No global message stream.** No "all messages I've ever sent" surface for a user; no "all messages on the platform" admin surface. Each pair is the unit of query. The closest aggregate is per-pair message counts for atmospheric summary purposes, computed per D33 §1.1 aggregate-only shape.

---

## §4 Gate inheritance (D24)

**§4.1 — Chat opens at D24 §4.4 `converged`.** The pair must satisfy converged for the chat to be reachable. The boo gate language remains "boo back and the chat opens," surfaced per D24 §7.1.

**§4.2 — Chat closes when the gate closes.** When the converged-contributing events decay past D24 §6 windows, the chat substrate transitions to a closed state. The user-visible behaviour: existing message content fades out per the same D22 decay tier, the composer surface disappears, the inbox cell shows a "this chat has gone quiet" label per D15 tone.

**§4.3 — Chat cannot be paid-skip-gated.** Per D24 §11.6 + D21 §9. No upgrade tier opens a chat without the primitive event. No "I'd pay to message this person" surface.

**§4.4 — User can lock the gate stricter.** Per D24 §12.6. A user can require D24 §4.5 `trusted` before chat opens with anyone they have not previously transacted with. Stricter is permitted; looser is forbidden.

**§4.5 — SOS surfaces bypass the chat gate.** When a §3.4 safety contact pairing has been established and an SOS dispatch is in flight, the dispatch routes through Telegram per existing SOS architecture, not through chat. Chat is not the SOS substrate; chat does not become one.

---

## §5 Message decay (D22 inheritance)

Adapting D22 §3 to messaging:

**§5.1 — Three decay tiers for messages.** `fresh` (last 24h), `recent` (last 30d), `archived-to-pair` (older than 30d). Older messages are not deleted server-side; they are out of the rendering window and require explicit "show older" affordance to surface.

**§5.2 — Per-pair chat archive expires at 180 days.** Past 180 days from the last contributing primitive event for the pair (per D24 §6 windows), the substrate executes irreversible content deletion per D22 §4 atmospheric aggregation pipeline equivalent. The aggregate counter for "this pair had a conversation" survives; the messages themselves are destroyed. Reconstructing the conversation is mathematically impossible.

**§5.3 — Retraction is immediate and content-destroying.** Per §3.3. The user can retract any of their own messages. The substrate removes the content immediately; the message marker remains so the conversation flow does not become incoherent (the other party sees "[retracted]" inline), but the content does not exist.

**§5.4 — No "message search."** A user cannot search across their own message history because the substrate does not maintain a denormalised search index per user. Search would imply persistent per-user message-content access patterns, which violates §5.2 + D33 §1.2. Inside a single open chat thread, search is permitted (per-pair, ephemeral, no index).

**§5.5 — No "message export."** Per D33 §9 + D31 §9 inheritance. The user has a per-relationship history surface (D24 §7.2) showing the pair's primitive events, not the chat content. The chat content is not portable.

---

## §6 Composer and content types

**§6.1 — Text input is the default content type.** Plain text, length-bounded per the existing chat composer. No rich-text formatting, no @-mentions across pairs, no #-tags.

**§6.2 — Reactions are a single-tap acknowledgement.** A small fixed set of reaction emojis (not a full emoji picker), tappable on any message. Reactions are content; they decay with the underlying message.

**§6.3 — Media attachments are bounded.** Photo or short video, size-capped per the existing chat composer. Each attachment inherits the same decay state as the message it accompanies. No "media-only" surface aggregating a user's sent attachments.

**§6.4 — Convergence-resolution markers are system-emitted.** When a user marks a handoff resolution on the hybrid sheet (per D19 §6.10), the resolution shows as a system-emitted marker in the chat ("Sorted — Passed on"). The marker is a content type with a locked enum value, not freeform.

**§6.5 — Decay-system notices are system-emitted.** When the chat transitions to a closed state per §4.2, or when a message reaches the `recent` decay tier, a small system notice may appear (D15 tone) marking the transition. The notice is not actionable.

**§6.6 — Specifically forbidden composer affordances.** No "send to multiple users" button. No "share to thread" affordance. No "schedule message" surface. No "smart reply" suggestion bar. No "AI rewrite" button. No "translate" feature that consumes message content through a model (per D32 §6.3 — cross-user content in model context requires explicit mutual consent at the moment of invocation; per-pair translation would not satisfy that gate by default).

---

## §7 Convergence-context inheritance

The convergence slice established that when a chat opens from L2HybridExchangeSheet, the chat surface displays a convergence banner with the beacon title, the primary affordance ("Heading to [venue]?"), and the structured openers (per `convergenceContext` prop in L2ChatSheet).

D25 binds the contract:

**§7.1 — The convergence banner is always shown when chat opens from a hybrid-sheet handoff.** Not optional, not collapsible past the first scroll. The chat exists because of the beacon; the banner names it.

**§7.2 — The banner decays with the beacon.** Per D34 §4.5 trajectory decay. After the beacon transitions to `recent` per the trajectory state, the banner softens its language ("You crossed at this beacon recently"). After `gone`, the banner falls off the chat surface and the chat shows only the per-pair content thread.

**§7.3 — Openers are template, not model-generated.** The opener affordances ("Still available?", "Heading there too?") are template strings selected based on beacon kind + venue. No model generates the openers. Per D32 §4.10 — chat-side conversational AI between users is forbidden.

**§7.4 — One beacon, one chat.** A single beacon between the same two users opens the same chat thread regardless of which surface initiated; the chat substrate is per-pair, not per-(pair, beacon). Multiple beacons between the same pair surface the same chat with multiple convergence banners stacked chronologically.

---

## §8 Inbox surface

**§8.1 — The inbox is per-user, per-pair-row.** The user sees a list of their open chats (pairs at or above `converged`). Each row is a pair. There is no "unread badge" total across rows that aggregates into a single number on a nav surface — per D17 nav-as-pure-navigation. Per-row unread indicators are permitted; nav-level aggregate badges are not.

**§8.2 — Inbox ordering is recency of last message, not engagement-derived.** No "priority inbox," no "users you message most," no model-mediated re-ranking. Recency is the only ordering input.

**§8.3 — Inbox respects D08 visibility.** When the counterparty user is off-grid, the inbox row continues to show (the chat does not disappear) but the off-grid presence guard from D20 §5.3 + the convergence slice's `data-presence-suppressed` pattern applies. No "last seen" timestamp, no online dot.

**§8.4 — Inbox does not show chat content previews past the gate condition.** When a pair drops below `converged` (per §4.2), the inbox row shows the "gone quiet" label, not the last message preview. The substrate refuses to surface content for a chat whose gate has closed.

---

## §9 No group chats, no broadcast, no mass DM

This deserves its own section because it is the temptation operators and growth pressure will push hardest against.

**§9.1 — No group chats, ever.** Three-or-more chat is a different surface than per-pair chat. The substrate's per-pair partition is constitutional. Adding group chat requires a new doctrine establishing the consent model for the third+ party and the persistence shape; D25 explicitly forbids it.

**§9.2 — No broadcast to "users who have converged with you."** A user cannot send the same message to every user they have a converged relationship with. Per D31 §6.1 inheritance (mass communication ban) — the chat substrate does not produce the recipient list, so the broadcast cannot be sent even if a surface tried to invoke it.

**§9.3 — No operator-to-attendee messaging.** Per D31 §6.2. Operators communicate through per-handoff chats only.

**§9.4 — No mass announcement channels.** No "HOTMESS announcements" thread that the platform pushes to users via chat. Platform-originated notifications go through the existing notification dispatcher, which has its own rate-limiting and consent gating. They do not appear as chat messages.

**§9.5 — No "share this chat" affordance.** A chat thread is not shareable. A user cannot forward a message to a third party, screenshot-share within the app, or generate a permalink. (Operating-system level screenshots are obviously possible; the platform does not provide affordances that imply chat content is portable.)

---

## §10 Off-grid continuity (D08 inheritance)

D08 + the convergence slice's off-grid hardening establish that off-grid users' presence does not emit. D25 binds the chat consequence:

**§10.1 — Off-grid users' open chats remain reachable to converged peers.** A user going off-grid does not collapse their existing chats. The peers continue to see the inbox row; the chat opens; messages can be sent. The off-grid user receives delivery per their notification settings.

**§10.2 — Off-grid presence is never surfaced through chat metadata.** No "they're online now," no "they read this," no "they're typing." The chat shows messages as delivered when the substrate has accepted them; nothing further.

**§10.3 — Off-grid users do not appear as available for new chats.** Beacon-drop-or-discovery surfaces respect D08; off-grid users do not surface to new prospective converged-rung peers. Existing chats persist; new chats from non-mutual peers do not initiate.

---

## §11 What D25 forbids

In addition to inherited prohibitions:

- Group chats, "rooms," or any 3+-party persistent thread substrate.
- Broadcast-to-many surfaces of any kind.
- Model-generated message content, smart replies, or AI summaries of chat content.
- Per-user message search or global search across chats.
- Cross-pair message-content reads.
- "Priority inbox" or model-driven inbox re-ranking.
- Persistent read-receipt surfaces (the system tracks delivery for routing only; read-state is not user-visible).
- Typing indicators (D08 + convergence presence guard inheritance).
- Online-presence indicators (same).
- Per-user chat-volume denormalised columns.
- Operator-injected chat content.
- "Share to feed" or "share to story" affordances from chat.
- Payment-request message types (settlement at the agree-to-amount surface per D21).
- Persistent chat archive past 180 days from the pair's last contributing primitive event.
- Chat export, chat backup, or chat data portability.

---

## §12 What D25 permits

- Per-pair text + reaction + media + system-marker chat.
- Convergence banner from L2HybridExchangeSheet handoff.
- Template-string openers seeded from beacon context.
- Per-row unread indicators on the inbox.
- User-initiated retraction of own messages (content-destroying).
- Per-thread search inside a single open chat (ephemeral, no index).
- Notification delivery for new messages per the user's existing notification settings.
- System markers for convergence resolution and decay transitions.

---

## §13 Acceptance test

D33 §9 + D32 §11 + D24 §13 + D25 specific:

§13.1 — Show the chat substrate schema. Confirm per-pair partition keyed by ordered `(lower_user_id, higher_user_id)`.

§13.2 — Show the message content-type enum. Confirm exact match with §3.2 + §6.

§13.3 — Show the gate-read path. Confirm chat opens iff D24 §4.4 `converged` is satisfied.

§13.4 — Confirm no denormalised per-user chat-volume column exists.

§13.5 — Show the 180-day decay path. Confirm content destruction is irreversible per D22 §4.

§13.6 — Show the inbox query. Confirm recency-ordering, no model-ranking, no priority-inbox column.

§13.7 — Confirm no group-chat substrate exists or is hidden behind a feature flag.

§13.8 — Confirm no broadcast surface exists. Confirm no recipient-list query against the chat substrate.

§13.9 — Show retraction. Confirm content removal, marker preservation, no operator-recovery path.

A PR introducing chat-substrate behaviour without all nine answers does not ship.

---

## §14 Drift indicators

In addition to inherited drift indicators:

- A `chats` or `threads` table with a participants array longer than 2.
- A `room_id`, `channel_id`, `group_id` column.
- A "smart reply" suggestion bar in the composer.
- A "schedule send" affordance.
- A "share this chat" or "forward message" affordance.
- A model invocation reading message content for a non-mutually-invoked feature.
- A `priority_score` or `engagement_rank` column on chats or messages.
- A typing-indicator surface.
- A read-receipt surface.
- A per-user chat-export endpoint.
- An "all your messages" search surface.
- A persistent operator-side chat reader.

Each is an audit moment. Revert and refactor.

---

## §15 Boardroom test framing

- "Can we add group chats for events?" — No. §9.1 binds.
- "Can we let operators message all attendees?" — No. §9.3 + D31 §6 bind.
- "Can we offer 'premium chat' with extra features?" — No. §2.5 + D24 §11.6 bind.
- "Can we use AI to suggest replies?" — No. §11 + D32 §4.10 bind.
- "Can we keep chat archives forever?" — No. §5.2 binds. 180 days from last contributing primitive event.
- "Can users back up their chats?" — No. §5.5 + §11 bind.
- "Can we show 'top messagers' to gamify engagement?" — No. §8.2 + D34 anti-gamification bind.
- "Can we add a HOTMESS announcement channel?" — No. §9.4 binds. Platform notifications go through the dispatcher, not chat.
- "Can chat data train a recommendation model?" — No. D32 §10 cross-property + D24 §11 trust-derivation forbids it.

---

## §16 Forward inheritance

**§16.1 — D28 (Refund & Cancellation).** Dispute and refund flows initiate from the chat surface where the settlement was negotiated. The §6.4 convergence-resolution marker carries the resolution state that the dispute flow may reverse per D24 §3.5.

**§16.2 — Future voice/video.** Synchronous voice or video would be a separate substrate with its own doctrine. D25 explicitly does not extend to synchronous media; the bounded-conversation framing of §2 would need re-derivation for ephemeral synchronous channels.

**§16.3 — Operator handoff communication.** Per D31 §3.4 — operators communicate with handoff parties through the same chat substrate. The per-pair partition holds whether one side is an operator entity or a user.

---

## §17 Naming and references

- **The per-pair chat substrate** lives in the `chat` schema (or equivalent existing schema in the live codebase).
- **The content-type enum** is the §3.2 locked set.
- **The decay state machine** is the §5 binding.
- **The convergence-context banner** is the inheritance from the convergence slice.

Reference for inheritance:
- `docs/doctrine/24-contextual-trust-weighting-doctrine.md`
- `docs/doctrine/22-temporal-doctrine.md`
- `docs/doctrine/32-ai-automation-doctrine.md`
- `docs/doctrine/33-memory-permanence-doctrine.md`
- `docs/doctrine/34-trajectory-doctrine.md`
- `docs/doctrine/15-care-language-doctrine.md`
- `docs/doctrine/20-identity-doctrine.md`
- `docs/doctrine/31-venue-partner-power-doctrine.md`

---

## §18 What ships next

D25 is now a written constitutional commitment. No chat-substrate behaviour ships without inheriting it.

The existing chat substrate (the L2ChatSheet + per-pair persistence + boo-first gate) is substantially D25-compliant already. A near-term audit slice surfaces drift if it exists:

1. **Slice 1 — D25 conformance audit.** Walk the live chat substrate schema, content types, inbox queries, message-decay paths, retraction paths. Surface any non-conformance for follow-up. Read-only; no migrations.
2. **Slice 2 — Add 180-day decay enforcement.** Scheduled job per §5.2. If not currently enforced, ship the irreversible content-destruction pipeline aligned with D22 §4 atmospheric aggregation.
3. **Slice 3 — Content-type lockdown.** Migration converting any free-text type field to the §3.2 enum.
4. **Slice 4 — Off-grid chat continuity verification.** Confirm §10 holds in production with live test users.
5. **Slice 5 — Drift indicators monitoring.** Scheduled job that scans the schema for §14 drift indicators (e.g., new array-typed participants column appearing) and pings the operator audit channel.

Each slice ships independently. Slice 1 first; the audit determines which of 2-5 are needed.

---

## §19 Closing

HOTMESS users will message each other. The chat will not become a feed, will not become a broadcast surface, will not become an engagement system.

The bounded-conversation framing of §2 is the structural commitment. Per-pair partition (§3.1), gate-gated opening (§4), bounded decay (§5), no group/broadcast (§9), no model assistance (§6.6 + D32 inheritance), no persistent search or export (§5.4, §5.5), no engagement-derived ordering (§8.2). Each is enforced at a different layer; removing one requires editing a different part of the substrate.

The temptation will be group chats. Then broadcast. Then smart replies. Then archived search. Each one would deliver near-term engagement at the cost of D24 + D33 + D32. The doctrine binds them all at once.

D25 completes the messaging surface contract. With it, the user-facing communication layer of HOTMESS is fully under constitutional substrate discipline. The remaining unwritten doctrines — D28 (refund), D23/D26/D27/D29/D30 — inherit this layer rather than extend it.
