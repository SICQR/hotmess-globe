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

---

## §17 Scoped continuity vs portable extraction (amendment, 2026-05-31)

### §17.0 Why this amendment exists

D31 as originally written §1–§16 was correct about what venues must not become — extractive identity owners with platform-wide audience portability — but the wording risked over-rotating into "venues must be stateless." Specifically §4.5's "no per-operator user attribution table" reads as forbidding venues from knowing their own community, and §6's mass-communication ban combined with §2's incapability commitments could be interpreted as forbidding any venue-scoped continuity at all.

That interpretation would break the reality of nightlife operations and make the venue economy commercially unviable. Queer nightlife is **relational infrastructure**. Saunas have regulars. Promoters have communities. Recovery spaces remember returning attendees. Trusted door staff recognise familiar faces. A doctrine that erased that erased the texture HOTMESS exists to protect.

The real constitutional commitment was always anti-portability, not anti-memory. This amendment makes the distinction explicit so the substrate engineering follows the right line.

The single sentence: **operator continuity is allowed; operator ownership is not.**

### §17.1 The constitutional line

**Allowed (scoped continuity):**

- Recurring members of a venue's community
- Known regulars inside a venue's relationship boundary
- Venue-scoped member tiers (guestlist, founding members, host roster, recurring crew)
- Continuity of atmosphere across nights, seasons, scene cycles
- Ongoing operational relationships between venue staff and members
- Local event history at the venue
- Per-venue attendance aggregates (within venue scope)
- Atmosphere telemetry for the venue's own surface
- Local moderation tooling at the venue's surface
- Venue-only messaging surfaces (Operator-mode chat per D25 §20.6)
- Venue-scoped badges and roles (member, host, regular crew, founding patron)
- Staff coordination and check-in systems
- Ticket state and event-day logistics
- Care and safety tooling at the venue
- Returning-crowd patterns inside venue analytics
- Community memory: "this person has been with us since opening night"

**Forbidden (portable extraction):**

- Exportable user graphs (no CSV, no API export of member list)
- Cross-property behavioural portability (no synthesising HOTMESS member status with operator-side data outside the platform)
- Off-platform CRM extraction (no Mailchimp sync, no HubSpot integration, no Salesforce export)
- Persistent audience ownership outside the platform substrate
- Identity resale or data licensing
- Surveillance continuity (no behavioural replay over time used for ad targeting or trait inference)
- Hidden partner dossiers (no "what we know about this user" surface beyond what the user has consented to within the venue boundary)
- Cross-venue user stitching ("people who attend Venue A also attend Venue B" platform-side recommendation surface)
- Hidden behavioural dossiers beyond venue-scoped operational data
- Venue-owned trust scoring (per D24 §11.4 inheritance — trust is per-pair, never per-venue-attribution)
- Meta/Google ad audience export
- Off-platform user-graph sale or licensing

The line is not "venues can know nothing." The line is **what venues know cannot leave the venue's constitutional boundary, and cannot synthesise into platform-wide user identity.**

### §17.2 The substrate shape

§4.5 stated "no per-operator user attribution table." The corrected reading: **per-venue membership substrate is permitted; cross-venue aggregation and off-platform export are forbidden.**

The substrate shape:

- **§17.2.1 — Per-venue membership table is allowed.** Lives in the `partner` schema (per D31 §4.1) under the specific venue's namespace. Schema is owned by the venue's operator entity. Records who is a member, their member tier, their join date, their last visit, their recurring status.

- **§17.2.2 — Cross-venue isolation is enforced at the schema layer.** A query that joins `partner.venue_A.members` with `partner.venue_B.members` is refused at the substrate level. The schema design makes the join physically impossible without an `ALTER` that crosses two operator entities' grants. That ALTER is a doctrinal review per D33 §1.2 + D33 §4.2.

- **§17.2.3 — Read paths are venue-scoped.** The operator dashboard reads from its own venue's namespace through the operator audit-logged path (D31 §4.4). The substrate refuses cross-venue queries.

- **§17.2.4 — No platform-wide "operator-known users" view.** No surface, function, or report aggregates membership across operators. The atmospheric residue (D33) continues to hold only aggregate counts; per-user attribution lives only inside each venue's namespace, never platform-wide.

- **§17.2.5 — Export is forbidden at the API layer.** No endpoint returns a CSV, JSON list, or paged result of member identifiers outside the platform's surface. The operator views their members through the operator dashboard; they do not download them.

- **§17.2.6 — Off-platform sync is forbidden.** No integration with Mailchimp, HubSpot, Klaviyo, Meta Business Manager, Google Ads, or any other off-platform CRM/ad system reads from the per-venue membership substrate. Adding such an integration is a constitutional change requiring a new doctrine.

- **§17.2.7 — User consent constitutes membership.** A user becomes a member of a venue's community through an explicit opt-in action ("this is one of my places" / "save this venue" / "follow the line-up here"). Attendance alone does not create membership; the consent is the constituting event.

- **§17.2.8 — User can leave at any time.** The membership record is user-retractable per D24 §3.6 retraction semantics. Walking back consent removes the record from the venue's substrate immediately.

### §17.3 The "this is one of my places" framing

The user-facing language for membership is **"this is one of my places"** or equivalent D15-tone language. Not "follow this venue," not "subscribe," not "loyalty program member." The semantic is belonging, not subscription.

A user's profile may surface "my places" as a private surface visible to the user. It is not surfaced publicly to other users — per D24 §7.3 cross-user reputation surfaces are forbidden. The user can see their own places; the venue can see its own members; no surface joins those two views into a platform-wide map.

### §17.4 What venue dashboards may render

The venue dashboard is **Venue OS**, not CRM software. The framing matters because it determines what features the operator surface invites and what it refuses.

**Allowed dashboard categories:**

- **Live operational intelligence.** Tonight's energy, current capacity, atmospheric reads for the next hour, weather/transit impact on the venue's catchment.
- **Atmosphere telemetry.** Aggregate signal density at the venue's surface, returning-crowd patterns, time-of-week patterns, season patterns. All aggregate per D33.
- **Community continuity.** Member count, member tier breakdown, recurring-attendance aggregates, founding-member cohort recognition.
- **Scoped relationship management.** A list of the venue's members (per §17.2.1), member tiers, last-visit timestamps, recurring status. No cross-venue join, no off-platform sync.
- **Event operations.** Ticket state, guestlist state, check-in tooling, staff coordination, capacity management.
- **Care and safety tooling.** Sober space coordination, aftercare resource availability, safety partner pairing per D24 §3.4, incident logging through the audit-log path.
- **Editorial control.** Venue surface copy, hours, photos, accessibility info per D31 §3.5.

**Forbidden dashboard categories:**

- **Audience export tools.** No "download CSV of attendees," no API export, no third-party integration.
- **Ad-targeting systems.** No "build a Meta audience from your members," no segmentation tool that produces a portable list.
- **Cross-venue analytics.** No "users who attend your venue also attend X" surface; that requires cross-venue data joining which §17.2.2 forbids.
- **Hidden user dossiers.** No surface showing "what we know about this member" beyond the venue-scoped operational data the user has consented to.
- **Venue-owned trust scoring.** Per D24 §11.4 — trust is per-pair, not per-venue.
- **Predictive churn / re-engagement automations.** Per D32 §4.2 + §4.7 — no model-derived "users likely to lapse" surface, no automated re-engagement push.

### §17.5 Operator-mode messaging extension

D25 §20.6 Operator mode is "purpose-scoped; no CRM continuity; no portable per-user thread access." The amendment refines this:

- **§17.5.1 — Operator-mode messaging is scoped to specific handoffs (existing).** Per the original D31 §3.4. A chat exists for the handoff and resolves with the handoff.
- **§17.5.2 — Venue-scoped community messaging is allowed at the venue's surface.** A venue may publish to its own community-feed surface (per D31 §3.5 editorial control) — a curated, slow, low-frequency stream that members of the venue can choose to subscribe to. The substrate is the venue's editorial surface, not the per-pair chat substrate.
- **§17.5.3 — Members opt into the community feed explicitly.** Default-off. The opt-in is co-located with the "this is one of my places" affordance from §17.3.
- **§17.5.4 — Venue community feed is not chat.** No reply threads, no per-user response, no DM injection. It is publish-only from the venue side, read-only on the user side. Per D31 §6.3 reframing: users pull from the venue surface; the venue does not push to user DMs.
- **§17.5.5 — Rate-limited.** Per D34 anti-density-trap. The venue community feed has hard rate limits (e.g., maximum 2 posts per week) enforced at the substrate layer.

### §17.6 Care-partner inheritance (§13 expanded)

D31 §13 introduced care partners with an additional non-extraction commitment. The amendment specifies:

- **§17.6.1 — Care-partner operators may steward continuity for active care relationships.** A recovery space remembering its returning members is the same shape as a club remembering its regulars — scoped, consented, non-portable.
- **§17.6.2 — Care-partner-side data has stricter export and visibility constraints.** No analytics surface, no member-list view beyond active care-role-paired members per D24 §3.3. Aggregate counts only for non-pair-bound members of the care partner's community.
- **§17.6.3 — Care-partner roles cannot pivot to commercial recommendation.** A care partner cannot publish "members of our community also visit X" or surface paid recommendations. The constitutional non-extraction commitment from §13 stacks on top of §17 for care contexts.

### §17.7 Reconciliation with §4.5

§4.5 as originally written read: "No per-operator user attribution table. This is the absence that makes §2.1 + §2.5 structural."

**Corrected reading:** "No platform-wide per-operator user attribution surface. Per-venue membership tables are allowed within the operator's constitutional boundary per §17. The structural pin is cross-venue isolation (§17.2.2), platform-wide aggregation absence (§17.2.4), and export/sync prohibition (§17.2.5–§17.2.6), not the absence of all venue-side knowledge."

§4.5 stays in the doctrine as written for historical fidelity; the corrected reading lives in §17.7. A future revision may inline §17.7 into §4.5 directly; for now the amendment pattern preserves the audit trail.

### §17.8 Acceptance test extension

D31 §9 + §17-specific:

§17.8.1 — Show the per-venue membership table schema. Confirm it lives in the venue's operator namespace within `partner`.

§17.8.2 — Show the cross-venue isolation. Confirm grants are scoped per operator entity; demonstrate a join across two venues' member tables fails at the substrate.

§17.8.3 — Show the export path absence. Confirm no API endpoint returns a portable member list.

§17.8.4 — Show the off-platform sync absence. Confirm no integration with Mailchimp, HubSpot, Meta, Google, or equivalent reads from the membership substrate.

§17.8.5 — Show the user consent flow that constitutes membership. Confirm attendance alone does not create a member record.

§17.8.6 — Show the user retraction surface. Confirm members can leave at any time and the record is removed.

§17.8.7 — Show the venue community feed (if implemented). Confirm publish-only, rate-limited, opt-in default-off.

§17.8.8 — Show the dashboard surfaces. Confirm allowed categories (§17.4 allow-list) are present; confirm forbidden categories (§17.4 forbid-list) are absent.

A PR introducing venue-side continuity features without all eight answers does not ship.

### §17.9 Drift indicators specific to §17

In addition to §10 and the inherited drift indicators:

- A "download members CSV" button on a venue dashboard.
- A Mailchimp / HubSpot / Klaviyo / Meta Business Manager / Google Ads integration touching membership data.
- A cross-venue aggregation surface ("members who also belong to X").
- A "predict churn" or "re-engagement automation" model invocation on membership data.
- A platform-wide "operator-known users" report or admin surface.
- A "venue trust score" assigned to individual members.
- A community feed that becomes reply-able, DM-injectable, or rate-limit-bypassed.
- A per-venue API key that returns member identifiers.
- A "venue-side ad targeting" surface, however small.
- A foreign key joining `partner.venue_A.members` to `partner.venue_B.members`.
- A consent-bypass admin tool that adds members without their opt-in.

Each is an audit moment. Revert and refactor.

### §17.10 Boardroom test framing (updated)

The §11 boardroom test framings stand. Adding the §17 territory:

- "Can a venue see its regulars?" — Yes. §17.1 + §17.4 allowed-list bind.
- "Can a venue export its member list?" — No. §17.2.5 binds.
- "Can a venue sync members to Mailchimp?" — No. §17.2.6 binds.
- "Can a venue see which other venues its members attend?" — No. §17.2.2 cross-venue isolation binds.
- "Can a venue offer a 'founding member' tier with perks?" — Yes, venue-scoped. §17.1 allowed-list. The perks must be venue-internal; they cannot be cross-venue or platform-wide.
- "Can a venue publish a weekly community update to its members?" — Yes, through the community feed (§17.5), opt-in, rate-limited, publish-only.
- "Can a venue DM all its members about a special night?" — No. §17.5.4 + D31 §6 mass-communication ban bind.
- "Can a venue do 'people who attend your venue also like X' recommendations?" — No. §17.4 forbidden-list binds.
- "Can a recovery space remember who its returning members are?" — Yes. §17.6.1.
- "Can a recovery space publish recommendations to its members for paid services?" — No. §17.6.3 binds.

### §17.11 The strategic framing

The corrected commitment is HOTMESS's strongest commercial differentiator against traditional nightlife SaaS:

**Community continuity without extractive ownership.**

That is a position no traditional CRM-based nightlife platform can occupy. The traditional model (Eventbrite, RA, Resident Advisor, Dice, Posh) builds the venue's value by becoming the export layer — the venue gets access to its audience by extracting it through the platform. HOTMESS inverts this: the venue's value comes from the platform's commitment that its community lives inside the venue's constitutional boundary and cannot be extracted by anyone, including the venue itself, including HOTMESS, including future acquirers.

A queer venue choosing HOTMESS over Eventbrite is not choosing fewer features. It is choosing **the only platform where its community continuity cannot become someone else's audience asset.** That is the moat at the operator layer.

### §17.12 Closing

The original D31 was right about what venues must not become and risked being wrong about what they must remain capable of. The amendment corrects the over-rotation without touching the constitutional commitment.

Venues may steward continuity inside their constitutional boundary. They may remember their regulars, host their members, recognise returning attendees, run their nights, publish to their community feed, coordinate their staff, and operate their care infrastructure. They may not export that continuity, may not sync it off-platform, may not synthesise it across venues, may not weaponise it for ad targeting, may not sell it, and may not lose it to an acquirer.

The constitutional line is **scoped continuity vs portable extraction.** Inside the venue's constitutional boundary, continuity is the texture queer nightlife requires. Outside that boundary, extraction is the harm the platform refuses to enable.

Queer nightlife is relational infrastructure. The platform supports "this is one of my places." It does not support "this venue owns my behavioural identity." That is the corrected commitment.
