// Mapbox local-mode layer stack — implements docs/GLOBE_MAPBOX_LAYER_STACK.md
// (the local renderer contract). Owns: stable layer IDs, privacy-safe source
// construction, and the contract-ordered layer definitions. Kept framework-free
// and side-effect-light so it stays unit-testable.

import { resolveBeaconCategory } from '@/components/globe/beaconGlyphs';

// Stable layer IDs (naming convention from the spec, §"Mapbox layer naming").
export const LAYER_IDS = {
  clusterCircles: 'hm-cluster-circles',
  clusterCount: 'hm-cluster-symbols',
  beaconMarkers: 'hm-beacon-markers',
  beaconIcons: 'hm-beacon-icons',
  selectedHalo: 'hm-selected-halo',
};
export const SOURCE_IDS = { public: 'hm-public', selected: 'hm-selected' };

// Declutter constants surfaced so callers can introspect the readability
// contract (see addLayerStack header for doctrine references).
export const CLUSTER_RADIUS = 80;
export const ICON_MIN_ZOOM = 11;

// Category → colour, aligned with the globe LAYER_DEFS so the two engines read alike.
export const CATEGORY_COLOR = {
  events: '#FF4F9A',
  venues: '#00C2E0',
  people: '#39FF14',
  market: '#FFD700',
  radio: '#B026FF',
  care: '#FFFFFF',
  other: '#C8962C',
};

// Privacy contract (§"Privacy constraints"): these never enter the PUBLIC source.
const PRIVATE = new Set(['help', 'sos', 'safety', 'location_share', 'location_shares', 'trusted_contact', 'sos_ring', 'checkin']);
// Categories that must render with APPROXIMATE (coarsened) coordinates, never exact
// (§L9: "no raw people GPS; Chill/Meetup approximate; Preloved never exposes home").
const APPROX = new Set(['person', 'people', 'user', 'chill', 'meetup', 'hookup', 'social', 'preloved']);

function field(b, ...keys) {
  for (const k of keys) {
    const v = b && b[k];
    if (v != null && v !== '') return String(v).toLowerCase();
  }
  return '';
}

export function isPrivate(b) {
  const k = field(b, 'kind');
  const c = field(b, 'beacon_category', 'category');
  const m = field(b, 'mode');
  return PRIVATE.has(k) || PRIVATE.has(c) || PRIVATE.has(m);
}

function isApprox(b) {
  return APPROX.has(field(b, 'kind')) || APPROX.has(field(b, 'beacon_category', 'category')) || APPROX.has(field(b, 'mode'));
}

export function categoryOf(b) {
  const all = `${field(b, 'kind')} ${field(b, 'beacon_category', 'category')} ${field(b, 'type')}`;
  if (/recovery|care|sober|na_aa|naaa|aftercare/.test(all)) return 'care';
  if (/event|ticket/.test(all)) return 'events';
  if (/venue/.test(all)) return 'venues';
  if (/person|people|user|chill|meet|hookup|social/.test(all)) return 'people';
  if (/market|preloved|vendor|shop/.test(all)) return 'market';
  if (/radio|music/.test(all)) return 'radio';
  return 'other';
}

// ~1.1km grid — coarsen approximate categories so exact location is never exposed.
const snap = (n) => Math.round(n * 100) / 100;

// Build the privacy-checked PUBLIC FeatureCollection. Private safety signals are
// dropped entirely; people/preloved/etc. are snapped to a coarse grid.
export function toPublicSafeFeatureCollection(beacons) {
  const list = Array.isArray(beacons) ? beacons : [];
  const features = [];
  for (const b of list) {
    if (!b || isPrivate(b)) continue;
    let lat = Number(b.lat != null ? b.lat : b.location_lat);
    let lng = Number(b.lng != null ? b.lng : b.location_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (isApprox(b)) { lat = snap(lat); lng = snap(lng); }
    const cat = categoryOf(b);
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: b.id != null ? String(b.id) : '',
        cat,
        // Fine-grained venue category for the HOTMESS Beacon Identity System.
        // null when input doesn't resolve to one of the 9 supported categories —
        // caller falls back to the generic gold circle marker.
        beacon_category: resolveBeaconCategory(b.beacon_category || b.category || b.type || b.kind || ''),
        color: CATEGORY_COLOR[cat] || CATEGORY_COLOR.other,
        title: String(b.title || b.name || ''),
        // Declutter sort-key input (see addLayerStack 'symbol-sort-key').
        // State-care icons get a +100 boost in the layer expression so they
        // always win the z-order tie at street zoom; here we just surface
        // the raw signal-economics priority/intensity so the layer can read it.
        priority: Number.isFinite(Number(b.priority))
          ? Number(b.priority)
          : (Number.isFinite(Number(b.intensity)) ? Number(b.intensity) : 0),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

// Time-of-day environmental atmosphere (docs/GLOBE_WEATHER_TIME_AND_ENVIRONMENTAL_RENDERING.md):
// the local map's fog shifts dawn → day → dusk → night so it feels temporally alive
// rather than a static utility map. Keeps a HOTMESS dark/gold bias at night.
export function environmentalFog(hour, reducedMotion) {
  const h = Number.isFinite(hour) ? hour : 22;
  // Blue-marble palette: deep-blue space, a luminous blue atmospheric limb, and a
  // star field at night — tuned to sit under the satellite imagery so the globe reads
  // as Earth-from-space. The limb warmth shifts gently with the daylight cycle.
  let cfg;
  // Cinematic blue globe restored 2026-05-26 (Phil regression flag):
  //   wider horizon-blend (0.5+), brighter blue high-color (cyan-shifted),
  //   richer deep-blue space-color, and a low-intensity star field even at
  //   daytime so the globe always reads as Earth-from-space, not flat map.
  if (h >= 5 && h < 8) {           // dawn — blue limb breaking warm
    cfg = { color: 'rgba(14,18,28,0.55)', 'high-color': '#9bc4ff', 'space-color': '#06122a', 'horizon-blend': 0.52, 'star-intensity': reducedMotion ? 0 : 0.12 };
  } else if (h >= 8 && h < 17) {   // day — bright cyan-blue atmosphere
    cfg = { color: 'rgba(16,26,42,0.5)', 'high-color': '#a8caff', 'space-color': '#061128', 'horizon-blend': 0.55, 'star-intensity': reducedMotion ? 0 : 0.08 };
  } else if (h >= 17 && h < 20) {  // dusk — cooling blue
    cfg = { color: 'rgba(14,18,28,0.55)', 'high-color': '#82a8e0', 'space-color': '#050d22', 'horizon-blend': 0.48, 'star-intensity': reducedMotion ? 0 : 0.16 };
  } else {                          // night — deep blue space, glowing limb, stars
    cfg = { color: 'rgba(8,12,22,0.62)', 'high-color': '#5b8fd0', 'space-color': '#030717', 'horizon-blend': 0.42, 'star-intensity': reducedMotion ? 0 : 0.28 };
  }
  return cfg;
}

// Adds sources + layers in contract order on top of the base style. Idempotent:
// guards every add so re-invocation (style reload) can't throw.
//
// Doctrine — this layer stack operationalises the readability rules from
//   docs/doctrine/product-doctrine.md ('Density must remain legible' +
//   Operational Loop #6 'Readability Loop' + Anti-Goal 'buried under clutter')
//   and docs/doctrine/sacred-invariants.md (rules 10-12 on readability).
// The product should become CLEARER under pressure, not noisier: clusters
// form from a wider radius (CLUSTER_RADIUS), individual icons are gated
// until zoom >= ICON_MIN_ZOOM, higher-priority/state-care beacons sort on
// top via 'symbol-sort-key', and street-zoom suppresses icon overlap so
// each pin remains a decision-grade target.
export function addLayerStack(map, opts) {
  const reducedMotion = !!(opts && opts.reducedMotion);

  // L1 — atmospheric tint, time-of-day aware so the map feels temporally alive.
  try {
    map.setFog(environmentalFog(new Date().getHours(), reducedMotion));
  } catch (e) { /* fog unsupported on some styles — non-fatal */ }

  if (!map.getSource(SOURCE_IDS.public)) {
    map.addSource(SOURCE_IDS.public, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,        // L6 — density handled before individual pins
      clusterRadius: CLUSTER_RADIUS,
      // Single-engine globe wants individual blooms by street zoom; the legacy
      // local-only map kept 16. Caller can tune; default stays 16 for back-compat.
      clusterMaxZoom: (opts && Number.isFinite(opts.clusterMaxZoom)) ? opts.clusterMaxZoom : 16,
    });
  }
  if (!map.getSource(SOURCE_IDS.selected)) {
    map.addSource(SOURCE_IDS.selected, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  }

  // L6 — cluster circles (count-scaled, gold)
  if (!map.getLayer(LAYER_IDS.clusterCircles)) {
    map.addLayer({
      id: LAYER_IDS.clusterCircles,
      type: 'circle',
      source: SOURCE_IDS.public,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#C8962C',
        'circle-opacity': 0.85,
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(0,0,0,0.45)',
      },
    });
  }
  // L7 — cluster counts
  if (!map.getLayer(LAYER_IDS.clusterCount)) {
    map.addLayer({
      id: LAYER_IDS.clusterCount,
      type: 'symbol',
      source: SOURCE_IDS.public,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12,
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#050507' },
    });
  }
  // L9 — individual beacons (category-coloured, capped size; no giant glow)
  if (!map.getLayer(LAYER_IDS.beaconMarkers)) {
    map.addLayer({
      id: LAYER_IDS.beaconMarkers,
      type: 'circle',
      source: SOURCE_IDS.public,
      // Fallback gold dot — only when not a cluster AND no category icon available.
      filter: ['all', ['!', ['has', 'point_count']], ['!', ['has', 'beacon_category']]],
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], '#C8962C'],
        'circle-radius': 6,
        'circle-opacity': 0.92,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.55)',
      },
    });
  }
  // L9a — HOTMESS Beacon Identity System icon (per-category glyph + gold/care ring).
  // Sprite images are registered up-stream by registerBeaconIcons(map) before this
  // layer is added; if a category has no matching sprite, the L9 fallback gold dot
  // renders instead because the two layers' filters are mutually exclusive on
  // 'has beacon_category'.
  if (!map.getLayer(LAYER_IDS.beaconIcons)) {
    map.addLayer({
      id: LAYER_IDS.beaconIcons,
      type: 'symbol',
      source: SOURCE_IDS.public,
      filter: ['all', ['!', ['has', 'point_count']], ['has', 'beacon_category']],
      layout: {
        // Per-zoom icon gating - below ICON_MIN_ZOOM the cluster layer owns
        // the map exclusively (no overlapping pins at country/city zoom).
        // At ICON_MIN_ZOOM the clusterMaxZoom (default 16) has long since
        // started breaking clusters down, so the handoff stays clean.
        'icon-image': [
          'step', ['zoom'],
          '',
          ICON_MIN_ZOOM, [
            'match', ['get', 'beacon_category'],
            'gym',       'hm-beacon-gym',
            'club',      'hm-beacon-club',
            'sauna',     'hm-beacon-sauna',
            'leather',   'hm-beacon-leather',
            'cafe',      'hm-beacon-cafe',
            'clinic',    'hm-beacon-clinic',
            'aftercare', 'hm-beacon-aftercare',
            'cruising',  'hm-beacon-cruising',
            'market',    'hm-beacon-market',
            'hm-beacon-club',
          ],
        ],
        // Symbol sort key - Mapbox renders LOWER sort-key values on top, so
        // we negate the priority. State-care (recovery/aftercare/clinic) gets
        // a +100 boost so safety glyphs always win the z-order tie in dense
        // areas. Future event category also gets a smaller boost.
        'symbol-sort-key': [
          '-', 0, [
            '+',
            ['case',
              ['==', ['get', 'cat'], 'care'], 100,
              ['==', ['get', 'cat'], 'events'], 10,
              0,
            ],
            ['coalesce', ['to-number', ['get', 'priority']], 0],
          ],
        ],
        // Allow overlap at cluster-context zooms (low zoom = readability of
        // density matters more than per-pin distinctness), suppress overlap
        // at street zoom (>=15) where each pin is a decision target.
        'icon-allow-overlap': ['step', ['zoom'], true, 15, false],
        'icon-ignore-placement': ['step', ['zoom'], true, 15, false],
        'icon-size': 0.5, // 88-source / 44-css = 0.5 to match the 44px MAP-size spec
      },
    });
  }

  // L10 — selected halo (rendered last → always on top)
  if (!map.getLayer(LAYER_IDS.selectedHalo)) {
    map.addLayer({
      id: LAYER_IDS.selectedHalo,
      type: 'circle',
      source: SOURCE_IDS.selected,
      paint: {
        'circle-radius': 15,
        'circle-color': 'rgba(200,150,44,0.15)',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF',
      },
    });
  }
}
