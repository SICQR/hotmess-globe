import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X } from 'lucide-react';

// Phase A — Mapbox local mode. Read-only street-level map for deep-zoom detail
// (the proper fix for the blurry globe deep-zoom). Token VITE_MAPBOX_TOKEN is
// provisioned in Vercel (Dev/Preview/Prod). Lazy-loaded from Globe.jsx so
// mapbox-gl is never in the overview bundle.
mapboxgl.accessToken = (import.meta && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN) || '';

const GOLD = '#C8962C';

function toFeatureCollection(beacons) {
  const list = Array.isArray(beacons) ? beacons : [];
  const features = list
    .filter((b) => b && Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lng)))
    .map((b) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(b.lng), Number(b.lat)] },
      properties: { id: b.id != null ? String(b.id) : '', title: b.title || b.name || '' },
    }));
  return { type: 'FeatureCollection', features };
}

export default function LocalMapboxView({ focus, beacons, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !mapboxgl.accessToken) return undefined;
    const f = focus || { lat: 51.5074, lng: -0.1278 };
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [f.lng, f.lat],
      zoom: 14,
      attributionControl: true,
    });
    mapRef.current = map;
    map.on('load', () => {
      try {
        map.addSource('beacons', { type: 'geojson', data: toFeatureCollection(beacons) });
        map.addLayer({
          id: 'beacons-circle',
          type: 'circle',
          source: 'beacons',
          paint: {
            'circle-radius': 7,
            'circle-color': GOLD,
            'circle-opacity': 0.85,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255,255,255,0.5)',
          },
        });
      } catch (e) { /* non-fatal: map renders without the beacon layer */ }
    });
    return () => { try { map.remove(); } catch (e) {} mapRef.current = null; };
  }, [focus, beacons]);

  return (
    <div className="fixed inset-0 z-[120] bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      {!mapboxgl.accessToken && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">Map unavailable</div>
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
