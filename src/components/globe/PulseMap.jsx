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

const GLOBE_ZOOM = 3.2;   // macro: curvature + cluster visible
const LOCAL_ZOOM = 15;    // micro: street detail + individual blooms
const LONDON = { lat: 51.5074, lng: -0.1278 };

export default function PulseMap({ beacons = [], userLocation, onBeaconClick, onMapApi, onReady }) {
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

        const loc = userLocRef.current && Number.isFinite(Number(userLocRef.current.lat))
          ? { lat: Number(userLocRef.current.lat), lng: Number(userLocRef.current.lng) }
          : LONDON;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11', // dark, premium base
          projection: 'globe',                       // v3 native globe curvature
          center: [loc.lng, loc.lat],
          zoom: GLOBE_ZOOM,
          minZoom: 0.8,   // can pull back to whole-globe
          maxZoom: 18,    // street detail
          attributionControl: true,
        });
        mapRef.current = map;
        map.on('error', () => { /* keep graceful; never throw */ });

        // Atmosphere + star field the moment the style is ready, so the globe
        // reads as "space" immediately rather than popping in on full load.
        map.on('style.load', () => {
          try { map.setFog(environmentalFog(new Date().getHours(), reducedMotion)); } catch (e) { /* non-fatal */ }
        });

        map.on('load', () => {
          if (cancelled) return;
          try { map.resize(); } catch (e) { /* non-fatal */ }
          setStatus('ready');
          try { if (onReadyRef.current) onReadyRef.current(); } catch (e) { /* non-fatal */ }

          // Beacon layer stack (clusters glow at macro, blooms at micro). Lower
          // clusterMaxZoom than the legacy local-only map so individuals separate
          // by street zoom on the single-engine globe.
          try {
            addLayerStack(map, { reducedMotion, clusterMaxZoom: 13 });
            const src = map.getSource(SOURCE_IDS.public);
            if (src && src.setData) src.setData(toPublicSafeFeatureCollection(beaconsRef.current));
          } catch (e) { /* non-fatal: base map still usable */ }

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
            // Hand the datum back so the parent opens its existing preview panel.
            try {
              if (onBeaconClickRef.current) {
                onBeaconClickRef.current({
                  id: feat.properties.id,
                  title: feat.properties.title,
                  kind: feat.properties.cat,
                  beacon_category: feat.properties.cat,
                  lat: feat.geometry.coordinates[1],
                  lng: feat.geometry.coordinates[0],
                });
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
