import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Mapbox GL CSS is needed for the canvas to size correctly.
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Navigation,
  Footprints,
  Bike,
  Car,
  Moon,
  Clock,
  MapPin,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchRoutingDirections } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { decodeGooglePolyline } from '@/utils/googlePolyline';
import { buildUberDeepLink } from '@/utils/uberDeepLink';
import { supabase } from '@/components/utils/supabaseClient';
import { cn } from '@/lib/utils';

/**
 * InAppDirections — D14 Slice 2 (Mapbox GL + Constellation).
 *
 * Doctrine refs:
 *  - D14 §0 — never eject the user from the night.
 *  - D14 §3 — Walk / Fastest / Night Route. Psychological reframe; routing
 *    algorithm rewrite is Slice 4. id/apiMode stay stable for backward compat.
 *  - D14 §4.5 — density-trap. No ranking, no "busier route" labels, no
 *    numeric counts. The constellation is texture, not score.
 *  - D14 §5 — care as spatial property of the city. Care + curated pins
 *    render on the same surface as the route.
 *  - D15 — copy in HOTMESS register. Mode subtitles canonical examples.
 *
 * Architecture notes (Slice 2):
 *  - Engine: Mapbox GL (was react-leaflet). Other surfaces still use
 *    react-leaflet — see EventsMapView, L2LiveLocationWatcherSheet — so
 *    the dep stays in package.json.
 *  - Constellation reads `beacons` table DIRECTLY, not pulse_signals.
 *    The pulse_signals view strips metadata.curated/intent/kind on
 *    projection; reading from the source keeps the care-vs-curated
 *    visual distinction (cream vs gold) honest.
 *  - The route line is intentionally quiet — no density modulation,
 *    no glow that scales with beacon count. Density is texture in
 *    the constellation pulse, never in the route polyline itself.
 */

// Mode-chip reframe (D14 §3). id/apiMode stable for backward compat.
const TRAVEL_MODES = [
  { id: 'foot',  label: 'Walk',        subtitle: 'Quiet, simple, present',   icon: Footprints, apiMode: 'WALK',    color: '#39FF14' },
  { id: 'bike',  label: 'Fastest',     subtitle: 'You have somewhere to be', icon: Bike,       apiMode: 'BICYCLE', color: '#00C2E0' },
  { id: 'drive', label: 'Night Route', subtitle: 'Safer late-night path',    icon: Moon,       apiMode: 'DRIVE',   color: '#C8962C' },
];

// Brand colours — locked, must match mapboxLayerStack categories on the globe.
const CARE_COLOR     = '#F4ECD8'; // cream — PUBLIC_CARE_OVERRIDE
const CURATED_COLOR  = '#C8962C'; // gold  — editorial / curated district
const ORIGIN_COLOR   = '#00C2E0'; // teal  — viewer "YOU" pin

const MAPBOX_TOKEN = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';

// D14 §0 product rule (Phil locked 2026-05-30):
//   "Directions are for moving through the night, not flying across the world."
// When the user's current location is absurdly far from the destination, we
// suppress the route draw entirely. Drawing a route across continents wastes
// API calls, produces a planet-spanning line that obscures the destination,
// and reads as a travel app — exactly the drift D14 §1 forbids.
const FAR_THRESHOLD_KM = 500;

// Haversine great-circle distance in km. No deps.
const greatCircleKm = (a, b) => {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

// HTML pin for YOU / GO. Bordered ring + text label. (Constellation pins use
// a different, quieter style — see buildConstellationEl below.)
const buildLabelPinEl = ({ label, color, glow }) => {
  const el = document.createElement('div');
  el.style.cssText = `
    width:36px;height:36px;border-radius:999px;
    display:flex;align-items:center;justify-content:center;
    background: rgba(0,0,0,0.8);
    border: 2px solid ${color};
    box-shadow: 0 0 12px ${glow || color};
    backdrop-filter: blur(4px);
    color: ${color};
    font-weight: 900;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  `;
  el.textContent = label;
  el.setAttribute('data-pull-refresh-ignore', '');
  return el;
};

// Constellation pin — discrete pulse dot. Cream for care, gold for curated.
// No text label, no glow on the route line itself. Quiet, observant.
// (D14 §4.5 density-trap: dots are texture not score; pure count, not heat.)
const buildConstellationEl = ({ color }) => {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    position: relative; width: 28px; height: 28px;
    pointer-events: none;
  `;
  const halo = document.createElement('div');
  halo.style.cssText = `
    position: absolute; inset: 0; border-radius: 50%;
    background: radial-gradient(circle, ${color}99 0%, ${color}3a 35%, transparent 72%);
    animation: hmCnstPulse 2.6s ease-in-out infinite;
  `;
  const core = document.createElement('div');
  core.style.cssText = `
    position: absolute; top: 50%; left: 50%;
    width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px;
    border-radius: 50%;
    background: ${color};
    box-shadow: 0 0 8px ${color}cc;
  `;
  wrap.appendChild(halo);
  wrap.appendChild(core);
  wrap.setAttribute('data-pull-refresh-ignore', '');
  return wrap;
};

// Keyframe stylesheet — injected once per document. Multiple instances of
// the component share it.
let constellationKeyframesInjected = false;
const ensureConstellationKeyframes = () => {
  if (constellationKeyframesInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-hm-constellation', '1');
  style.textContent = `
    @keyframes hmCnstPulse {
      0%, 100% { transform: scale(0.85); opacity: 0.95; }
      50%      { transform: scale(1.15); opacity: 0.55; }
    }
  `;
  document.head.appendChild(style);
  constellationKeyframesInjected = true;
};

// Decide the constellation colour for a base-table beacon row.
// Reads the FULL metadata (not pulse_signals' stripped projection), so the
// curated vs care distinction stays honest at the source — per Phil's lock.
const constellationColourFor = (b) => {
  const meta = b?.metadata || {};
  const kind = (meta.kind || '').toLowerCase();
  if (kind === 'district' || kind === 'hotmess') return CURATED_COLOR;
  if (meta.curated === true && kind !== 'care') return CURATED_COLOR;
  return CARE_COLOR;
};

export default function InAppDirections({
  destination,
  destinationName,
  destinationAddress,
  // onClose / compact / expandable kept in signature for back-compat but no
  // longer rendered — L2SheetContainer handles dismiss via pull-down (#301
  // strip X; #277 pull-down). The standalone modal in DirectionsButton
  // dismisses via backdrop tap. Either way no inner X / no max/min controls.
  // eslint-disable-next-line no-unused-vars
  onClose,
  // eslint-disable-next-line no-unused-vars
  compact = false,
  // eslint-disable-next-line no-unused-vars
  expandable = true,
  className,
}) {
  const [mode, setMode] = useState('foot');
  const [origin, setOrigin] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  // Constellation source data. Reads from beacons (not pulse_signals) so
  // curated vs care is distinguishable. D14 §5 (care as spatial property).
  const [constellationBeacons, setConstellationBeacons] = useState([]);

  // Container + map refs — created once per mounted component.
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Marker refs so we can clean them up on data change / unmount.
  const youMarkerRef = useRef(null);
  const goMarkerRef = useRef(null);
  const constellationMarkersRef = useRef([]);

  // Get viewer location.
  useEffect(() => {
    if (!destination) return;
    safeGetViewerLatLng(
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      { retries: 2, logKey: 'in-app-directions' }
    ).then((loc) => {
      if (loc) {
        setOrigin({ lat: loc.lat, lng: loc.lng });
        setLocationError(null);
      } else {
        setLocationError('Enable location to see directions');
      }
    });
  }, [destination]);

  // D14 §0 far-origin gate. Compute once here so every downstream effect /
  // fetch / render branch can short-circuit consistently. When origin is
  // absurdly far, we don't have a route — we have a destination view.
  const distanceKm = useMemo(
    () => greatCircleKm(origin, destination),
    [origin?.lat, origin?.lng, destination?.lat, destination?.lng]
  );
  const originIsFar = Number.isFinite(distanceKm) && distanceKm > FAR_THRESHOLD_KM;

  // Fetch constellation candidates. Reads from base `beacons` so curated/care
  // metadata stays intact (pulse_signals view strips it).
  // - Near origin: bbox spans origin↔destination + 600m pad (route corridor).
  // - Far origin (D14 §0): bbox is destination ±~5km only (district scale).
  useEffect(() => {
    if (!destination) { setConstellationBeacons([]); return; }
    let alive = true;
    let minLat, maxLat, minLng, maxLng;
    if (originIsFar || !origin) {
      // Destination-only district bbox — care anchors visible around the pin.
      const PAD = 0.05; // ~5km at London latitudes
      minLat = destination.lat - PAD; maxLat = destination.lat + PAD;
      minLng = destination.lng - PAD; maxLng = destination.lng + PAD;
    } else {
      const PAD = 0.006; // ~600m
      minLat = Math.min(origin.lat, destination.lat) - PAD;
      maxLat = Math.max(origin.lat, destination.lat) + PAD;
      minLng = Math.min(origin.lng, destination.lng) - PAD;
      maxLng = Math.max(origin.lng, destination.lng) + PAD;
    }

    supabase
      .from('beacons')
      .select('id, title, geo_lat, geo_lng, lat, lng, metadata, beacon_category, ends_at, status')
      .or([
        'metadata->>intent.eq.aftercare',
        'beacon_category.in.(aftercare,recovery,clinic)',
        'metadata->>curated.eq.true',
      ].join(','))
      .gte('geo_lat', minLat).lte('geo_lat', maxLat)
      .gte('geo_lng', minLng).lte('geo_lng', maxLng)
      .gt('ends_at', new Date().toISOString())
      .eq('status', 'active')
      .limit(40)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) { setConstellationBeacons([]); return; }
        const pins = (data || [])
          .map((b) => ({
            id: b.id,
            title: b.title || '',
            lat: b.geo_lat ?? b.lat,
            lng: b.geo_lng ?? b.lng,
            colour: constellationColourFor(b),
          }))
          .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng));
        setConstellationBeacons(pins);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, originIsFar]);

  // Routing fetch — gated on having both endpoints AND origin being near enough
  // that a route is meaningful. D14 §0: never compute or draw a route that
  // spans the planet. Saves API calls + prevents the route polyline from
  // obscuring the destination view.
  const modeConfig = TRAVEL_MODES.find(m => m.id === mode);
  const canFetch = !!origin && !!destination && !originIsFar;

  const { data: directions, isLoading } = useQuery({
    queryKey: ['directions', mode, origin?.lat, origin?.lng, destination?.lat, destination?.lng],
    queryFn: () => fetchRoutingDirections({
      origin, destination,
      mode: modeConfig?.apiMode || 'WALK',
      ttlSeconds: 120
    }),
    enabled: canFetch,
    retry: false,
    staleTime: 60000,
  });

  // Decode polyline → array of [lng, lat] for Mapbox (note the flip vs Leaflet).
  // D14 §0: when origin is far, route is empty — no straight-line fallback,
  // no polyline at all. The destination view is the whole rendering.
  const routeLngLat = useMemo(() => {
    if (originIsFar) return [];
    const encoded = directions?.polyline?.encoded;
    if (typeof encoded === 'string' && encoded.trim()) {
      return decodeGooglePolyline(encoded).map((p) => [p.lng, p.lat]);
    }
    const pts = directions?.polyline?.points;
    if (Array.isArray(pts) && pts.length) {
      return pts
        .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
        .map((p) => [p.lng, p.lat]);
    }
    if (origin && destination) {
      return [[origin.lng, origin.lat], [destination.lng, destination.lat]];
    }
    return [];
  }, [directions?.polyline, origin, destination, originIsFar]);

  // Uber deep link — unchanged.
  const uberUrl = useMemo(() => {
    if (!destination) return null;
    return buildUberDeepLink({
      dropoffLat: destination.lat,
      dropoffLng: destination.lng,
      dropoffNickname: destinationName || 'Destination'
    });
  }, [destination, destinationName]);

  // openFullDirections — see #671 history. No-op preserved for any third-party
  // import; the button is not rendered.
  // eslint-disable-next-line no-unused-vars
  const openFullDirections = () => { /* no-op */ };

  // ── Mapbox map: create once, mutate via setData/setMarker afterwards. ──

  useEffect(() => {
    ensureConstellationKeyframes();
    if (!MAPBOX_TOKEN || !containerRef.current || locationError) return;

    let cancelled = false;
    let resizeT;

    (async () => {
      try {
        const mod = await import('mapbox-gl');
        const mapboxgl = mod.default || mod;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        if (cancelled || !containerRef.current) return;

        const startCenter = destination
          ? [destination.lng, destination.lat]
          : [-0.1278, 51.5074];
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: startCenter,
          zoom: 14,
          attributionControl: true,
        });
        mapRef.current = map;
        map.on('error', () => { /* keep overlay graceful */ });

        map.on('load', () => {
          if (cancelled) return;
          try { map.resize(); } catch (e) { /* non-fatal */ }

          // Route source + two-pass layer (under-halo + on-top-line). Quiet —
          // no density modulation. The constellation carries texture; the
          // line stays a line. (D14 §4.5.)
          map.addSource('hm-route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
          });
          map.addLayer({
            id: 'hm-route-halo',
            type: 'line',
            source: 'hm-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': ['get', 'colour'],
              'line-width': 8,
              'line-opacity': 0.3,
            },
          });
          map.addLayer({
            id: 'hm-route-line',
            type: 'line',
            source: 'hm-route',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': ['get', 'colour'],
              'line-width': 5,
              'line-opacity': 0.9,
            },
          });

          setMapReady(true);
        });

        // Guard against 0-sized init.
        resizeT = setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
      } catch (e) {
        if (!cancelled) setLocationError('Map unavailable');
      }
    })();

    return () => {
      cancelled = true;
      if (resizeT) clearTimeout(resizeT);
      try {
        constellationMarkersRef.current.forEach((m) => m.remove());
        constellationMarkersRef.current = [];
        if (youMarkerRef.current) { youMarkerRef.current.remove(); youMarkerRef.current = null; }
        if (goMarkerRef.current)  { goMarkerRef.current.remove();  goMarkerRef.current  = null; }
        if (mapRef.current) mapRef.current.remove();
      } catch (e) { /* non-fatal */ }
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Create exactly once.

  // Fit bounds whenever endpoints change.
  // - Near origin: fit to origin↔destination box (route corridor).
  // - Far origin (D14 §0): fit to destination only at district scale —
  //   "Directions are for moving through the night, not flying across
  //   the world." Avoids the planet-spanning view when origin is on the
  //   other side of the globe.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !destination) return;
    try {
      if (originIsFar || !origin) {
        // Fly to destination at district scale; constellation pins read clean.
        map.flyTo({ center: [destination.lng, destination.lat], zoom: 13, duration: 600 });
        return;
      }
      const swLng = Math.min(origin.lng, destination.lng);
      const swLat = Math.min(origin.lat, destination.lat);
      const neLng = Math.max(origin.lng, destination.lng);
      const neLat = Math.max(origin.lat, destination.lat);
      map.fitBounds([[swLng, swLat], [neLng, neLat]], { padding: 50, duration: 600 });
    } catch (e) { /* non-fatal */ }
  }, [mapReady, origin?.lat, origin?.lng, destination?.lat, destination?.lng, originIsFar]);

  // YOU + GO markers — recreate on endpoint change.
  // Far origin: YOU pin suppressed (where the user actually is is irrelevant
  // to a destination view). GO pin always shows.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    (async () => {
      const mod = await import('mapbox-gl');
      const mapboxgl = mod.default || mod;

      if (youMarkerRef.current) { youMarkerRef.current.remove(); youMarkerRef.current = null; }
      if (goMarkerRef.current)  { goMarkerRef.current.remove();  goMarkerRef.current  = null; }

      if (origin && !originIsFar) {
        const el = buildLabelPinEl({ label: 'YOU', color: ORIGIN_COLOR, glow: 'rgba(0,217,255,0.6)' });
        youMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map);
      }
      if (destination) {
        const el = buildLabelPinEl({ label: 'GO', color: CURATED_COLOR, glow: 'rgba(255,20,147,0.6)' });
        goMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);
      }
    })();
  }, [mapReady, origin?.lat, origin?.lng, destination?.lat, destination?.lng, originIsFar]);

  // Route polyline data — update via setData (don't recreate the source/layer).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const colour = modeConfig?.color || CURATED_COLOR;
    const feature = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routeLngLat.length >= 2 ? routeLngLat : [] },
      properties: { colour },
    };
    try {
      const src = map.getSource('hm-route');
      if (src && src.setData) src.setData(feature);
    } catch (e) { /* non-fatal */ }
  }, [mapReady, routeLngLat, modeConfig?.color]);

  // Constellation markers — diff against current set; clean + recreate.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    (async () => {
      const mod = await import('mapbox-gl');
      const mapboxgl = mod.default || mod;

      constellationMarkersRef.current.forEach((m) => m.remove());
      constellationMarkersRef.current = [];

      constellationBeacons.forEach((b) => {
        const el = buildConstellationEl({ color: b.colour });
        if (b.title) el.title = b.title; // browser tooltip on hover
        const m = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat([b.lng, b.lat])
          .addTo(map);
        constellationMarkersRef.current.push(m);
      });
    })();
  }, [mapReady, constellationBeacons]);

  if (!destination) return null;

  const duration = formatDuration(directions?.duration_seconds);
  const distance = formatDistance(directions?.distance_meters);

  // Chromeless render. The wrapping surface (L2SheetContainer for the L2
  // path, DirectionsButton's modal for the standalone path) provides bg,
  // border, dismiss. We just lay out the content.
  //
  // Visual language matches L2ClusterPreviewSheet (the canonical HOTMESS
  // peek aesthetic): tiny gold pill chip → large heading → soft subtitle
  // → tab row → quiet body. No X, no max/min, no inner border.
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header — chip + heading + address. Matches cluster preview. */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border tracking-[0.14em]"
            style={{ color: '#C8962C', borderColor: 'rgba(200,150,44,0.25)', backgroundColor: 'rgba(200,150,44,0.08)' }}
          >
            <Navigation className="w-2.5 h-2.5" />
            route
          </span>
        </div>
        <h2 className="text-white font-black text-xl leading-tight">
          {destinationName || 'Directions'}
        </h2>
        {destinationAddress && (
          <p className="text-white/55 text-sm mt-1 leading-snug truncate">
            {destinationAddress}
          </p>
        )}
      </div>

      {/* Mode chips — same border-weight + radius as cluster's primary button.
          Subtitle under active mode carries the D14 §3 emotional cue. */}
      <div className="px-4 pt-2 pb-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {TRAVEL_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold border active:scale-95 transition-transform',
                mode === m.id
                  ? 'bg-white/10 border-white/25 text-white'
                  : 'bg-white/[0.03] border-white/10 text-white/55'
              )}
            >
              <m.icon className="w-3.5 h-3.5" style={{ color: mode === m.id ? m.color : undefined }} />
              <span>{m.label}</span>
            </button>
          ))}
          {/* Uber chip — external eject, outline-only to signal "leaves the app". */}
          <button
            onClick={() => uberUrl && window.open(uberUrl, '_blank')}
            disabled={!uberUrl}
            className="flex items-center justify-center gap-1 px-2.5 py-2.5 rounded-xl text-xs font-bold border border-white/10 bg-transparent text-white/45 active:scale-95 transition-transform"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Uber</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
          </button>
        </div>
        {modeConfig?.subtitle && (
          <p className="text-[10px] text-white/40 text-center tracking-[0.08em]">
            {modeConfig.subtitle}
          </p>
        )}
      </div>

      {/* Map — fixed-height. No internal chrome. */}
      <div className="relative h-[260px] mx-4 mt-1 rounded-xl overflow-hidden">
        {locationError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03] border border-white/5 rounded-xl">
            <div className="text-center p-4">
              <MapPin className="w-10 h-10 text-white/15 mx-auto mb-2" />
              <p className="text-white/55 text-sm">{locationError}</p>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ width: '100%', height: '100%' }}
          />
        )}

        {isLoading && !locationError && !originIsFar && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 px-2.5 py-1 rounded-full text-[10px] text-white/55">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading route…</span>
          </div>
        )}

        {/* D14 §0 far-origin contextual overlay. Replaces the route corridor
            with a destination-only district view + a quiet message. HOTMESS
            register (D15) — no travel-app phrasing, no "directions disabled". */}
        {originIsFar && !locationError && (
          <div className="absolute top-2 left-2 right-2 bg-black/75 backdrop-blur-md px-3 py-2 rounded-xl border border-white/8">
            <p className="text-white text-xs font-bold leading-snug">
              You're not near this signal.
            </p>
            <p className="text-white/50 text-[11px] mt-0.5 leading-snug">
              Map's around the destination. Plan when nearby.
            </p>
          </div>
        )}
      </div>

      {/* ETA row — terse, cluster-style. No density label, no ranking copy
          (D14 §4.5). The constellation does the talking. Suppressed when
          origin is far — distance / duration aren't meaningful information
          when the user isn't moving toward the destination tonight. */}
      {!originIsFar && (
        <div className="px-4 pt-3 pb-4 flex items-center gap-3">
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-white/40" />
              <span className="text-sm font-bold text-white">{duration}</span>
            </div>
          )}
          {distance && (
            <span className="text-white/40 text-xs tabular-nums">{distance}</span>
          )}
        </div>
      )}
      {/* Far-origin spacer so the sheet doesn't slam into the map's bottom edge. */}
      {originIsFar && <div className="h-4" />}
    </div>
  );
}

/**
 * DirectionsButton — compact button that opens the directions in a standalone
 * modal. Used outside the L2 sheet system. The modal supplies its own chrome
 * (bg + soft gold hairline + rounded-2xl) so the chromeless InAppDirections
 * has a visual surface to sit on. Dismiss is backdrop-tap; matches the L2
 * sheet pull-down dismiss semantically (no X button).
 */
export function DirectionsButton({
  destination,
  destinationName,
  variant = 'outline',
  size = 'sm',
  className,
}) {
  const [showDirections, setShowDirections] = useState(false);

  if (!destination?.lat || !destination?.lng) return null;

  return (
    <>
      <Button
        onClick={() => setShowDirections(true)}
        variant={variant}
        size={size}
        className={cn('border-white/20 text-white hover:bg-white/10', className)}
      >
        <Navigation className="w-4 h-4 mr-1" />
        Directions
      </Button>

      <AnimatePresence>
        {showDirections && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowDirections(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-black border-t border-[#C8962C]/40 sm:border sm:rounded-2xl overflow-hidden"
            >
              {/* Drag handle — visual cue that backdrop tap dismisses; matches
                  L2SheetContainer's top handle so the standalone modal feels
                  like the same sheet system. */}
              <div className="flex justify-center pt-2 pb-1">
                <span className="block w-10 h-1 rounded-full bg-white/15" />
              </div>
              <InAppDirections
                destination={destination}
                destinationName={destinationName}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * ETABadges — compact ETA chips for profile cards. Unchanged.
 */
export function ETABadges({ etas, onModeSelect, className }) {
  if (!etas || Object.keys(etas).length === 0) return null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {etas.walk && (
        <button
          onClick={() => onModeSelect?.('foot')}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
        >
          <Footprints className="w-3 h-3" />
          <span>{Math.round(etas.walk / 60)}m</span>
        </button>
      )}
      {etas.bike && (
        <button
          onClick={() => onModeSelect?.('bike')}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
        >
          <Bike className="w-3 h-3" />
          <span>{Math.round(etas.bike / 60)}m</span>
        </button>
      )}
      {etas.drive && (
        <button
          onClick={() => onModeSelect?.('drive')}
          className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:border-white/30 transition-all"
        >
          <Car className="w-3 h-3" />
          <span>{Math.round(etas.drive / 60)}m</span>
        </button>
      )}
    </div>
  );
}
