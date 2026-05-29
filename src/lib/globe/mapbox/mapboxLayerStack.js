// Mapbox local-mode layer stack — implements docs/GLOBE_MAPBOX_LAYER_STACK.md
// (the local renderer contract). Owns: stable layer IDs, privacy-safe source
// construction, and the contract-ordered layer definitions. Kept framework-free
// and side-effect-light so it stays unit-testable.

// Stable layer IDs (naming convention from the spec, §"Mapbox layer naming").
export const LAYER_IDS = {
  clusterCircles: 'hm-cluster-circles',
  clusterCount: 'hm-cluster-symbols',
  beaconMarkers: 'hm-beacon-markers',
  selectedHalo: 'hm-selected-halo',
};
export const SOURCE_IDS = { public: 'hm-public', selected: 'hm-selected' };

// Category → colour, aligned with the globe LAYER_DEFS so the two engines read alike.
//
// Phil 2026-05-29: added `editorial` as a distinct category for curated district
// pulse beacons (Soho · Warming, Vauxhall · Eyes on tonight, etc.) so they paint
// in brand gold rather than the events-pink default — the operator's editorial
// voice must be visually distinct from user-hosted event invites. Locks the
// Doctrine 11 visual contract: editorial reads atmospheric, events read social.
export const CATEGORY_COLOR = {
  editorial: '#C8962C', // brand gold — curated district pulse
  events: '#FF4F9A',
  venues: '#00C2E0',
  people: '#39FF14',
  market: '#FFD700',
  radio: '#B026FF',
  care: '#F4ECD8',  // cream — care reads soft, not clinical white
  other: '#C8962C',
};

// Privacy contract (§"Privacy constraints"): these never enter the PUBLIC source.
//
// Phil 2026-05-29: the safety/aftercare distinction matters. `safety` as a TYPE
// covers operator-placed care-available beacons ("Aftercare available · Land
// here if you need it") which are public-by-intent — they're an offering, not
// an emergency. The PRIVATE set still drops genuine SOS / location-share /
// trusted-contact rows. The `isPrivate` check below carves out aftercare so
// the offering surfaces while the emergency channel stays sealed.
const PRIVATE = new Set(['help', 'sos', 'safety', 'location_share', 'location_shares', 'trusted_contact', 'sos_ring', 'checkin']);
// Public-by-intent overrides — even if the row's type/kind says "safety",
// these category values mean "I am offering care", which is publishable.
const PUBLIC_CARE_OVERRIDE = new Set(['aftercare', 'recovery', 'clinic']);
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

function metaField(b, key) {
  try {
    const meta = b && (b.metadata || b.meta);
    if (!meta) return '';
    const v = typeof meta === 'string' ? JSON.parse(meta)[key] : meta[key];
    return v == null ? '' : String(v).toLowerCase();
  } catch (_) { return ''; }
}

function isCurated(b) {
  // metadata.curated === true → operator drop (district / hotmess / care)
  try {
    const meta = b && (b.metadata || b.meta);
    if (!meta) return false;
    const c = typeof meta === 'string' ? JSON.parse(meta).curated : meta.curated;
    return c === true || c === 'true';
  } catch (_) { return false; }
}

export function isPrivate(b) {
  const k = field(b, 'kind');
  const c = field(b, 'beacon_category', 'category');
  const m = field(b, 'mode');
  // Public-by-intent override: an aftercare/recovery/clinic offering renders
  // even when the row's broad type is 'safety'. Genuine SOS rows have type
  // 'safety' AND category in {help, sos, sos_ring, location_share, ...} —
  // those still get dropped because the category check below them still hits.
  if (PUBLIC_CARE_OVERRIDE.has(c)) return false;
  return PRIVATE.has(k) || PRIVATE.has(c) || PRIVATE.has(m);
}

function isApprox(b) {
  return APPROX.has(field(b, 'kind')) || APPROX.has(field(b, 'beacon_category', 'category')) || APPROX.has(field(b, 'mode'));
}

export function categoryOf(b) {
  const all = `${field(b, 'kind')} ${field(b, 'beacon_category', 'category')} ${field(b, 'type')}`;
  // Curated district editorial — operator-placed atmospheric reads, not real
  // events. Must paint in brand gold so the user can tell editorial voice
  // apart from user-hosted invites at a glance. Doctrine 11.
  if (isCurated(b)) {
    const metaKind = metaField(b, 'kind');
    if (metaKind === 'district' || metaKind === 'hotmess') return 'editorial';
    // Curated event-shaped beacons without a venue or scheduled start time
    // are district reads dressed up as events. They paint editorial too.
    const hasVenue = b && (b.venue_id || b.venueId);
    const hasSchedule = b && (b.event_start_at || b.event_end_at);
    if (/event/.test(all) && !hasVenue && !hasSchedule) return 'editorial';
  }
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
        color: CATEGORY_COLOR[cat] || CATEGORY_COLOR.other,
        title: String(b.title || b.name || ''),
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
  let cfg;
  if (h >= 5 && h < 8) {           // dawn — warm gold horizon
    cfg = { color: 'rgba(20,14,8,0.55)', 'high-color': '#caa15a', 'space-color': '#241d2e', 'horizon-blend': 0.3, 'star-intensity': 0 };
  } else if (h >= 8 && h < 17) {   // day — cool, light, no stars
    cfg = { color: 'rgba(20,22,28,0.4)', 'high-color': '#9fb6cc', 'space-color': '#1a2433', 'horizon-blend': 0.4, 'star-intensity': 0 };
  } else if (h >= 17 && h < 20) {  // dusk — amber
    cfg = { color: 'rgba(20,12,8,0.55)', 'high-color': '#c8762c', 'space-color': '#1a1020', 'horizon-blend': 0.3, 'star-intensity': reducedMotion ? 0 : 0.03 };
  } else {                          // night — deep gold (nightlife default)
    cfg = { color: 'rgba(10,8,5,0.6)', 'high-color': '#3a2a10', 'space-color': '#050507', 'horizon-blend': 0.2, 'star-intensity': reducedMotion ? 0 : 0.05 };
  }
  return cfg;
}

// Adds sources + layers in contract order on top of the base style. Idempotent:
// guards every add so re-invocation (style reload) can't throw.
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
      clusterRadius: 50,
      clusterMaxZoom: 16,
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
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['coalesce', ['get', 'color'], '#C8962C'],
        'circle-radius': 6,
        'circle-opacity': 0.92,
        'circle-stroke-width': 2,
        'circle-stroke-color': 'rgba(255,255,255,0.55)',
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

