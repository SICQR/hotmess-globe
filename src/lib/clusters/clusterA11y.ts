/**
 * D43 Slice A · PR 4 · cluster aria-label composer.
 *
 * Extracted to its own pure module so:
 *   1. The test file imports a TS module with no React dependency (clean
 *      unit-test boundary — vitest runs without JSX transform).
 *   2. Any other AT-mirror surface (future Telegram digest, voice agent,
 *      print-style summary) reuses the exact same string contract.
 *
 * Per D17 §4 unified-preview pattern, the visual chip surface and any AT
 * mirror MUST emit the same composed reality from `ClusterPreviewState`.
 * Both this file and `ClusterPreviewChip.tsx` consume `formatChipCopy`,
 * so the answer to D48 §5.1's canonical question is identical in either
 * register: no face/avatar/owner-id ever appears, because §3.4 default-down
 * already stepped any representative down upstream by the time state
 * reaches this composer.
 *
 * Doctrine refs: D43, D48 §3.4 / §5.1, D17 §4, D35, sacred-invariants substrate.
 */

import { formatChipCopy } from '@/components/globe/ClusterPreviewChip';
import type { ClusterPreviewState } from '@/lib/clusters/types';

/**
 * Compose the screen-reader aria-label for a cluster row.
 *
 * Format:
 *   normal:           "{lead}. {tail}. Press Enter to zoom in."
 *   aftercare-only:   "{lead}. {tail}. Press Enter to zoom in."  (lead = "Care held here")
 *   single-intent:    "{lead}. {tail}. Press Enter to zoom in."
 *   empty tail edge:  "{lead}. Press Enter to zoom in."
 *
 * "Press Enter to zoom in" matches WCAG 2.1 SC 2.1.1 / 4.1.2 expectation for
 * keyboard-activated controls. Cluster activation flies the camera in (the
 * Mapbox `getClusterExpansionZoom` behaviour) — the AT verb is "zoom in"
 * not "open" because there's no L2 sheet for clusters by design (D43:
 * clusters are in-world atmosphere, not list pickers).
 */
export function composeClusterAriaLabel(
  state: ClusterPreviewState | null | undefined,
  dense: boolean = false,
): string {
  if (!state) return '';
  const isDense = dense || (Number(state.count) >= 6);
  const { lead, tail } = formatChipCopy(state, isDense);
  const parts: string[] = [lead];
  if (tail) parts.push(tail);
  parts.push('Press Enter to zoom in');
  // Join with ". " so screen readers pause briefly between segments — VO and
  // NVDA both honour the sentence boundary as a pacing cue.
  return parts.join('. ') + '.';
}
