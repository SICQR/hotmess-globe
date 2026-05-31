/**
 * src/lib/lang/surface-meta.ts
 *
 * Doctrine: D35 — Language Operating System §3.4.
 *
 * Every major user-facing surface in the HOTMESS OS declares its tonal
 * contract via a `SurfaceMeta` constant near the top of its file. This
 * converts D35 from prose into machine-readable constraints, enabling
 * lint rules, reviewer tooling, automated drift detection, and AI-
 * assisted copy generation that inherits doctrine constraints by default
 * rather than averaging toward generic platform-English.
 *
 * SEED FILE. Per Phil's "first token file is tiny" rule (D35 amendment
 * 2026-05-31): keep this minimal until P2/P3 inform the schema's
 * evolution. Resist adding speculative fields.
 *
 * Future fields under consideration (NOT in this version):
 *   - `cultural_risk: 'low' | 'medium' | 'high' | 'critical'` — flags
 *     surfaces where drift carries identity-level damage (onboarding,
 *     upgrade hero, care/SOS). Defer to a doctrine PR after P3 ships.
 *   - `requires_review: ToneLayer[]` — explicit reviewer-attention list
 *     for cross-layer surfaces.
 */

// ───────────────────────────────────────────────────────────────────────────
// D35 §0 — Language Layers
// ───────────────────────────────────────────────────────────────────────────

/**
 * The two language layers HOTMESS operates.
 *
 *   A — System Language. Legally-adjacent infrastructure. Used for
 *       safety, moderation, payments, consent, deletion, legal,
 *       verification, outages, account state. Direct, stable,
 *       low-theatre, emotionally precise, minimal slang, globally
 *       understandable. The user feels the distinction subconsciously
 *       — when Layer A is speaking they understand without being told
 *       that this is the part of HOTMESS that is load-bearing for
 *       their safety, money, legal status, account state.
 *
 *   B — Brand Language. Used for editorial, onboarding mood, empty
 *       states, campaigns, Pulse, Ghosted, Drops, Radio, environmental
 *       copy. Seductive, cinematic, playful, emotionally charged,
 *       culturally specific. Gay-men-coded, London-coded, nightlife-
 *       coded, recovery-aware where the surface calls for it.
 */
export type ToneLayer = 'A' | 'B';

// ───────────────────────────────────────────────────────────────────────────
// D35 §3 — Energy Rules
// ───────────────────────────────────────────────────────────────────────────

/**
 * The energy band a surface operates at, from 0 (Silent SOS) to 7
 * (Radio campaigns / full-volume Drops launch moments).
 *
 *   0  Silent SOS triggers · check-in escalation · moderation ban notice
 *   1  Payment failure · account deletion confirmation · password reset
 *   2  Care surface · Trusted Contacts management · off-grid toggle
 *   3  Settings · empty states · functional-with-warmth
 *   4  Ghosted grid · inbox · profile sheets · messaging composer
 *   5  Pulse globe · beacon peek-sheets · route drawing · /upgrade hero
 *   6  Drops landing · HNH MESS hero · Market product detail · paywall hero
 *   7  HOTMESS Radio campaigns · scheduled live events · Drops launch
 *
 * Drift detection: the user does not encounter two surfaces at the
 * same energy back-to-back unless the journey requires it.
 */
export type EnergyLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ───────────────────────────────────────────────────────────────────────────
// D35 §2 — State-Based Tone Matrix + emotional_intent
// ───────────────────────────────────────────────────────────────────────────

/**
 * The human feeling a surface is designed to produce.
 *
 * Phil's rule (D35 amendment 2026-05-31): emotional_intent describes
 * the HUMAN FEELING the surface is designed to produce, NOT a business
 * metric. Banned values include `conversion`, `upsell`, `retention`,
 * `engagement` — those describe what the company wants from the user.
 * `emotional_intent` describes what the surface is doing to the user's
 * nervous system. The doctrine governs the human feeling, not the KPI.
 *
 * P1 monetisation vocabulary (the initial seed):
 *
 *   invitation_to_participate
 *     Consumer paywall heroes and inline gates. "You can come further in."
 *     The user is being offered a deeper relationship with the network,
 *     not being sold a subscription.
 *
 *   operational_access
 *     Creator / venue / promoter feature gates. "This is a tool you'll
 *     need." The user is being shown a capability that unlocks operator
 *     work, not a status purchase.
 *
 *   participation_marker
 *     Consumer tier badge (MESS / HOTMESS). Identity-adjacent. The
 *     badge is where the user is in their relationship with HOTMESS,
 *     not what they have bought.
 *
 *   operational_marker
 *     Operator tier badge (CONNECTED / PROMOTER / VENUE). Verified
 *     operator presence. Reads subconsciously as role, not elite tier.
 *
 *   reassurance
 *     Layer A transaction confirmation after Stripe success. Low
 *     theatre, present-tense, "this landed."
 *
 *   respectful_acknowledgment
 *     Cancellation / downgrade flow. Calm direct acknowledgement.
 *     Per D35 §7.1 explicitly banned: "we'll miss you," "are you sure
 *     you want to leave us," any manipulation framing.
 *
 *   quota_signal
 *     Beacon-quota meter and similar operational telemetry. Layer A,
 *     factual, emotionally neutral. The meter never sells. The tap
 *     interaction on the meter opens a Layer B paywall sheet — but
 *     the meter itself is infrastructure, not pressure.
 *
 * Each value names the felt experience, not the transaction. The
 * vocabulary will grow as P2-P8 ship — each phase's intent values are
 * proposed in their phase PR and ratified before code lands.
 *
 * Future P2 vocabulary (onboarding) under consideration:
 *   `arrival`, `welcoming`, `boundary_setting`, `permission_granting`.
 *
 * Future P3 vocabulary (care) under consideration:
 *   `grounding`, `holding`, `pause`, `safety_offered`.
 */
export type EmotionalIntent =
  | 'invitation_to_participate'
  | 'operational_access'
  | 'participation_marker'
  | 'operational_marker'
  | 'reassurance'
  | 'respectful_acknowledgment'
  | 'quota_signal';

// ───────────────────────────────────────────────────────────────────────────
// SurfaceMeta
// ───────────────────────────────────────────────────────────────────────────

/**
 * The declared tonal contract for a major user-facing surface.
 *
 * Surfaces export a `SURFACE_META` constant near the top of their file:
 *
 *   export const SURFACE_META: SurfaceMeta = {
 *     tone_layer: 'B',
 *     energy_level: 5,
 *     emotional_intent: 'invitation_to_participate',
 *     inherits: ['D21', 'D28'],
 *   };
 *
 * Lint rules (to be added in a follow-up slice) read this constant and
 * apply tier-tagged enforcement: a surface declared as `tone_layer: 'A'`
 * cannot import strings from a Layer B token file without an explicit
 * override comment; a `tone_layer: 'A', energy_level: 1` surface
 * triggers Critical violations on any §7.2 luxury SaaS drift terms,
 * exclamation marks, or caps-locked words outside tier names.
 *
 * D35 §9.5 names the metadata declaration as the enforcement vector.
 * Without it, every CI check is a global regex grep — noisy and
 * context-blind. With it, each warning is anchored to a declared
 * intent and severity is computed in context.
 */
export interface SurfaceMeta {
  /** Layer A (System / infrastructure) or Layer B (Brand / voice). */
  tone_layer: ToneLayer;

  /** 0-7 energy band per D35 §3.1. */
  energy_level: EnergyLevel;

  /** The human feeling this surface is designed to produce. */
  emotional_intent: EmotionalIntent;

  /**
   * Other doctrines this surface inherits from beyond D35.
   * Optional. Cross-references for reviewers and the AI-assistance
   * downstream tool. Example: ['D21', 'D28'] for a paywall that
   * inherits from Payment & Payout and Refund & Cancellation.
   */
  inherits?: ReadonlyArray<string>;
}
