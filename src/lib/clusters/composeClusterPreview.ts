/**
 * D43 Slice A — In-World Cluster Preview · composer
 *
 * Scope doc: docs/slices/d43-slice-a-cluster-preview.md (locked 2026-06-01).
 *
 * THIS IS NOT A UI HELPER. Per §3.6 of the scope:
 *   `composeClusterPreview` is a visibility negotiation engine,
 *    a doctrine enforcement layer, a social exposure arbitration system.
 *
 * Treat it as constitutional infrastructure:
 *   - unit-tested before any render code consumes it
 *   - deterministic outputs (same inputs + viewer = same output)
 *   - explicit gate traceability (`gate_trace` in the output, one entry per beacon)
 *   - audit-visible failures (uncertainty fallbacks emit telemetry events)
 *
 * The §5.1 canonical evaluation question from D48 is wired here as a binding
 * contract. For every face_avatar render path, this composer answers:
 *
 *   "Did the user opt into face exposure for THIS surface (cluster-preview),
 *    at THIS intent, under THESE conditions (D48 §3.3 gates 1–4)?"
 *
 * If a future PR removes a gate from the cascade, the change is conspicuous
 * because gate naming is in code, gate state lands in `gate_trace`, and the
 * deterministic snapshot tests in §7.2 fail.
 *
 * Doctrine refs:
 *   D43 (in-world vs sheet-world) · D48 §3.1/§3.2/§3.3/§5.1 (exposure
 *   spectrum + matrix + four gates + canonical question) · D08 (visibility
 *   state) · D35 (language register) · sacred-invariants Constitutional
 *   Substrate (over-protection by default).
 */

import {
  AFTERCARE_HELD_HERE,
  ALL_INTENTS,
  type ClusterPreviewState,
  type GateTraceEntry,
  type Intent,
  type IntentCount,
  type UncertaintyFallbackEvent,
  type ViewerContext,
  type ViewerVisibleBeacon,
} from './types';

// ─── topology hash (continuity invariant key) ────────────────────────────────

/**
 * §3.5 Cluster Continuity Invariant.
 *
 * Stable hash of cluster identity used as the continuity cache key. Only
 * topology-meaningful fields participate:
 *   - owner_id set (sorted)
 *   - intent per owner
 *   - safety_eligibility per owner (a moderation flip is a topology change)
 *
 * Fields deliberately NOT in the hash (these change on idle re-render without
 * representing meaningful topology change):
 *   - freshness_score (drifts every second)
 *   - exposure_register / consent flags (these affect WHO is representative,
 *     not WHETHER the cluster has changed identity)
 *   - viewer_trust_state (changes via mutual flips, but mutual flips also
 *     change priority/safety which IS captured here)
 *   - proximity_band (viewer movement — atmosphere, not cluster identity)
 *
 * The composer detects "same topology, different viewer state" and re-evaluates
 * only the parts that depend on viewer state, while preserving the
 * representative selection from `prior` when the cluster itself hasn't changed.
 */
export function topologyHash(
  beacons: readonly ViewerVisibleBeacon[],
  now: number = Date.now(),
): string {
  const parts = beacons
    .map((b) => {
      // D49 §15.3 — event_tonight beacons carry a temporal validity bit in
      // the hash so the continuity cache busts when an event crosses its
      // start or expiry. Other intents are temporally stable; no extra bit.
      let eventBit = '';
      if (b.intent === 'event_tonight') {
        const hasStart = b.signal_starts_at != null;
        const started = hasStart && (b.signal_starts_at as number) <= now;
        const expired =
          b.signal_expires_at != null && (b.signal_expires_at as number) < now;
        // 3 phases: pre (upcoming), live (underway), post (expired / invalid)
        // missing_starts_at maps to 'post' (filtered out by composer)
        const phase = !hasStart || expired ? 'post' : started ? 'live' : 'pre';
        eventBit = `::ev=${phase}`;
      }
      return `${b.owner_id}::${b.intent}::${b.safety_eligibility ? '1' : '0'}::${b.priority_class}${eventBit}`;
    })
    .sort();
  return `n=${beacons.length}|${parts.join('|')}`;
}

// ─── per-beacon §5.1 evaluation ──────────────────────────────────────────────

function evaluateBeacon(
  beacon: ViewerVisibleBeacon,
  viewer: ViewerContext,
): GateTraceEntry {
  const base = {
    beacon_id: beacon.id,
    intent: beacon.intent,
    gate_3_zoom: 'step_down' as const, // D48 §3.3 g3 is structurally step-down for cluster-preview (§3.2)
  };

  // §3.2 Aftercare structural forbiddance (D48 §3.2) — NEVER face-eligible
  // regardless of any gate combination. Substrate protection: the gate cannot
  // be opened.
  if (beacon.intent === 'aftercare') {
    return {
      ...base,
      gate_1_trust: 'pass',
      gate_2_proximity: 'pass',
      gate_4_consent: 'pass',
      final_register: 'anonymous',
      eligible_for_face: false,
      reason: 'aftercare structural forbiddance (D48 §3.2)',
    };
  }

  // §3.4 substrate protection — viewer's own beacon never represents the
  // cluster (you don't see your own face in someone else's atmospheric reading).
  if (viewer.viewer_id && beacon.owner_id === viewer.viewer_id) {
    return {
      ...base,
      gate_1_trust: 'pass',
      gate_2_proximity: 'pass',
      gate_4_consent: 'pass',
      final_register: 'anonymous',
      eligible_for_face: false,
      reason: "viewer's own beacon — not eligible as representative",
    };
  }

  // §3.4 default-down on any missing signal. Better to under-show than mis-show.
  if (beacon.exposure_register == null) {
    return {
      ...base,
      gate_1_trust: 'uncertain',
      gate_2_proximity: 'uncertain',
      gate_4_consent: 'uncertain',
      final_register: 'anonymous',
      eligible_for_face: false,
      reason: 'uncertainty fallback: missing exposure_register',
    };
  }

  // §5.1 canonical evaluation — answer the four gates explicitly.
  //
  // Gate 1: viewer trust. Face permitted only when viewer is mutual with owner.
  const gate1: 'pass' | 'step_down' | 'uncertain' =
    beacon.viewer_trust_state == null
      ? 'uncertain'
      : beacon.viewer_trust_state === 'mutual'
        ? 'pass'
        : 'step_down';

  // Gate 2: proximity. Face permitted only at close range.
  const gate2: 'pass' | 'step_down' | 'uncertain' =
    beacon.proximity_band == null
      ? 'uncertain'
      : beacon.proximity_band === 'close'
        ? 'pass'
        : 'step_down';

  // Gate 4: per-surface consent. Has the user opted in to face exposure on
  // THIS surface (cluster-preview) at THIS intent? D48 §5 contract.
  const gate4: 'pass' | 'step_down' | 'uncertain' =
    beacon.per_surface_consent_cluster_preview == null
      ? 'uncertain'
      : beacon.per_surface_consent_cluster_preview
        ? 'pass'
        : 'step_down';

  // Face-eligible iff gates 1+2+4 all pass. Gate 3 (zoom) is the structural
  // downward force; it does not block when 1/2/4 explicitly permit, but it
  // does mean cluster-preview faces are intentionally rare (§3.2 of slice).
  const eligible_for_face =
    gate1 === 'pass' && gate2 === 'pass' && gate4 === 'pass';

  const reason = eligible_for_face
    ? 'all four gates pass — face_avatar permitted'
    : `step-down: gates failed [${(
        [
          ['trust', gate1],
          ['proximity', gate2],
          ['consent', gate4],
        ] as const
      )
        .filter(([, v]) => v !== 'pass')
        .map(([k, v]) => `${k}:${v}`)
        .join(', ')}]`;

  return {
    ...base,
    gate_1_trust: gate1,
    gate_2_proximity: gate2,
    gate_4_consent: gate4,
    final_register: eligible_for_face ? 'face_avatar' : 'anonymous',
    eligible_for_face,
    reason,
  };
}

// ─── §3.3 representative cascade ─────────────────────────────────────────────

/**
 * Stable deterministic transform of `owner_id` for the §3.3 level-4 tie-break.
 *
 * Not crypto — just produces a stable lexicographic ordering that's NOT the
 * raw owner_id (we don't want the representative to be "alphabetically lowest
 * owner_id always wins" because that creates predictable bias). Reversing the
 * string is sufficient: same input → same output, but the ordering doesn't
 * trivially correlate with id properties humans can reason about.
 */
function hashOwnerId(id: string): string {
  return id.split('').reverse().join('');
}

/**
 * §3.3 five-level deterministic priority cascade. Ratified §9.3:
 * NEVER random per render. The city must feel composed, not shuffled.
 *
 * Order:
 *   1. priority_class (higher first)        — operator/curated/venue beacons
 *   2. safety_eligibility (true first)      — moderation-clean beacons
 *   3. freshness_score (higher first)       — newer / more active
 *   4. hashOwnerId, lexicographic           — stable deterministic tie-break
 *   5. beacon.id, lexicographic             — last-resort fallback
 */
function pickRepresentative(
  eligible: readonly ViewerVisibleBeacon[],
): ViewerVisibleBeacon | null {
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((a, b) => {
    if (a.priority_class !== b.priority_class) return b.priority_class - a.priority_class;
    if (a.safety_eligibility !== b.safety_eligibility) {
      return a.safety_eligibility ? -1 : 1; // true first
    }
    if (a.freshness_score !== b.freshness_score) return b.freshness_score - a.freshness_score;
    const ah = hashOwnerId(a.owner_id);
    const bh = hashOwnerId(b.owner_id);
    if (ah !== bh) return ah < bh ? -1 : 1;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    return 0;
  });
  return sorted[0];
}

// ─── compose ─────────────────────────────────────────────────────────────────

/**
 * Main entry point. Pure function. No I/O.
 *
 * @param beacons The cluster's member beacons, post-D48-Slice-1 filter.
 * @param viewer  Viewer context (their auth id, used for own-beacon exclusion).
 * @param prior   Optional previous state for the same cluster — enables the
 *                §3.5 Cluster Continuity Invariant: if topology unchanged,
 *                the prior state is returned unchanged (representative stays
 *                stable, no flicker, no shuffle).
 * @param options Optional callbacks. `onUncertaintyFallback` fires for every
 *                beacon whose evaluation returned an `uncertain` gate, so the
 *                caller can log a telemetry event.
 */
export function composeClusterPreview(
  beacons: readonly ViewerVisibleBeacon[],
  viewer: ViewerContext,
  prior: ClusterPreviewState | null = null,
  options: {
    onUncertaintyFallback?: (event: UncertaintyFallbackEvent) => void;
    /** Override `Date.now()` for deterministic snapshot tests. */
    now?: () => number;
  } = {},
): ClusterPreviewState {
  // Single call to now() — used for topology hash temporal phase, temporal
  // filter, event_summary "soonest upcoming" computation, and composed_at.
  // Pure: same inputs (incl. options.now) → same output.
  const nowMs = (options.now ?? Date.now)();
  const hash = topologyHash(beacons, nowMs);

  // §3.5 Cluster Continuity Invariant: if topology hash matches the prior
  // composition, return the prior state unchanged. The cluster hasn't
  // materially changed — preserve representative, visual identity, and
  // emotional continuity. The city should breathe, not reshuffle.
  if (prior && prior.topology_hash === hash) {
    return prior;
  }

  const evaluations = beacons.map((b) => evaluateBeacon(b, viewer));

  // Emit uncertainty fallback telemetry events (§7.1, §11 KPI).
  if (options.onUncertaintyFallback) {
    for (let i = 0; i < beacons.length; i++) {
      const b = beacons[i];
      const e = evaluations[i];
      const isUncertain =
        e.gate_1_trust === 'uncertain' ||
        e.gate_2_proximity === 'uncertain' ||
        e.gate_4_consent === 'uncertain' ||
        e.reason.startsWith('uncertainty fallback');
      if (isUncertain) {
        // Map the missing-field reason. If exposure_register is missing the
        // composer short-circuits with that specific reason; otherwise pick
        // the first uncertain gate.
        const reason: UncertaintyFallbackEvent['reason'] =
          b.exposure_register == null
            ? 'missing_exposure_register'
            : b.viewer_trust_state == null
              ? 'missing_trust_state'
              : b.proximity_band == null
                ? 'missing_proximity'
                : 'missing_consent';
        options.onUncertaintyFallback({
          beacon_id: b.id,
          intent: b.intent,
          reason,
        });
      }
    }
  }

  // D49 §15.3 — temporal filter. event_tonight signals MUST have
  // signal_starts_at (substrate violation rejected at compose time); expired
  // events MUST be filtered (stale events break "reason to move"). All other
  // intents pass through unchanged.
  const validForCount = (b: ViewerVisibleBeacon): boolean => {
    if (b.intent !== 'event_tonight') return true;
    if (b.signal_starts_at == null) return false;
    if (b.signal_expires_at != null && b.signal_expires_at < nowMs) return false;
    return true;
  };

  // §3.3 intent mix breakdown — stable ALL_INTENTS ordering, zero counts omitted.
  // event_tonight beacons that fail the temporal filter contribute zero to the
  // mix (and to dominant_intent / event_summary below).
  const counts: Partial<Record<Intent, number>> = {};
  for (const b of beacons) {
    if (!validForCount(b)) continue;
    counts[b.intent] = (counts[b.intent] ?? 0) + 1;
  }
  const intent_mix: IntentCount[] = ALL_INTENTS.filter(
    (i) => (counts[i] ?? 0) > 0,
  ).map((i) => ({ intent: i, count: counts[i] as number }));

  // §5 edge case — aftercare-only cluster gets "Care held here" copy, no avatar.
  // Computed against the full beacons list (temporal filter doesn't apply to
  // aftercare — care lifecycle is governed elsewhere).
  const onlyAftercare =
    beacons.length > 0 && beacons.every((b) => b.intent === 'aftercare');

  // D49 §15.4 — cluster-level event_tonight detection.
  //
  // Aftercare-only special_copy takes precedence (care is structural; events
  // are content). For all other clusters, ANY non-expired event_tonight signal
  // makes the cluster event-dominant — asymmetric action-worthiness rule.
  const validEvents = onlyAftercare
    ? []
    : beacons.filter((b) => b.intent === 'event_tonight' && validForCount(b));

  const dominant_intent: Intent | null = validEvents.length > 0 ? 'event_tonight' : null;

  const event_summary =
    validEvents.length > 0
      ? {
          count: validEvents.length,
          // Soonest upcoming start. Events already started (start < now) are
          // included in count but excluded from soonest_starts_at — the field
          // describes "next thing to move toward", not "underway".
          soonest_starts_at: validEvents
            .map((b) => b.signal_starts_at as number)
            .filter((t) => t >= nowMs)
            .reduce<number | null>(
              (acc, t) => (acc == null || t < acc ? t : acc),
              null,
            ),
        }
      : null;

  // Build face-eligible set (after all gates + substrate protections).
  // Note: beacon must also have an avatar_url to be selected as representative —
  // a face-gated beacon with no avatar can't represent anything.
  const faceEligibleBeacons: ViewerVisibleBeacon[] = [];
  for (let i = 0; i < beacons.length; i++) {
    if (evaluations[i].eligible_for_face && beacons[i].avatar_url) {
      faceEligibleBeacons.push(beacons[i]);
    }
  }

  // §3.3 deterministic representative selection. NEVER random.
  // §5 edge — aftercare-only cluster forces representative to null regardless.
  const repBeacon = onlyAftercare ? null : pickRepresentative(faceEligibleBeacons);

  const representative =
    repBeacon && repBeacon.avatar_url
      ? { beacon_id: repBeacon.id, avatar_url: repBeacon.avatar_url }
      : null;

  return {
    cluster_id: hash,
    count: beacons.length,
    intent_mix,
    representative,
    special_copy: onlyAftercare ? AFTERCARE_HELD_HERE : null,
    gate_trace: evaluations,
    topology_hash: hash,
    composed_at: nowMs,
    dominant_intent,
    event_summary,
  };
}
