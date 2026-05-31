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

---

## §20 Constitutional messaging modes (amendment, 2026-05-31)

### §20.0 Why this amendment exists

§2 named chat as a bounded conversation. That framing is correct as a *default mode* but is insufficient as the complete contract. HOTMESS is not a chat app. It is an operating system whose surfaces overlap simultaneously: trajectory, care, settlement, safety, radio, commerce, presence, operators, atmosphere, events, and disappearance. A single message in HOTMESS can simultaneously be a flirtation, a coordination, a settlement step, a safety escalation, a care continuity beat, an operator logistics note, an event routing signal, and trajectory residue. Each of those carries different constitutional weight.

The naive resolution — one global messaging philosophy — fails because the constitutional weights conflict. A handoff needs confirmation; an SOS needs certainty; a care escalation may need acknowledgement; a venue transfer may need temporal validity; but a flirtation must not create pressure, and disappearance must remain possible. No single global philosophy can satisfy all of these.

The architectural correction: **messaging is not a feature. It is a transport layer between constitutional systems.** The ontology of a thread determines its persistence, expectation, visibility, interruption rights, escalation rights, acknowledgement semantics, decay semantics, and routing behaviour. The same communication primitive behaves differently depending on the constitutional context the thread is operating under.

This amendment establishes the **mode taxonomy** that adapts §2 across HOTMESS's substrate. The previous sections §3–§19 describe the default mode (Trajectory). The amendment names four additional modes — Settlement, Safety, Care, Operator — each with its own constitutional overrides.

### §20.1 The mode is a property of the thread, not the message

A thread enters a mode when its anchoring substrate event is one of the substrate-recognised classes (a beacon-anchored handoff, an SOS dispatch, a care-role pairing, an operator-mediated handoff). A thread can carry multiple modes simultaneously when its anchoring events are multi-class — for example, a settlement thread can also be a safety thread if SOS pairing is active between the same pair. When modes overlap, the **strictest constraint wins** for any given property (e.g., SOS interruption override beats Trajectory no-pressure semantics).

Mode is computed at query time from the substrate events that constitute the thread's history (per D24 §2.2 position-function discipline). It is not a denormalised column on the thread, and it is not user-selectable.

### §20.2 Mode: Trajectory (default)

The mode that §3–§19 describe. Active when the anchoring event is a §3.1 mutual boo or a §3.2 completed handoff with no settlement involvement.

- **Persistence:** D22 §5 default decay (fresh / recent / archived-to-pair → 180-day irreversible deletion).
- **Expectations:** no forced acknowledgement; silence is acceptable; read state is not user-visible.
- **Visibility:** D08 default; presence indicators forbidden.
- **Interruption rights:** none — neither party may demand a response.
- **Escalation rights:** none beyond the standard convergence affordance.
- **Acknowledgement semantics:** none required.
- **Decay semantics:** atmospheric decay; messages soften visually then disappear.
- **Routing behaviour:** standard notification dispatcher; rate-limited; user-throttleable.
- **Disappearance compatibility:** full — D08 off-grid is honoured throughout.

The Trajectory mode is the default because it is the lowest-pressure mode. Modes that need to override its constraints must do so explicitly.

### §20.3 Mode: Settlement

Active when the anchoring beacon has entered the D21 state machine at `initiated` or beyond.

- **Persistence:** the message thread inherits Trajectory decay, BUT settlement-relevant content (amount agreement, confirmation markers, dispute initiation) is duplicated to the regulated settlement schema (D21 §3.1) for the regulated retention window. The chat-side content decays normally; the regulated record persists per D21.
- **Expectations:** confirmation is meaningful. When the chat surfaces an agree-to-amount affordance (D21 §8.2), the response is a substrate-recognised event, not just text.
- **Visibility:** chat is per-pair as always; the underlying settlement state is reachable per D21 §3.4 only through the operator-audit-logged path.
- **Interruption rights:** none beyond Trajectory.
- **Escalation rights:** either party can escalate to D28 reversal flow (templated composer opener, §4.2 of D28).
- **Acknowledgement semantics:** the confirmation markers (D25 §6.4) are substrate-recognised, not optional. A "Sorted — Passed on" marker is a real event, not a chat label.
- **Decay semantics:** chat content decays per Trajectory; regulated-substrate persistence is independent.
- **Routing behaviour:** notification dispatch includes the D21 state-transition events (e.g., "agreement reached," "reversal requested") through the standard dispatcher with no special priority.
- **Disappearance compatibility:** partial — the chat content may decay and the user may go off-grid, but the regulated record persists. D08 visibility does not extend to regulatory minimum retention.

Settlement mode is the spec D28 retroactively becomes the implementation specification for.

### §20.4 Mode: Safety

Active when the anchoring substrate event is a D24 §3.4 safety contact pairing AND an SOS dispatch is currently active OR being prepared.

- **Persistence:** safety-relevant exchanges persist longer than Trajectory — minimum 90 days for any message during an active SOS window, retained in the safety event substrate (D24 §10.3 separate substrate) rather than the chat substrate. Outside an active SOS window, the thread behaves as Trajectory mode.
- **Expectations:** acknowledgement matters. When the dispatch is in flight, the receiving contact is expected to confirm receipt. The substrate models the acknowledgement as a discrete event, not a read receipt.
- **Visibility:** during an active SOS window, the standard off-grid presence guard (D08 + convergence) is overridden by user explicit consent at SOS-initiation time per D31 §6.4. After the window closes, off-grid resumes.
- **Interruption rights:** **override.** SOS routing bypasses notification throttling, do-not-disturb settings, and the convergence chat's normal rate-limit per the existing SOS architecture.
- **Escalation rights:** the dispatched contact has the right to invoke external emergency services or further chain dispatch per the existing SOS doctrine; the originating user has the right to terminate the dispatch.
- **Acknowledgement semantics:** binary, substrate-recognised. The receiving contact either acknowledges or does not; the dispatcher routes accordingly.
- **Decay semantics:** longer retention (90+ days for SOS-window content; archive per safety substrate). The atmospheric residue D33 pattern still applies to operator-level aggregates; per-user SOS records are governed by safety substrate retention rules, not D22 default.
- **Routing behaviour:** Telegram routing per existing SOS architecture; bypasses standard dispatcher.
- **Disappearance compatibility:** **suspended** during active SOS window per explicit consent (D31 §6.4). Resumed when window closes.

Safety mode is the only mode that explicitly overrides Trajectory's no-pressure framing. The override is constitutional — safety dignity supersedes flirtation dignity when both are live in the same thread.

### §20.5 Mode: Care

Active when the anchoring substrate event is a D24 §3.3 consented care-role pairing.

- **Persistence:** care thread content persists for the duration of the active pairing — does not decay on Trajectory timelines. When the pairing is terminated by either party through the care surface, the thread enters Trajectory decay from the termination event.
- **Expectations:** silence is **not** punished. Days or weeks between messages are part of the design. The thread does not produce "you haven't messaged in a while" surfaces, does not display "last active" labels, does not emit re-engagement notifications.
- **Visibility:** D08 default; off-grid is honoured throughout. Care does not override visibility the way Safety does.
- **Interruption rights:** soft. The care surface offers a "quiet check-in" affordance (one templated message, rate-limited to once per N days) that may surface when the dispatcher's atmospheric reads suggest the pair has been quiet for a long stretch — but this never displays to either party as "the other one might need you," only as a self-initiated affordance.
- **Escalation rights:** if the pair has also paired as safety contacts (D24 §3.4), Safety mode constraints stack over Care mode. Care alone does not grant SOS-style override.
- **Acknowledgement semantics:** none required. Care holds without confirmation.
- **Decay semantics:** none during active pairing. Slow atmospheric decay after termination.
- **Routing behaviour:** dispatcher uses lower-priority routing; messages do not push aggressively.
- **Disappearance compatibility:** full. Care explicitly does not violate D08; a user going off-grid does not break a care pairing, only suspends visible activity.

Care mode is the mode where **continuity outranks engagement**. The optimisation target for any feature touching Care is dignity, not response rate.

### §20.6 Mode: Operator

Active when one party to the thread is an operator entity (D31 §4.1) and the anchoring event is a handoff at the operator's venue/event/service.

- **Persistence:** operator-side chat content decays per Trajectory plus the operator audit log captures the resolution events per D31 §4.4. The operator does not retain a CRM-shaped record of the user; the audit log records that an operator-side action occurred, not the conversation content.
- **Expectations:** purpose-scoped. The thread exists for the handoff and resolves with the handoff. Operators do not initiate Trajectory-style follow-up chat after resolution.
- **Visibility:** D20 identity symmetry preserved; operator does not see richer user identity than a peer would. Off-grid presence guard applies normally.
- **Interruption rights:** none beyond Trajectory.
- **Escalation rights:** operator may initiate D28 reversal per D31 §3.6 refusal-of-service. The reversal flows through the audit-logged operator path.
- **Acknowledgement semantics:** for handoff confirmation, substrate-recognised per Settlement mode if the handoff involves money flow. For non-settlement handoffs, none required.
- **Decay semantics:** chat decays per Trajectory; the audit-log entry persists per D31 §4.4 retention.
- **Routing behaviour:** standard dispatcher; no operator-broadcast capability (D31 §6).
- **Disappearance compatibility:** full for the user side. Operator side is governed by operator role configuration.

The operator mode binds: **no portability, no CRM continuity, no persistent operator access** to a per-user thread beyond the per-handoff scope.

### §20.7 Mode interaction matrix

When a thread carries multiple modes simultaneously, the strictest constraint wins for each property:

- **Persistence:** longest required by any active mode (Safety > Settlement-regulated > Care-active > Trajectory).
- **Expectations / acknowledgement:** strictest required by any active mode (Safety substrate-required > Settlement substrate-required > others none).
- **Interruption rights:** strongest granted by any active mode (Safety override > others none).
- **Decay:** slowest demanded by any active mode (Care-active no-decay > Safety 90-day > Settlement chat-decay-plus-regulated > Trajectory default).
- **Disappearance compatibility:** weakest preserved by any active mode (Safety suspended-during-SOS > Settlement partial > Care full > Trajectory full).

The matrix is computed per (thread, current-time, active-modes) and consumed by the surface as a per-property constraint, not as a single "mode" value.

### §20.8 The mode taxonomy is closed

The five modes (Trajectory, Settlement, Safety, Care, Operator) are the canonical set. Adding a mode requires a doctrinal amendment naming the new mode's substrate anchor and its property values across the seven dimensions in §20.0. New modes are not configuration. They are constitutional surface changes.

Behavioural variants within an existing mode (e.g., a venue-specific operator subtype with different decay) are configuration within Operator mode, not new modes.

### §20.9 What this amendment forbids

In addition to the existing §11 prohibitions:

- A mode-selector UI that allows a user to switch a thread's mode arbitrarily. Mode is determined by substrate anchor, not by user election.
- A "mode override" admin tool that re-categorises a thread bypassing its anchor events.
- A model invocation that infers mode from message content (per D32 §3.1 substrate inheritance — modes come from substrate events, not from synthesis).
- Cross-mode content reuse — copy templated for Trajectory ("Heading there too?") used inside Safety. Mode-specific templates are mandatory.
- A "unified inbox sort by mode" surface that ranks Safety above Care above Settlement etc. Per §8.2 recency ordering only; mode is a per-row property, not a sort key.
- A "mode history" surface showing how a thread's mode has changed over time. Mode is reconstructed at query time per §20.1; it is not a logged sequence.

### §20.10 Acceptance test extension

D25 §13 + §20-specific:

§20.10.1 — Show how the surface determines the active modes for a given thread. Confirm it derives from substrate events per §20.1, not from a denormalised column.

§20.10.2 — Show the mode-interaction matrix implementation. Confirm the strictest-wins rule for each of the seven property dimensions in §20.0.

§20.10.3 — Show that templates are mode-specific (e.g., Safety acknowledgement affordance is not Trajectory's "Heading there too?").

§20.10.4 — Show the per-mode persistence path. Confirm Safety content persists 90+d; Care content persists during active pairing; Settlement-relevant content is duplicated to the regulated substrate; Trajectory content decays per D22.

§20.10.5 — Confirm no mode-selector UI exists; mode is substrate-derived.

§20.10.6 — Confirm no model invocation infers mode from message content.

A PR introducing mode-aware messaging behaviour without all six answers does not ship.

### §20.11 Forward inheritance update

The forward inheritance of D25 was previously named at the doctrine level (§16). The amendment is more specific:

- **D28** is the implementation specification for **Settlement mode** within D25. The settlement-mode property values in §20.3 are D28's contract surface.
- **The existing SOS doctrine** is the implementation specification for **Safety mode**. SOS routing's interruption-override is constitutional under §20.4.
- **The care suite** is the implementation specification for **Care mode**. Care's "continuity outranks engagement" framing is constitutional under §20.5.
- **D31 §3.4 + §3.6** is the implementation specification for **Operator mode**.

These are not new doctrines; they are existing doctrines re-framed as mode-specific contracts under D25's transport layer.

### §20.12 Closing

The architectural correction here is that messaging in HOTMESS was never a single primitive. It was always a transport layer between constitutional systems. The amendment names the modes that were implicitly there and binds their property values explicitly so future surfaces inherit by reference rather than re-derivation.

The most important sentence for the contributor reading the amendment under feature pressure: **the same message can carry multiple constitutional weights simultaneously, and the strictest constraint wins.** A safety-pairing-active chat between two converged users with an active care role and an in-flight settlement is all four modes at once, and the surface must honour all four — Safety's interruption rights, Care's silence-not-punished framing, Settlement's confirmation semantics, Trajectory's disappearance compatibility — by computing the per-property matrix per §20.7.

That is what makes HOTMESS messaging an OS-level transport rather than a feature. The chat substrate is one shape; the constitutional weight it carries is multiple. The mode taxonomy is how the two reconcile.

D25 as originally written (§1–§19) is now correctly read as **the Trajectory mode specification**. §20 promotes D25 to the doctrine that governs all modes, with the other modes inheriting through the §20 amendment plus their respective implementation doctrines.

The remaining doctrines (D23, D26, D27, D29, D30) inherit the mode taxonomy; specifically, any future doctrine that introduces a new communication context inherits D25 §20 by either picking an existing mode or proposing a new one with full property-dimension specification.
