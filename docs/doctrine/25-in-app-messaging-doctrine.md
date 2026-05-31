# D25 — HOTMESS In-App Messaging Doctrine

**The HOTMESS theory of contact. Governs chats, temporary threads, marketplace contact, event coordination, care handoffs, venue replies, and every in-app message surface.**

**Status:** Locked
**Written:** 2026-05-31
**Author:** Phil
**Inherited from:** D08, D12, D14, D15, D19, D20, D22, D24, D34, EXECUTION
**Inherited by:** D28, D31, D32, property doctrines, messaging slices, convergence slices, commerce and care flows.

---

## §0. Sacred Messaging Rule

**Messaging in HOTMESS exists to move people through consented contact, not to trap them in endless attention loops.**

A message is not an engagement unit. A thread is not a feed. A chat is not a growth surface.

Messaging exists to help people safely clarify, coordinate, hand off, meet, decline, exit, recover, or escalate.

---

## §1. Core Thesis

HOTMESS messaging is proximity-aware, context-bound, consent-led, and decay-conscious.

It must feel like nightlife contact:

- quick when the situation is live
- quiet when the moment has passed
- human when care is involved
- bounded when commerce is involved
- non-extractive when attention is involved
- safe when ambiguity becomes risk

The system should never create the feeling of being watched, chased, ranked, farmed, or punished for silence.

---

## §2. Thread Classes

All message threads must declare their class.

| Class | Purpose | Default retention | Exit rule |
|---|---|---|---|
| **Social** | ordinary user-to-user contact | D22 continuity-bound | mute, block, delete, report |
| **Temporary** | beacon/contact/handoff moment | decays after moment | auto-softens after expiry |
| **Commerce** | Preloved, drops, ticket resale coordination | evidentiary until dispute window ends | handoff/resolution state closes active context |
| **Event** | guestlist, arrival, meeting, queue, route | expires around event window | context decays after event |
| **Care** | aftercare, trusted handoff, support referral | care-minimised | user-controlled exit, safety override retained |
| **Safety** | SOS, trusted contact, abuse escalation | evidentiary/access controlled | cannot be deleted from audit while active |
| **Venue/Partner** | operator replies and logistics | purpose-bound | no DM extraction outside platform |

No thread may exist without a declared class. If the product cannot name the class, the thread should not ship.

---

## §3. Consent Before Contact

HOTMESS does not assume that proximity equals permission.

Allowed opening conditions:

- explicit tap to message
- reply to a user's beacon
- accepted contact path from a hybrid sheet
- transaction/handoff requirement
- event coordination where both parties opted into the event surface
- care handoff with consent
- safety escalation
- venue/operator response to a user-initiated action

Forbidden opening conditions:

- silent auto-DMs because users are nearby
- partner broadcast DMs to nearby users
- “someone viewed you” contact prompts
- algorithmic “say hi” nudges based on desirability
- coercive reply pressure
- “you have unread attention” loops
- bulk unsolicited venue messages

Contact must be earned by context, not harvested from presence.

---

## §4. Identity Boundaries

Messaging uses Presence Identity unless a privileged flow explicitly requires another layer.

Rules:

- Legal Identity never appears in chat.
- Safety contacts never appear in normal chat.
- Recovery Identity never appears in chat.
- Internal trust weights never appear in chat.
- Pseudonymous handles are valid message identities.
- Real names are opt-in, reversible, and never inferred.
- A user may transact pseudonymously while the platform remains legally accountable under D20.

If a chat view can expose Legal, Safety, or Recovery fields to another user, the build fails D25 and D20.

---

## §5. Message Copy and Tone

Messaging copy must be human, direct, and low-pressure.

Allowed:

- “Still around?”
- “Heading there too?”
- “Need one?”
- “Want to hand this over?”
- “No stress — you can leave this here.”
- “This thread will quiet down after the moment passes.”

Forbidden:

- “Don’t miss your chance.”
- “They’re waiting for your reply.”
- “Reply now to keep momentum.”
- “You’re losing visibility.”
- “Trusted users respond faster.”
- “Complete your profile to get more replies.”
- marketplace SEO language: buyer, seller completed, order, transaction, customer journey

D15 governs care copy. D19 governs commerce language. D34 governs trajectory language.

---

## §6. Temporary Context and Decay

Threads may carry context, but context must decay.

Examples:

- “Heading to Eagle too?”
- “Beacon active nearby”
- “Ticket handoff for tonight”
- “Crossed recently”
- “Care handoff requested”

Decay rules:

- live context may be explicit while active
- expired context softens into non-reconstructive language
- old location/proximity must not remain replayable
- commerce evidence survives only as required by D28 and D22
- care context is minimised and user-controlled

A thread must not become a permanent movement diary.

---

## §7. Notifications

Notifications are part of messaging doctrine.

Allowed notification reasons:

- direct reply
- active handoff update
- ticket transfer change
- safety escalation
- care confirmation
- event logistics update
- user-enabled beacon reply

Forbidden notification patterns:

- engagement farming
- “someone is nearby” without user opt-in
- “you are getting attention” loops
- partner promo blasts disguised as messages
- repeated reply nags
- shame-based unread language
- push copy that reveals sensitive context on lock screen

Notification copy must be privacy-safe when seen by someone else.

---

## §8. Blocking, Muting, Reporting, and Exit

Every message surface must provide an exit path.

Minimum controls:

- mute
- block
- report
- leave temporary thread where safe
- hide expired context
- delete local view where retention law allows
- safety escalation when harm is present

Rules:

- blocking suppresses future contact across relevant surfaces
- muting never lowers trust
- non-response never lowers trust
- reporting does not notify the reported user
- exiting a care thread must not punish the user
- safety threads may retain audit evidence even if user-facing view closes

No dead-end chats.

---

## §9. Commerce and Ticket Messaging

Commerce messaging exists to coordinate handoff, not to perform marketplace theatre.

Allowed verbs:

- passed on
- sorted
- covered
- claimed
- going together
- heading there
- picked up
- handed over

Forbidden verbs in user-facing resolution language:

- sold
- buyer
- seller completed
- order complete
- transaction complete
- customer
- checkout conversation

D19 remains binding. D28 will govern refunds, cancellations, reversals, and evidence windows.

---

## §10. Care and Safety Messaging

Care messages must never sound like moderation, punishment, or conversion copy.

Care messaging rules:

- user agency first
- plain language
- no diagnosis
- no shame
- no forced disclosure
- no permanent care label in Presence
- no partner/operator access unless explicitly consented

Safety messaging rules:

- SOS overrides all lower messaging surfaces
- trusted-contact flows do not expose ordinary chat history
- abuse reports are not debated in chat
- escalation evidence is access-controlled

Care is information and services. Safety is escalation. Neither is social scoring.

---

## §11. Schema Consequence

Messaging requires classed threads and bounded context.

Required fields/classes:

- `thread_class`
- `context_type`
- `context_id`
- `context_expires_at`
- `retention_class`
- `visibility_scope`
- `participant_presence_ids`
- `safety_escalation_state`
- `handoff_resolution_state`
- `last_context_label`
- `decayed_context_label`

Forbidden schema patterns:

- one unclassified `messages` blob for all purposes
- permanent exact-location context in thread metadata
- Legal/Safety/Recovery joins in normal chat queries
- unread/reply metrics used as desirability ranking
- public message counts as prestige

---

## §12. Retention Impact

Messaging inherits D22.

Retention classes:

- **Trajectory:** live context; short-lived and decays.
- **Continuity:** lightweight thread continuity; enough to resume a human conversation.
- **Evidentiary:** disputes, abuse, payment/ticket handoff evidence; bounded by D28/legal need.
- **Care:** minimised, user-controlled where possible, safety-audited where necessary.
- **Atmosphere:** aggregate-only; never reconstructive.

A user may delete or hide local continuity where legal/evidentiary duties allow. Deletion does not erase active safety or legal evidence while required.

---

## §13. Instrumentation

Allowed aggregate instrumentation:

- thread class creation count
- handoff completion rate
- temporary thread decay completion
- mute/block/report aggregate rate
- notification open aggregate by class
- care flow completion aggregate
- abandonment by surface

Forbidden instrumentation:

- replayable message timelines for growth analysis
- desirability scoring from reply rates
- ranking users by response speed
- partner access to message analytics tied to identity
- permanent movement reconstruction from thread context

Observation must improve safety, flow, and coherence — not attention extraction.

---

## §14. Acceptance Test

A build fails D25 if:

1. any thread has no declared class;
2. a user can receive unsolicited proximity-based DMs;
3. Legal, Safety, or Recovery identity appears in ordinary chat;
4. non-response, mute, or pseudonymity reduces user standing;
5. a temporary thread preserves exact context after expiry;
6. marketplace chat uses buyer/seller/order/transaction language;
7. notifications reveal sensitive context on lock screen;
8. a user cannot block, mute, report, or exit where safe;
9. message metrics feed desirability ranking;
10. care messaging becomes coercive, diagnostic, or status-producing.

---

## §15. Failure Mode If Violated

If D25 is violated, HOTMESS becomes another inbox trap: attention pressure, unsafe proximity, commerce theatre, and permanent context masquerading as connection.

The product will start rewarding reply speed, punishing silence, leaking identity, and turning nightlife ambiguity into surveillance.

That is structurally unacceptable.

---

## §16. Final Operating Sentence

**Contact should move the moment forward, then know when to quiet down.**

That is the entire messaging doctrine compressed.