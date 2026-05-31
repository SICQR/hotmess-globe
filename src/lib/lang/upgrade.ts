/**
 * src/lib/lang/upgrade.ts
 *
 * Doctrine: D35 — Language Operating System §9.1.
 *
 * The canonical string set for every P1 monetisation surface in the
 * HOTMESS OS. No inline strings in JSX for paywall / upgrade / tier
 * surfaces — import from here, render through here, drift becomes
 * detectable at PR-review time.
 *
 * Phil's rule (D35 amendment 2026-05-31): the first token file is tiny.
 * Resist the urge to build a giant registry. Prove governance works,
 * contributors comply, reviewers understand it, drift decreases — then
 * expand. Overengineering this seeds framework fatigue, which is a
 * second kind of entropy.
 *
 * Phil's "different emotional contracts" rule (D35 amendment 2026-05-31):
 * each operator tier hero is NOT a parameterised template. HOTMESS reads
 * seductive / in-motion; CONNECTED reads commerce-access; PROMOTER reads
 * orchestration; VENUE reads infrastructure-anchored. Distinct sentence
 * architecture per tier, not interpolated.
 *
 * Phil's "access not status" rule (D35 amendment 2026-05-31): tier
 * descriptions describe CAPABILITY, not prestige. The badge is never
 * the value. The capability is.
 *
 * Phil's "no belonging manipulation" rule (D35 amendment 2026-05-31):
 * banned at the §7.1 Critical level — "real members," "full access to
 * the community," "serious users," "unlock the real HOTMESS," "the
 * boys who matter," "join the inner circle," "core community."
 */

// ───────────────────────────────────────────────────────────────────────────
// /upgrade page hero (Layer B, energy 5, invitation_to_participate)
// ───────────────────────────────────────────────────────────────────────────

/**
 * The consumer hero for the /upgrade page.
 *
 * Energy 5 (Pulse band). Layer B. The user is being invited to a
 * deeper relationship with the network. No urgency, no theatre, no
 * pricing in the hero line itself — price lives in the tier rows below.
 *
 * Phil swagger pass (2026-05-31 follow-up to PR #761): the hero string
 * is "Go further in." — three words, masculine gravity, sounds like a
 * door opening, sounds slightly dangerous, doesn't over-explain. The
 * constant name preserves the D35 §1.3 canonical "Move deeper" verb
 * (which remains the registry's identifier for this slot); the
 * rendered string is the Phil-approved swagger variant. D35 §1.3
 * permits Layer B paywall-hero variants and "Go further in." is one.
 *
 * No subtitle. The hero stands alone above the tier grid by design —
 * Phil 2026-05-31: "a strong HOTMESS line should sometimes be allowed
 * to sit in silence. That silence creates authority." The grid is the
 * answer; another sentence dilutes the energy.
 */
export const HERO_MOVE_DEEPER = 'Go further in.';

// ───────────────────────────────────────────────────────────────────────────
// Per-tier hero lines — distinct emotional contracts per tier
// ───────────────────────────────────────────────────────────────────────────

/**
 * The tier "step into" line that appears as the per-tier descriptor on
 * the upgrade page and on tier-specific paywall heroes.
 *
 * MESS — participation_marker — Layer B, energy 3. The free tier
 * doesn't get a hero; it gets an acknowledgment. The user is already
 * inside; this names where they are.
 */
export const STEP_INTO_MESS = 'You are in. Welcome to the mess.';

/**
 * HOTMESS — invitation_to_participate — Layer B, energy 5.
 * Seductive, in-motion, participatory per Phil's emotional shape table.
 * "Deeper participation" not "premium upgrade."
 *
 * Phil swagger pass (2026-05-31 follow-up to PR #761): "Built for boys
 * who stay out longer. Run hotter." Reads "like a quiet warning label
 * on a nightclub door" (Phil's framing). "Built for" feels
 * infrastructural not performative; "boys who stay out longer" is
 * emotionally precise; "Run hotter" is pure HOTMESS. Stays short
 * enough to feel punchy without collapsing into ad copy.
 */
export const STEP_INTO_HOTMESS = 'Built for boys who stay out longer. Run hotter.';

/**
 * CONNECTED — operational_access — Layer A, energy 3.
 * Commerce-access framing per Phil. The user is being shown a tool,
 * not a status purchase. Operational tone, not nightlife poetry.
 */
export const STEP_INTO_CONNECTED =
  'Open your seller surface. Own your corner of the scene.';

/**
 * PROMOTER — operational_access — Layer A, energy 3.
 * Orchestration framing per Phil. The user runs nights, moves crowds,
 * holds the calendar. Operational verb, anchored agency.
 */
export const STEP_INTO_PROMOTER =
  'Run the night. Sell tickets, work the door, hold the room.';

/**
 * VENUE — operational_access — Layer A, energy 2.
 * Infrastructure presence per Phil — stable, operational, trusted,
 * anchored. The lowest-energy hero in the upgrade ladder because a
 * £99/month operator needs reliability framing, not nightlife poetry.
 * This is the surface that proves D35 §3.1 (different tiers want
 * different energies) holds under transactional pressure.
 */
export const STEP_INTO_VENUE = 'Your space on the Globe. Forever-anchored.';

// ───────────────────────────────────────────────────────────────────────────
// Per-tier role chips — the single-phrase relationship each tier names.
//
// Phil's rule (D35 amendment 2026-05-31, follow-up): the role chip
// behaves like a label on a switchboard — extremely plain, no
// cleverness, no atmosphere. The step-into line carries the
// emotional/atmospheric register; the role chip is the wiring diagram
// label that tells you which circuit this tier is.
//
// Lowercase in source on purpose — the CSS uppercases for the visible
// render. The source string reads as a plain switchboard label so a
// reviewer or contributor opening this file sees the register the
// chip is meant to operate in, not a stylised brand-mark.
//
// These five constants are the canonical role vocabulary. Future
// surfaces that reference tiers (e.g. an inline tier-name reference in
// Care or in Settings) inherit these phrases so the role naming stays
// coherent across the OS.
// ───────────────────────────────────────────────────────────────────────────

export const ROLE_MESS = 'community entry';
export const ROLE_HOTMESS = 'deeper participation';
export const ROLE_CONNECTED = 'commerce access';
export const ROLE_PROMOTER = 'night orchestration';
export const ROLE_VENUE = 'infrastructure presence';

// ───────────────────────────────────────────────────────────────────────────
// Per-tier capability lines — what the tier UNLOCKS in terms of CAPABILITY,
// not status. Phil's rule: access, not prestige.
//
// Rendered as a single supporting paragraph on the upgrade card, NOT as
// a bulleted feature checklist. The checklist layout is one of the
// quiet ways SaaS drift sneaks back in (Phil amendment 2026-05-31).
// ───────────────────────────────────────────────────────────────────────────

export const CAPABILITY_MESS =
  'Age-verified entry. Browse the Globe. Radio always free. Three Ghosted previews. Buy anything without a tier.';

export const CAPABILITY_HOTMESS =
  'Full Ghosted grid. Taps, messaging, tonight-intention badges. Full Smash Daddys music library. Dial-A-Daddy. Hand N Hand. Three beacon drops a month.';

export const CAPABILITY_CONNECTED =
  'Everything HOTMESS plus: sell preloved (twenty listings). Seller dashboard. Creator dashboard. Brand page. Referral programme. Ten beacon drops a month.';

export const CAPABILITY_PROMOTER =
  'Everything CONNECTED plus: create events, sell tickets, run guestlists. Promoter dashboard. Radio slot. Twenty beacon drops a month. Unlimited personas.';

export const CAPABILITY_VENUE =
  'Everything PROMOTER plus: venue dashboard, door staff app, Stripe Connect payouts, permanent Globe presence, unlimited beacon drops, business billing.';

// ───────────────────────────────────────────────────────────────────────────
// Inline consumer paywall gates (Layer B, energy 4, invitation_to_participate)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Inline gate shown when a user on MESS taps a messaging surface.
 * Per D25, chat requires (1) HOTMESS tier or higher AND (2) a mutual boo.
 * This gate covers the tier half. Layer B, energy 4.
 */
export const GATE_MESSAGING_BLOCKED = 'Chat opens at HOTMESS. Move deeper to keep going.';

/**
 * Inline gate shown when a MESS user's 90-second music preview ends.
 * Phil's HelpCenter line: "MESS gets 90-second previews. HOTMESS and
 * above get full playback." This gate names the floor.
 */
export const GATE_MUSIC_PREVIEW_ENDED =
  'Preview ran out. Full tracks are at HOTMESS.';

/**
 * Inline gate shown over the fogged Ghosted grid for MESS users.
 * Per Phil's positioning, the fog is the floor; HOTMESS lifts it.
 */
export const GATE_GHOSTED_FOGGED =
  'You see three previews on MESS. The rest of the grid is at HOTMESS.';

/**
 * Inline gate shown when a user has used their monthly beacon quota.
 * Note: this is the GATE (the paywall sheet that opens when the user
 * taps a depleted meter). The METER itself is a separate string in
 * `BEACON_QUOTA_METER` below and operates at Layer A.
 */
export const GATE_BEACON_QUOTA_HIT =
  'You have used this month’s beacon drops. Move deeper for more.';

// ───────────────────────────────────────────────────────────────────────────
// Operator surface gate (Layer A, energy 2, operational_access)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Inline gate shown when a non-seller-tier user lands on a Preloved
 * sell flow. Operator surface — Layer A, energy 2. Not "unlock selling"
 * — "selling opens at CONNECTED" — capability description, not a
 * marketing pitch.
 */
export const GATE_PRELOVED_SELLER_NEEDED =
  'Selling on Preloved opens at CONNECTED. Twenty listings, seller dashboard, analytics.';

// ───────────────────────────────────────────────────────────────────────────
// Beacon quota meter (Layer A, energy 2, quota_signal)
// ───────────────────────────────────────────────────────────────────────────

/**
 * The beacon quota meter that surfaces operational telemetry: how many
 * drops the user has used in the current billing window. Layer A,
 * factual, emotionally neutral. The meter never sells. The tap
 * interaction on the meter opens GATE_BEACON_QUOTA_HIT (Layer B) — but
 * the meter itself is infrastructure, not pressure.
 *
 * Render examples:
 *   "3 of 3 used this month"     — at-cap MESS would never see this
 *                                  (MESS has 0 quota)
 *   "2 of 3 used this month"     — HOTMESS
 *   "8 of 10 used this month"    — CONNECTED
 *   "Unlimited"                  — VENUE
 *
 * The two functions return the rendered string. They are not template
 * literals at the call site — the call site imports the function and
 * passes the operational facts.
 */
export function beaconQuotaMeter(used: number, cap: number): string {
  if (cap === -1) return 'Unlimited';
  return `${used} of ${cap} used this month`;
}

/**
 * The label that sits next to the quota meter on the Pulse drop flow
 * and on the membership page. Operational, not aspirational.
 */
export const BEACON_QUOTA_METER_LABEL = 'Beacon drops';

// ───────────────────────────────────────────────────────────────────────────
// Stripe transaction Layer A (energy 1)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Post-checkout success toast / banner. emotional_intent: reassurance.
 * Direct, present-tense, "this landed." No exclamation marks. No
 * persona language. No brand-mark wordplay. Per D35 §0 Layer A.
 */
export const CONFIRMATION_LANDED = 'You are on your new tier. Access is open.';

/**
 * Post-cancellation acknowledgment. emotional_intent:
 * respectful_acknowledgment. Calm, direct, no "we'll miss you," no
 * "are you sure you want to leave us," no manipulation per D35 §7.1.
 */
export const CANCELLATION_CONFIRMED =
  'Cancelled. Your access continues until the end of this period, then you drop back to MESS.';

/**
 * Stripe checkout was abandoned mid-flow. Layer A energy 1.
 * Matter-of-fact; the user changed their mind, that is fine.
 */
export const CHECKOUT_CANCELLED_MID_FLOW = 'Checkout closed. No changes were made.';

/**
 * Cancellation flow modal heading. Layer A energy 1.
 * Direct statement of what the user is about to do. No theatre.
 */
export const CANCELLATION_MODAL_TITLE = 'Cancel subscription';

/**
 * Cancellation flow modal body. Names the consequence in operational
 * terms. Per D35 §7.1, the word "premium" is banned; per D35 §1.5 the
 * canonical name is the tier the user is on.
 */
export const CANCELLATION_MODAL_BODY =
  'Your access continues until the end of this billing period. After that, you drop back to MESS.';

/**
 * Cancellation flow modal — keep button (stays on tier).
 * Per D35 §7.1 explicit ban on "we'll miss you" and "are you sure
 * you want to leave us" framing — this label states what the action
 * does, no theatre.
 */
export const CANCELLATION_MODAL_KEEP = 'Keep my tier';

/**
 * Cancellation flow modal — confirm button.
 */
export const CANCELLATION_MODAL_CONFIRM = 'Cancel subscription';

// ───────────────────────────────────────────────────────────────────────────
// Error states (Layer A, energy 1)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Stripe checkout failed to create a session. Layer A error state per
 * D35 §2.4: human, not corporate. Acknowledge → state → offer recovery.
 */
export const CHECKOUT_SESSION_FAILED =
  'That did not go through. Try again, or use a different card.';

/**
 * Cancellation request failed at the Stripe API. Layer A error state.
 * Offers the support path explicitly because the user cannot resolve
 * this alone.
 */
export const CANCELLATION_FAILED =
  'Cancellation did not go through. Email support@hotmess.london and we will sort it.';

/**
 * Auth required for a paid action. Layer A.
 */
export const CHECKOUT_AUTH_REQUIRED = 'Sign in to keep going.';

// ───────────────────────────────────────────────────────────────────────────
// Subscription footer copy (Layer A, energy 1)
// ───────────────────────────────────────────────────────────────────────────

/**
 * The footer line below the tier grid. States the contractual reality
 * in plain terms. Per D35 §6, "monthly" is OK (live, in-motion);
 * banned would be "subscription" alone as a marketing word — but here
 * it is used as a noun-of-record, which is fine.
 */
export const SUBSCRIPTION_TERMS =
  'Monthly tiers, charged via Stripe. Cancel anytime — access continues to the end of the period.';

/**
 * The Stripe security strapline. Layer A, factual, no theatre.
 */
export const PAYMENT_SECURITY = 'Payments by Stripe. We never see your card.';

// ───────────────────────────────────────────────────────────────────────────
// Tier metadata used to render the upgrade grid
// ───────────────────────────────────────────────────────────────────────────

/**
 * The canonical tier identity used to render the /upgrade page.
 *
 * Note: `stripePriceIdEnvVar` names the environment variable the API
 * route looks up at checkout. The variable may be undefined in
 * development — the page handles that gracefully (toast: "Tier not
 * configured for checkout yet" + log) without breaking the render.
 *
 * `tone_layer` and `energy_level` per Phil's classification table
 * (2026-05-31 amendment).
 */
export interface TierRowMeta {
  id: 'mess' | 'hotmess' | 'connected' | 'promoter' | 'venue';
  displayName: 'MESS' | 'HOTMESS' | 'CONNECTED' | 'PROMOTER' | 'VENUE';
  priceLabel: string;
  priceAmountPence: number;
  /** "Why this tier exists" — the emotional centre of the card. */
  stepIntoLine: string;
  /** "What role it gives you in the ecosystem" — single-phrase chip. */
  roleLine: string;
  /** "What tools open up" — supporting prose, not a feature checklist. */
  capabilityLine: string;
  stripePriceIdEnvVar: string | null;
  tone_layer: 'A' | 'B';
  energy_level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export const TIER_ROWS: ReadonlyArray<TierRowMeta> = [
  {
    id: 'mess',
    displayName: 'MESS',
    priceLabel: 'Free',
    priceAmountPence: 0,
    stepIntoLine: STEP_INTO_MESS,
    roleLine: ROLE_MESS,
    capabilityLine: CAPABILITY_MESS,
    stripePriceIdEnvVar: null, // free tier, no Stripe product
    tone_layer: 'B',
    energy_level: 3,
  },
  {
    id: 'hotmess',
    displayName: 'HOTMESS',
    priceLabel: '£7.99 / month',
    priceAmountPence: 799,
    stepIntoLine: STEP_INTO_HOTMESS,
    roleLine: ROLE_HOTMESS,
    capabilityLine: CAPABILITY_HOTMESS,
    stripePriceIdEnvVar: 'VITE_STRIPE_HOTMESS_PRICE_ID',
    tone_layer: 'B',
    energy_level: 5,
  },
  {
    id: 'connected',
    displayName: 'CONNECTED',
    priceLabel: '£19.99 / month',
    priceAmountPence: 1999,
    stepIntoLine: STEP_INTO_CONNECTED,
    roleLine: ROLE_CONNECTED,
    capabilityLine: CAPABILITY_CONNECTED,
    stripePriceIdEnvVar: 'VITE_STRIPE_CONNECTED_PRICE_ID',
    tone_layer: 'A',
    energy_level: 3,
  },
  {
    id: 'promoter',
    displayName: 'PROMOTER',
    priceLabel: '£44.99 / month',
    priceAmountPence: 4499,
    stepIntoLine: STEP_INTO_PROMOTER,
    roleLine: ROLE_PROMOTER,
    capabilityLine: CAPABILITY_PROMOTER,
    stripePriceIdEnvVar: 'VITE_STRIPE_PROMOTER_PRICE_ID',
    tone_layer: 'A',
    energy_level: 3,
  },
  {
    id: 'venue',
    displayName: 'VENUE',
    priceLabel: '£99.99 / month',
    priceAmountPence: 9999,
    stepIntoLine: STEP_INTO_VENUE,
    roleLine: ROLE_VENUE,
    capabilityLine: CAPABILITY_VENUE,
    stripePriceIdEnvVar: 'VITE_STRIPE_VENUE_PRICE_ID',
    tone_layer: 'A',
    energy_level: 2,
  },
];

/**
 * Lookup helper used by the upgrade page and any inline paywall that
 * needs to reference a specific tier's metadata.
 */
export function tierRow(
  id: TierRowMeta['id'],
): TierRowMeta | undefined {
  return TIER_ROWS.find((t) => t.id === id);
}
