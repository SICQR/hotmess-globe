/**
 * src/lib/atmospheric.ts — Convergence Slice v1 + Infra PR 1.
 *
 * D22 §3 + §4 Atmospheric memory layer — real write path.
 *
 * Infra PR 1 (this revision):
 *   - recordHandoffAtmosphere now calls public.record_handoff_atmosphere()
 *     in Supabase. That RPC is a thin wrapper around atmosphere.record_handoff(),
 *     which is the only legal write path into atmosphere.handoff_residue.
 *   - The substrate destroys the raw venue_label inside the function body
 *     (calls atmosphere._classify_venue once, never persists the input).
 *   - The substrate quantises time to the current hour before write.
 *   - The substrate has no actor_id, target_id, or beacon_id column —
 *     those columns physically do not exist. Reconstruction is impossible
 *     from this table alone; reversing the forgetting would require an
 *     ALTER TABLE, which is a visible, reviewable, doctrinal act.
 *
 * This is forward secrecy for social presence: once the handoff has been
 * recorded, no future query — by us, by a future engineer, by an acquirer,
 * by a court — can reconstruct the source primitives from this table.
 * That guarantee lives in the substrate, not in this file.
 *
 * What this file is responsible for:
 *   - Shape the call site so the RPC cannot be invoked with anything other
 *     than the three pre-bucketed primitives.
 *   - Swallow errors (D22 §4 — atmospheric signals never throw to user
 *     surface).
 *   - Stay shape-stable. The exported signature is the contract every
 *     caller depends on. Adding parameters here is a constitutional drift
 *     and must be reviewed as such.
 *
 * What this file is NOT responsible for:
 *   - Bucketing the venue. The substrate does that. Sending the raw
 *     label is correct; the substrate is where it gets destroyed.
 *   - Time quantisation. The substrate does that too.
 *   - Identity scrubbing. There is no identity to scrub — by design we
 *     never reached for it.
 */

import { supabase } from '@/components/utils/supabaseClient';

export interface HandoffAtmosphereInput {
  /** Bucketed venue label. NEVER a precise coordinate. The substrate
   *  classifies this into a coarse venue_class and discards the input. */
  venueLabel?: string;
  /** Coarse beacon kind. 'ticket' | 'preloved' | 'other'. */
  beaconKind: 'ticket' | 'preloved' | 'other';
  /** Resolution state from the locked vocabulary table. */
  resolutionState: ResolutionState;
}

export type ResolutionState =
  | 'passed_on'
  | 'sorted'
  | 'covered'
  | 'claimed'
  | 'going_together'
  | 'heading_there'
  | 'picked_up'
  | 'handed_over';

/**
 * Locked resolution vocabulary, per D19 §6.10 + D34 §4.7.
 * Mapping internal state → user-facing copy.
 *
 * Do NOT add: 'sold', 'buyer', 'seller_completed', 'order', 'transaction',
 * 'completed_purchase', 'paid'. These are prohibited by D19 §6.10 and
 * §11.1 (No Marketplace SEO Tone) and would fail CI's text-scan in
 * scripts/check-resolution-vocab.mjs.
 *
 * The substrate (atmosphere.record_handoff) ALSO validates against this
 * vocabulary. If the values here drift out of sync with the substrate,
 * the substrate silently no-ops the write rather than corrupting the
 * residue table. That is intentional belt-and-braces.
 */
export const RESOLUTION_COPY: Record<ResolutionState, string> = {
  passed_on: 'Passed on',
  sorted: 'Sorted',
  covered: 'Covered',
  claimed: 'Claimed',
  going_together: 'Going together',
  heading_there: 'Heading there',
  picked_up: 'Picked up',
  handed_over: 'Handed over',
};

/**
 * Emit an atmospheric handoff signal.
 *
 * Crosses the substrate boundary via supabase.rpc(). The substrate
 * function:
 *   1. Quantises time to the current hour.
 *   2. Bucket-classifies venueLabel into a coarse venue_class.
 *   3. Validates beaconKind + resolutionState against locked enums.
 *   4. Upserts into atmosphere.handoff_residue (aggregate counter).
 *
 * No per-event row exists after this call. Only a delta on a counter.
 *
 * Errors are swallowed: D22 §4 binds that atmospheric signals never throw
 * to user surface. A failed write means the residue counter doesn't tick;
 * the user-facing handoff resolution still completes.
 */
export async function recordHandoffAtmosphere(
  input: HandoffAtmosphereInput,
): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (window as { __HM_DEBUG?: boolean }).__HM_DEBUG) {
      // eslint-disable-next-line no-console
      console.debug('[atmospheric] handoff →', {
        venueLabel: input.venueLabel || null,
        beaconKind: input.beaconKind,
        resolutionState: input.resolutionState,
      });
    }

    const { error } = await supabase.rpc('record_handoff_atmosphere', {
      p_venue_label: input.venueLabel ?? null,
      p_beacon_kind: input.beaconKind,
      p_resolution_state: input.resolutionState,
    });

    if (error && typeof window !== 'undefined' && (window as { __HM_DEBUG?: boolean }).__HM_DEBUG) {
      // eslint-disable-next-line no-console
      console.debug('[atmospheric] handoff rpc error (swallowed)', error.message);
    }
  } catch {
    /* D22 §4 noop — atmospheric signals never throw to user surface */
  }
}
