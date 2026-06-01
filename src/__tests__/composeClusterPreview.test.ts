/**
 * D43 Slice A — composer acceptance seeds.
 *
 * Implements all 7 acceptance seeds from §7.2 of the locked scope doc
 * (docs/slices/d43-slice-a-cluster-preview.md). Each test corresponds 1:1
 * to a seed and is named accordingly. Failures here mean a doctrine
 * regression — fix the composer, not the test.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  composeClusterPreview,
  topologyHash,
} from '@/lib/clusters/composeClusterPreview';
import {
  AFTERCARE_HELD_HERE,
  type Intent,
  type ProximityBand,
  type UncertaintyFallbackEvent,
  type ViewerContext,
  type ViewerTrustState,
  type ViewerVisibleBeacon,
} from '@/lib/clusters/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const FIXED_NOW = 1_780_000_000_000;
const now = () => FIXED_NOW;

const STRANGER_VIEWER: ViewerContext = { viewer_id: 'viewer-alpha' };

/**
 * Make a beacon with sensible defaults; pass an overrides object to vary
 * specific fields. Defaults compose a "stranger, far, no consent, no
 * avatar" beacon — i.e. one that should NEVER be face-eligible.
 */
function makeBeacon(over: Partial<ViewerVisibleBeacon>): ViewerVisibleBeacon {
  return {
    id: 'b-default',
    owner_id: 'owner-default',
    intent: 'looking',
    exposure_register: 'anonymous',
    viewer_trust_state: 'stranger',
    proximity_band: 'far',
    priority_class: 0,
    safety_eligibility: true,
    freshness_score: 0.5,
    per_surface_consent_cluster_preview: false,
    avatar_url: undefined,
    ...over,
  };
}

/**
 * A "fully opted-in" beacon — gates 1+2+4 all pass. Used in seed 2 where
 * the viewer is mutual with this owner at close range + cluster-preview
 * face opt-in.
 */
function makeFullyEligibleBeacon(over: Partial<ViewerVisibleBeacon>): ViewerVisibleBeacon {
  return makeBeacon({
    exposure_register: 'face_avatar',
    viewer_trust_state: 'mutual',
    proximity_band: 'close',
    per_surface_consent_cluster_preview: true,
    avatar_url: 'https://example.com/avatar.jpg',
    ...over,
  });
}

// ─── seed 1 ──────────────────────────────────────────────────────────────────

describe('seed 1 — Soho cluster, mixed intents, none with face opt-in', () => {
  it('returns count + intent mix + no representative', () => {
    const beacons: ViewerVisibleBeacon[] = [
      makeBeacon({ id: 'b1', owner_id: 'o1', intent: 'looking' }),
      makeBeacon({ id: 'b2', owner_id: 'o2', intent: 'looking' }),
      makeBeacon({ id: 'b3', owner_id: 'o3', intent: 'cruising' }),
      makeBeacon({ id: 'b4', owner_id: 'o4', intent: 'cruising' }),
      makeBeacon({ id: 'b5', owner_id: 'o5', intent: 'aftercare' }),
      makeBeacon({ id: 'b6', owner_id: 'o6', intent: 'quiet_hold' }),
    ];

    const state = composeClusterPreview(beacons, STRANGER_VIEWER, null, { now });

    expect(state.count).toBe(6);
    expect(state.intent_mix).toEqual([
      { intent: 'looking', count: 2 },
      { intent: 'cruising', count: 2 },
      { intent: 'aftercare', count: 1 },
      { intent: 'quiet_hold', count: 1 },
    ]);
    expect(state.representative).toBeNull();
    expect(state.special_copy).toBeNull();
    expect(state.composed_at).toBe(FIXED_NOW);
  });
});

// ─── seed 2 ──────────────────────────────────────────────────────────────────

describe('seed 2 — same cluster, but viewer is mutual + close + opted-in on one cruising beacon', () => {
  it('selects that beacon as the representative via §3.3 priority cascade', () => {
    const beacons: ViewerVisibleBeacon[] = [
      makeBeacon({ id: 'b1', owner_id: 'o1', intent: 'looking' }),
      makeBeacon({ id: 'b2', owner_id: 'o2', intent: 'looking' }),
      // Only this one passes all four gates:
      makeFullyEligibleBeacon({
        id: 'b3',
        owner_id: 'o3',
        intent: 'cruising',
        avatar_url: 'https://example.com/o3.jpg',
      }),
      makeBeacon({ id: 'b4', owner_id: 'o4', intent: 'cruising' }),
      makeBeacon({ id: 'b5', owner_id: 'o5', intent: 'aftercare' }),
      makeBeacon({ id: 'b6', owner_id: 'o6', intent: 'quiet_hold' }),
    ];

    const state = composeClusterPreview(beacons, STRANGER_VIEWER, null, { now });

    expect(state.count).toBe(6);
    expect(state.representative).toEqual({
      beacon_id: 'b3',
      avatar_url: 'https://example.com/o3.jpg',
    });
    expect(state.special_copy).toBeNull();
    // Gate trace for b3 should show all four gates pass + face_avatar register.
    const b3Trace = state.gate_trace.find((g) => g.beacon_id === 'b3')!;
    expect(b3Trace.gate_1_trust).toBe('pass');
    expect(b3Trace.gate_2_proximity).toBe('pass');
    expect(b3Trace.gate_3_zoom).toBe('step_down'); // structural for cluster preview
    expect(b3Trace.gate_4_consent).toBe('pass');
    expect(b3Trace.final_register).toBe('face_avatar');
    expect(b3Trace.eligible_for_face).toBe(true);
  });
});

// ─── seed 3 ──────────────────────────────────────────────────────────────────

describe('seed 3 — aftercare-only cluster', () => {
  it('shows "Care held here" and no representative, regardless of gates', () => {
    // Even if these aftercare beacons would normally be face-eligible on a
    // non-aftercare intent, the §3.2 structural forbiddance applies.
    const beacons: ViewerVisibleBeacon[] = [
      makeFullyEligibleBeacon({
        id: 'b1',
        owner_id: 'o1',
        intent: 'aftercare',
        avatar_url: 'https://example.com/o1.jpg',
      }),
      makeFullyEligibleBeacon({
        id: 'b2',
        owner_id: 'o2',
        intent: 'aftercare',
        avatar_url: 'https://example.com/o2.jpg',
      }),
      makeBeacon({ id: 'b3', owner_id: 'o3', intent: 'aftercare' }),
    ];

    const state = composeClusterPreview(beacons, STRANGER_VIEWER, null, { now });

    expect(state.count).toBe(3);
    expect(state.special_copy).toBe(AFTERCARE_HELD_HERE);
    expect(state.representative).toBeNull();
    // Every gate trace entry must show the structural forbiddance.
    for (const t of state.gate_trace) {
      expect(t.eligible_for_face).toBe(false);
      expect(t.reason).toContain('aftercare structural forbiddance');
    }
  });
});

// ─── seed 4 ──────────────────────────────────────────────────────────────────

describe('seed 4 — aftercare-plurality mixed cluster', () => {
  it('counts aftercare normally + no representative (no leader chip exists)', () => {
    const beacons: ViewerVisibleBeacon[] = [
      makeBeacon({ id: 'b1', owner_id: 'o1', intent: 'aftercare' }),
      makeBeacon({ id: 'b2', owner_id: 'o2', intent: 'aftercare' }),
      makeBeacon({ id: 'b3', owner_id: 'o3', intent: 'hosting' }),
      makeBeacon({ id: 'b4', owner_id: 'o4', intent: 'looking' }),
    ];

    const state = composeClusterPreview(beacons, STRANGER_VIEWER, null, { now });

    expect(state.count).toBe(4);
    expect(state.intent_mix).toEqual([
      { intent: 'looking', count: 1 },
      { intent: 'hosting', count: 1 },
      { intent: 'aftercare', count: 2 },
    ]);
    // No representative — hosting/looking aren't face-eligible here.
    expect(state.representative).toBeNull();
    // Not aftercare-only, so no "Care held here" copy.
    expect(state.special_copy).toBeNull();
  });
});

// ─── seed 5 ──────────────────────────────────────────────────────────────────

describe("seed 5 — cluster contains viewer's own beacon", () => {
  it("counts viewer's own beacon but never makes it the representative", () => {
    const beacons: ViewerVisibleBeacon[] = [
      // Viewer's own beacon — fully face-eligible by all four gates, but
      // substrate protection (§3.4) excludes from representative.
      makeFullyEligibleBeacon({
        id: 'b-own',
        owner_id: 'viewer-alpha', // matches STRANGER_VIEWER.viewer_id
        intent: 'cruising',
        avatar_url: 'https://example.com/own.jpg',
      }),
      // Another fully face-eligible beacon — this should win.
      makeFullyEligibleBeacon({
        id: 'b-other',
        owner_id: 'other-owner',
        intent: 'cruising',
        avatar_url: 'https://example.com/other.jpg',
      }),
    ];

    const state = composeClusterPreview(beacons, STRANGER_VIEWER, null, { now });

    expect(state.count).toBe(2);
    expect(state.representative).toEqual({
      beacon_id: 'b-other',
      avatar_url: 'https://example.com/other.jpg',
    });
    // Gate trace for viewer's own beacon names the substrate reason.
    const ownTrace = state.gate_trace.find((g) => g.beacon_id === 'b-own')!;
    expect(ownTrace.eligible_for_face).toBe(false);
    expect(ownTrace.reason).toContain("viewer's own beacon");
  });
});

// ─── seed 6 ──────────────────────────────────────────────────────────────────

describe('seed 6 — uncertainty fallback (missing signals)', () => {
  it('defaults down to anonymous, atmosphere survives, telemetry fires', () => {
    const beacons: ViewerVisibleBeacon[] = [
      // All face-eligible by trust+proximity flags, but exposure_register
      // signal returns undefined — default-down per §3.4.
      makeBeacon({
        id: 'b1',
        owner_id: 'o1',
        intent: 'cruising',
        viewer_trust_state: 'mutual',
        proximity_band: 'close',
        per_surface_consent_cluster_preview: true,
        avatar_url: 'https://example.com/o1.jpg',
        exposure_register: undefined,
      }),
      makeBeacon({
        id: 'b2',
        owner_id: 'o2',
        intent: 'looking',
        viewer_trust_state: 'mutual',
        proximity_band: 'close',
        per_surface_consent_cluster_preview: true,
        avatar_url: 'https://example.com/o2.jpg',
        exposure_register: undefined,
      }),
    ];

    const onUncertaintyFallback = vi.fn();
    const state = composeClusterPreview(beacons, STRANGER_VIEWER, null, {
      now,
      onUncertaintyFallback,
    });

    // Atmosphere (count + intent_mix) survives.
    expect(state.count).toBe(2);
    expect(state.intent_mix.length).toBeGreaterThan(0);
    // No representative — default-down wins.
    expect(state.representative).toBeNull();
    // Every gate trace shows uncertainty.
    for (const t of state.gate_trace) {
      expect(t.eligible_for_face).toBe(false);
      expect(t.reason).toMatch(/uncertainty fallback/);
      expect(t.final_register).toBe('anonymous');
    }
    // Telemetry: one event per beacon.
    expect(onUncertaintyFallback).toHaveBeenCalledTimes(2);
    const events = onUncertaintyFallback.mock.calls.map((c) => c[0] as UncertaintyFallbackEvent);
    expect(events.every((e) => e.reason === 'missing_exposure_register')).toBe(true);
  });
});

// ─── seed 7 ──────────────────────────────────────────────────────────────────

describe('seed 7 — cluster churn without topology change (continuity invariant)', () => {
  it('returns the SAME state object when topology is unchanged (§3.5)', () => {
    const beacons: ViewerVisibleBeacon[] = [
      makeFullyEligibleBeacon({
        id: 'b1',
        owner_id: 'o1',
        intent: 'cruising',
        avatar_url: 'https://example.com/o1.jpg',
        freshness_score: 0.4,
      }),
      makeFullyEligibleBeacon({
        id: 'b2',
        owner_id: 'o2',
        intent: 'cruising',
        avatar_url: 'https://example.com/o2.jpg',
        freshness_score: 0.4,
      }),
      makeBeacon({ id: 'b3', owner_id: 'o3', intent: 'looking' }),
    ];

    const first = composeClusterPreview(beacons, STRANGER_VIEWER, null, { now });

    // Simulate a re-fire of the RPC for the same cluster — same owner set,
    // same intents, same safety flags. Freshness drifts (irrelevant to topology
    // hash) but the topology is unchanged.
    const churnedBeacons = beacons.map((b) => ({ ...b, freshness_score: 0.4001 }));

    const second = composeClusterPreview(churnedBeacons, STRANGER_VIEWER, first, {
      now: () => FIXED_NOW + 1000, // even if time passes, prior continuity wins
    });

    // §3.5 — exact same object returned.
    expect(second).toBe(first);
    expect(second.representative).toEqual(first.representative);
    expect(second.composed_at).toBe(first.composed_at); // continuity preserves timestamp too
  });

  it('recomposes when topology actually changes (a beacon arrives)', () => {
    const beacons: ViewerVisibleBeacon[] = [
      makeBeacon({ id: 'b1', owner_id: 'o1', intent: 'looking' }),
      makeBeacon({ id: 'b2', owner_id: 'o2', intent: 'looking' }),
    ];
    const first = composeClusterPreview(beacons, STRANGER_VIEWER, null, { now });

    const grown: ViewerVisibleBeacon[] = [
      ...beacons,
      makeBeacon({ id: 'b3', owner_id: 'o3', intent: 'cruising' }),
    ];
    const second = composeClusterPreview(grown, STRANGER_VIEWER, first, {
      now: () => FIXED_NOW + 1000,
    });

    expect(second).not.toBe(first);
    expect(second.count).toBe(3);
    expect(second.topology_hash).not.toBe(first.topology_hash);
  });
});

// ─── determinism ─────────────────────────────────────────────────────────────

describe('determinism (§3.6 constitutional infrastructure requirement)', () => {
  it('same inputs + same viewer = same output across repeated calls', () => {
    const beacons: ViewerVisibleBeacon[] = [
      makeFullyEligibleBeacon({
        id: 'b1',
        owner_id: 'alpha',
        avatar_url: 'a.jpg',
      }),
      makeFullyEligibleBeacon({
        id: 'b2',
        owner_id: 'beta',
        avatar_url: 'b.jpg',
      }),
      makeFullyEligibleBeacon({
        id: 'b3',
        owner_id: 'gamma',
        avatar_url: 'g.jpg',
      }),
    ];

    const runs = Array.from({ length: 10 }, () =>
      composeClusterPreview(beacons, STRANGER_VIEWER, null, { now }),
    );

    const reps = runs.map((r) => r.representative?.beacon_id);
    // All runs produce the same representative — never random.
    expect(new Set(reps).size).toBe(1);
  });
});

// ─── topology hash sanity ────────────────────────────────────────────────────

describe('topologyHash', () => {
  it('is stable across reorderings of the same beacon set', () => {
    const a = makeBeacon({ id: 'a', owner_id: 'o-a', intent: 'looking' });
    const b = makeBeacon({ id: 'b', owner_id: 'o-b', intent: 'cruising' });
    expect(topologyHash([a, b])).toBe(topologyHash([b, a]));
  });

  it('changes when a moderation flip changes safety_eligibility', () => {
    const safe = makeBeacon({ id: 'b', owner_id: 'o', safety_eligibility: true });
    const unsafe = { ...safe, safety_eligibility: false };
    expect(topologyHash([safe])).not.toBe(topologyHash([unsafe]));
  });

  it('does NOT change when freshness_score drifts', () => {
    const a = makeBeacon({ id: 'b', owner_id: 'o', freshness_score: 0.1 });
    const b = { ...a, freshness_score: 0.9 };
    expect(topologyHash([a])).toBe(topologyHash([b]));
  });
});

// ─── D49 §15 — event_tonight intent class ────────────────────────────────────

describe('D49 §15 event_tonight intent class', () => {
  // Anchor times around FIXED_NOW so tests are deterministic.
  const PRE = FIXED_NOW + 60 * 60 * 1000; // 1h from now
  const LIVE_START = FIXED_NOW - 30 * 60 * 1000; // started 30m ago
  const LIVE_END = FIXED_NOW + 60 * 60 * 1000; // ends in 1h
  const EXPIRED_START = FIXED_NOW - 4 * 60 * 60 * 1000; // started 4h ago
  const EXPIRED_END = FIXED_NOW - 60 * 60 * 1000; // ended 1h ago

  it('non-event clusters return dominant_intent=null and event_summary=null', () => {
    const state = composeClusterPreview(
      [
        makeBeacon({ id: 'b1', owner_id: 'o-1', intent: 'looking' }),
        makeBeacon({ id: 'b2', owner_id: 'o-2', intent: 'cruising' }),
      ],
      STRANGER_VIEWER,
      null,
      { now },
    );
    expect(state.dominant_intent).toBeNull();
    expect(state.event_summary).toBeNull();
  });

  it('a single upcoming event makes the cluster event-dominant (asymmetric rule)', () => {
    const state = composeClusterPreview(
      [
        makeBeacon({ id: 'b1', owner_id: 'o-1', intent: 'looking' }),
        makeBeacon({ id: 'b2', owner_id: 'o-2', intent: 'looking' }),
        makeBeacon({ id: 'b3', owner_id: 'o-3', intent: 'looking' }),
        makeBeacon({ id: 'b4', owner_id: 'o-4', intent: 'looking' }),
        makeBeacon({
          id: 'evt',
          owner_id: 'o-venue',
          intent: 'event_tonight',
          signal_starts_at: PRE,
          signal_expires_at: PRE + 3 * 60 * 60 * 1000,
        }),
      ],
      STRANGER_VIEWER,
      null,
      { now },
    );
    expect(state.dominant_intent).toBe('event_tonight');
    expect(state.event_summary).toEqual({ count: 1, soonest_starts_at: PRE });
  });

  it('expired events are filtered out — no inflation, no dominance', () => {
    const state = composeClusterPreview(
      [
        makeBeacon({ id: 'b1', owner_id: 'o-1', intent: 'looking' }),
        makeBeacon({
          id: 'evt-old',
          owner_id: 'o-venue',
          intent: 'event_tonight',
          signal_starts_at: EXPIRED_START,
          signal_expires_at: EXPIRED_END,
        }),
      ],
      STRANGER_VIEWER,
      null,
      { now },
    );
    expect(state.dominant_intent).toBeNull();
    expect(state.event_summary).toBeNull();
    expect(state.intent_mix).toEqual([{ intent: 'looking', count: 1 }]);
  });

  it('event_tonight without signal_starts_at is rejected as substrate violation', () => {
    const state = composeClusterPreview(
      [
        makeBeacon({ id: 'b1', owner_id: 'o-1', intent: 'looking' }),
        makeBeacon({
          id: 'evt-bad',
          owner_id: 'o-venue',
          intent: 'event_tonight',
          // signal_starts_at intentionally omitted
        }),
      ],
      STRANGER_VIEWER,
      null,
      { now },
    );
    expect(state.dominant_intent).toBeNull();
    expect(state.event_summary).toBeNull();
    expect(state.intent_mix).toEqual([{ intent: 'looking', count: 1 }]);
  });

  it('live (already-started, not-expired) event counts but does not contribute to soonest_starts_at', () => {
    const state = composeClusterPreview(
      [
        makeBeacon({
          id: 'live',
          owner_id: 'o-venue-1',
          intent: 'event_tonight',
          signal_starts_at: LIVE_START,
          signal_expires_at: LIVE_END,
        }),
        makeBeacon({
          id: 'upcoming',
          owner_id: 'o-venue-2',
          intent: 'event_tonight',
          signal_starts_at: PRE,
          signal_expires_at: PRE + 60 * 60 * 1000,
        }),
      ],
      STRANGER_VIEWER,
      null,
      { now },
    );
    expect(state.dominant_intent).toBe('event_tonight');
    expect(state.event_summary).toEqual({ count: 2, soonest_starts_at: PRE });
  });

  it('aftercare-only cluster takes precedence over event_tonight — care wins', () => {
    // All aftercare. Mixing aftercare + event_tonight is tested separately;
    // this seed locks the "all-aftercare overrides everything" rule from §5.
    const state = composeClusterPreview(
      [
        makeBeacon({ id: 'a1', owner_id: 'o-1', intent: 'aftercare' }),
        makeBeacon({ id: 'a2', owner_id: 'o-2', intent: 'aftercare' }),
      ],
      STRANGER_VIEWER,
      null,
      { now },
    );
    expect(state.special_copy).toBe(AFTERCARE_HELD_HERE);
    expect(state.dominant_intent).toBeNull();
    expect(state.event_summary).toBeNull();
  });

  it('mixed aftercare + event_tonight is event-dominant (cluster is not aftercare-only)', () => {
    const state = composeClusterPreview(
      [
        makeBeacon({ id: 'a1', owner_id: 'o-1', intent: 'aftercare' }),
        makeBeacon({
          id: 'evt',
          owner_id: 'o-venue',
          intent: 'event_tonight',
          signal_starts_at: PRE,
          signal_expires_at: PRE + 60 * 60 * 1000,
        }),
      ],
      STRANGER_VIEWER,
      null,
      { now },
    );
    expect(state.special_copy).toBeNull();
    expect(state.dominant_intent).toBe('event_tonight');
    expect(state.event_summary).toEqual({ count: 1, soonest_starts_at: PRE });
  });

  it('topology hash changes when an event_tonight crosses from upcoming to live', () => {
    const upcoming = makeBeacon({
      id: 'evt',
      owner_id: 'o-venue',
      intent: 'event_tonight',
      signal_starts_at: FIXED_NOW + 1000, // 1s from now → pre
      signal_expires_at: FIXED_NOW + 60_000,
    });
    const live = { ...upcoming, signal_starts_at: FIXED_NOW - 1000 }; // 1s ago → live
    expect(topologyHash([upcoming], FIXED_NOW)).not.toBe(topologyHash([live], FIXED_NOW));
  });

  it('topology hash unchanged for ambient (non-event) beacons regardless of now', () => {
    const a = makeBeacon({ id: 'b', owner_id: 'o', intent: 'looking' });
    expect(topologyHash([a], 1)).toBe(topologyHash([a], 999_999_999));
  });

  it('continuity cache busts when an event crosses its expiry', () => {
    const pre = makeBeacon({
      id: 'evt',
      owner_id: 'o-venue',
      intent: 'event_tonight',
      signal_starts_at: FIXED_NOW + 1000,
      signal_expires_at: FIXED_NOW + 2000,
    });
    const first = composeClusterPreview([pre], STRANGER_VIEWER, null, { now });
    expect(first.dominant_intent).toBe('event_tonight');

    // Jump time forward past expiry. Same beacon array, but the temporal phase
    // for the event has flipped pre → post, so topologyHash differs and the
    // continuity short-circuit must NOT return the cached state.
    const future = () => FIXED_NOW + 60_000;
    const second = composeClusterPreview([pre], STRANGER_VIEWER, first, { now: future });
    expect(second.topology_hash).not.toBe(first.topology_hash);
    expect(second.dominant_intent).toBeNull();
    expect(second.event_summary).toBeNull();
  });
});
