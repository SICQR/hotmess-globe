# D31 — Venue & Partner Power Doctrine

**Status:** canonical. Established 2026-05-31.
**Inherits from:** D08 (Visibility), D14 (Routing), D15 (Care Language), D17 (Surface Layer), D19 (Marketplace), D20 (Identity), D21 (Payment & Payout), D22 (Temporal), D33 (Memory & Permanence).
**Inherited by:** any future doctrine introducing a third-party operator role.

---

## §0 Why this doctrine exists

HOTMESS has already begun seeding curated venue presence on the globe — gyms, saunas, aftercare points, district editorials. So far, every curated presence has been platform-authored. There is no operator role with platform write access, no partner dashboard, no venue self-service.

Before either of those exists — before HOTMESS onboards its first external operator — the constitutional limits of operator power must be set. If they are set after the first operator is live, the negotiation becomes commercial rather than doctrinal, and the platform's posture toward operators is whatever the first commercial conversation ends up being. That is the wrong way to establish the boundary.

D31 sets the boundary now, while it is cheap. It defines:

- What operators may know about users.
- What operators may demand from the platform.
- What operators may receive at settlement.
- What operators may not, under any pressure, ever obtain.

The single sentence: **operators inherit reach, never reconstruction.**

---

## §1 The operator category

An operator is any third-party entity granted a structured role inside HOTMESS that allows them to:

- Surface a venue, event, or service on the platform.
- Receive settlement through the platform's payment substrate (D21).
- Receive notifications or signal routed through the platform.
- Interact with users through a partner-side surface.

D31 governs the substrate-level constitutional limits on all four. It does NOT yet specify the operator UI, the onboarding flow, or the commercial terms of partnership — those are downstream of the doctrinal limits.

D31 does NOT govern:

- Anthropic-style sub-processors of platform infrastructure (Vercel, Supabase, Stripe, Resend). Those are infrastructure providers operating under D33 substrate constraints, not partner operators with user-facing reach.
- Users who happen to also run businesses. A user account is governed by D20 regardless of whether the human behind it owns a venue. Becoming an operator requires explicit onboarding into the operator role.
- Internal HOTMESS team members. Those are governed by employment contract and the audit-logged operator-correction paths in D33 §3.4 / D21 §3.4.

---

## §2 The operator-incapability commitments

Mirroring D33's substrate-incapability pattern at the operator layer. An operator role is D31-compliant when it satisfies all five of:

**§2.1 — No user-list export.** An operator cannot export a list of users associated with their venue, event, or service. Not for "marketing," not for "verification," not for "remarketing," not for "loyalty programs." The substrate does not produce such a list because the columns required to construct it (per-user attribution to a specific operator) do not exist outside regulated settlement (which is locked per D21 §3.4 and not operator-accessible).

**§2.2 — No live user-presence stream.** An operator cannot receive a real-time feed of which users are present at their venue. They can receive aggregate atmospheric reads ("how many people are checking the area right now") through the same atmospheric read functions any future surface uses. Individual presence is never operator-accessible.

**§2.3 — No identity-binding through operator channels.** When a user converges through an operator-anchored beacon (a ticket to the operator's event, a preloved handover at the operator's space), the operator does not learn the user's Presence Identity unless the user has deliberately disclosed it through a separate user-initiated act. Convergence routing through an operator's surface inherits D20 identity symmetry — the operator sees the surface from the same Presence Identity layer the paying user sees, not a richer one.

**§2.4 — No moderation override.** An operator cannot remove a user from the platform, downrank them, hide them, or restrict their visibility. Moderation is platform-internal and audit-logged per D33 §3.4. An operator can flag, refuse service, or block individual interactions at their own venue surface, but the user's platform identity is not theirs to alter.

**§2.5 — No data-portability demand on user behalf.** A user can request their own data via existing user-side flows. An operator cannot request "all our customers' data" via partnership. The substrate does not produce that aggregate because it does not exist (per §2.1).

Each commitment is enforced at a different layer:
- §2.1 — substrate column absence + D33 inheritance.
- §2.2 — read-function granularity (aggregate-only).
- §2.3 — D20 identity symmetry inherited through operator surfaces.
- §2.4 — moderation surface scope (platform-internal).
- §2.5 — substrate shape (no per-operator user attribution column).

---

## §3 What operators may have

D31 binds the absence list above. It also affirms what operators may have — explicitly, so the partnership conversation is concrete rather than only restrictive.

**§3.1 — Surface placement.** A venue may render on the globe with district / time / atmospheric context. An event may render as a beacon. A service may render on Care or Market surfaces. The placement obeys the surface's own doctrine (D08, D14, D17, D19, etc.) and does not get bypass privileges.

**§3.2 — Atmospheric reads.** An operator dashboard may read aggregate counts: "how many handoffs have settled near your venue last week," "what mix of beacon kinds is moving through your district," "what time-of-day band is busiest." These are atmospheric residue reads (per D33 §6), aggregated over a window, with no per-user identifiability.

**§3.3 — Settlement to the operator's Stripe account.** When a beacon anchored at an operator's surface resolves with money flow, the operator receives the net via Stripe (per D21 §6.3). The regulated settlement row exists in the regulated schema; the operator sees the same Stripe Express dashboard a peer user sees — no richer view than that.

**§3.4 — Operator-side communication with handoff parties.** Operators may communicate with users who have converged on their surface through the same chat substrate users use with each other — Presence-Identity-symmetric, mutual-consent-gated, with D34 trajectory decay applied identically. Operators do not get a "broadcast to all attendees" channel that bypasses D34. Mass communication is forbidden by the chat substrate's per-pair shape.

**§3.5 — Editorial control over their own surface.** An operator may set their venue's name, description, hours, photo, accessibility info, and the editorial copy that renders inside the venue's place card. Within HOTMESS's tone guidance (D15), they are the author of their own surface.

**§3.6 — Refusal of service at their own surface.** An operator may decline to honour a specific handoff at their venue (e.g., the venue is full, the ticket is no longer valid). This is a per-handoff refusal, not a platform-wide block. The refused user is notified through standard surfaces; the operator's refusal does not propagate into the user's platform identity.

---

## §4 The operator-side substrate

When the first operator role ships, it requires:

**§4.1 — An operator entity.** A separate table from `users`. Operator accounts are not user accounts with a flag; they are a different category. This prevents accidental "operator privileges leak into user surfaces" drift.

**§4.2 — A per-operator surface ownership table.** Maps operator entities to the venues / events / services they own. Locked write path through operator-onboarding flow + operator-side admin flow, both audit-logged.

**§4.3 — A per-operator Stripe linkage.** Stripe Connect Express account for the operator, same shape as the peer-settlement linkage in D21 §7. No platform-side balance; Stripe is source of truth.

**§4.4 — An audit-logged operator action table.** Every operator-side write — surface edit, Stripe linkage change, refund initiated, refusal recorded — is logged in an append-only audit table that the operator cannot rewrite. This is the operator-layer equivalent of D33 §3.4's audit log for platform-internal corrections.

**§4.5 — No per-operator user attribution table.** This is the absence that makes §2.1 + §2.5 structural. There is no table that maps users to operators. When a user attends an operator's event, no row anywhere in the substrate records "user X attended operator Y's event." The regulated settlement table (D21) records that user X transacted with operator Y for a specific amount on a specific date, because regulation requires that, and the operator can see their own side of that transaction through Stripe. The aggregate atmospheric residue records that handoffs of kind K settled in venue class V during hour H. Nothing else is recorded, by construction.

---

## §5 Operator identity and verification

Operators are verified differently from users. The verification serves a different constitutional function: not to bind identity for the platform's purposes (D20 explicitly forbids that for users), but to give peer users the safety of knowing that a venue rendering as "The Eagle, Vauxhall" is operated by the actual Eagle, Vauxhall.

**§5.1 — Operator verification renders as surface attestation, not as a badge on individuals.** A venue's place card may carry an "Operated by [verified business name]" line. No individual person at the operator side carries a verification badge on their personal HOTMESS profile (because that would re-introduce the chrome D20 §5.3 forbids on profile surfaces).

**§5.2 — Operator legal identity persists in a regulated schema.** Per D21 §2.1 patterning. Tax / AML / consumer-protection grade. Operator-side reads through operator dashboard, with the same operator-audit-log discipline as in §4.4.

**§5.3 — Verification revocation is platform-side.** If an operator is removed from the verified set (for safety or compliance reasons), the surface attestation is removed. Atmospheric reads still work; settlement still flows through Stripe per Stripe's policies; the operator's role on the platform is governed by the operator-side terms of service.

---

## §6 The mass-communication ban

This deserves its own section because it is the temptation operators will press against hardest.

**§6.1 — Operators may not broadcast to "all attendees of event X."** The chat substrate does not produce such a list (per §2.1). Even if an operator could enumerate attendees (which they cannot), there is no platform-provided broadcast channel.

**§6.2 — Operators may not push notifications to anyone outside their per-handoff chats.** The notification dispatcher (the existing one) routes platform-originated notifications. Operators may not inject content into that stream. If an operator wants to reach a user who is not currently in a per-handoff chat with them, the answer is: they cannot.

**§6.3 — Operators may publish to their own venue's editorial surface.** A new event, a venue update, an aftercare resource — these render on the venue's surface and are discovered by users when users navigate there. The push direction is user-pulls, not operator-pushes. This preserves D34 anti-gamification and D14 anti-density-trap discipline.

**§6.4 — Mass-communication exception: SOS routing.** Operators in safety-relevant roles (e.g., a venue that has opted into being a safety partner) may RECEIVE platform-originated SOS routing, scoped to events occurring at their venue, with explicit user consent at the moment of SOS escalation. This is platform-to-operator, not operator-to-user, and it is gated by per-user consent at the time of the SOS, not at the time of operator onboarding.

---

## §7 Operator economic relationship

D21 §9 (platform fees) applies to operator settlement identically. D31 adds:

**§7.1 — No operator-tier "premium" features that erode constitutional commitments.** An operator cannot pay more to receive identity-bearing data. Cannot pay more to broadcast. Cannot pay more to surface-rank above other operators. Cannot pay more to access individual user attribution.

The doctrinal answer to "can we offer a Pro tier with attendee analytics?" is no, regardless of fee. The substrate does not produce attendee analytics.

**§7.2 — Operators may pay for legitimate surface enhancements.** Higher-resolution venue photos. Multi-photo editorial galleries. Featured placement in district editorials (with explicit "Featured" disclosure per D17 surface-layer honesty). Extended atmospheric read windows on their dashboard. These are surface or read-window features; none of them changes substrate shape.

**§7.3 — The fee structure is published.** Per D21 §9.2. The operator-tier price list lives at a public URL.

**§7.4 — No revenue share that depends on per-user behaviour.** A "you receive X% per user who attended" arrangement requires per-user attribution, which §2.1 + §4.5 forbid. Operator revenue is a function of settlement volume (which exists in regulated form per D21) and surface-tier (which is flat), nothing else.

---

## §8 The acquisition / sale of operator-side data

This is the boardroom temptation D33 §13 named, applied to the operator layer.

**§8.1 — Operator-side data is not sold.** Aggregate atmospheric residue could be sold (it is aggregate by D33 construction). It is not, because §7.4 binds: operator revenue is settlement volume + flat surface tier, not data licensing. Introducing data licensing would require a constitutional change, not a feature flag.

**§8.2 — Operator-side data is not shared with third parties.** Not ad networks, not analytics providers, not loyalty platforms, not insurance underwriters. Operators receive their own aggregate dashboard; nothing leaves the platform's substrate to a third party.

**§8.3 — The substrate makes this hard to undo.** Because the per-user attribution table does not exist (§4.5), the only data that COULD be shared is the atmospheric residue, which is already aggregate. The aggregate is bounded by D33 §1.1. There is nothing identity-bearing to share even if a future operator wanted to.

---

## §9 Acceptance test for any D31 implementation PR

When the first operator role ships, it must answer the D33 §9 seven-question test + the D21 §11 seven-question test (because operators are also settlement counterparties), plus these D31-specific questions:

§9.1 — Show the operator entity table schema. Confirm operators are a separate category from users.

§9.2 — Show that no table maps users to operators outside the regulated settlement table. Specifically: no `attendance` table, no `customer_list` table, no `event_attendees` table, no `operator_user_xref` table.

§9.3 — Show the operator dashboard's read paths. Confirm every read returns aggregates over a window or surface-owned editorial content. No path returns per-user attribution.

§9.4 — Show the operator audit log table and the write paths into it. Confirm append-only and operator-inaccessible.

§9.5 — Show the verification surface attestation. Confirm no badge appears on any individual person's profile as a side effect of operator verification.

§9.6 — Show the mass-communication ban in the chat substrate. Confirm there is no operator-broadcast endpoint, no operator-push endpoint, no operator-injected notification channel.

§9.7 — If the PR introduces an operator-tier "Pro" feature, show its scope is surface or read-window. Confirm it does not provide per-user attribution, broadcast capability, or moderation override.

A D31 implementation PR without all seven answers in the description does not ship.

---

## §10 Drift indicators specific to D31

In addition to D33 §10 and D21 §12:

- A `venue_attendance` or `event_attendees` table proposed for "loyalty programs."
- An operator dashboard that lists users by name or handle.
- A "premium operator tier" that includes per-user analytics.
- An operator-side "send to all attendees" button.
- A verification badge appearing on a peer user's profile because they work for a verified operator.
- A revenue-share arrangement that meters per-user behaviour.
- An operator-API export endpoint that returns rows per user.
- A "we'll just give the operator a CSV once a month" workaround.
- Any data-sharing arrangement with an ad network, analytics provider, or loyalty platform.

Each is an audit moment. Revert and refactor.

---

## §11 Boardroom test framing

For non-engineering stakeholders considering D31 under operator-acquisition pressure:

- "The Eagle wants a list of their regulars" — Cannot produce. The substrate does not contain such a list (§2.1, §4.5). Offer aggregate atmospheric reads instead.
- "Can we sell a Pro tier with attendee analytics?" — No (§7.1). The substrate does not produce attendee analytics.
- "An events platform wants to integrate with us" — Aggregate reads through a documented read API are possible (per §3.2). Per-user data is not.
- "A safety partner wants live presence routing" — Per-handoff routing only, at the moment of an SOS event, with user consent at that moment (§6.4). Not a general presence stream.
- "An acquirer is asking what operator data we have" — Aggregate atmospheric residue per operator's region; nothing else. The substrate cannot retroactively manufacture identity-bearing data because the columns do not exist.
- "A council wants attendance data for licensing" — Refer them to the operator (who has Stripe-side data) or to platform-aggregate reads (which do not identify users). The platform itself cannot produce per-user attendance.

---

## §12 D15 inheritance — operators speak in HOTMESS tone

Per D15 Care Language. Operator-authored editorial copy on platform surfaces obeys HOTMESS tone guidance: anti-clinical, anti-corporate, care-forward. Operators are not granted a chrome-heavy surface within HOTMESS just because they are partners. Their venue surfaces look like every other surface, with their editorial content inside.

**§12.1 — No operator branding chrome.** The operator's name renders on their surface; their logo does not unless explicitly invited by the editorial template. No operator-controlled top bar, no operator-coloured background, no operator-watermarked images.

**§12.2 — Operator-authored copy is tone-reviewed.** Onboarding includes tone alignment. Repeat violations of D15 surface in the operator audit log and trigger surface-attestation review (§5.3).

---

## §13 Forward inheritance into care partners

A sub-category of operator — care partners — has additional constitutional weight because of HOTMESS's recovery-advocacy posture. When a future doctrine introduces formal care-partner role (e.g., AA chapters that host meetings, recovery-focused saunas, harm-reduction outreach orgs), D31 applies in full, plus additional D15 inheritance and an explicit non-extraction commitment: care partners do not receive data, monetary or informational, that could be used to commercially target people in recovery. This is named here so the future doctrine does not need to re-derive it.

---

## §14 Naming and references

- **The operator entity table** lives in a `partner` schema (to ship). Separate from `users`, locked write paths.
- **The operator audit log table** is the authoritative log of operator-side actions.
- **The verification surface attestation** renders only on operator-owned venue surfaces, never on individual profiles.
- **The operator atmospheric dashboard** is the read surface — aggregates only, per D33 inheritance.

Reference for inheritance:
- `docs/doctrine/33-memory-permanence-doctrine.md`
- `docs/doctrine/21-payment-payout-doctrine.md`
- `docs/doctrine/20-identity-doctrine.md`
- `docs/doctrine/15-care-language-doctrine.md`

---

## §15 What ships next

D31 is now a written constitutional commitment. No operator-role code lands without inheriting it.

The first implementation work, when scoped:

1. **Slice 1 — Operator entity scaffold.** Migration establishing the `partner` schema and the operator entity table. No UI.
2. **Slice 2 — Per-operator surface ownership.** Table mapping operators to venues/events they own. No UI.
3. **Slice 3 — Operator Stripe Connect linkage.** Inherits D21 §7 patterns. No UI.
4. **Slice 4 — Operator audit log table.** Append-only, operator-inaccessible.
5. **Slice 5 — Operator dashboard read surface.** Aggregate-only reads. Per-operator atmospheric residue function.
6. **Slice 6 — Verification surface attestation.** Surface-side render only.

Each slice ships independently. Each PR answers the D33 §9 + D21 §11 + D31 §9 acceptance tests in full.

---

## §16 Closing

HOTMESS will partner with venues, events, and services. The partnership will not be the route by which surveillance retention enters the platform.

The substrate-incapability pattern applies at the operator layer too: operators inherit reach (surface placement, settlement, communication with handoff parties) but never reconstruction (no user lists, no presence streams, no identity binding, no moderation override, no portability on user behalf). The five §2 commitments are independently load-bearing; the absence of the per-user attribution table (§4.5) is the structural pin that makes the rest enforceable.

Operators will press against §6 (mass communication) hardest, because every venue's commercial instinct is to reach attendees in bulk. The constitutional answer is that HOTMESS is not a venue's CRM, and the substrate does not produce a CRM-shaped dataset. Users discover venues; venues do not retain users.

D31 is the boundary the platform inherits before its first commercial partner negotiation, so that negotiation is constitutional rather than improvised.
