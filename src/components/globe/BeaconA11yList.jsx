import React from 'react';
import { composeClusterAriaLabel } from '@/lib/clusters/clusterA11y';
// Re-export so existing call sites that imported it from BeaconA11yList continue
// to work; canonical source lives at @/lib/clusters/clusterA11y for cleaner
// test boundary (no React in the test runner).
export { composeClusterAriaLabel } from '@/lib/clusters/clusterA11y';

// Parallel DOM accessibility tree for the WebGL bloom sprites + Mapbox clusters.
//
// A three.js Sprite has no role, no focus, no name — a screen reader and a keyboard
// user can't reach it. Mapbox cluster circles have the same problem. This sr-only list
// mirrors both as real <button>s, so Tab cycles them, Enter/Space activates one, and a
// screen reader announces them. Visually hidden (sr-only) but kept in the tab + a11y
// trees, which is exactly the keyboard/SR parity those layers can't provide natively.
//
// D43 Slice A · PR 4 — cluster row consumer.
//
// Per D17 §4 unified-preview pattern, the cluster row MUST emit the same composed
// reality the sighted chip emits. Both consume ClusterPreviewState from
// composeClusterPreview; the only difference is the medium (aria-label vs. JSX).
// Phil's ratified copy strings flow through `formatChipCopy` so the answer to
// D48 §5.1's canonical question ("did the user opt in to face exposure for
// this surface, at this intent, under these conditions?") is the same in both
// registers — the AT layer never exposes face data because §3.4 default-down
// already stepped representatives down upstream by the time state reaches here.
//
// Doctrine refs: D43, D48 §3.4 / §5.1, D17 §4, D35, sacred-invariants substrate.

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

export default function BeaconA11yList({
  beacons = [],
  clusters = [],
  viewerLocation = null,
  onSelect,
  onClusterSelect,
}) {
  const beaconList = Array.isArray(beacons) ? beacons : [];
  const clusterList = Array.isArray(clusters) ? clusters : [];
  return (
    <div
      className="sr-only"
      role="region"
      aria-label="Beacons and clusters on the map. Tab to move between them, Enter to activate."
    >
      <ul>
        {/* Cluster rows render first — broader scope before individual beacons.
            This matches the visual hierarchy (clusters dominate at lower zoom)
            and gives screen-reader users the same orientation a sighted user
            gets when scanning the map. */}
        {clusterList.map((cluster, i) => {
          if (!cluster || !cluster.state) return null;
          const label = composeClusterAriaLabel(cluster.state);
          const key = cluster.cluster_id != null
            ? `cluster-${cluster.cluster_id}`
            : `cluster-idx-${i}`;
          return (
            <li key={key}>
              <button
                type="button"
                aria-label={label}
                data-cluster-id={cluster.cluster_id ?? ''}
                onClick={() => onClusterSelect && onClusterSelect(cluster)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onClusterSelect) onClusterSelect(cluster);
                  }
                }}
              >
                {label}
              </button>
            </li>
          );
        })}
        {beaconList.map((b, i) => {
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
