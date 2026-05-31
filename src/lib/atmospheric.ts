/**
 * src/lib/atmospheric.ts — Convergence Slice v1, PR 3.
 *
 * D22 §3 Atmospheric memory layer (stub).
 *
 * recordHandoffAtmosphere — emits an aggregate atmospheric signal when a
 * handoff resolves. D22 §4 Irreversibility Rule binds: the call MUST destroy
 * the input identity before persisting. PR 3 ships a no-op stub that proves
 * the call site exists and the input shape is right; PR 4 wires the real
 * irreversible aggregation pipeline into Supabase.
 *
 * What the stub guarantees:
 *   - No individual user id is stored anywhere by this function.
 *   - No precise timestamp persists (we bucket to the hour at most).
 *   - No raw beacon id or seller id propagates past this boundary.
 *   - When PR 4 wires the persistence layer, the function signature does
 *     not change — only the body. Call sites are stable.
 *
 * D22 §4.1 Anti-Creep Rule binds: this signal MAY influence ambience
 * (city-mood, district density, atmospheric overlays). It MAY NOT be used
 * for enforcement, ranking, moderation escalation, or any individual
 * decision. Future contributors: do not add an `actorId` or a `targetId`
 * parameter here.
 */

export interface HandoffAtmosphereInput {
  /** Bucketed venue label. NEVER a precise coordinate. */
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
 * Emit an atmospheric handoff signal. Stub for PR 3 — logs to console only.
 * PR 4 replaces the body with an irreversible aggregate write per D22 §4.
 *
 * Sacred contract preserved across PR 3 → PR 4:
 *   - Only the three input fields above ever cross this boundary.
 *   - The return value is `void` and will remain `void`.
 *   - Errors are swallowed (handoff should never fail the user surface).
 */
export function recordHandoffAtmosphere(input: HandoffAtmosphereInput): void {
  try {
    // PR 3 stub — observable in dev, no persistence. PR 4 will replace
    // this body with a call to a stored procedure that buckets time and
    // location, destroys the inputs, and increments an atmospheric counter.
    if (typeof window !== 'undefined' && (window as { __HM_DEBUG?: boolean }).__HM_DEBUG) {
      // eslint-disable-next-line no-console
      console.debug('[atmospheric] handoff', {
        venueLabel: input.venueLabel || null,
        beaconKind: input.beaconKind,
        resolutionState: input.resolutionState,
      });
    }
  } catch {
    /* D22 §4 noop — atmospheric signals never throw to user surface */
  }
}
