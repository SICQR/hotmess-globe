/**
 * D43 Slice A · PR 2 · ClusterPreviewChip — copy formatter tests
 *
 * Just the `formatChipCopy` function — the JSX render is a presentational
 * concern verified visually. The copy contract is the part the doctrine cares
 * about (Phil's ratified examples 2026-06-01 must produce the exact strings).
 */

import { describe, expect, it } from 'vitest';
import { formatChipCopy } from '@/components/globe/ClusterPreviewChip';
import type { ClusterPreviewState } from '@/lib/clusters/types';

const baseState: Omit<ClusterPreviewState, 'count' | 'intent_mix' | 'special_copy'> = {
  cluster_id: 'test-cluster',
  representative: null,
  gate_trace: [],
  topology_hash: 'test-cluster',
  composed_at: 0,
};

describe('formatChipCopy — normal mixed (dense=false)', () => {
  it('matches Phil\'s example: "8 nearby   looking · hosting · quiet"', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 8,
      intent_mix: [
        { intent: 'looking', count: 3 },
        { intent: 'hosting', count: 2 },
        { intent: 'quiet_hold', count: 3 },
      ],
      special_copy: null,
    };
    expect(formatChipCopy(state, false)).toEqual({
      lead: '8 nearby',
      tail: 'looking · hosting · quiet',
    });
  });
});

describe('formatChipCopy — dense (dense=true)', () => {
  it('matches Phil\'s example: "8 nearby   3 looking · 2 hosting · 1 care · 2 quiet"', () => {
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
    expect(formatChipCopy(state, true)).toEqual({
      lead: '8 nearby',
      tail: '3 looking · 2 hosting · 1 care · 2 quiet',
    });
  });
});

describe('formatChipCopy — aftercare-only', () => {
  it('matches Phil\'s example: "Care held here   3 nearby"', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 3,
      intent_mix: [{ intent: 'aftercare', count: 3 }],
      special_copy: 'Care held here',
    };
    expect(formatChipCopy(state, false)).toEqual({
      lead: 'Care held here',
      tail: '3 nearby',
    });
    // Dense doesn't affect aftercare-only output — special_copy short-circuits.
    expect(formatChipCopy(state, true)).toEqual({
      lead: 'Care held here',
      tail: '3 nearby',
    });
  });
});

describe('formatChipCopy — single-intent cluster', () => {
  it('shows just the one intent label without dot separators', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 4,
      intent_mix: [{ intent: 'cruising', count: 4 }],
      special_copy: null,
    };
    expect(formatChipCopy(state, false)).toEqual({
      lead: '4 nearby',
      tail: 'cruising',
    });
  });
});

describe('formatChipCopy — empty intent mix (theoretical edge)', () => {
  it('returns lead only, null tail', () => {
    const state: ClusterPreviewState = {
      ...baseState,
      count: 0,
      intent_mix: [],
      special_copy: null,
    };
    expect(formatChipCopy(state, false)).toEqual({
      lead: '0 nearby',
      tail: null,
    });
  });
});
