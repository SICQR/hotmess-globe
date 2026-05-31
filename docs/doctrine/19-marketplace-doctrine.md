# D19 — HOTMESS Marketplace Doctrine

**Preloved + Event Ticket Resale. Canonical system policy v1.**

**Status:** Locked
**Written:** 2026-05-31
**Author:** Phil
**Cross-references:** D02 (Membership Entitlement), D08 (Visibility State), D09 (Onboarding Truth), D11 (Arrival State), D12 (Drop Beacon), D14 (Routing Continuity), D15 (Care Language), D17 (Surface Layer), D18 (Product Sheet Layout).

---

## §0. Sacred Operating Rule

HOTMESS does not optimise for maximum transaction volume. HOTMESS optimises for trust, continuity, safer nightlife participation, local culture, queer community infrastructure, and legitimate redistribution.

**If growth mechanics conflict with trust and safety: trust wins.**

This rule sits above every other rule in this document. Any subsequent clause that conflicts with it is wrong by construction.

---

## §1. Presence Integrity

Marketplace activity must never reconstruct or imply live presence for users who are off-grid.

D08 protects visibility. D19 protects behavioural inference. Commerce surfaces cannot become a side-channel around D08. If they do, the dignity floor breaks.

Prohibited (for any seller in any visibility state other than `public`):
- "active now"
- "online seller"
- "last active …"
- "responds quickly"
- "recently viewed"
- "seller nearby"
- typing indicators on marketplace chat
- "active 2m ago" / "active today"
- any read-receipt that exposes time of view
- inferred presence from listing-edit timestamps
- inferred presence from new-listing creation

Where a seller's visibility allows presence, marketplace presence is read from the same canonical visibility snapshot as Pulse and Ghosted (`get_renderable_beacons_for_viewer` / equivalent). Marketplace does NOT compute its own presence.

This clause is binding above any UX request that asks for "seller activity signals." Future contributors: do not ship them.

---

## §2. System Thesis

HOTMESS commerce is not generic ecommerce. Preloved and Ticket Resale exist to extend queer nightlife culture safely, locally, and socially — not to create anonymous extraction marketplaces.

The system is built around:
- proximity
- trust
- accountability
- nightlife continuity
- identity persistence
- safer exchanges
- community legitimacy

Every listing, seller, ticket, and exchange is connected to:
- a persistent identity
- a live social layer (subject to §1)
- a moderation framework
- a safety system
- a geographic context

HOTMESS is not a classifieds site. HOTMESS is nightlife infrastructure.

---

## §3. Atmosphere Over Commerce

Commerce remains subordinate to atmosphere.

Order of priority on any HOTMESS surface that contains marketplace elements:
1. Editorial
2. Signal
3. Nightlife
4. Product
5. Transaction

Marketplace UI may NOT drift brighter than the OS. Specifically prohibited:
- White card backgrounds against the dark OS.
- Colourful CTA stickers ("HOT THIS WEEK", "🔥 TRENDING", urgency chips).
- Discount red on price.
- Dopamine badges, fire emoji, sparkle FX.
- Giant grids of products with no editorial context.
- Marketplace-specific iconography that competes with the gold / signal palette.

Marketplace borrows the OS visual language. The OS does not borrow marketplace's.

---

## §4. Core Principles

### §4.1 Identity Required

All sellers must have:
- a verified HOTMESS account
- age-confirmed (18+)
- valid profile state
- active community standing

Anonymous selling is prohibited.

### §4.2 Proximity Matters

Listings are geographically contextual. Users primarily see nearby items, nearby ticket holders, nearby exchanges, nearby nightlife relevance.

Discovery priority: same city → same event ecosystem → same nightlife network → national → global.

### §4.3 Safety Overrides Commerce

Safety systems outrank transactions. Users must be able to: report seller, block seller, share meet location, trigger SOS, activate check-in timer, mark exchange completed safely. Safety overlays remain globally accessible during all transaction flows (per D17 surface layer rules).

### §4.4 No Scalper Culture

HOTMESS does not optimise for speculative resale. The platform exists to redistribute access, reduce waste, support community circulation, protect nightlife participation. Not to exploit scarcity, inflate prices, or enable industrial resellers.

### §4.5 No Hustler Economy

HOTMESS commerce should feel **circulated, not extracted.**

Explicitly rejected (do not ship, do not request):
- growth hacking
- seller streaks
- urgency farming
- inventory grinding
- "top seller" badges
- "power seller" tiers
- affiliate loops
- engagement ladders
- gamified daily / weekly quotas
- "boost for visibility" upsells beyond the membership tier
- referral pyramids
- "sold within 24h" social proof
- countdown timers on listings

Atmosphere collapses into marketplace sludge the moment any of these ship. Future contributors: this list is non-exhaustive. If a feature smells like a growth hack, it is one.

---

## §5. Preloved Doctrine

### §5.1 Definition

Preloved is peer-to-peer resale for fashion, nightlife gear, accessories, fetishwear, creative items, community objects, and selected lifestyle products connected to queer nightlife culture.

### §5.2 Preloved Is Editorial

Listings should feel personal, contextual, story-driven, nightlife-linked. Not warehouse-like, SKU-heavy, or corporate.

Optional listing fields include:
- where item was worn
- associated event
- nightlife context
- creator notes
- styling notes
- nearby availability

All optional. Required only for listings that volunteer them.

### §5.3 Provenance Over Inventory

This is the HOTMESS-specific commerce language. Not Depop. Not Vinted. Not Grailed. A new category: **nightlife provenance commerce**.

The seed phrasing:
- "Worn once at Fold closing weekend."
- "Bought for WHOLE Festival."
- "Pickup tonight after Dial-A-Daddy."
- "Last seen at Eagle."
- "Summer at Berghain."
- "From the smoke room."
- "Afterhours bag."
- "Sunday recovery hoodie."

Not "condition." Not "seller score." Not "verified authentic."

Provenance over inventory. Where it lived. What night it belonged to. What scene it passed through. Emotional residue, not resale metadata.

**Tone rule:** observational, not cosplay. "Worn at Fold" is observational. "PEAK fold rave realness 🔥🔥🔥" is cosplay. The first is provenance, the second is performance. Cosplay reads as cringe in this medium; restraint reads as lived.

Provenance must be self-volunteered, never inferred or auto-populated. The system does not tag items with events the seller attended. Sellers tell the item's story themselves.

### §5.4 Allowed Items

Clothing, harnesses, accessories, bags, footwear, nightlife gear, art objects, records, selected wellness products, selected creator merchandise.

### §5.5 Restricted Items

Counterfeit goods, illegal substances, weapons, stolen items, prescription drugs, items implicated in unresolved disputes.

**Intimate / fluid-contact items:** sanitation rule applies. New-in-package intimate apparel allowed; used intimate apparel with bodily-fluid potential prohibited. Used harnesses, leather gear, and jocks allowed if cleanable and visibly clean; sellers must describe cleaning state. Moderators may remove items where sanitation cannot be reasonably verified from listing media.

HOTMESS reserves the right to remove any item.

### §5.6 Seller Tiers

Marketplace seller tier is **orthogonal to D02 Membership Entitlement Matrix.** Membership tiers (MESS / HOTMESS / HOTMESS+) gate consumer features. Seller tiers gate selling capabilities. A MESS member can be a Pro Seller; a HOTMESS+ member can be a Casual Seller.

Seller tiers:
- **Casual:** limited active listings, standard commission, no boosts.
- **Pro:** analytics, more active listings, drop support, featured visibility within editorial discovery, lower fees. Application + reputation gated.
- **Verified Creative / Venue / Brand:** editorial tagging, event-linked drops, globe promotion eligibility. Identity verification + community standing required.

No public tier display. Tier informs system behaviour, not user-facing badges. (See §4.5: no power-seller signalling.)

### §5.7 Listing Quality Standards

Real images, accurate condition, category selection, delivery/pickup method, moderation-safe content.

No AI-generated fake products. AI-assisted styling shots of real products with the real product clearly photographed elsewhere in the listing are permitted; AI-fabricated products with no real-world referent are prohibited.

### §5.8 Exchange Types

Supported: shipping, venue pickup, public meetup, event handoff, local courier.

HOTMESS strongly encourages public-space exchanges, venue-linked pickup, exchange check-in systems. The check-in timer (D08-adjacent safety surface) integrates here.

### §5.9 Messaging Doctrine

Messaging is contextual. Marketplace chat inherits trust state, moderation state, block state, safety access. Users can share approximate location, ETA, venue, trigger check-in timer.

**Cross-reference D14 (Routing Continuity):** the share-location / share-ETA / venue-handoff flow is InAppDirections territory. Marketplace MUST NOT introduce a parallel routing surface or escape to Google Maps. The same constraint applies.

### §5.10 Reputation System

HOTMESS avoids gamified scoring.

No follower counts. No public seller scores. No fake engagement metrics.

Trust is inferred quietly from: successful exchange count, verification state, community standing, moderation history, account age, event participation. None of these surface as numbers or badges to other users. They inform algorithmic behaviour (search ranking, fraud signal weights, dispute priority). They do not perform reputation publicly.

### §5.11 Listing Sunset

Sold listings auto-take-down at confirmation of exchange. A 7-day grace window allows the seller to re-list if the exchange failed. Past the window, the listing is archived; the seller may create a fresh one.

---

## §6. Event Ticket Resale Doctrine

### §6.1 Definition

Ticket Resale exists to safely redistribute access to nightlife events when plans change.

### §6.2 Emotional Positioning

The truth: people miss nights because life happens.

The tone is NOT "secondary market liquidity."

The tone IS:
- "Can't make it anymore?"
- "Pass it on."
- "Keep the night moving."
- "Spare ticket for someone who needs the night."

This distinction binds all ticket-resale UI copy. Operational tone is rejected; the language carries the doctrine.

### §6.3 Supported Tickets

Club tickets, festival tickets, private event tickets, member events, QR tickets, external ticket provider imports.

Potential integrations: RA, Dice, Eventbrite, native HOTMESS ticketing.

**Footnote (binding):** integrations are gated on each provider's transfer policy. RA tickets are non-transferable in most jurisdictions; ticket resale UI must reflect what is actually supported per provider, never imply transferability that doesn't exist.

### §6.4 Anti-Fraud Principles

All ticket resale systems prioritise verification. Possible layers: original purchase proof, QR validation, API validation, identity-linked ownership, ticket state tracking, transfer confirmation. High-risk listings may require manual review.

### §6.5 Anti-Scalping Policy

HOTMESS may: cap markup percentage, limit resale quantity, prevent repeated speculative resale, block industrial sellers, freeze suspicious accounts. Priority: community access over profit extraction.

### §6.6 Ticket Ownership State

Tickets exist in clear states: active, listed, reserved, sold, transferred, disputed, invalidated, scanned. Only one valid owner can exist at a time.

### §6.7 Event-Aware Routing

Ticket listings appear on event profiles, inside Pulse, in local discovery, on venue surfaces, in relevant chats, in Right Now.

Example surfacing: "2 nearby tickets available for tonight."

**Ticket signals should feel like nightlife movement, not financial inventory.** This one line is binding across every surface that renders ticket presence.

All ticket-Pulse signals respect §1 Presence Integrity. A seller in off-grid state can list a ticket; the listing surfaces, but no presence is implied — no "active 2m ago," no "online seller," no "nearby."

### §6.8 Refund & Dispute Doctrine

HOTMESS is not automatically liable for all disputes. Platform role depends on transaction type: facilitated, escrowed, externally verified, peer-to-peer.

Dispute paths: failed transfer, invalid ticket, duplicate sale, scam behaviour, event cancellation.

Moderation may freeze payouts, suspend accounts, revoke selling rights.

**SLA:** first moderator response to a dispute within 6 hours for ticketed events occurring within 24h; within 24 hours otherwise. Auto-acknowledgement on dispute filing is immediate.

### §6.9 Event Partner Controls

Venues / promoters may: disable resale, cap resale pricing, whitelist transfer systems, prioritise community members, require identity matching. HOTMESS supports promoter-level rules.

### §6.10 Commerce Beacon Doctrine

**A commerce beacon is not a listing. A commerce beacon is a moment of nightlife intent.** That single rule protects the entire map.

This subsection sits at the collision point of D08 (visibility), D12 (beacon semantics), D14 (routing continuity), and D19. Without it, beacons eventually drift into Craigslist pins and the OS fractures.

**Commerce beacons communicate:**
- availability
- movement
- redistribution
- convergence
- social circulation

**Commerce beacons do NOT communicate:**
- inventory density
- speculative opportunity
- marketplace optimisation
- permanent storefront behaviour
- catalogue depth

**Good language (binding):**
- "2 spare Fold tickets"
- "Need one for tonight"
- "Looking for 1 tonight"
- "One seat in the cab from Vauxhall"
- "Passing on a wristband"
- "Extra ticket before doors"

**Bad language (prohibited):**
- "20 tickets available"
- "Best price"
- "BUY NOW"
- "Official reseller"
- "Ticket broker"
- "DM offers"
- floating price-first UI on the map
- any caps-locked transactional verb on a globe surface

Price belongs inside sheets and transaction surfaces, never as the primary language of Pulse. No price-forward rendering on the globe — no £40, no £80, no floating money UI, no "best offer." Prices live in the sheet detail, the thread, the handoff flow.

**Expiry — commerce beacons decay aggressively:**
- event tickets decay near doors-open
- strong decay after 2h of inactivity for "looking" / "selling" intent beacons
- post-event signals auto-retire
- stale commerce beacons fade visually before removal
- "Passed on" state instead of hard disappear

**Wording tone — passing-on, not transactional:**

| Use | Avoid |
|---|---|
| Passed on | Sold |
| Claimed | Buyer acquired |
| Sorted | Completed transaction |
| Covered | Sold out |
| Found one | — |

"Sold" reads marketplace. "Passed on" reads circulation. The tone is the doctrine.

**Visual differentiation — "Looking" vs "Selling":**

Looking beacons feel vulnerable / social:
- softer pulse
- hollow ring
- low-signal animation
- muted colourway
- "Need one?" tone

Selling / spare beacons feel active / directional:
- solid ring
- slightly brighter emission
- "Got one spare" / "Passing one on" tone

This visual split is non-negotiable — it prevents the map from carrying predatory or scalper energy. Same shape with no differentiation reads as commerce; differentiated rendering reads as nightlife.

**Visibility binding (D08):**
Off-grid users may transact privately — receive replies, message, complete handoffs — but **may not emit public commerce-presence signals**. No "seller nearby." No passive commerce presence. No reconstruction of visibility state through the resale channel. Commerce cannot become a side-channel around D08.

**Social-first resolution (HOTMESS-native):**
Where possible, the system biases toward social resolution before commercial resolution. If two mutuals are both heading to the same event, one with a spare and one looking, that resolves socially before commercially.

Surfacing priority:
1. mutuals
2. nearby trusted users
3. community circulation
4. anonymous resale

The system should subtly encourage *"pass it to someone in the world already around you."* That is profoundly different from resale platforms.

**Convergence is more valuable than resale:**
The strongest commerce interaction is not "ticket sold." It is *"we're headed there together."*

Future ticket-beacon affordances should support:
- "going with?"
- "ride share?"
- "meet before?"
- "headed there"
- "one spare in the cab"

That is HOTMESS-native behaviour. Marketplace platforms cannot compete with this layer; only nightlife infrastructure can render it.

**Anti-scalper structural limits (architectural, not just moderation):**
- quantity caps per user per event
- same-event beacon cooldowns
- repeated resale friction
- no mass posting
- no repost loops
- no algorithmic boosting for high-turnover sellers

**HOTMESS optimises for circulation, not arbitrage.** That sentence is doctrine.

**Commerce Beacon Acceptance Test:**
*No commerce beacon may visually dominate nightlife intent, reconstruct off-grid visibility, or incentivise speculative resale behaviour over social circulation.*

If a tester can produce a beacon state that does any of those three things, the build fails §6.10 and does not ship.

---

## §7. Globe + Pulse Integration

Marketplace activity emits Pulse signals — subject to §1 Presence Integrity.

Examples:
- item listed
- ticket available nearby
- last-minute ticket drop
- creator drop live
- event sold out
- pickup cluster forming

**Visibility binding:** marketplace Pulse signals route through `get_renderable_beacons_for_viewer` (or equivalent D08 visibility snapshot). Off-grid sellers emit no live signals. Their listings remain discoverable through search and event surfaces; they do not appear as nearby presence.

Commerce becomes part of the city's live energy map — without becoming a tracker.

---

## §8. Care Integration

Care isn't "bad transaction support." Care is infrastructure.

D15 Care Language applies to commerce surfaces. After a failed or distressing exchange, users are routed into the care suite, not just into a moderator queue.

Care territories specific to commerce:
- **Post-night item recovery** — "left my jacket at" flows for known venues.
- **Safe handoff coordination** — pre-meetup check-in, mid-meetup pulse, post-meetup acknowledgement.
- **Venue-assisted returns** — partner venues hold items for collection; the doctrine supports the workflow.
- **Recovery routing after failed meetups** — InAppDirections (D14) ferry path, not abandonment.
- **Emotional de-escalation after coercive exchanges** — care surface intercepts before moderation.

The marketplace is not separate from the care suite. They share the same user.

---

## §9. Moderation Doctrine

HOTMESS moderation is proactive, trust-weighted, safety-first, human-reviewed for escalation.

Signals: rapid relisting, repeated disputes, scam reports, suspicious pricing, impossible travel patterns, abusive messaging.

High-risk accounts may lose selling rights, payout access, visibility, event access.

**Cross-reference §8 Care Integration:** when moderation action affects a user mid-trade or post-incident, care routing fires concurrently. The user is supported, not just sanctioned.

---

## §10. Payment + Escrow Principles

### §10.1 v1 (ships first)
- Platform-mediated payment.
- Delayed payout windows (24h–7d depending on tier and trust state).
- Identity-linked payouts.
- Fraud review capability.
- Peer-to-peer with platform mediation on disputes.

### §10.2 v2 (deferred scope)
- Escrow holds for high-risk ticket sales.
- Post-event release for resold tickets.
- Manual confirmation for flagged exchanges.
- Stripe Connect integration for tiered payout rules.

The v1/v2 split protects the ship cadence. v1 is months of work; v2 is more. Do not collapse them into one effort.

---

## §11. UX Principles

The system should feel cinematic, social, local, alive, nightlife-native.

NOT spreadsheet-like, corporate marketplace UI, generic ecommerce.

Commerce surfaces behave like nightlife intelligence. (See §3 Atmosphere Over Commerce for the visual restraint specifics.)

### §11.1 No Marketplace SEO Tone

Marketplace copy may not adopt generic ecommerce urgency language. This prevents a future contributor from importing StockX / Depop / Vinted copy into the OS.

**Avoid:**
- "limited stock"
- "best deal"
- "must sell"
- "fastest seller"
- "lowest price"
- "don't miss out"
- "selling fast"
- "x people viewing"
- "only 2 left"
- "trending"
- "hot right now"
- generic countdown copy

**Prefer:**
- "passing it on"
- "can't make it anymore"
- "available tonight"
- "pickup after"
- "still looking?"
- "sorted"
- "sorted, thanks"
- "from the smoke room"
- "spare for someone who needs the night"

HOTMESS commerce language should feel **circulated, social, and nightlife-native** — never extractive or conversion-optimised. Copy is doctrine. Drift here drifts the whole OS.

---

## §12. Legal + Compliance

HOTMESS reserves the right to: remove listings, freeze transactions, suspend sellers, restrict ticket resale, cooperate with lawful investigations.

Users must agree: they own listed items, tickets are transferable per provider rules, listings are accurate, prohibited items are forbidden. 18+ only.

GDPR-compliant handling required for: payment data, identity verification, transaction logs, moderation records, dispute evidence.

---

## §13. First-Listing Onboarding

Cross-references D09 Onboarding Truth Architecture.

A user becomes a seller through a guided onboarding that surfaces:
- Identity confirmation (per §4.1).
- Tier explanation (Casual / Pro / Verified Creative — per §5.6).
- Provenance prompts (per §5.3) — invitation, not requirement.
- Safety surface walk-through.

No dark-pattern push to "list your first item now." The onboarding meets the user where they are.

---

## §14. Acceptance Test

**No commerce surface may violate the dignity floor, reconstruct off-grid presence, or incentivise extraction over circulation.**

If a tester can produce a surface that does any of those three things — the build fails D19 and does not ship.

---

## §15. Final Operating Rule Restated

(See §0.)

If growth mechanics conflict with trust and safety: trust wins.

That sentence is the doctrine. Everything above is the scaffolding around it.
