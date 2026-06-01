/**
 * D43 Slice A · PR 3 · mapboxLeafToBeacon shaping helper — unit tests.
 *
 * Pure-function tests. No Mapbox, no React. Verifies the §3.4 default-down
 * contract at the upstream-shaping layer: every null on a Mapbox leaf becomes
 * the right kind of null on the composer input.
 */

import { describe, expect, it } from 'vitest';
import {
  type ClusterLeafFeature,
  mapboxLeafToBeacon,
  mapboxLeavesToBeacons,
} from '@/lib/clusters/mapboxLeafToBeacon';

const FIXED_NOW = 1_780_000_000_000;
const now = () => FIXED_NOW;

function feat(props: Record<string, unknown>): ClusterLeafFeature {
  return {
    properties: props,
    geometry: { type: 'Point', coordinates: [0, 0] },
  };
}

describe('mapboxLeafToBeacon — intent normalisation', () => {
  it('passes through known intents verbatim', () => {
    for (const i of [
      'looking', 'hosting', 'cruising', 'aftercare',
      'quiet_hold', 'arriving', 'market',
    ]) {
      const out = mapboxLeafToBeacon(feat({ id: 'b', intent: i }), { now });
      expect(out.intent).toBe(i);
    }
  });

  it('falls back to "looking" for unknown intent strings', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b', intent: 'something-weird' }), { now });
    expect(out.intent).toBe('looking');
  });

  it('routes aftercare via cat when intent is missing', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b', cat: 'care' }), { now });
    expect(out.intent).toBe('aftercare');
  });

  it('routes aftercare via beacon_category=aftercare when intent is missing', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b', beacon_category: 'aftercare' }), { now });
    expect(out.intent).toBe('aftercare');
  });

  it('defaults to "looking" with no intent and no aftercare signal', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b' }), { now });
    expect(out.intent).toBe('looking');
  });
});

describe('mapboxLeafToBeacon — §3.4 default-down null propagation', () => {
  it('leaves viewer-side signals null so the composer steps down', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b', intent: 'cruising' }), { now });
    expect(out.viewer_trust_state).toBeNull();
    expect(out.proximity_band).toBeNull();
    expect(out.per_surface_consent_cluster_preview).toBeNull();
    expect(out.avatar_url).toBeNull();
  });

  it('preserves exposure_register from the leaf (D48 Slice 1)', () => {
    const out = mapboxLeafToBeacon(
      feat({ id: 'b', intent: 'cruising', exposure_register: 'persona_shape' }),
      { now },
    );
    expect(out.exposure_register).toBe('persona_shape');
  });

  it('returns null exposure_register when the leaf has none (Infrastructure/Atmosphere modes)', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b', intent: 'aftercare' }), { now });
    expect(out.exposure_register).toBeNull();
  });
});

describe('mapboxLeafToBeacon — priority_class + safety_eligibility', () => {
  it('passes through numeric priority from the leaf', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b', priority: 7 }), { now });
    expect(out.priority_class).toBe(7);
  });

  it('defaults priority_class to 0 when missing or non-numeric', () => {
    expect(mapboxLeafToBeacon(feat({ id: 'b' }), { now }).priority_class).toBe(0);
    expect(mapboxLeafToBeacon(feat({ id: 'b', priority: 'high' }), { now }).priority_class).toBe(0);
  });

  it('marks safety_eligibility=true (the public-safe pipeline already filtered)', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b' }), { now });
    expect(out.safety_eligibility).toBe(true);
  });
});

describe('mapboxLeafToBeacon — freshness_score from ends_at_ms', () => {
  it('returns ~1.0 for a beacon that just dropped (4h TTL)', () => {
    // ends_at = now + 4h → fresh
    const ends = FIXED_NOW + 4 * 60 * 60 * 1000;
    const out = mapboxLeafToBeacon(feat({ id: 'b', ends_at_ms: ends }), { now });
    expect(out.freshness_score).toBeGreaterThanOrEqual(0.99);
    expect(out.freshness_score).toBeLessThanOrEqual(1);
  });

  it('returns 0 for an expired beacon', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b', ends_at_ms: FIXED_NOW - 1000 }), { now });
    expect(out.freshness_score).toBe(0);
  });

  it('returns ~0.5 for a beacon at the midpoint of its 4h lifetime', () => {
    const ends = FIXED_NOW + 2 * 60 * 60 * 1000; // 2h left of 4h TTL
    const out = mapboxLeafToBeacon(feat({ id: 'b', ends_at_ms: ends }), { now });
    expect(out.freshness_score).toBeCloseTo(0.5, 1);
  });

  it('defaults to 0.5 when ends_at_ms is missing — neutral signal', () => {
    const out = mapboxLeafToBeacon(feat({ id: 'b' }), { now });
    expect(out.freshness_score).toBe(0.5);
  });
});

describe('mapboxLeafToBeacon — string coercion', () => {
  it('coerces id + owner_id to strings even when numeric on the leaf', () => {
    const out = mapboxLeafToBeacon(
      feat({ id: 42, owner_id: 99, intent: 'looking' }),
      { now },
    );
    expect(out.id).toBe('42');
    expect(out.owner_id).toBe('99');
  });

  it('returns empty strings (not undefined) when fields are missing', () => {
    const out = mapboxLeafToBeacon(feat({ intent: 'looking' }), { now });
    expect(out.id).toBe('');
    expect(out.owner_id).toBe('');
  });
});

describe('mapboxLeavesToBeacons — batch convenience', () => {
  it('maps over a leaf array preserving order', () => {
    const features = [
      feat({ id: 'a', intent: 'looking' }),
      feat({ id: 'b', intent: 'cruising' }),
      feat({ id: 'c', intent: 'aftercare' }),
    ];
    const beacons = mapboxLeavesToBeacons(features, { now });
    expect(beacons.map((b) => b.id)).toEqual(['a', 'b', 'c']);
    expect(beacons.map((b) => b.intent)).toEqual(['looking', 'cruising', 'aftercare']);
  });
});
