/**
 * D43 Slice A · PR 4 · cluster aria-label tests
 *
 * Pins Phil's ratified copy strings (2026-06-01) on the AT register so any
 * future drift between the chip (visual) and the a11y row (AT) is caught
 * here. D17 §4 unified-preview pattern — both surfaces MUST emit the same
 * composed reality from `composeClusterPreview` state, and the only way to
 * guarantee that is to share `formatChipCopy` (chip path) and pin the
 * AT-suffixed form (this path).
 */

import { describe, expect, it } from 'vitest';
import { composeClusterAriaLabel } from '@/lib/clusters/clusterA11y';
import type { ClusterPreviewState } from '@/lib/clusters/types';

const baseState: Omit<ClusterPreviewState, 'count' | 'intent_mix' | 'special_copy' | 'dominant_intent' | 'event_summary'> = {
  cluster_id: 'test-cluster',
  representative: null,
  gate_trace: [],
  topology_hash: 'test-cluster',
  composed_at: 0,
};

describe('composeClusterAriaLabel — normal mixed', () => {
  it('produces the AT mirror of Phil\'s "5 nearby   looking · hosting · quiet" example', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 5, // <6 so dense=false
      intent_mix: [
        { intent: 'looking', count: 2 },
        { intent: 'hosting', count: 1 },
        { intent: 'quiet_hold', count: 2 },
      ],
      special_copy: null,
    };
    expect(composeClusterAriaLabel(state)).toBe(
      '5 nearby. looking · hosting · quiet. Press Enter to zoom in.',
    );
  });
});

describe('composeClusterAriaLabel — dense (count >= 6)', () => {
  it('auto-switches to per-intent count copy when count >= 6', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 8,
      intent_mix: [
        { intent: 'looking', count: 3 },
        { intent: 'hosting', count: 2 },
        { intent: 'aftercare', count: 1 },
        { intent: 'quiet_hold', count: 2 },
      ],
      special_copy: null,
    };
    expect(composeClusterAriaLabel(state)).toBe(
      '8 nearby. 3 looking · 2 hosting · 1 care · 2 quiet. Press Enter to zoom in.',
    );
  });

  it('honours explicit dense=true override even at low count', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 3,
      intent_mix: [
        { intent: 'looking', count: 2 },
        { intent: 'hosting', count: 1 },
      ],
      special_copy: null,
    };
    expect(composeClusterAriaLabel(state, true)).toBe(
      '3 nearby. 2 looking · 1 hosting. Press Enter to zoom in.',
    );
  });
});

describe('composeClusterAriaLabel — aftercare-only', () => {
  it('mirrors Phil\'s "Care held here   3 nearby" example, AT-suffixed', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 3,
      intent_mix: [{ intent: 'aftercare', count: 3 }],
      special_copy: 'Care held here',
    };
    expect(composeClusterAriaLabel(state)).toBe(
      'Care held here. 3 nearby. Press Enter to zoom in.',
    );
  });

  it('aftercare-only output is dense-invariant — special_copy short-circuits density', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 12, // would normally trigger dense
      intent_mix: [{ intent: 'aftercare', count: 12 }],
      special_copy: 'Care held here',
    };
    expect(composeClusterAriaLabel(state)).toBe(
      'Care held here. 12 nearby. Press Enter to zoom in.',
    );
  });
});

describe('composeClusterAriaLabel — single intent', () => {
  it('renders one intent label without separators', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 4,
      intent_mix: [{ intent: 'cruising', count: 4 }],
      special_copy: null,
    };
    expect(composeClusterAriaLabel(state)).toBe(
      '4 nearby. cruising. Press Enter to zoom in.',
    );
  });
});

describe('composeClusterAriaLabel — empty edge', () => {
  it('elides the tail segment cleanly when intent_mix is empty', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 0,
      intent_mix: [],
      special_copy: null,
    };
    expect(composeClusterAriaLabel(state)).toBe(
      '0 nearby. Press Enter to zoom in.',
    );
  });

  it('returns empty string when state is null (defensive)', () => {
    expect(composeClusterAriaLabel(null)).toBe('');
    expect(composeClusterAriaLabel(undefined)).toBe('');
  });
});

describe('composeClusterAriaLabel — D48 §3.4 default-down compliance', () => {
  it('emits no face/avatar/owner-id signal even when representative is set on state', () => {
    // Even in the (currently impossible) case where the composer DID set a
    // representative, the AT layer never reads it — only count + intent mix
    // make it into the aria-label. This pins that contract.
    const state: ClusterPreviewState = {
      ...baseState,
      count: 4,
      intent_mix: [{ intent: 'looking', count: 4 }],
      special_copy: null,
      representative: {
        beacon_id: 'b-secret',
        owner_id_hash: 'u-secret',
        avatar_url: 'https://example.com/face.jpg',
        intent: 'looking',
      } as any,
    };
    const out = composeClusterAriaLabel(state);
    expect(out).not.toContain('secret');
    expect(out).not.toContain('face.jpg');
    expect(out).not.toContain('avatar');
    expect(out).toBe('4 nearby. looking. Press Enter to zoom in.');
  });
});

