import React from 'react';

// Parallel DOM accessibility tree for the WebGL bloom sprites.
//
// A three.js Sprite has no role, no focus, no name — a screen reader and a keyboard
// user can't reach it. This sr-only list mirrors the same beacons as real <button>s,
// so Tab cycles them, Enter/Space opens one (same handler as a sprite click), and a
// screen reader announces "category: name, distance". It's visually hidden (sr-only)
// but stays in the tab + a11y trees, which is exactly the keyboard/SR parity the
// sprite layer can't provide natively.

function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(km) {
  if (km == null || !Number.isFinite(km)) return '';
  // Doctrine (Phil 2026-05-26 + sacred invariant 7): no exact tracking exposed
  // in user-visible text. Bucket into sensed-not-measured language. Screen
  // readers get the same protection as visual users.
  if (km < 0.1) return 'very close';
  if (km < 1) return 'nearby';
  if (km < 5) return 'in the area';
  if (km < 50) return 'across town';
  return 'far away';
}

// Mirror of categoryColor()'s buckets, in human words for the SR announcement.
function categoryLabel(kind) {
  const k = String(kind || '').toLowerCase();
  if (/recovery|sober|na_aa|aftercare/.test(k)) return 'Recovery';
  if (/safety|care|sos|help/.test(k)) return 'Safety';
  if (/event|ticket/.test(k)) return 'Event';
  if (/venue/.test(k)) return 'Venue';
  if (/radio|music/.test(k)) return 'Radio';
  if (/person|people|user|social|chill|meet|hookup|promoter/.test(k)) return 'Person';
  return 'Signal';
}

export default function BeaconA11yList({ beacons = [], viewerLocation = null, onSelect }) {
  const list = Array.isArray(beacons) ? beacons : [];
  return (
    <div
      className="sr-only"
      role="region"
      aria-label="Beacons on the map. Tab to move between beacons, Enter to open one."
    >
      <ul>
        {list.map((b, i) => {
          const lat = Number(b.lat ?? b.location_lat);
          const lng = Number(b.lng ?? b.location_lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const cat = categoryLabel(b.kind || b.beacon_category || b.type);
          const name = b.title || b.name || (b.metadata && b.metadata.title) || 'Untitled signal';
          const dist = viewerLocation ? formatDistance(distanceKm(viewerLocation, { lat, lng })) : '';
          const label = `${cat}: ${name}${dist ? ', ' + dist : ''}`;
          return (
            <li key={b.id || `${lat},${lng},${i}`}>
              <button
                type="button"
                aria-label={label}
                onClick={() => onSelect && onSelect(b)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelect) onSelect(b);
                  }
                }}
              >
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
