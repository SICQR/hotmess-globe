/**
 * D43 Slice A · PR 2 · ClusterPreviewChip
 *
 * Implementer line from Phil (ratified 2026-06-01):
 *
 *   "Build the chip like atmospheric residue from the globe,
 *    not a tooltip from a map library."
 *
 * That sentence is the spec. Everything below is a translation of it.
 *
 * What this component IS:
 *   - A small smoked-glass capsule. Never a card. Never a dashboard panel.
 *   - A flare of social weather. Not a tooltip.
 *   - A read-only consumer of `ClusterPreviewState` from `composeClusterPreview`.
 *     Whatever decisions the composer made (representative selection, default-down,
 *     aftercare-only handling, continuity invariant), this chip honours.
 *
 * What this component is NOT:
 *   - Wiring. PR 3 handles hover/long-press attachment via the kind-router.
 *   - Positioning logic. The parent decides upper-right (desktop) vs above-press
 *     (mobile) via wrapper styling. The chip just renders flexibly into whatever
 *     box it's given.
 *   - A tap target. Per D43 §3, the preview is information given, not a thing to
 *     interact with. No onClick. No href. No commit-to-sheet plumbing.
 *
 * Ratified visual treatment (§9 + Phil 2026-06-01):
 *   - Smoked-glass capsule (rounded, dark, blurred backdrop, low gold rim)
 *   - Avatar (when present) partially recessed into the chip — signal, not content
 *   - Soft glow pulse on mount, clean fade on dismount
 *   - 1.5s timeout is the caller's responsibility (the `visible` prop drops to false)
 *   - Aftercare-only variant: softer care tone (still dark glass), NO emergency
 *     green / medical blue / hospital badge / support service styling
 *
 * Doctrine refs: D43, D48, D17, D35, sacred-invariants Constitutional Substrate.
 */

import { AnimatePresence, motion } from 'framer-motion';
import type { ClusterPreviewState, Intent } from '@/lib/clusters/types';

// ─── display labels ──────────────────────────────────────────────────────────

/**
 * Display strings for intents in chip copy.
 *
 * Phil's ratified examples (2026-06-01):
 *   "8 nearby   3 looking · 2 hosting · 1 care · 2 quiet"
 *
 * So `aftercare` → "care", `quiet_hold` → "quiet" in chip copy specifically.
 * These are presentational shortenings — the underlying doctrine intent names
 * (Drop Beacon Doctrine) stay as the canonical machine identifiers.
 */
const INTENT_LABEL: Record<Intent, string> = {
  looking: 'looking',
  hosting: 'hosting',
  cruising: 'cruising',
  aftercare: 'care',
  quiet_hold: 'quiet',
  arriving: 'arriving',
  market: 'market',
};

// ─── copy formatter ──────────────────────────────────────────────────────────

/**
 * Build the chip's copy line from the composed state.
 *
 * Three modes per Phil's ratification:
 *
 *  - **Aftercare-only**: "Care held here   3 nearby"
 *    (special_copy carries "Care held here" per scope §3.3 ratified §9.2)
 *
 *  - **Normal mixed** (dense=false): "8 nearby   looking · hosting · quiet"
 *    Lists intents without their counts. The count "8 nearby" carries the
 *    quantitative signal; the intent list is qualitative atmosphere.
 *
 *  - **Dense** (dense=true): "8 nearby   3 looking · 2 hosting · 1 care · 2 quiet"
 *    For high-density clusters where the per-intent breakdown is the
 *    information you came for.
 *
 * Returns two segments: `lead` (the count or special line) and `tail` (the
 * intent list). The chip renders them with a divider so the visual hierarchy
 * is preserved.
 */
export function formatChipCopy(
  state: ClusterPreviewState,
  dense: boolean,
): { lead: string; tail: string | null } {
  if (state.special_copy) {
    // Aftercare-only cluster — "Care held here   3 nearby"
    return {
      lead: state.special_copy,
      tail: `${state.count} nearby`,
    };
  }
  const lead = `${state.count} nearby`;
  const tail = state.intent_mix
    .map((entry) => {
      const label = INTENT_LABEL[entry.intent];
      return dense ? `${entry.count} ${label}` : label;
    })
    .join(' · ');
  return { lead, tail: tail || null };
}

// ─── component ───────────────────────────────────────────────────────────────

export interface ClusterPreviewChipProps {
  /** The composed cluster state from `composeClusterPreview`. */
  state: ClusterPreviewState;
  /** Controls mount via AnimatePresence. Parent owns the 1.5s timeout. */
  visible: boolean;
  /**
   * When true, copy includes per-intent counts (`3 looking · 2 hosting`).
   * Recommend true for high-density clusters; false for atmospheric reads
   * where you just want the intent vocabulary present.
   * Default: false.
   */
  dense?: boolean;
  /** Optional accessibility label override. */
  ariaLabel?: string;
}

/**
 * Read-only chip. No internal timeout — the parent (PR 3 kind-router branch)
 * controls visibility via the `visible` prop. Per §4 of the scope, the preview
 * dismisses on pointer-leave / press-release / 1.5s timeout, all of which
 * resolve to the parent setting visible=false.
 */
export function ClusterPreviewChip({
  state,
  visible,
  dense = false,
  ariaLabel,
}: ClusterPreviewChipProps) {
  const { lead, tail } = formatChipCopy(state, dense);
  const isAftercareOnly = !!state.special_copy;
  const avatar = state.representative?.avatar_url ?? null;

  // Slightly softer rim for aftercare-only chip — Phil ratified: "same dark
  // glass, softer care tone". Avoids any emergency-services register.
  const rimGold = isAftercareOnly ? 'rgba(200, 150, 44, 0.18)' : 'rgba(200, 150, 44, 0.32)';
  const glowGold = isAftercareOnly ? 'rgba(200, 150, 44, 0.08)' : 'rgba(200, 150, 44, 0.14)';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label={
            ariaLabel ??
            (tail ? `${lead}. ${tail}.` : lead) /* a11y mirrors §6 of the scope */
          }
          initial={{ opacity: 0, scale: 0.96, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 2 }}
          transition={{
            // Phil ratified: fast materialise, soft glow pulse, clean fade-out,
            // NO bouncy SaaS motion. Quick ease, no spring.
            duration: 0.18,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="pointer-events-none select-none inline-flex items-center gap-2.5 max-w-[min(78vw,360px)]"
          style={{
            // Smoked-glass capsule. Heavy backdrop blur + low-opacity black so
            // the globe behind reads as the substrate, not as a panel
            // background. Rounded-full gives the "capsule" feel rather than a
            // card. Padding kept tight (10px / 12px) so the chip never
            // dominates the viewport.
            background: 'rgba(8, 8, 10, 0.62)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            borderRadius: 999,
            border: `1px solid ${rimGold}`,
            padding: '6px 12px 6px 6px',
            // Soft glow pulse — barely there, atmospheric. Not a SaaS
            // notification ring.
            boxShadow: `0 0 0 1px rgba(255, 255, 255, 0.02), 0 6px 22px ${glowGold}, 0 0 18px ${glowGold}`,
          }}
        >
          {/* Avatar — recessed into the chip. Signal, not content. */}
          {avatar ? (
            <span
              aria-hidden
              className="flex-shrink-0 overflow-hidden"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                // Slight outset shadow + thin gold ring suggests the avatar
                // is half-embedded into the chip's surface rather than sitting
                // on top of it.
                background: '#0A0A0B',
                boxShadow: `inset 0 0 0 1px ${rimGold}, 0 1px 2px rgba(0,0,0,0.4)`,
              }}
            >
              <img
                src={avatar}
                alt=""
                draggable={false}
                className="w-full h-full object-cover"
                style={{ display: 'block', filter: 'grayscale(0.15)' }}
              />
            </span>
          ) : (
            // No avatar — small neutral pip in its place so the chip's left
            // edge has consistent rhythm regardless of representative state.
            // Subtle gold dot, very small. Reads as "presence here" without
            // suggesting identity.
            <span
              aria-hidden
              className="flex-shrink-0"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                marginLeft: 8,
                marginRight: 4,
                background: rimGold,
                boxShadow: `0 0 6px ${glowGold}`,
              }}
            />
          )}

          {/* Copy block */}
          <span
            className="flex items-baseline gap-2 min-w-0"
            style={{ paddingRight: 2 }}
          >
            <span
              className="font-semibold"
              style={{
                color: 'rgba(255, 250, 235, 0.96)',
                fontSize: 12.5,
                letterSpacing: 0.1,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
              }}
            >
              {lead}
            </span>
            {tail ? (
              <>
                <span
                  aria-hidden
                  style={{
                    width: 1,
                    height: 10,
                    background: 'rgba(255, 255, 255, 0.18)',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="truncate"
                  style={{
                    color: 'rgba(255, 250, 235, 0.7)',
                    fontSize: 12,
                    letterSpacing: 0.05,
                    lineHeight: 1.1,
                  }}
                >
                  {tail}
                </span>
              </>
            ) : null}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ClusterPreviewChip;
