/**
 * D43 Slice A · PR 5 · cluster uncertainty telemetry dispatcher.
 *
 * Constitutional purpose: when a face_avatar path steps down due to
 * uncertainty in the §3.3 four-gate cascade, the system records WHY.
 * Closes the constitutional loop. Protects trust without adding surface
 * complexity.
 *
 * Phil's hard boundary (2026-06-01):
 *   ALLOWED: one table, service-role write only via RLS insert-only,
 *            insert via existing onUncertaintyFallback callback,
 *            one morning digest sentence.
 *   FORBIDDEN: dashboard, realtime feed, second table, visual UI,
 *              per-user analytics surface, telemetry-driven ranking.
 *
 * Doctrine refs: D43 §11, D48 §3.3, sacred-invariants substrate.
 */

import { supabase } from '@/components/utils/supabaseClient';
import type { UncertaintyFallbackEvent } from './types';

/**
 * SHA-256 hash of the viewer's auth uid. Uses Web Crypto (available in
 * every modern browser + Vercel edge runtime). Returns null for null/empty
 * input — anonymous viewers stay anonymous in the telemetry table.
 *
 * Why hash, not store raw uid: Phil's boundary forbids per-user analytics
 * surface. Hashing prevents anyone with table-read (service role) from
 * looking up which actual user got stepped down, while still letting us
 * count distinct affected viewers for the morning digest. One-way function;
 * no reverse lookup.
 */
export async function hashViewerId(viewerId: string | null | undefined): Promise<string | null> {
  if (!viewerId) return null;
  try {
    const enc = new TextEncoder();
    const data = enc.encode(viewerId);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

/**
 * Maps the composer's `reason` value to a structured gate_name. The reason
 * names which §3.3 gate returned uncertain; we surface that as a first-class
 * column so the morning digest can `GROUP BY gate_name` without parsing
 * strings.
 */
function reasonToGateName(reason: UncertaintyFallbackEvent['reason']): string {
  switch (reason) {
    case 'missing_exposure_register': return 'exposure_register';
    case 'missing_trust_state':       return 'viewer_trust';
    case 'missing_proximity':         return 'proximity';
    case 'missing_consent':           return 'per_surface_consent';
    default:                          return 'unknown';
  }
}

/**
 * Record a single uncertainty fallback event. Fire-and-forget — errors
 * swallowed because this is observability, not a critical path. The chip
 * rendering MUST NOT block on or fail because of a telemetry write.
 *
 * Receives one event per beacon-per-cluster-render where the §3.3 cascade
 * returned "uncertain" on a gate that was needed to evaluate face_avatar
 * eligibility. The composer emits this for every beacon it steps down due
 * to uncertainty (vs. confident denial).
 *
 * `clusterId` is passed by the caller (PulseMap chip path) because the
 * composer's event only carries the beacon-level context, not the cluster
 * envelope it was composed within.
 */
export async function recordClusterUncertainty(
  event: UncertaintyFallbackEvent,
  viewerId: string | null | undefined,
  clusterId?: string | number | null,
): Promise<void> {
  try {
    const viewer_id_hash = await hashViewerId(viewerId);
    await supabase.from('cluster_uncertainty_events').insert({
      cluster_id: clusterId != null ? String(clusterId) : '',
      viewer_id_hash,
      topology_hash: null, // composer doesn't surface this in v1; reserved for future
      intent: event.intent ?? null,
      gate_name: reasonToGateName(event.reason),
      reason: event.reason ?? null,
      step_down_to: 'anonymous', // §3.4 default step-down; future composer may surface other registers
    });
  } catch {
    // observability is not critical-path
  }
}
