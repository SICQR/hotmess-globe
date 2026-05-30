/**
 * L2ClusterPreviewSheet — peek-preview for a beacon cluster.
 *
 * Phil locked 2026-05-29. Opens when the user taps a cluster bubble on /pulse.
 * Shows "N signals here", the strongest title surfaced first, a short list of
 * constituent signals, and two CTAs:
 *   - "Show signals" — zooms in to scatter the cluster (calls the resolver
 *     PulseMap handed through, then closes the sheet).
 *   - Tap any signal in the list → opens that signal's L2 beacon sheet.
 *
 * Closes the all-zoom readability gap without messing with the working
 * marker-level flow. Peek/expand behaviour is provided by L2SheetContainer.
 *
 * Doctrine: 11-arrival-state-doctrine (Pulse Doctrine — probability + momentum)
 */

import { useMemo } from 'react';
import { Radio, ZoomIn } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

function formatRemaining(endsAtMs) {
  if (!endsAtMs) return null;
  const diff = endsAtMs - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function L2ClusterPreviewSheet({
  count = 0,
  lat,
  lng,
  leaves = [],
  expansion_resolver,
}) {
  const { openSheet, closeSheet } = useSheet();

  // Strongest-first. Leaves were already sorted by PulseMap, but defensive
  // resort here so the sheet doesn't depend on caller order.
  const sortedLeaves = useMemo(() => {
    return [...leaves].sort((a, b) => (b.priority || 0) - (a.priority || 0) ||
                                       (b.ends_at_ms || 0) - (a.ends_at_ms || 0));
  }, [leaves]);

  const handleSignalTap = (leaf) => {
    if (!leaf || !leaf.id) return;
    const cleanId = typeof leaf.id === 'string' ? leaf.id.replace(/^beacon[:_]/, '') : leaf.id;
    closeSheet();
    // Defer the open by a tick so the cluster sheet's close transition can
    // start cleanly before the beacon sheet's open transition kicks in.
    window.setTimeout(() => {
      openSheet('beacon', { beaconId: cleanId, beacon: { id: cleanId, ...leaf, lat, lng } });
    }, 80);
  };

  const handleZoomCloser = async () => {
    if (typeof expansion_resolver !== 'function') {
      closeSheet();
      return;
    }
    try {
      const zoom = await expansion_resolver();
      if (typeof window !== 'undefined' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        // PulseMap listens on this event to fly the camera.
        window.dispatchEvent(new CustomEvent('pulse:flyto', {
          detail: { lat, lng, zoom: zoom != null ? zoom : undefined },
        }));
      }
    } catch (_) { /* never block the user */ }
    closeSheet();
  };

  const strongestTitle = sortedLeaves[0]?.title || null;

  return (
    <div className="relative flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border"
            style={{ color: '#C8962C', borderColor: 'rgba(200,150,44,0.25)', backgroundColor: 'rgba(200,150,44,0.08)' }}
          >
            <Radio className="w-2.5 h-2.5" />
            cluster
          </span>
        </div>
        <h2 className="text-white font-black text-xl leading-tight">
          {count} signal{count === 1 ? '' : 's'} here
        </h2>
        {strongestTitle && (
          <p className="text-white/55 text-sm mt-1 leading-snug">
            Strongest: {strongestTitle}
          </p>
        )}
      </div>

      {/* Action block above-fold at peek (Phil's locked sheet contract). */}
      <div className="px-4 pt-2 pb-3 flex flex-col gap-2">
        <button
          onClick={handleZoomCloser}
          className="w-full bg-[#1C1C1E] text-white font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform"
        >
          <ZoomIn className="w-4 h-4 text-white/50" />
          Zoom closer
        </button>
      </div>

      {/* Signals list — visible when the user drags the sheet up to expand. */}
      <div className="px-4 pt-1 pb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/30 mb-2">
          Show signals
        </p>
        <ul className="flex flex-col gap-1.5">
          {sortedLeaves.map((leaf) => {
            const remaining = formatRemaining(leaf.ends_at_ms);
            const dot = leaf.color || '#C8962C';
            return (
              <li key={leaf.id || leaf.title}>
                <button
                  onClick={() => handleSignalTap(leaf)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 active:scale-[0.99] transition-transform text-left"
                >
                  <span
                    aria-hidden
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: dot, boxShadow: `0 0 6px ${dot}55` }}
                  />
                  <span className="flex-1 min-w-0 text-white text-sm font-semibold truncate">
                    {leaf.title || 'Signal'}
                  </span>
                  {remaining && (
                    <span className="text-white/40 text-[11px] tabular-nums flex-shrink-0">
                      {remaining}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {count > sortedLeaves.length && (
          <p className="text-white/30 text-[11px] mt-3">
            +{count - sortedLeaves.length} more. Zoom closer to see them all.
          </p>
        )}
      </div>
    </div>
  );
}
