/**
 * D43 Slice A · PR 3 · Mapbox-cluster-leaf → ViewerVisibleBeacon shaping helper.
 *
 * The composer (`composeClusterPreview`) is upstream-agnostic by design — it
 * accepts the `ViewerVisibleBeacon` contract and doesn't care where the rows
 * came from. This file is the adapter between Mapbox's cluster-source leaf
 * feature shape (what `source.getClusterLeaves()` returns) and the composer's
 * input contract.
 *
 * Doctrine refs: D43, D48 §3.1/§3.4, sacred-invariants Constitutional Substrate.
 *
 * Per scope §3.4 default-down: any signal we don't have on the Mapbox feature
 * MUST be left null/undefined so the composer steps the beacon down to the
 * most-protective register. The current public GeoJSON pipeline (D48 Slice 1)
 * emits these properties only:
 *
 *   id, owner_id, cat, beacon_category, color, title, ends_at_ms, priority,
 *   glow, identity_mode, exposure_register, intent (added in PR 3)
 *
 * Properties NOT on the feature today (and therefore null here):
 *
 *   - viewer_trust_state (needs viewer-side join — D08 mutual lookup)
 *   - proximity_band     (needs viewer location vs beacon distance calc)
 *   - per_surface_consent_cluster_preview (consent UI not shipped yet —
 *     when nobody has opted in, default-down produces faceless previews,
 *     which is the correct behaviour per substrate)
 *   - avatar_url         (not in public GeoJSON — would need a viewer-side
 *     join against profiles; deferred to a later slice)
 *
 * The composer's §3.4 default-down rule converts every null → step down,
 * so today every cluster preview renders as count + intent mix with no
 * representative. That's correct: face exposure on cluster preview requires
 * an explicit opt-in surface that doesn't exist yet. Once Slice G ships
 * the consent UI, this shaper picks up the per-surface consent + avatar_url
 * and face-eligible beacons start surfacing through the composer naturally.
 */

import type { Intent, ViewerVisibleBeacon } from './types';

// ─── normalisation ───────────────────────────────────────────────────────────

const KNOWN_INTENTS: ReadonlyArray<Intent> = [
  'looking',
  'hosting',
  'cruising',
  'aftercare',
  'quiet_hold',
  'arriving',
  'market',
];

const KNOWN_INTENT_SET: ReadonlySet<string> = new Set(KNOWN_INTENTS);

/**
 * Best-effort intent extraction with graceful fallback.
 *
 * Priority order:
 *   1. Explicit `intent` property (D12 first-class — added to GeoJSON in PR 3)
 *   2. Aftercare detection via `cat` or `beacon_category` (substrate-protect)
 *   3. Fallback to 'looking' as the generic-presence intent
 *
 * Fallback choice rationale: 'looking' is the most-protective default intent
 * for representative-eligibility — it doesn't open the aftercare structural
 * forbiddance path AND it doesn't claim more-specific social acts (hosting,
 * cruising) that the beacon didn't actually claim.
 */
function normaliseIntent(props: Record<string, unknown>): Intent {
  const raw = String(props['intent'] ?? '').toLowerCase().trim();
  if (KNOWN_INTENT_SET.has(raw)) return raw as Intent;

  // Aftercare leaks via cat / beacon_category — keep the protective routing
  // even when the intent string itself isn't yet on the leaf properties.
  const cat = String(props['cat'] ?? '').toLowerCase();
  const beaconCat = String(props['beacon_category'] ?? '').toLowerCase();
  if (cat === 'care' || beaconCat === 'aftercare' || beaconCat === 'recovery') {
    return 'aftercare';
  }

  return 'looking';
}

/**
 * Derive a freshness_score in [0, 1] from `ends_at_ms`.
 *
 * The cluster source doesn't carry a real activity signal — `priority` is a
 * static field set at beacon drop time, and there's no per-beacon engagement
 * stream in the GeoJSON layer. So we use the only temporal signal available:
 * how much of the beacon's 4-hour-default lifetime remains.
 *
 * Beacons that just dropped have the highest freshness; beacons near
 * expiry score lowest. The composer uses this as the level-3 tie-break in
 * the §3.3 representative cascade.
 *
 * If `ends_at_ms` is missing we return 0.5 (neutral) so the beacon competes
 * fairly but doesn't dominate.
 */
function freshnessFromEndsAt(endsAtMs: unknown, now: number): number {
  const end = Number(endsAtMs);
  if (!Number.isFinite(end) || end <= 0) return 0.5;
  const remaining = end - now;
  if (remaining <= 0) return 0; // expired
  // Default beacon TTL is 4h per BeaconDropModal — anything fresher than that
  // pegs at 1.0 (recent drop), anything close to expiring drops toward 0.
  const ttlMs = 4 * 60 * 60 * 1000;
  const score = Math.min(1, remaining / ttlMs);
  return score;
}

// ─── shaper ──────────────────────────────────────────────────────────────────

/**
 * Mapbox cluster leaf feature → ViewerVisibleBeacon.
 *
 * The `feature` argument is the shape returned by Mapbox's
 * `source.getClusterLeaves(clusterId, limit, offset, callback)`. Specifically
 * a GeoJSON Feature with `properties` populated by `toPublicSafeFeatureCollection`
 * in `src/lib/globe/mapboxLayerStack.js`.
 *
 * Signals not present today are returned as null/undefined so the composer's
 * §3.4 default-down branch fires. This is the correct behaviour while the
 * D48 per-surface consent UI hasn't shipped — every face_avatar render path
 * answers §5.1's canonical question with "step_down" until the upstream
 * data layer can answer "yes".
 */
export interface ClusterLeafFeature {
  properties?: Record<string, unknown>;
  geometry?: { type: string; coordinates: [number, number] };
}

export interface ShapeOptions {
  /** Inject a `now` for deterministic snapshot tests; default `Date.now()`. */
  now?: () => number;
}

export function mapboxLeafToBeacon(
  feature: ClusterLeafFeature,
  options: ShapeOptions = {},
): ViewerVisibleBeacon {
  const props = feature?.properties ?? {};
  const now = (options.now ?? Date.now)();

  return {
    id: String(props['id'] ?? ''),
    owner_id: String(props['owner_id'] ?? ''),
    intent: normaliseIntent(props),

    // exposure_register IS on the leaf (D48 Slice 1). Pass through — the
    // composer compares it but the per-gate eligibility for face_avatar
    // depends on the four gates, not on this register directly.
    exposure_register: (props['exposure_register'] as ViewerVisibleBeacon['exposure_register']) ?? null,

    // Viewer-side signals — null by design until upstream surfaces ship.
    // §3.4 default-down handles every null → step down.
    viewer_trust_state: null,
    proximity_band: null,
    per_surface_consent_cluster_preview: null,
    avatar_url: null,

    // priority_class — the GeoJSON's `priority` is signal-economics priority
    // (curated > standard). Use it directly as the level-1 representative
    // cascade input.
    priority_class: Number.isFinite(Number(props['priority'])) ? Number(props['priority']) : 0,

    // safety_eligibility — public-safe pipeline already filters private
    // safety beacons. Anything reaching the cluster source has passed
    // upstream RLS + isPrivate(). True by default.
    safety_eligibility: true,

    freshness_score: freshnessFromEndsAt(props['ends_at_ms'], now),
  };
}

/**
 * Convenience: shape an array of leaves in one call.
 */
export function mapboxLeavesToBeacons(
  features: readonly ClusterLeafFeature[],
  options: ShapeOptions = {},
): ViewerVisibleBeacon[] {
  return features.map((f) => mapboxLeafToBeacon(f, options));
}
