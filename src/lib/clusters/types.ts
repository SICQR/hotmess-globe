/**
 * D43 Slice A — In-World Cluster Preview · types
 *
 * Doctrine refs: D43, D48 §3.1/§3.3/§5.1, D08, D17, D35, sacred-invariants.
 * Scope doc: docs/slices/d43-slice-a-cluster-preview.md
 *
 * These types are the input/output contract of `composeClusterPreview`.
 * Treat the composer as constitutional infrastructure (§3.6):
 * - deterministic outputs
 * - gate-traceable
 * - audit-visible
 *
 * Per §1 of the scope, this slice ships ZERO schema / RPC drift. The
 * upstream data layer is the existing D48 Slice 1 pipeline reading from
 * `get_renderable_beacons_for_viewer`. Whoever wires the kind-router
 * branch (next PR) is responsible for shaping the RPC rows into
 * `ViewerVisibleBeacon` shape — the composer accepts what it needs.
 */

// ─── enums ───────────────────────────────────────────────────────────────────

/** D12 + Drop Beacon Doctrine — the seven first-class signal intents. */
export type Intent =
  | 'looking'
  | 'hosting'
  | 'cruising'
  | 'aftercare'
  | 'quiet_hold'
  | 'arriving'
  | 'market';

/** D48 §2 — exposure spectrum. `full_reveal` is sheet-world only; never appears
 *  in cluster-preview output. */
export type ExposureRegister = 'anonymous' | 'persona_shape' | 'face_avatar';

/** D48 §3.3 gate 1 + D08 viewer-state coupling. */
export type ViewerTrustState = 'stranger' | 'viewer_opted_in' | 'mutual';

/** D48 §3.3 gate 2 — physical proximity, not just zoom. */
export type ProximityBand = 'far' | 'near' | 'close';

// ─── inputs ──────────────────────────────────────────────────────────────────

/**
 * One beacon as seen by a specific viewer, after the D48 Slice 1 visibility
 * snapshot has filtered + decorated it for this viewer.
 *
 * Nullable signals (`exposure_register`, `viewer_trust_state`, `proximity_band`,
 * `per_surface_consent_cluster_preview`) trigger the §3.4 default-down rule
 * inside the composer: missing signal → step down to anonymous, log a
 * fallback event. Better to under-show than mis-show.
 */
export interface ViewerVisibleBeacon {
  /** Stable beacon id (used for §3.3 fallback tie-break + cache hashing). */
  id: string;

  /** Owner of the beacon. NEVER rendered in cluster preview — used only for
   *  mutual-set computation and "is viewer's own beacon?" check. */
  owner_id: string;

  intent: Intent;

  /** D48 §2 register. `null` / `undefined` triggers default-down. */
  exposure_register: ExposureRegister | null | undefined;

  /** D48 §3.3 gate 1. `null` triggers default-down. */
  viewer_trust_state: ViewerTrustState | null | undefined;

  /** D48 §3.3 gate 2. `null` triggers default-down. */
  proximity_band: ProximityBand | null | undefined;

  /** §3.3 representative cascade — level 1 (explicit priority class).
   *  Curated / venue / operator beacons rank higher. Standard = 0. */
  priority_class: number;

  /** §3.3 representative cascade — level 2 (safety eligibility gate composite). */
  safety_eligibility: boolean;

  /** §3.3 representative cascade — level 3 (activity / freshness, 0..1). */
  freshness_score: number;

  /**
   * D48 §3.3 gate 4 — has the user explicitly opted in to face exposure on
   * the CLUSTER-PREVIEW surface, at this intent?
   *
   * Per-surface is intentionally explicit. Opt-in on profile-sheet does NOT
   * imply opt-in on cluster-preview. `null` triggers default-down.
   */
  per_surface_consent_cluster_preview: boolean | null | undefined;

  /** Only consulted if this beacon is selected as representative. */
  avatar_url?: string | null;
}

/** Viewer context passed alongside the beacon list. */
export interface ViewerContext {
  /** Viewer's own auth id. `null` for unauthenticated viewers. Used to
   *  exclude viewer's own beacon from representative eligibility (§3.4). */
  viewer_id: string | null;
}

// ─── outputs ─────────────────────────────────────────────────────────────────

export interface IntentCount {
  intent: Intent;
  count: number;
}

/**
 * Per-beacon gate trace. One entry per beacon evaluated, in input order.
 *
 * Per §7.1 implementation requirements, this MUST appear in the composer
 * output so every face_avatar render path is audit-visible. Any reviewer
 * of an implementation PR can answer D48 §5.1's canonical question
 * (*"Did the user opt into face exposure for this surface, at this intent,
 * under these conditions?"*) by reading the gate trace alone.
 */
export interface GateTraceEntry {
  beacon_id: string;
  intent: Intent;

  /** D48 §3.3 gate 1 — viewer trust. */
  gate_1_trust: 'pass' | 'step_down' | 'uncertain';

  /** D48 §3.3 gate 2 — proximity. */
  gate_2_proximity: 'pass' | 'step_down' | 'uncertain';

  /**
   * D48 §3.3 gate 3 — zoom. Cluster-preview is by definition a low-zoom
   * artifact, so this gate is STRUCTURALLY 'step_down' for every beacon
   * in this surface (§3.2 of the slice scope). Recorded for completeness
   * + future-proofing.
   */
  gate_3_zoom: 'step_down';

  /** D48 §3.3 gate 4 — per-surface consent. */
  gate_4_consent: 'pass' | 'step_down' | 'uncertain';

  /** The register this beacon contributes to the preview after gating. */
  final_register: ExposureRegister;

  /**
   * Whether this beacon is eligible to be selected as the cluster's single
   * representative. False for:
   *  - aftercare (§3.2 structural forbiddance)
   *  - viewer's own beacon (§3.4 substrate protection)
   *  - any beacon whose face_avatar gates 1/2/4 don't all pass
   *  - any beacon with no avatar_url
   */
  eligible_for_face: boolean;

  /** Human-readable reason, for audit + telemetry. */
  reason: string;
}

/**
 * The composer's output. This object is what `ClusterPreviewChip` and the
 * a11y row consume — both treat it as their single source of truth.
 */
export interface ClusterPreviewState {
  /** Same value as `topology_hash`. Convenience handle for callers that
   *  identify clusters by id rather than by hash. */
  cluster_id: string;

  count: number;

  /** Per-intent count breakdown, in `ALL_INTENTS` order, omitting zero counts. */
  intent_mix: IntentCount[];

  /** Single representative (§3.3 cascade). `null` if no face-eligible beacon. */
  representative: { beacon_id: string; avatar_url: string } | null;

  /**
   * Special copy override.
   *
   * Currently used only for the aftercare-only-cluster case (§5 edge cases),
   * where the line "Care held here" is canonical (ratified §9.2). Render
   * surfaces show this copy in place of the intent mix for that cluster.
   */
  special_copy: string | null;

  /** Per-beacon audit trail. Same length as the input `beacons` array. */
  gate_trace: GateTraceEntry[];

  /** Stable hash of the cluster's topology. Used by the continuity cache
   *  (§3.5) — equal hash + same viewer = same composed state. */
  topology_hash: string;

  /** Epoch milliseconds when this state was composed. */
  composed_at: number;
}

// ─── telemetry ───────────────────────────────────────────────────────────────

/**
 * Emitted whenever the composer steps a beacon down due to a missing /
 * uncertain signal. Wired to a callback so the composer stays pure — the
 * caller decides where to log (Sentry, Supabase telemetry, console).
 *
 * Per §11 of the scope, the uncertainty fallback rate is a tracked KPI:
 * elevated rates indicate upstream D48 pipeline health issues.
 */
export interface UncertaintyFallbackEvent {
  beacon_id: string;
  intent: Intent;
  reason:
    | 'missing_exposure_register'
    | 'missing_trust_state'
    | 'missing_proximity'
    | 'missing_consent';
}

// ─── constants ───────────────────────────────────────────────────────────────

/** Canonical intent ordering for the intent-mix breakdown. Stable. */
export const ALL_INTENTS: readonly Intent[] = [
  'looking',
  'hosting',
  'cruising',
  'aftercare',
  'quiet_hold',
  'arriving',
  'market',
] as const;

/** Ratified §9.2 — the canonical aftercare-only-cluster line. */
export const AFTERCARE_HELD_HERE = 'Care held here';
