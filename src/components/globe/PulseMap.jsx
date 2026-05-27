import React, { useEffect, useRef, useState } from 'react';
// mapbox-gl needs its stylesheet for the canvas to size + paint.
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  LAYER_IDS,
  SOURCE_IDS,
  addLayerStack,
  toPublicSafeFeatureCollection,
  environmentalFog,
} from '../../lib/globe/mapboxLayerStack';
import { registerBeaconIcons } from './beaconIconFactory';
import { BEACON_GLYPHS } from './beaconGlyphs';

// Single-engine Pulse map. Mapbox GL v3 in GLOBE PROJECTION from load: cinematic
// planetary curvature + atmosphere + stars at macro zoom, real street detail at
// micro zoom, beacons rendered at every level (city cluster glow → individual
// bloom pins). This replaces the react-globe.gl sphere + globe→local handoff —
// one map, one camera, no isBehindGlobe crash path, no dual-engine state.
//
// The component is intentionally chrome-free (no FAB / toggle of its own): the
// parent (Globe.jsx) owns the on-screen controls and drives the camera through
// the imperative api handed back via onMapApi (toggleLocal / getCenter / flyTo*).

const TOKEN = (import.meta && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// 4-tier spatial model (Phil 2026-05-27): GLOBE → REGION → CITY → LOCAL.
// Each tier has its own pitch so the camera feels atmospheric, not geopolitical.
const GLOBE_ZOOM = 2.2;
const REGION_ZOOM = 5.5;
const CITY_ZOOM = 9.5;
const LOCAL_ZOOM = 14;
const TIER_PITCH = { globe: 15, region: 10, city: 30, local: 45 };
function tierForZoom(z) {
  if (z < 4) return 'globe';
  if (z < 7) return 'region';
  if (z < 12) return 'city';
  return 'local';
}
const LONDON = { lat: 51.5074, lng: -0.1278 };

// Cities that have an editorial profile (district_editorial_profiles). That table
// has no geometry, so the map centre → slug match is done here with a tiny
// centroid table. Extend as editorial coverage grows.
const EDITORIAL_CITIES = [
  { slug: 'london',   lat: 51.5074, lng: -0.1278 },
  { slug: 'berlin',   lat: 52.5200, lng: 13.4050 },
  { slug: 'new-york', lat: 40.7128, lng: -74.0060 },
];
const LOCAL_FOCUS_ZOOM = 10;      // at/above this the camera is "inside" a city
const LOCAL_FOCUS_MAX_DEG = 1.5;  // accept a city within ~150km of the centre
function resolveEditorialCity(lat, lng, zoom) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(zoom >= LOCAL_FOCUS_ZOOM)) return null;
  let best = null, bestD = Infinity;
  for (const c of EDITORIAL_CITIES) {
    const d = Math.hypot(lat - c.lat, lng - c.lng);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best && bestD <= LOCAL_FOCUS_MAX_DEG ? best : null;
}

export default function PulseMap({ beacons = [], userLocation, onBeaconClick, onMapApi, onReady, onLocalFocus }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Latest props via refs so the create-once effect never needs to re-run.
  const beaconsRef = useRef(beacons);
  beaconsRef.current = beacons;
  const userLocRef = useRef(userLocation);
  userLocRef.current = userLocation;
  const onBeaconClickRef = useRef(onBeaconClick);
  onBeaconClickRef.current = onBeaconClick;
  const onMapApiRef = useRef(onMapApi);
  onMapApiRef.current = onMapApi;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onLocalFocusRef = useRef(onLocalFocus);
  onLocalFocusRef.current = onLocalFocus;

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Create the map ONCE. Parent re-renders pass fresh beacons via the [beacons]
  // effect below; rebuilding the map on every render would never let it load.
  useEffect(() => {
    let cancelled = false;
    let resizeTimer;
    (async () => {
      if (!TOKEN) { setStatus('error'); return; }
      try {
        const mod = await import('mapbox-gl');
        const mapboxgl = mod.default || mod;
        mapboxgl.accessToken = TOKEN;
        if (cancelled || !containerRef.current) return;

        // Always open on London — the brand home + where signal density lives — so
        // the macro view reads as "the signal starts here". The user's own area is
        // one tap away via the right-side dive-to-local toggle (uses userLocation).
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11', // dark, premium base
          projection: 'globe',                       // v3 native globe curvature
          center: [LONDON.lng, LONDON.lat],
          zoom: GLOBE_ZOOM,
          minZoom: 0.8,   // can pull back to whole-globe
          maxZoom: 18,    // street detail
          attributionControl: false, // swapped for the compact (i) control below
        });
        mapRef.current = map;
        // Mapbox + OpenStreetMap attribution is REQUIRED by their ToS (can't be
        // removed without a commercial plan) — the compact control collapses it to a
        // small (i) so it's unobtrusive. The small Mapbox logo stays (also required).
        try { map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right'); } catch (e) { /* non-fatal */ }
        map.on('error', () => { /* keep graceful; never throw */ });

        // Tier auto-detect — emit current tier on every move so the rail UI
        // can highlight whichever tier the user is in (after pinch/drag too).
        let lastTier = tierForZoom(GLOBE_ZOOM);
        map.on('moveend', () => {
          const t = tierForZoom(map.getZoom());
          if (t !== lastTier) {
            lastTier = t;
            if (typeof window !== 'undefined') {
              try { window.dispatchEvent(new CustomEvent('pulse:tier', { detail: { tier: t } })); } catch (_) {}
            }
          }
        });

        // Run setup on style.load (style parsed) rather than 'load' (which waits for
        // the first tile batch): the dark base + atmosphere + controls appear fast and
        // tiles fill in progressively — no long "Loading the signal…" over a fresh area.
        let setupDone = false;
        // Fallback: if style.load didn't install the beacon stack (race with sprite
        // loading or earlier throw), retry on 'load' which fires once tiles arrive.
        map.on('load', () => {
          if (cancelled) return;
          try {
            if (!map.getSource('hm-public')) {
              console.warn('[PulseMap] beacon stack missing after style.load — retrying on load');
              if (typeof installBeaconStack === 'function') installBeaconStack('load-fallback');
            }
          } catch (e) { console.error('[PulseMap] load-fallback threw:', e); }
        });
        map.on('style.load', () => {
          // Atmosphere + star field, re-applied on every style load.
          try { map.setFog(environmentalFog(new Date().getHours(), reducedMotion)); } catch (e) { /* non-fatal */ }
          if (setupDone || cancelled) return;
          setupDone = true;
          try { map.resize(); } catch (e) { /* non-fatal */ }
          setStatus('ready');
          try { if (onReadyRef.current) onReadyRef.current(); } catch (e) { /* non-fatal */ }

          // Night-earth re-tone (Phil 2026-05-26 globe-style overhaul):
          // we keep mapbox.satellite-v9 as the source (one tile pipeline, no extra
          // API key risk, no NASA Black Marble free-tier rate-limit exposure) and
          // crush it into a dark earth + faint city-light scatter via raster paint.
          // Result reads as "Earth at night from orbit", not "Google Maps with a
          // logo on it". Faded out by street zoom so the dark vector base takes
          // over for legibility — fadeout curve preserved verbatim (Phil: do not
          // touch the z=10 handoff to street-level streets).
          try {
            if (!map.getSource('hm-satellite')) {
              map.addSource('hm-satellite', { type: 'raster', url: 'mapbox://mapbox.satellite', tileSize: 256 });
            }
            if (!map.getLayer('hm-satellite')) {
              let firstSymbol;
              const layers = (map.getStyle() && map.getStyle().layers) || [];
              for (const l of layers) { if (l.type === 'symbol') { firstSymbol = l.id; break; } }
              map.addLayer({
                id: 'hm-satellite',
                type: 'raster',
                source: 'hm-satellite',
                paint: {
                  // Cinematic dark-earth curve — opacity envelope preserved from
                  // PR #408 (do not touch the z=10 city-zoom fadeout per Phil).
                  'raster-opacity': ['interpolate', ['linear'], ['zoom'], 1.5, 0.96, 4, 0.9, 6, 0.7, 8, 0.35, 10, 0],
                  // Night-earth crush: desaturate to mono, drop brightness ceiling
                  // so only the brightest pixels (city lights, ice, deserts) punch
                  // through, lift contrast, and rotate hue cool so what does punch
                  // through reads as neon-cyan city-light scatter, not yellow lamps.
                  'raster-saturation': -1,
                  'raster-brightness-max': 0.25,
                  'raster-contrast': 0.4,
                  'raster-hue-rotate': -20,
                  'raster-fade-duration': 300,
                },
              }, firstSymbol);
            }
          } catch (e) { /* non-fatal: dark vector base still renders */ }

          // CHANGE 2 — neon coastline + country-edge overlay (Phil 2026-05-26).
          // The dark-v11 base style already loads the mapbox-streets-v8 vector
          // tiles under the source id 'composite' (Mapbox convention for the
          // bundled source on first-party styles). We tap that source twice:
          //   - water polygon edges → coastlines (reads as the world's outline)
          //   - admin lines (admin_level 0–1) → country/region edges
          // Both use the neon purple-blue from the brief (#7A5BFF) with a soft
          // blur for the orbital-neon feel. Inserted BEFORE the beacon clusters
          // (beforeId = LAYER_IDS.clusterCircles) so beacons stay on top.
          try {
            if (map.getSource('composite')) {
              const beforeId = map.getLayer(LAYER_IDS.clusterCircles) ? LAYER_IDS.clusterCircles : undefined;
              if (!map.getLayer('hm-coastline-neon')) {
                map.addLayer({
                  id: 'hm-coastline-neon',
                  type: 'line',
                  source: 'composite',
                  'source-layer': 'water',
                  filter: ['==', ['geometry-type'], 'Polygon'],
                  paint: {
                    'line-color': '#7A5BFF',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 5, 1.0, 8, 1.6],
                    'line-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.45, 6, 0.55, 9, 0.25, 11, 0],
                    'line-blur': 0.6,
                  },
                }, beforeId);
              }
              if (!map.getLayer('hm-admin-neon')) {
                map.addLayer({
                  id: 'hm-admin-neon',
                  type: 'line',
                  source: 'composite',
                  'source-layer': 'admin',
                  // Country (0) + first-order region (1) edges only; drops noisy
                  // sub-admin lines so the globe reads as nations, not counties.
                  filter: ['all', ['<=', ['to-number', ['get', 'admin_level']], 1], ['!=', ['get', 'maritime'], 'true']],
                  paint: {
                    'line-color': '#7A5BFF',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.3, 5, 0.7, 8, 1.1],
                    'line-opacity': ['interpolate', ['linear'], ['zoom'], 2, 0.35, 6, 0.45, 9, 0.2, 11, 0],
                    'line-blur': 0.5,
                  },
                }, beforeId);
              }
            }
          } catch (e) { /* non-fatal: coastline overlay is purely decorative */ }

          // Beacon layer stack (clusters glow at macro, blooms at micro). Lower
          // clusterMaxZoom than the legacy local-only map so individuals separate
          // by street zoom on the single-engine globe.
          //
          // 2026-05-27 (Phil): silent catch was hiding addLayerStack failures —
          // production globe had NO beacon source/layers and we never knew.
          // Errors now surface to console; the fallback on map.on('load') retries
          // if style.load fired before things were ready.
          const installBeaconStack = (origin) => {
            try {
              registerBeaconIcons(map).catch((err) => {
                console.warn('[PulseMap] beacon icon registration failed (will fall back to gold dots):', err && err.message || err);
              });
              addLayerStack(map, { reducedMotion, clusterMaxZoom: 13 });
              const src = map.getSource(SOURCE_IDS.public);
              if (src && src.setData) {
                src.setData(toPublicSafeFeatureCollection(beaconsRef.current));
              } else {
                console.error('[PulseMap] hm-public source missing after addLayerStack (' + origin + ')');
              }
            } catch (e) {
              console.error('[PulseMap] addLayerStack threw (' + origin + '):', e && e.message || e, e && e.stack);
            }
          };
          installBeaconStack('style.load');

          // Cluster tap → expand toward its constituents.
          map.on('click', LAYER_IDS.clusterCircles, (e) => {
            const feat = e.features && e.features[0];
            if (!feat) return;
            const src = map.getSource(SOURCE_IDS.public);
            if (!src || !src.getClusterExpansionZoom) return;
            src.getClusterExpansionZoom(feat.properties.cluster_id, (err, zoom) => {
              if (err || cancelled) return;
              map.easeTo({ center: feat.geometry.coordinates, zoom, duration: reducedMotion ? 0 : 500 });
            });
          });

          // Beacon tap → selected halo + parent handler (preview panel).
          map.on('click', LAYER_IDS.beaconMarkers, (e) => {
            const feat = e.features && e.features[0];
            if (!feat) return;
            try {
              const sel = map.getSource(SOURCE_IDS.selected);
              if (sel && sel.setData) {
                sel.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: feat.geometry, properties: feat.properties }] });
              }
            } catch (er) { /* non-fatal */ }
            // Hand the FULL local record back (resolved by id) so the parent can route
            // person/social beacons into the boo-gated profile/chat flow — the map
            // feature only carries id/cat/title for privacy, but the client already
            // holds the full signal list in memory. Falls back to feature props.
            try {
              if (onBeaconClickRef.current) {
                const fid = feat.properties.id;
                const list = Array.isArray(beaconsRef.current) ? beaconsRef.current : [];
                const full = list.find((b) => b && String(b.id) === String(fid));
                const coords = feat.geometry.coordinates;
                const datum = full
                  ? { ...full, lat: coords[1], lng: coords[0] }
                  : {
                      id: fid,
                      title: feat.properties.title,
                      kind: feat.properties.cat,
                      beacon_category: feat.properties.cat,
                      lat: coords[1],
                      lng: coords[0],
                    };
                onBeaconClickRef.current(datum);
              }
            } catch (er) { /* non-fatal */ }
            // Lightweight on-map label too.
            try {
              const label = feat.properties.title || (feat.properties.cat ? feat.properties.cat[0].toUpperCase() + feat.properties.cat.slice(1) : 'Signal');
              new mapboxgl.Popup({ offset: 14, closeButton: true })
                .setLngLat(feat.geometry.coordinates)
                .setHTML('<div style="font:600 12px/1.35 system-ui,sans-serif;color:#111;max-width:170px">' + escapeHtml(label) + '</div>')
                .addTo(map);
            } catch (er) { /* non-fatal */ }
          });

          // ── Beacon Identity icons — mirror the beaconMarkers click handler so
          //    tapping a category beacon opens the same preview flow.
          map.on('click', LAYER_IDS.beaconIcons, (e) => {
            const feat = e.features && e.features[0];
            if (!feat) return;
            try {
              const sel = map.getSource(SOURCE_IDS.selected);
              if (sel && sel.setData) {
                sel.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: feat.geometry, properties: feat.properties }] });
              }
            } catch (er) { /* non-fatal */ }
            try {
              if (onBeaconClickRef.current) {
                const fid = feat.properties.id;
                const list = Array.isArray(beaconsRef.current) ? beaconsRef.current : [];
                const full = list.find((b) => b && String(b.id) === String(fid));
                const coords = feat.geometry.coordinates;
                const datum = full
                  ? { ...full, lat: coords[1], lng: coords[0] }
                  : {
                      id: fid,
                      title: feat.properties.title,
                      kind: feat.properties.cat,
                      beacon_category: feat.properties.beacon_category || feat.properties.cat,
                      lat: coords[1],
                      lng: coords[0],
                    };
                onBeaconClickRef.current(datum);
              }
            } catch (er) { /* non-fatal */ }
          });

          // ── Hover label — text hidden by default, appears on mouseenter, hides
          //    on mouseleave. Matches the Beacon Identity hover spec
          //    (CATEGORY · MOTION). Skip on touch where mouseenter never fires.
          let __hmHoverPopup = null;
          let __hmHoverFid = null;
          map.on('mouseenter', LAYER_IDS.beaconIcons, (e) => {
            const feat = e.features && e.features[0];
            if (!feat) return;
            try { map.getCanvas().style.cursor = 'pointer'; } catch (er) { /* non-fatal */ }
            const cat = feat.properties.beacon_category;
            const glyph = cat && BEACON_GLYPHS[cat];
            if (!glyph) return;
            const fid = feat.properties.id || (feat.geometry.coordinates[0] + ',' + feat.geometry.coordinates[1]);
            if (__hmHoverFid === fid && __hmHoverPopup) return;
            __hmHoverFid = fid;
            if (__hmHoverPopup) { try { __hmHoverPopup.remove(); } catch (er) { /* non-fatal */ } __hmHoverPopup = null; }
            const title = (feat.properties.title || '').toString();
            const dotColor = glyph.state === 'care' ? '#F4F1E8' : '#E6BE5A';
            const dotShadow = glyph.state === 'care' ? 'rgba(244,241,232,0.45)' : 'rgba(230,190,90,0.45)';
            const html = '<div style="font:500 10px/1.2 ui-monospace,monospace;letter-spacing:0.28em;text-transform:uppercase;color:#EAE6DD;background:rgba(8,8,12,0.92);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.10);border-radius:4px;padding:6px 10px;white-space:nowrap;">'
              + '<span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:' + dotColor + ';margin-right:8px;vertical-align:middle;box-shadow:0 0 6px ' + dotShadow + ';"></span>'
              + escapeHtml(glyph.label) + ' &middot; ' + escapeHtml(glyph.motion)
              + (title ? '<div style="margin-top:4px;font-weight:400;letter-spacing:0.08em;text-transform:none;color:rgba(255,255,255,0.62);font-size:11px;">' + escapeHtml(title) + '</div>' : '')
              + '</div>';
            try {
              __hmHoverPopup = new mapboxgl.Popup({ offset: 18, closeButton: false, closeOnClick: false, className: 'hm-beacon-hover' })
                .setLngLat(feat.geometry.coordinates)
                .setHTML(html)
                .addTo(map);
            } catch (er) { /* non-fatal */ }
          });
          map.on('mouseleave', LAYER_IDS.beaconIcons, () => {
            try { map.getCanvas().style.cursor = ''; } catch (er) { /* non-fatal */ }
            __hmHoverFid = null;
            if (__hmHoverPopup) { try { __hmHoverPopup.remove(); } catch (er) { /* non-fatal */ } __hmHoverPopup = null; }
          });

          // Pointer affordance on the hit layers (desktop).
          ['clusterCircles', 'beaconMarkers'].forEach((key) => {
            map.on('mouseenter', LAYER_IDS[key], () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (er) {} });
            map.on('mouseleave', LAYER_IDS[key], () => { try { map.getCanvas().style.cursor = ''; } catch (er) {} });
          });

          // Hand the imperative camera api to the parent (right-side toggle, drop-at-centre).
          try {
            if (onMapApiRef.current) {
              const dur = reducedMotion ? 0 : 1600;
              onMapApiRef.current({
                getCenter: () => { try { const c = map.getCenter(); return { lat: c.lat, lng: c.lng }; } catch (e) { return null; } },
                // Search results / external jumps land here.
                flyTo: (loc) => {
                  if (!loc || !Number.isFinite(Number(loc.lat)) || !Number.isFinite(Number(loc.lng))) return;
                  const z = Number.isFinite(Number(loc.zoom)) ? Number(loc.zoom) : LOCAL_ZOOM;
                  try { map.flyTo({ center: [Number(loc.lng), Number(loc.lat)], zoom: z, duration: dur, essential: true }); } catch (e) {}
                },
                flyToLocal: () => {
                  const u = userLocRef.current;
                  const c = (u && Number.isFinite(Number(u.lat))) ? { lat: Number(u.lat), lng: Number(u.lng) } : (() => { const cc = map.getCenter(); return { lat: cc.lat, lng: cc.lng }; })();
                  try { map.flyTo({ center: [c.lng, c.lat], zoom: LOCAL_ZOOM, duration: dur, essential: true }); } catch (e) {}
                },
                flyToGlobe: () => {
                  try { const cc = map.getCenter(); map.flyTo({ center: [cc.lng, cc.lat], zoom: GLOBE_ZOOM, duration: dur, essential: true }); } catch (e) {}
                },
                // The right-side toggle: dive to local when we're at globe scale,
                // pull back out to the globe when we're already down at street.
                toggleLocal: () => {
                  let z = GLOBE_ZOOM;
                  try { z = map.getZoom(); } catch (e) {}
                  if (z < 8) {
                    const u = userLocRef.current;
                    const c = (u && Number.isFinite(Number(u.lat))) ? { lat: Number(u.lat), lng: Number(u.lng) } : (() => { const cc = map.getCenter(); return { lat: cc.lat, lng: cc.lng }; })();
                    try { map.flyTo({ center: [c.lng, c.lat], zoom: LOCAL_ZOOM, duration: dur, essential: true }); } catch (e) {}
                  } else {
                    try { const cc = map.getCenter(); map.flyTo({ center: [cc.lng, cc.lat], zoom: GLOBE_ZOOM, duration: dur, essential: true }); } catch (e) {}
                  }
                },
              });
            }
          } catch (e) { /* non-fatal */ }

          // District editorial focus — single-engine replacement for the retired
          // react-globe localFocus path. When the camera settles inside a city at
          // local zoom, tell the parent which editorial slug to surface (district
          // card + care cue); clear it on pull-back to the globe. Fires only on change.
          let lastFocusSlug = null;
          const reportLocalFocus = () => {
            try {
              const cc = map.getCenter();
              const city = resolveEditorialCity(cc.lat, cc.lng, map.getZoom());
              const slug = city ? city.slug : null;
              if (slug === lastFocusSlug) return;
              lastFocusSlug = slug;
              if (onLocalFocusRef.current) onLocalFocusRef.current(city ? { slug: city.slug, lat: cc.lat, lng: cc.lng } : null);
            } catch (e) { /* non-fatal */ }
          };
          map.on('moveend', reportLocalFocus);
          reportLocalFocus();
        });

        // Guard against a 0-size init (layout not flushed) → blank canvas.
        resizeTimer = setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
      } catch (e) {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      try { if (mapRef.current) mapRef.current.remove(); } catch (e) {}
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed fresh beacon data in place — never recreate the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const src = map.getSource(SOURCE_IDS.public);
      if (src && src.setData) src.setData(toPublicSafeFeatureCollection(beacons));
    } catch (e) { /* source not ready; initial data set on load */ }
  }, [beacons]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm pointer-events-none">
          {status === 'error' ? 'Map unavailable' : 'Loading the signal…'}
        </div>
      )}
    </div>
  );
}
