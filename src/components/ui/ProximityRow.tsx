/**
 * ProximityRow — two-layer travel cue used on venue and person cards.
 *
 * Brief: Phil 2026-05-26 — Proximity Travel Cues v1 (final hybrid model).
 *
 * Doctrine non-negotiables:
 *   - Venue: full 3-mode (walk/lime/uber) breakdown on tap. Cap 50km.
 *   - Person: walk-only bucket. Always show "location approximate" in
 *     expanded view. No Lime, no Uber, ever. Cap 30km.
 *   - Stale or missing viewer location → render nothing (quiet state).
 *   - Never describe this as AI anywhere.
 */

import { useState } from 'react';
import {
  venueDefaultCue,
  venueTravelBreakdown,
  personDefaultCue,
  personTravelExpanded,
  distanceMetres,
  isLocationFresh,
} from '@/lib/travelTime';

interface ProximityRowProps {
  type: 'venue' | 'person';
  venueLat: number;
  venueLng: number;
  viewerLat: number | null;
  viewerLng: number | null;
  /** Viewer position timestamp (ms epoch or ISO string). Stale = render nothing. */
  locationUpdatedAt: string | number | null;
  /** Override the per-type distance cap (m). Defaults: venue 50km / person 30km. */
  distanceCap?: number;
}

const monoStyle: React.CSSProperties = {
  fontFamily: 'Space Mono, monospace',
  fontSize: '10px',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

export function ProximityRow({
  type,
  venueLat,
  venueLng,
  viewerLat,
  viewerLng,
  locationUpdatedAt,
  distanceCap,
}: ProximityRowProps) {
  const [expanded, setExpanded] = useState(false);

  // Guard 1: viewer has no location at all
  if (viewerLat == null || viewerLng == null) return null;
  if (!Number.isFinite(viewerLat) || !Number.isFinite(viewerLng)) return null;

  // Guard 2: location stale (silence beats a wrong number)
  if (!isLocationFresh(locationUpdatedAt)) return null;

  // Guard 3: venue coords missing
  if (!Number.isFinite(venueLat) || !Number.isFinite(venueLng)) return null;

  const distM = distanceMetres(viewerLat, viewerLng, venueLat, venueLng);
  const cap = distanceCap ?? (type === 'venue' ? 50000 : 30000);

  // Guard 4: too far away
  if (distM > cap) return null;

  return (
    <div className="border-t border-white/5 px-4 py-2">
      <div className="flex items-center justify-between">
        <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.4)' }}>
          {type === 'venue' ? venueDefaultCue(distM) : personDefaultCue(distM)}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{ ...monoStyle, color: '#C8962C' }}
          className="ml-3 shrink-0 hover:opacity-80"
          aria-expanded={expanded}
          aria-label={type === 'venue' ? 'How to get there' : 'Travel time'}
        >
          {type === 'venue' ? 'How to get there →' : 'Travel time ›'}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 flex flex-col gap-1">
          {type === 'venue' ? (
            venueTravelBreakdown(distM).map((t) => (
              <div key={t.mode} className="flex items-center gap-2">
                <span aria-hidden="true">{t.icon}</span>
                <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.35)' }}>
                  {t.label}
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">{personTravelExpanded(distM).icon}</span>
                <span style={{ ...monoStyle, color: 'rgba(255,255,255,0.35)' }}>
                  {personTravelExpanded(distM).label}
                </span>
              </div>
              <span
                style={{
                  ...monoStyle,
                  color: 'rgba(255,255,255,0.2)',
                  fontSize: '9px',
                }}
              >
                {personTravelExpanded(distM).note}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ProximityRow;
