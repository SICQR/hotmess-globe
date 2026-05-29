import React, { useEffect, useRef, useState } from 'react';
// Static CSS import: mapbox-gl needs its stylesheet for the canvas to size and
// paint correctly. ~30KB, cheap, and reliable in the prod bundle.
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, MapPin } from 'lucide-react';
import {
  LAYER_IDS,
  SOURCE_IDS,
  addLayerStack,
  toPublicSafeFeatureCollection,
} from '../../lib/globe/mapboxLayerStack';

// Local street-level map (deep-zoom detail). mapbox-gl JS is dynamically imported
// on open so it stays out of the Pulse bundle AND a load/init failure degrades
// gracefully (overlay + message) instead of a black ErrorBoundary takeover.
// The layer stack (order, privacy, clustering, perf) lives in mapboxLayerStack.js
// per docs/GLOBE_MAPBOX_LAYER_STACK.md.
const TOKEN = (import.meta && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export default function LocalMapboxView({ focus, beacons, onClose, onReady, onDropBeacon }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Latest props read via refs so the map-creation effect can run exactly once.
  const beaconsRef = useRef(beacons);
  beaconsRef.current = beacons;
  const focusRef = useRef(focus);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Globe→local transition (docs/GLOBE_GLOBE_TO_LOCAL_TRANSITION_ANIMATION_SYSTEM.md,
  // Stage 5 "Local Reveal"): crossfade the overlay in over the globe and descend
  // district→street so the handoff feels deliberate, not a teleport. Honoured only
  // when the user hasn't asked for reduced motion.
  const reducedMotionRef = useRef(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const reducedMotion = reducedMotionRef.current;
  const [shown, setShown] = useState(reducedMotion); // reduced motion → visible immediately
  useEffect(() => {
    if (reducedMotion) return undefined;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [reducedMotion]);

  // Create the map ONCE on mount. The parent re-renders frequently and passes a
  // fresh `beacons` array each time; making that an effect dep would tear the map
  // down + rebuild it on every render and it would never finish loading.
  useEffect(() => {
    let cancelled = false;
    let resizeTimer;
    const reducedMotion = reducedMotionRef.current;
    (async () => {
      if (!TOKEN) { setStatus('error'); return; }
      try {
        const mod = await import('mapbox-gl');
        const mapboxgl = mod.default || mod;
        mapboxgl.accessToken = TOKEN;
        if (cancelled || !containerRef.current) return;
        const f = focusRef.current || { lat: 51.5074, lng: -0.1278 };
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11', // L0 — dark, muted, premium base
          center: [f.lng, f.lat],
          // Start at district scale and descend to street on load (the transition);
          // reduced motion lands directly at street level.
          zoom: reducedMotion ? 14.5 : 11,
          attributionControl: true,
        });
        mapRef.current = map;
        map.on('error', () => { /* keep overlay graceful; do not throw */ });

        map.on('load', () => {
          if (cancelled) return;
          try { map.resize(); } catch (e) { /* non-fatal */ }
          setStatus('ready');
          try { if (onReadyRef.current) onReadyRef.current(); } catch (e) { /* non-fatal */ }

          // Build the contract-ordered layer stack, then feed privacy-safe data.
          try {
            addLayerStack(map, { reducedMotion });
            const src = map.getSource(SOURCE_IDS.public);
            if (src && src.setData) src.setData(toPublicSafeFeatureCollection(beaconsRef.current));
          } catch (e) { /* non-fatal: map still usable as base */ }

          // Stage-5 descent: district → street, a gentle decelerating pull (no
          // violent easing). Skipped under reduced motion (we start at street zoom).
          if (!reducedMotion) {
            try { map.easeTo({ zoom: 14.5, duration: 1400, easing: (t) => 1 - Math.pow(1 - t, 3) }); } catch (e) { /* non-fatal */ }
          }

          // L6 interaction — tap cluster expands (no immediate pin explosion).
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

          // L9/L10 interaction — tap beacon sets the selected halo + a light card.
          map.on('click', LAYER_IDS.beaconMarkers, (e) => {
            const feat = e.features && e.features[0];
            if (!feat) return;
            try {
              const sel = map.getSource(SOURCE_IDS.selected);
              if (sel && sel.setData) {
                sel.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: feat.geometry, properties: feat.properties }] });
              }
            } catch (er) { /* non-fatal */ }
            try {
              const label = feat.properties.title || (feat.properties.cat ? feat.properties.cat[0].toUpperCase() + feat.properties.cat.slice(1) : 'Signal');
              new mapboxgl.Popup({ offset: 14, closeButton: true })
                .setLngLat(feat.geometry.coordinates)
                .setHTML('<div style="font:600 12px/1.35 system-ui,sans-serif;color:#111;max-width:160px">' + escapeHtml(label) + '</div>')
                .addTo(map);
            } catch (er) { /* non-fatal */ }
          });

          // L12 — pointer affordance on hit layers (desktop).
          ['clusterCircles', 'beaconMarkers'].forEach((key) => {
            map.on('mouseenter', LAYER_IDS[key], () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (er) {} });
            map.on('mouseleave', LAYER_IDS[key], () => { try { map.getCanvas().style.cursor = ''; } catch (er) {} });
          });
        });

        // Guard against a 0-size init (overlay layout not flushed yet) → black canvas.
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

  // Update beacon data in place when it changes — never recreate the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      const src = map.getSource(SOURCE_IDS.public);
      if (src && src.setData) src.setData(toPublicSafeFeatureCollection(beacons));
    } catch (e) { /* source not ready yet; initial data is set on load */ }
  }, [beacons]);

  return (
    <div className="fixed inset-0 z-[120] bg-[#050507]">
      <div ref={containerRef} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm pointer-events-none">
          {status === 'error' ? 'Map unavailable' : 'Loading map…'}
        </div>
      )}
      <button
        onClick={onClose}
        className="absolute top-[calc(128px+env(safe-area-inset-top,0px))] right-4 z-[151] px-4 py-2 bg-black/70 border border-white/20 backdrop-blur-md rounded-full text-white text-sm font-bold flex items-center gap-2 hover:bg-white hover:text-black transition-all"
        data-pull-refresh-ignore
      >
        <X className="w-4 h-4" /> Globe
      </button>
      {onDropBeacon && status === 'ready' && (
        <button
          onClick={() => {
            try {
              const m = mapRef.current;
              if (m && m.getCenter) {
                const c = m.getCenter();
                onDropBeacon({ lat: c.lat, lng: c.lng });
              }
            } catch (e) { /* non-fatal */ }
          }}
          className="absolute bottom-[calc(150px+env(safe-area-inset-bottom,0px))] right-4 z-[123] w-14 h-14 bg-[#C8962C] rounded-2xl flex items-center justify-center shadow-[0_15px_35px_-12px_rgba(200,150,44,0.6)] border border-white/30 hover:brightness-110 transition-all"
          title="Drop beacon here"
          aria-label="Drop a beacon at the map centre"
          data-pull-refresh-ignore
        >
          <MapPin className="w-6 h-6 text-black" />
        </button>
      )}
    </div>
  );
}

