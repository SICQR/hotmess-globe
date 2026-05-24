import React, { useEffect, useRef, useState } from 'react';
// Static CSS import: mapbox-gl needs its stylesheet for the canvas to size and
// paint correctly. ~30KB, cheap, and reliable in the prod bundle.
import 'mapbox-gl/dist/mapbox-gl.css';
import { X } from 'lucide-react';

// Phase A — local street-level map (deep-zoom detail). mapbox-gl JS is dynamically
// imported on open so it stays out of the Pulse bundle AND a load/init failure
// degrades gracefully (overlay + message) instead of a black ErrorBoundary takeover.
const TOKEN = (import.meta && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';
const GOLD = '#C8962C';

function toFeatureCollection(beacons) {
  const list = Array.isArray(beacons) ? beacons : [];
  return {
    type: 'FeatureCollection',
    features: list
      .filter((b) => b && Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lng)))
      .map((b) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [Number(b.lng), Number(b.lat)] }, properties: { id: b.id != null ? String(b.id) : '' } })),
  };
}

export default function LocalMapboxView({ focus, beacons, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // Latest props read via refs so the map-creation effect can run exactly once.
  const beaconsRef = useRef(beacons);
  beaconsRef.current = beacons;
  const focusRef = useRef(focus);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Create the map ONCE on mount. The parent globe page re-renders frequently and
  // passes a fresh `beacons` array each time; if that array were an effect dep the
  // map would be torn down + recreated on every render and never finish loading
  // (it would sit on "Loading map…" forever). So we depend on nothing and read the
  // initial focus/beacons from refs.
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
        const f = focusRef.current || { lat: 51.5074, lng: -0.1278 };
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [f.lng, f.lat],
          zoom: 14,
          attributionControl: true,
        });
        mapRef.current = map;
        map.on('error', () => { /* keep overlay graceful; do not throw */ });
        map.on('load', () => {
          if (cancelled) return;
          try { map.resize(); } catch (e) { /* non-fatal */ }
          setStatus('ready');
          try {
            map.addSource('beacons', { type: 'geojson', data: toFeatureCollection(beaconsRef.current) });
            map.addLayer({
              id: 'beacons-circle', type: 'circle', source: 'beacons',
              paint: { 'circle-radius': 7, 'circle-color': GOLD, 'circle-opacity': 0.85, 'circle-stroke-width': 2, 'circle-stroke-color': 'rgba(255,255,255,0.5)' },
            });
          } catch (e) { /* non-fatal */ }
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
      const src = map.getSource && map.getSource('beacons');
      if (src && src.setData) src.setData(toFeatureCollection(beacons));
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
        className="absolute top-[calc(16px+env(safe-area-inset-top,0px))] left-4 z-[121] px-4 py-2 bg-black/70 border border-white/20 backdrop-blur-md rounded-full text-white text-sm font-bold flex items-center gap-2 hover:bg-white hover:text-black transition-all"
        data-pull-refresh-ignore
      >
        <X className="w-4 h-4" /> Globe
      </button>
    </div>
  );
}
