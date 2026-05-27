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
    // Fine-grained venue category for the HOTMESS Beacon Identity System.
    // CRITICAL: when resolution fails (e.g. category='user', 'event', or any
    // value outside the 9-category whitelist) we OMIT this property entirely
    // rather than emitting null. Mapbox's `['has', 'beacon_category']` filter
    // returns true for any KEY that exists regardless of value, so a null
    // emission routed EVERY beacon into the icons layer (where the sprite
    // lookup then resolved to 'hm-beacon-' = no sprite = invisible) and
    // starved the fallback markers layer. Resulted in an empty globe even
    // though beacons were loaded (Phil 2026-05-27).
    const resolvedBeaconCategory = resolveBeaconCategory(b.beacon_category || b.category || b.type || b.kind || '');
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: b.id != null ? String(b.id) : '',
        // owner_id added 2026-05-26: belt-and-braces for the entity-aware
        // beacon-tap-to-profile flow. PulseMap's click handler usually
        // resolves the full beacon via in-memory lookup (and that path
        // already has owner_id), but on cache miss or stale data it falls
        // back to feature.properties — surfacing owner_id here makes that
        // fallback work too. Per beacon doctrine §2: tap MUST resolve to
        // creator's profile, never to a dead end.
        owner_id: b.owner_id != null ? String(b.owner_id) : (b.user_id != null ? String(b.user_id) : ''),
        cat,
        ...(resolvedBeaconCategory ? { beacon_category: resolvedBeaconCategory } : {}),
        color: CATEGORY_COLOR[cat] || CATEGORY_COLOR.other,
        title: String(b.title || b.name || ''),
        // Lifecycle: epoch-ms expiry so the symbol layer can pick the right
        // state-suffixed sprite (active / decaying / stale) via a Mapbox
        // `now()` expression. Null when no end-time on the source row —
        // the layer falls back to the active sprite for robustness.
        ends_at_ms: (function () {
          const v = b.ends_at != null ? b.ends_at : b.endsAt;
          if (v == null || v === '') return null;
          const t = typeof v === 'number' ? v : Date.parse(v);
          return Number.isFinite(t) ? t : null;
        })(),
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
  // Globe-style overhaul 2026-05-26 (Phil): deep-indigo space, blue limb,
  // wider horizon blend (0.45-0.6) so the atmosphere reads as orbit, not
  // weather app. Cool grey-blue ground colour to sit under the night-earth
  // satellite re-tone in PulseMap.jsx. Star intensity preserved low-always-on
  // (bumped at night per the brief) so the field is felt, not garish.
  if (h >= 5 && h < 8) {           // dawn — indigo space, blue limb cracking warm
    cfg = { color: 'rgba(12,14,32,0.6)', 'high-color': '#6d83e0', 'space-color': '#0c0a32', 'horizon-blend': 0.5, 'star-intensity': reducedMotion ? 0 : 0.18 };
  } else if (h >= 8 && h < 17) {   // day — indigo space, brighter blue atmosphere
    cfg = { color: 'rgba(14,18,36,0.55)', 'high-color': '#7a8ce8', 'space-color': '#0c0a32', 'horizon-blend': 0.55, 'star-intensity': reducedMotion ? 0 : 0.12 };
  } else if (h >= 17 && h < 20) {  // dusk — cooling indigo, mid-blue limb
    cfg = { color: 'rgba(12,14,32,0.6)', 'high-color': '#5b6fd0', 'space-color': '#0a0928', 'horizon-blend': 0.5, 'star-intensity': reducedMotion ? 0 : 0.22 };
  } else {                          // night — deep indigo space, blue limb, star field
    cfg = { color: 'rgba(10,12,28,0.65)', 'high-color': '#5b6fd0', 'space-color': '#0a0928', 'horizon-blend': 0.45, 'star-intensity': reducedMotion ? 0 : 0.35 };
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
          // Lifecycle-aware sprite picker (Sacred Invariants #4 + #5):
          // builds `hm-beacon-<category><suffix>` where suffix is '' for active,
          // '--decaying' (<=30min remaining) or '--stale' (<=5min remaining).
          // Expired rows (ttl <= 0) should be dropped UPSTREAM by data callers;
          // missing ends_at_ms falls through to the active sprite for robustness
          // (treated as ttl = 30min+1ms so the `>` 30min branch wins).
          ICON_MIN_ZOOM, [
            'let', 'ttl',
            ['-',
              ['coalesce', ['get', 'ends_at_ms'], ['+', ['literal', 1800001], ['number', ['now']]]],
              ['number', ['now']],
            ],
            ['concat', 'hm-beacon-', ['get', 'beacon_category'],
              ['case',
                ['>', ['var', 'ttl'], 1800000], '',
                ['>', ['var', 'ttl'], 300000],  '--decaying',
                ['>', ['var', 'ttl'], 0],        '--stale',
                '',
              ],
            ],
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

