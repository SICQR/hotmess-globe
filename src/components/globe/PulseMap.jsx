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
import { useGlowUserIds } from '@/hooks/useGlowUserIds';
import { BEACON_GLYPHS } from './beaconGlyphs';
// D43 Slice A · PR 3 — in-world cluster preview wiring.
// Composer + chip + leaf-shaper land here as the kind-router branch for
// cluster hover/long-press. Replaces the mapbox-native popup that was
// hand-rendering "N SIGNALS HERE" + strongest title.
// Doctrine refs: D43, D48 §3.1/§3.2/§3.3/§5.1, D17, sacred-invariants.
import { composeClusterPreview } from '@/lib/clusters/composeClusterPreview';
import { mapboxLeavesToBeacons } from '@/lib/clusters/mapboxLeafToBeacon';
import ClusterPreviewChip from './ClusterPreviewChip';
import { supabase } from '@/components/utils/supabaseClient';

/** D43 Slice A — chip dismiss timeout. Ratified §9.4. */
const CLUSTER_PREVIEW_TIMEOUT_MS = 1500;
/** D43 Slice A — long-press threshold for mobile chip activation. D17 muscle memory (#9.5). */
const CLUSTER_LONG_PRESS_MS = 350;

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

export default function PulseMap({ beacons = [], userLocation, onBeaconClick, onMapApi, onReady, onLocalFocus, onClustersChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Latest props via refs so the create-once effect never needs to re-run.
  const beaconsRef = useRef(beacons);
  beaconsRef.current = beacons;
  // globe_glow: amplify aura ONLY for owners with an active boost. Empty Set
  // in steady state → zero render impact. Hook silently falls back to empty
  // on RPC error so a Supabase blip never blanks the globe.
  const glowUserIds = useGlowUserIds();
  const glowUserIdsRef = useRef(glowUserIds);
  glowUserIdsRef.current = glowUserIds;
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
  // D43 Slice A · PR 4 — a11y cluster row consumer.
  // Optional callback that receives the array of currently-visible composed
  // cluster states whenever the camera settles. Lets a parent (Globe.jsx) feed
  // BeaconA11yList so screen-reader users get the same composed reality the
  // sighted chip emits. Default-down (§3.4) is enforced upstream by the leaf
  // shaper — by the time state reaches the parent there's no face data on it.
  const onClustersChangeRef = useRef(onClustersChange);
  onClustersChangeRef.current = onClustersChange;

  // ─── D43 Slice A · PR 3 — in-world cluster preview state ──────────────────
  // The React-state-driven chip replaces the previous Mapbox-native popup.
  // Per scope §3.6 the composer is constitutional infrastructure; here we
  // own the chip's mount/dismount + position projection + continuity cache.
  //
  // clusterPreview shape: null | {
  //   state: ClusterPreviewState (from composeClusterPreview),
  //   anchor: { lng, lat },     // re-projected on every map.move while visible
  //   screen: { x, y },         // current screen pixels for absolute position
  // }
  const [clusterPreview, setClusterPreview] = useState(null);
  // The map.on('move') callback closes over its initial render's state, so
  // we mirror the current preview into a ref to read inside the Mapbox
  // callback without re-binding the handler on every state change.
  const clusterPreviewRef = useRef(null);
  clusterPreviewRef.current = clusterPreview;
  // continuity cache — §3.5 invariant. cluster_id → ClusterPreviewState.
  // Held in a ref because it's keyed by Mapbox cluster ids, which are stable
  // across re-renders but change on data source replacement.
  const clusterCacheRef = useRef(new Map());
  // dismiss timeout (1.5s per §9.4)
  const clusterTimeoutRef = useRef(null);
  // D43 Slice A · PR 4 — a11y cluster sweep debounce. Idle fires multiple
  // times during settle on some platforms (notably mobile WebKit); we
  // coalesce to one sweep per ~250ms quiet window so we don't thrash
  // getClusterLeaves on the worker.
  const clusterSweepTimeoutRef = useRef(null);
  // viewer id from Supabase auth — fed to ViewerContext for the composer's
  // §3.4 "viewer's own beacon never represents the cluster" rule
  const viewerIdRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) viewerIdRef.current = data?.session?.user?.id ?? null;
      } catch { /* anonymous viewer is fine — composer handles null */ }
    })();
    return () => { cancelled = true; };
  }, []);
  // M-self (Phil 2026-05-28 #259): persistent self-marker. Camera flyTo was
  // the only proof a user was on the map — they couldn't actually see themselves.
  // Now: a pulsing gold dot painted at userLocation, always visible, no presence
  // dependency, distinct from beacons.
  const selfMarkerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapboxglRef = useRef(null);

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
        mapInstanceRef.current = map;
        mapboxglRef.current = mapboxgl;
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
                src.setData(toPublicSafeFeatureCollection(beaconsRef.current, glowUserIdsRef.current));
              } else {
                console.error('[PulseMap] hm-public source missing after addLayerStack (' + origin + ')');
              }
            } catch (e) {
              console.error('[PulseMap] addLayerStack threw (' + origin + '):', e && e.message || e, e && e.stack);
            }
          };
          installBeaconStack('style.load');

          // Cluster tap → open cluster preview sheet (Phil locked 2026-05-29).
          // Was: blind zoom into the cluster. Replaced with a peek-sheet that
          // surfaces "N signals here" with the strongest title and a list of
          // the constituent signals. The Zoom-in action stays available as a
          // secondary CTA inside the sheet.
          //
          // We pre-resolve the leaves here so the sheet doesn't need to know
          // about Mapbox — it just receives a static snapshot of the cluster.
          map.on('click', LAYER_IDS.clusterCircles, (e) => {
            const feat = e.features && e.features[0];
            if (!feat || !onBeaconClickRef.current) return;
            const src = map.getSource(SOURCE_IDS.public);
            if (!src || !src.getClusterLeaves) return;
            const clusterId = feat.properties.cluster_id;
            const count = Number(feat.properties.point_count) || 0;
            const coords = feat.geometry.coordinates;
            // getClusterLeaves can return up to `limit` features. Cap at 30 —
            // beyond that the preview list isn't readable and Zoom-in is
            // the right move anyway.
            const limit = Math.min(count, 30);
            src.getClusterLeaves(clusterId, limit, 0, (err, leaves) => {
              if (err || cancelled || !onBeaconClickRef.current) return;
              const leafItems = (leaves || []).map((leaf) => {
                const p = leaf.properties || {};
                return {
                  id: p.id,
                  title: p.title || (p.cat ? p.cat[0].toUpperCase() + p.cat.slice(1) : 'Signal'),
                  beacon_category: p.beacon_category || p.cat,
                  color: p.color,
                  priority: Number(p.priority) || 0,
                  ends_at_ms: Number(p.ends_at_ms) || 0,
                };
              });
              // Strongest = highest priority, ties broken by latest ends_at.
              leafItems.sort((a, b) => (b.priority - a.priority) || (b.ends_at_ms - a.ends_at_ms));
              onBeaconClickRef.current({
                isCluster: true,
                cluster_id: clusterId,
                count,
                lat: coords[1],
                lng: coords[0],
                leaves: leafItems,
                // Used by Globe.jsx when the user picks "Zoom in" — falls back
                // to a sensible level if the source doesn't expose expansion.
                expansion_resolver: () => new Promise((resolve) => {
                  try {
                    src.getClusterExpansionZoom(clusterId, (zErr, zoom) => {
                      resolve(zErr ? null : zoom);
                    });
                  } catch (_) { resolve(null); }
                }),
              });
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

          // ── Hover preview — Phil 2026-05-29 locked.
          //    Every beacon must surface anticipatory copy (title + subtitle +
          //    countdown if available) BEFORE the tap commits. Desktop:
          //    mouseenter. Mobile: 350ms long-press (touchstart-with-no-move).
          //    Wired on BOTH beaconIcons and beaconMarkers — the v2 silhouette
          //    layer covers categories with registered glyphs; the v1 circle
          //    layer covers everything else (seeded district/event/cafe/gym).
          //    Glyph is optional in the popup body — falls back to title-only
          //    when no glyph is registered for the category.
          let __hmHoverPopup = null;
          let __hmHoverFid = null;
          const __escape = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
          }[c] || c));
          const __formatRemaining = (endsAtMs) => {
            if (!endsAtMs) return null;
            const diff = endsAtMs - Date.now();
            if (diff <= 0) return null;
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
          };
          const __showHoverPopup = (feat) => {
            if (!feat || !feat.properties) return;
            const props = feat.properties;
            const fid = props.id || (feat.geometry.coordinates[0] + ',' + feat.geometry.coordinates[1]);
            if (__hmHoverFid === fid && __hmHoverPopup) return;
            __hmHoverFid = fid;
            if (__hmHoverPopup) { try { __hmHoverPopup.remove(); } catch (er) { /* non-fatal */ } __hmHoverPopup = null; }
            const cat = props.beacon_category;
            const glyph = cat && BEACON_GLYPHS[cat];
            const title = (props.title || '').toString();
            const subtitle = (props.description || props.subtitle || '').toString();
            const endsAtMs = Number(props.ends_at_ms) || (props.ends_at ? Date.parse(props.ends_at) : 0);
            const remaining = __formatRemaining(endsAtMs);
            // Care signals get cream accent, everything else gets brand gold.
            const isCare = glyph?.state === 'care' || cat === 'aftercare' || cat === 'safety' || cat === 'clinic';
            const dotColor = isCare ? '#F4F1E8' : '#E6BE5A';
            const dotShadow = isCare ? 'rgba(244,241,232,0.45)' : 'rgba(230,190,90,0.45)';
            // Header chip: glyph-label · motion if registered, otherwise just category.
            const headerText = glyph
              ? `${glyph.label} &middot; ${glyph.motion}`
              : __escape(String(cat || 'signal').toUpperCase());
            const remainingHtml = remaining
              ? `<span style="margin-left:8px;font-weight:400;color:rgba(255,255,255,0.55);font-size:10px;letter-spacing:0.1em;text-transform:none;">${__escape(remaining)}</span>`
              : '';
            const subtitleHtml = subtitle && subtitle !== title
              ? `<div style="margin-top:3px;font-weight:400;letter-spacing:0.04em;text-transform:none;color:rgba(255,255,255,0.55);font-size:11px;">${__escape(subtitle)}</div>`
              : '';
            const titleHtml = title
              ? `<div style="margin-top:4px;font-weight:500;letter-spacing:0.08em;text-transform:none;color:rgba(255,255,255,0.78);font-size:11px;">${__escape(title)}</div>`
              : '';
            const html = '<div style="font:500 10px/1.2 ui-monospace,monospace;letter-spacing:0.28em;text-transform:uppercase;color:#EAE6DD;background:rgba(8,8,12,0.92);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.10);border-radius:4px;padding:6px 10px;max-width:240px;">'
              + '<span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:' + dotColor + ';margin-right:8px;vertical-align:middle;box-shadow:0 0 6px ' + dotShadow + ';"></span>'
              + headerText + remainingHtml
              + titleHtml + subtitleHtml
              + '</div>';
            try {
              __hmHoverPopup = new mapboxgl.Popup({ offset: 18, closeButton: false, closeOnClick: false, className: 'hm-beacon-hover' })
                .setLngLat(feat.geometry.coordinates)
                .setHTML(html)
                .addTo(map);
            } catch (er) { /* non-fatal */ }
          };
          const __dismissHoverPopup = () => {
            __hmHoverFid = null;
            if (__hmHoverPopup) { try { __hmHoverPopup.remove(); } catch (er) { /* non-fatal */ } __hmHoverPopup = null; }
          };

          // Desktop hover — wire on BOTH layers so circle-rendered beacons
          // (seeded district, event, cafe, gym) also get a preview.
          ['beaconIcons', 'beaconMarkers'].forEach((key) => {
            map.on('mouseenter', LAYER_IDS[key], (e) => {
              try { map.getCanvas().style.cursor = 'pointer'; } catch (er) {}
              const feat = e.features && e.features[0];
              if (feat) __showHoverPopup(feat);
            });
            map.on('mouseleave', LAYER_IDS[key], () => {
              try { map.getCanvas().style.cursor = ''; } catch (er) {}
              __dismissHoverPopup();
            });
          });

          // Mobile long-press — Phil 2026-05-29: every beacon must have
          // hover-before-click. On touch, mouseenter never fires; 350ms hold
          // without significant move shows the preview chip. If the user
          // releases within 350ms we treat it as a tap (mapbox's own click
          // handler fires elsewhere); if they release after the preview is
          // shown we just dismiss the chip — preview without commit.
          let __hmTouchTimer = null;
          let __hmTouchStartXY = null;
          const __hmTouchClear = () => {
            if (__hmTouchTimer) { window.clearTimeout(__hmTouchTimer); __hmTouchTimer = null; }
            __hmTouchStartXY = null;
          };
          map.on('touchstart', (e) => {
            if (!e.originalEvent || e.originalEvent.touches.length !== 1) { __hmTouchClear(); return; }
            const t = e.originalEvent.touches[0];
            __hmTouchStartXY = { x: t.clientX, y: t.clientY };
            const point = e.point;
            __hmTouchTimer = window.setTimeout(() => {
              try {
                // Look at markers + icons + cluster circles. The cluster layer
                // gets its own popup shape ("N signals here") so the user can
                // read what they're about to commit to at any zoom level.
                const feats = map.queryRenderedFeatures([point.x, point.y], {
                  layers: [LAYER_IDS.beaconMarkers, LAYER_IDS.beaconIcons, LAYER_IDS.clusterCircles],
                });
                const feat = feats && feats[0];
                if (feat) {
                  if (feat.layer && feat.layer.id === LAYER_IDS.clusterCircles) {
                    // D43 Slice A · PR 3 — long-press cluster activation
                    // routes to the new React chip composer path.
                    __showClusterChip(feat);
                  } else {
                    __showHoverPopup(feat);
                  }
                }
              } catch (er) { /* non-fatal */ }
              __hmTouchTimer = null;
            }, 350);
          });
          map.on('touchmove', (e) => {
            if (!__hmTouchStartXY || !e.originalEvent || !e.originalEvent.touches[0]) { __hmTouchClear(); __dismissHoverPopup(); return; }
            const t = e.originalEvent.touches[0];
            const dx = t.clientX - __hmTouchStartXY.x;
            const dy = t.clientY - __hmTouchStartXY.y;
            if ((dx*dx + dy*dy) > 100) { // >10px move = scroll, not press
              __hmTouchClear();
              __dismissHoverPopup();
            }
          });
          map.on('touchend', () => {
            __hmTouchClear();
            window.setTimeout(__dismissHoverPopup, 600);
            // D43 Slice A · PR 3 — cluster chip honors its own 1.5s timer
            // (§9.4) so we don't dismiss it on touchend. The 1.5s window
            // is the "passing headlights" cadence Phil ratified.
          });
          map.on('touchcancel', () => {
            __hmTouchClear();
            __dismissHoverPopup();
            // Touch cancellation is a real interrupt (gesture aborted by
            // the system) — dismiss the chip too. Distinct from touchend.
            __dismissClusterChip();
          });

          // ── Cluster hover/long-press preview · D43 Slice A · PR 3 ──
          // REPLACES the legacy mapbox-native popup ("N SIGNALS HERE" + title)
          // with the React-state-driven ClusterPreviewChip. The composer
          // (composeClusterPreview) is the doctrine enforcement layer — see
          // src/lib/clusters/composeClusterPreview.ts + the locked scope
          // doc at docs/slices/d43-slice-a-cluster-preview.md.
          //
          // Per the locked scope: hover (desktop) + long-press (mobile, via the
          // existing 350ms touchstart-with-no-move handler) → fetch cluster
          // leaves → shape to ViewerVisibleBeacon → compose with §3.5 prior
          // from clusterCacheRef → set React state. The chip mounts, the
          // 1.5s dismiss is owned here, position re-projects on map.move.
          //
          // Doctrine: D43 §3 (in-world, no chip tap target), D48 §5.1
          // (canonical question evaluated per-beacon in gate_trace),
          // D17 §4 (unified preview pattern).
          const __dismissClusterChip = () => {
            if (clusterTimeoutRef.current) {
              window.clearTimeout(clusterTimeoutRef.current);
              clusterTimeoutRef.current = null;
            }
            setClusterPreview(null);
          };
          const __projectAnchor = (lng, lat) => {
            try {
              const p = map.project([lng, lat]);
              return { x: p.x, y: p.y };
            } catch (er) {
              return null;
            }
          };
          const __showClusterChip = (feat) => {
            if (!feat || !feat.properties || !feat.geometry) return;
            const count = Number(feat.properties.point_count) || 0;
            const clusterId = feat.properties.cluster_id;
            const [lng, lat] = feat.geometry.coordinates;
            const src = map.getSource(SOURCE_IDS.public);
            if (!src || !src.getClusterLeaves) return;

            src.getClusterLeaves(clusterId, Math.min(count, 30), 0, (err, leaves) => {
              if (err || cancelled) return;
              // Shape Mapbox leaves → ViewerVisibleBeacon, then compose.
              const beacons = mapboxLeavesToBeacons(leaves || []);
              const viewer = { viewer_id: viewerIdRef.current };
              const prior = clusterCacheRef.current.get(String(clusterId)) || null;
              const state = composeClusterPreview(beacons, viewer, prior, {
                onUncertaintyFallback: (event) => {
                  // PR 5 will wire this to a Supabase telemetry table + the
                  // morning observation digest. For now: dev-only console
                  // visibility so the §11 fallback rate is observable
                  // locally during build.
                  if (import.meta?.env?.DEV) {
                    // eslint-disable-next-line no-console
                    console.debug('[cluster-preview fallback]', event);
                  }
                },
              });
              clusterCacheRef.current.set(String(clusterId), state);
              const screen = __projectAnchor(lng, lat);
              if (!screen) return;
              setClusterPreview({ state, anchor: { lng, lat }, screen });
              // §9.4 — 1.5s atmospheric dismiss. Glance first, depth second.
              if (clusterTimeoutRef.current) window.clearTimeout(clusterTimeoutRef.current);
              clusterTimeoutRef.current = window.setTimeout(__dismissClusterChip, CLUSTER_PREVIEW_TIMEOUT_MS);
            });
          };
          map.on('mouseenter', LAYER_IDS.clusterCircles, (e) => {
            try { map.getCanvas().style.cursor = 'pointer'; } catch (er) {}
            const feat = e.features && e.features[0];
            if (feat) __showClusterChip(feat);
          });
          map.on('mouseleave', LAYER_IDS.clusterCircles, () => {
            try { map.getCanvas().style.cursor = ''; } catch (er) {}
            __dismissClusterChip();
          });
          // Re-project the chip's screen position on every map move so the
          // chip stays anchored to the cluster's geographic point during
          // pan/zoom. Lightweight: only fires while clusterPreview is set
          // (the inside-callback guard avoids work when the chip is hidden).
          map.on('move', () => {
            const cp = clusterPreviewRef.current;
            if (!cp) return;
            const screen = __projectAnchor(cp.anchor.lng, cp.anchor.lat);
            if (!screen) return;
            setClusterPreview((prev) => (prev ? { ...prev, screen } : prev));
          });
          // Mobile long-press cluster activation — the existing touchstart
          // 350ms hold logic (see __hmTouchStart handler above) already
          // detects when the long-pressed feature is a cluster and calls
          // __showClusterHoverPopup. The block below at line ~572 (now
          // updated to __showClusterChip) hands control here automatically.

          // D43 Slice A · PR 4 — a11y cluster sweep on settle.
          // Per D17 §4 unified-preview pattern, the BeaconA11yList cluster
          // rows must consume the SAME ClusterPreviewState the visual chip
          // consumes. We can't compute it lazily inside the a11y component
          // (getClusterLeaves is async; aria-label needs to be ready at
          // tab-focus time), so we sweep on map idle: query rendered cluster
          // features, resolve each leaf set through the composer, lift the
          // result to the parent via `onClustersChange`.
          //
          // Continuity (§3.5) is honoured because we pass `prior` from
          // clusterCacheRef → the composer short-circuits on topology-hash
          // match. The cache is shared with the chip path so the AT register
          // and the visual register both see the same stable representative
          // decision for as long as the cluster's topology holds.
          //
          // Debounced ~250ms so a single settle produces one sweep, not five.
          const __recomputeAllClusterStates = () => {
            const cb = onClustersChangeRef.current;
            if (typeof cb !== 'function') return; // no consumer wired
            try {
              // HOTFIX 2026-06-01 — was `SOURCE_IDS.beacons` (undefined). The
              // cluster-enabled GeoJSON source is `SOURCE_IDS.public` ('hm-public'),
              // matching every other getSource call in this file and the source
              // declared with cluster:true inside addLayerStack. The wrong key
              // returned undefined → getSource(undefined) → null → silent early
              // return → onClustersChange never fired → BeaconA11yList rendered
              // empty cluster prop → no cluster rows for screen-reader users
              // even when a cluster is visually present on the map.
              const src = map.getSource(SOURCE_IDS.public);
              if (!src || typeof src.getClusterLeaves !== 'function') return;
              const feats = map.queryRenderedFeatures(undefined, {
                layers: [LAYER_IDS.clusterCircles],
              });
              if (!feats || feats.length === 0) {
                cb([]);
                return;
              }
              // Deduplicate by cluster_id — Mapbox can emit the same cluster
              // feature twice if it straddles a tile boundary.
              const unique = new Map();
              for (const f of feats) {
                const cid = f && f.properties && f.properties.cluster_id;
                if (cid != null && !unique.has(cid)) unique.set(cid, f);
              }
              const pending = Array.from(unique.values()).map((f) => new Promise((resolve) => {
                const cid = f.properties.cluster_id;
                const count = Number(f.properties.point_count) || 0;
                const limit = Math.min(count || 30, 30);
                src.getClusterLeaves(cid, limit, 0, (err, leaves) => {
                  if (err || !Array.isArray(leaves)) return resolve(null);
                  try {
                    const beacons = mapboxLeavesToBeacons(leaves);
                    const prior = clusterCacheRef.current.get(String(cid)) || null;
                    const state = composeClusterPreview(
                      beacons,
                      { viewer_id: viewerIdRef.current },
                      prior,
                    );
                    clusterCacheRef.current.set(String(cid), state);
                    const coords = f.geometry && f.geometry.coordinates;
                    const anchor = Array.isArray(coords)
                      ? { lng: coords[0], lat: coords[1] }
                      : null;
                    resolve({ cluster_id: cid, state, anchor });
                  } catch (e) {
                    resolve(null);
                  }
                });
              }));
              Promise.all(pending).then((results) => {
                try { cb(results.filter(Boolean)); } catch (e) { /* parent crash isolation */ }
              });
            } catch (e) { /* non-fatal — the chip path is independent */ }
          };
          const __scheduleClusterSweep = () => {
            if (clusterSweepTimeoutRef.current) {
              window.clearTimeout(clusterSweepTimeoutRef.current);
            }
            clusterSweepTimeoutRef.current = window.setTimeout(() => {
              clusterSweepTimeoutRef.current = null;
              __recomputeAllClusterStates();
            }, 250);
          };
          map.on('idle', __scheduleClusterSweep);
          // First sweep after layer stack is fully painted.
          __scheduleClusterSweep();

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
                  try { const cc = map.getCenter(); map.flyTo({ center: [cc.lng, cc.lat], zoom: GLOBE_ZOOM, pitch: TIER_PITCH.globe, duration: dur, essential: true }); } catch (e) {}
                },
                flyToRegion: () => {
                  const u = userLocRef.current;
                  const c = (u && Number.isFinite(Number(u.lat))) ? { lat: Number(u.lat), lng: Number(u.lng) } : (() => { const cc = map.getCenter(); return { lat: cc.lat, lng: cc.lng }; })();
                  try { map.flyTo({ center: [c.lng, c.lat], zoom: REGION_ZOOM, pitch: TIER_PITCH.region, duration: dur, essential: true }); } catch (e) {}
                },
                flyToCity: () => {
                  const u = userLocRef.current;
                  const c = (u && Number.isFinite(Number(u.lat))) ? { lat: Number(u.lat), lng: Number(u.lng) } : (() => { const cc = map.getCenter(); return { lat: cc.lat, lng: cc.lng }; })();
                  try { map.flyTo({ center: [c.lng, c.lat], zoom: CITY_ZOOM, pitch: TIER_PITCH.city, duration: dur, essential: true }); } catch (e) {}
                },
                // 2026-05-27 Phil — single setTier entry point for the 4-button rail.
                // Maps tier string -> the right flyTo (current center, current user loc).
                setTier: (tier) => {
                  const t = String(tier || '').toLowerCase();
                  const pitch = TIER_PITCH[t] ?? TIER_PITCH.globe;
                  const zoom = t === 'globe' ? GLOBE_ZOOM
                             : t === 'region' ? REGION_ZOOM
                             : t === 'city' ? CITY_ZOOM
                             : t === 'local' ? LOCAL_ZOOM
                             : GLOBE_ZOOM;
                  const u = userLocRef.current;
                  const c = (u && Number.isFinite(Number(u.lat))) ? { lat: Number(u.lat), lng: Number(u.lng) } : (() => { const cc = map.getCenter(); return { lat: cc.lat, lng: cc.lng }; })();
                  try { map.flyTo({ center: [c.lng, c.lat], zoom, pitch, duration: dur, essential: true }); } catch (e) {}
                },
                currentTier: () => {
                  let z = GLOBE_ZOOM;
                  try { z = map.getZoom(); } catch (e) {}
                  return tierForZoom(z);
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
      // D43 Slice A · PR 3 — clean up the cluster chip timer so a re-mount
      // doesn't fire a stale dismiss onto fresh state.
      if (clusterTimeoutRef.current) {
        clearTimeout(clusterTimeoutRef.current);
        clusterTimeoutRef.current = null;
      }
      // PR 4 — also clear the a11y sweep debounce so it can't fire post-unmount.
      if (clusterSweepTimeoutRef.current) {
        clearTimeout(clusterSweepTimeoutRef.current);
        clusterSweepTimeoutRef.current = null;
      }
      clusterCacheRef.current.clear();
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
      if (src && src.setData) src.setData(toPublicSafeFeatureCollection(beacons, glowUserIds));
    } catch (e) { /* source not ready; initial data set on load */ }
  }, [beacons, glowUserIds]);

  // Self-marker effect: keeps a pulsing gold dot at the user's current location.
  // Re-runs whenever userLocation changes; tolerates map not ready yet.
  useEffect(() => {
    const map = mapInstanceRef.current;
    const mapboxgl = mapboxglRef.current;
    if (!map || !mapboxgl) return;
    const u = userLocation;
    // Remove marker if location is missing/invalid (user toggled off).
    if (!u || !Number.isFinite(Number(u.lat)) || !Number.isFinite(Number(u.lng))) {
      if (selfMarkerRef.current) {
        try { selfMarkerRef.current.remove(); } catch (e) {}
        selfMarkerRef.current = null;
      }
      return;
    }
    const lng = Number(u.lng);
    const lat = Number(u.lat);
    if (!selfMarkerRef.current) {
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'You are here');
      el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#C8962C;box-shadow:0 0 0 4px rgba(200,150,44,0.25),0 0 18px rgba(200,150,44,0.6);position:relative;pointer-events:none;';
      // Pulsing ring (CSS animation injected once)
      if (!document.getElementById('hm-self-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'hm-self-pulse-style';
        style.textContent = '@keyframes hm-self-pulse { 0% { box-shadow: 0 0 0 0 rgba(200,150,44,0.55), 0 0 18px rgba(200,150,44,0.6); } 70% { box-shadow: 0 0 0 22px rgba(200,150,44,0), 0 0 18px rgba(200,150,44,0.6); } 100% { box-shadow: 0 0 0 0 rgba(200,150,44,0), 0 0 18px rgba(200,150,44,0.6); } } .hm-self-pulse { animation: hm-self-pulse 2.2s infinite ease-out; }';
        document.head.appendChild(style);
      }
      el.className = 'hm-self-pulse';
      try {
        selfMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
      } catch (e) {
        console.warn('[PulseMap] self-marker create failed', e);
      }
    } else {
      try { selfMarkerRef.current.setLngLat([lng, lat]); } catch (e) {}
    }
    return () => {
      // Don't remove on every re-render — only on unmount or location-null path
    };
  }, [userLocation]);

  // Unmount cleanup
  useEffect(() => () => {
    if (selfMarkerRef.current) {
      try { selfMarkerRef.current.remove(); } catch (e) {}
      selfMarkerRef.current = null;
    }
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      {/* D43 Slice A · PR 3 — In-world cluster preview chip.
          Rendered absolutely-positioned over the map at the cluster's
          projected screen coordinates. Phil ratified positioning
          (2026-06-01): upper-right offset from the cluster point, never
          covering the marker. The chip itself owns pointer-events:none —
          it's information given, not a tap target (D43 §3).

          When `clusterPreview` is null the chip is not mounted at all,
          so there's zero cost when no cluster is being previewed. */}
      {clusterPreview && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            // Offset upper-right per Phil's ratification: shift up by chip
            // height (~36px) + 14px gap, and 14px to the right of the
            // cluster marker centre. Never centers, never covers the pin.
            transform: `translate3d(${clusterPreview.screen.x + 14}px, ${clusterPreview.screen.y - 50}px, 0)`,
            pointerEvents: 'none',
            zIndex: 5, // above map canvas, below any sheet chrome
          }}
        >
          <ClusterPreviewChip
            state={clusterPreview.state}
            visible={true}
            dense={clusterPreview.state.count >= 6}
          />
        </div>
      )}
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm pointer-events-none">
          {status === 'error' ? 'Map unavailable' : 'Loading the signal…'}
        </div>
      )}
    </div>
  );
}


