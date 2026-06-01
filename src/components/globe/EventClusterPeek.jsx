import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock4, ArrowUpRight, X } from 'lucide-react';

// D49 §15 step 3 — editorial peek for event_tonight clusters (Phil 2026-06-01).
//
// Phil's locked scope (no new doctrine, no dashboard UI):
//   "Peek explains why this cluster matters before asking the user to open it."
//
// Triggered by the existing window event 'pulse:event_cluster_tap' dispatched
// by PulseMap.jsx when a cluster with dominant_intent='event_tonight' is
// tapped (D49 §15.5). The peek is additive — cluster tap still zooms in;
// this surface explains the "why" alongside the spatial response.
//
// Variant routing (all read from `clusterState.dominant_intent`):
//   - event_tonight → "Tonight" framing + soonest time + count + "Open tonight" CTA
//   - venue (passive cluster) → neutral, stripped
//   - ambient (no dominant_intent) → light-touch, no CTA
//   - aftercare-only (special_copy set) → care tone, no CTA
//
// Tap contract unchanged: map cluster tap = zoom in. The peek's CTA is a
// separate affordance that opens the L2 sheet for the cluster's events.
//
// Visual: small floating capsule, sits above the bottom nav like
// BeaconPreviewPanel. Auto-dismisses after AUTO_DISMISS_MS so the map
// becomes unobstructed if the user just wants to keep exploring (matches
// the editorial card pattern from PR #790).

const AUTO_DISMISS_MS = 6500;

function formatSoonest(soonestStartsAt, nowMs) {
  if (soonestStartsAt == null) return null;
  const delta = soonestStartsAt - nowMs;
  if (delta < 0) return 'underway';
  const mins = Math.round(delta / 60_000);
  if (mins <= 1) return 'starting now';
  if (mins <= 90) return `in ${mins}m`;
  if (delta > 24 * 60 * 60 * 1000) return null;
  try {
    return new Date(soonestStartsAt).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export default function EventClusterPeek({ peek, onClose, onOpen }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [peek?.cluster_id]);

  useEffect(() => {
    if (!peek || dismissed) return undefined;
    const id = setTimeout(() => {
      setDismissed(true);
      onClose?.();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [peek, dismissed, onClose]);

  if (!peek || dismissed) return null;

  const state = peek.cluster_state || null;
  const summary = peek.event_summary || state?.event_summary || null;
  const dominant = state?.dominant_intent ?? null;
  const isAftercareOnly = !!state?.special_copy;
  // §15.7 — care wins. If for any reason a care-only state landed here,
  // do not render the event peek.
  if (isAftercareOnly) return null;

  // Variant gate. Per Phil's locked spec we ONLY render for event_tonight.
  // Venue / ambient / care clusters use the existing chip + zoom; no peek
  // needed. This is the "don't make every cluster feel like an event" rule.
  if (dominant !== 'event_tonight') return null;

  const count = summary?.count ?? 0;
  const soonest = formatSoonest(summary?.soonest_starts_at ?? null, Date.now());

  // Editorial framing — explain why this cluster matters BEFORE asking.
  const headline = count === 1 ? 'One thing on tonight' : `${count} things on tonight`;
  const reason = soonest
    ? soonest === 'underway'
      ? 'Underway now — step in if you\'re close.'
      : `Soonest ${soonest}.`
    : 'Times posted in the listings.';

  return (
    <AnimatePresence>
      <motion.div
        key={`event-peek-${peek.cluster_id}`}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="fixed left-2 right-2 z-[150] pointer-events-auto"
        data-pull-refresh-ignore
        style={{
          bottom: 'calc(180px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 'min(420px, calc(100vw - 16px))',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        <div
          className="relative rounded-2xl px-4 pt-3 pb-3 shadow-[0_-12px_30px_rgba(0,0,0,0.55)]"
          style={{
            background: 'rgba(8, 8, 10, 0.86)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            border: '1px solid rgba(255, 188, 70, 0.46)',
            boxShadow:
              '0 0 0 1px rgba(255, 255, 255, 0.02), 0 6px 22px rgba(255, 188, 70, 0.18), 0 0 18px rgba(255, 188, 70, 0.14)',
          }}
        >
          <button
            onClick={() => { setDismissed(true); onClose?.(); }}
            aria-label="Dismiss"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/5 text-white/45 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1.5 font-black uppercase"
              style={{
                color: 'rgba(255, 220, 140, 0.96)',
                fontSize: 9.5,
                letterSpacing: 1.6,
                padding: '3px 8px',
                borderRadius: 999,
                border: '1px solid rgba(255, 188, 70, 0.46)',
                background: 'rgba(255, 188, 70, 0.10)',
              }}
            >
              <Clock4 className="w-3 h-3" />
              TONIGHT
            </span>
          </div>

          <h3
            className="text-white text-base font-black italic tracking-tight leading-tight pr-7"
            style={{ letterSpacing: -0.2 }}
          >
            {headline}
          </h3>
          <p className="text-white/65 text-xs leading-snug mt-1.5 pr-7">
            {reason}
          </p>

          <button
            onClick={() => onOpen?.(peek)}
            className="w-full mt-3 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'rgba(255, 188, 70, 0.96)',
              color: '#0A0A0B',
            }}
          >
            Open tonight
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
