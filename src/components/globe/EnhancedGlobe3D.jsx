import React, { useEffect, useRef, useMemo, useState } from 'react';
import Globe from 'react-globe.gl';
import { makeBloomSprite, setBloomHover, setBloomActive } from '../../lib/globe/beaconBloom';

const DEFAULT_ROTATION = { lat: 20, lng: 0 };

// Hover/label HTML is injected by react-globe.gl as a string — escape any
// user-supplied beacon text (titles are member-authored) before interpolation.
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
// Altitude at which an inward zoom hands off to the local street map (the city
// band, just above the #294 minDistance floor) — fixes the "zoom goes blurry".
const DEEP_ZOOM_ALT = 1.8;

export default function EnhancedGlobe3D({
  beacons = [],
  cities = [],
  recoveryPins = [],
  // Founding-cohort layer (passed through from FoundingTierLayer):
  foundingHtmlElements = [],
  foundingArcs = [],
  foundingSosRings = [],
  renderHtmlElement,
  onBeaconClick,
  onCityClick,
  onRecoveryClick,
  onDeepZoom,
  rotationRef,
  // When true, beacons render as interactive bloom SPRITES (objectsData layer —
  // crash-free, unlike the htmlElements path) instead of merged point dots.
  bloomMarkers = false
}) {

  const globeRef     = useRef();
  const containerRef = useRef(null);
  const prevAltRef   = useRef(Infinity);
  const activeSpriteRef = useRef(null); // currently-selected bloom (for white-core toggle)
  const [size, setSize] = useState({ w: 0, h: 0 });

  // 2026-05-13: react-globe.gl sizes itself from container offsetWidth/Height
  // ONCE on mount and never reflows. On desktop window resize (or rotation)
  // half the globe goes missing. ResizeObserver keeps Globe's width/height
  // bound to the live container so it scales with the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  console.log('[Globe] Recovery Pins:', recoveryPins?.length || 0);

  // Pin sizes — tuned 2026-05-09 for mobile tap targets.
  // Recovery is the largest because it's the lowest-density layer and the
  // safest to overdraw. Person pins were noticeably under tap-radius before.
  const PIN_SIZE = { person: 0.55, recovery: 1.0, default: 0.7 };

  // Optimized data for the globe
  const pointsData = useMemo(() => {
    // When bloomMarkers is on, beacons leave the merged-points layer entirely and
    // render as interactive sprites (below). Recovery pins stay as points + rings.
    const beaconPoints = bloomMarkers ? [] : (Array.isArray(beacons) ? beacons : []).map(b => {
      const lat = Number(b.lat ?? b.location_lat);
      const lng = Number(b.lng ?? b.location_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        ...b,
        lat,
        lng,
        size: b.kind === 'person' ? PIN_SIZE.person : PIN_SIZE.default,
        color: b.kind === 'person' ? '#00C2E0' : '#FFEB3B'
      };
    }).filter(Boolean);

    const recoveryPoints = (Array.isArray(recoveryPins) ? recoveryPins : []).map(r => {
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        ...r,
        lat,
        lng,
        size: PIN_SIZE.recovery,
        color: '#FFFFFF', // Pure White for Recovery
        isRecovery: true
      };
    }).filter(Boolean);

    return [...beaconPoints, ...recoveryPoints];
  }, [beacons, recoveryPins, bloomMarkers]);

  // Bloom-sprite data: beacons, normalised to {lat,lng,...} with a stable kind so
  // categoryColor() can tint each bloom. Empty unless bloomMarkers is on.
  const beaconObjects = useMemo(() => {
    if (!bloomMarkers) return [];
    return (Array.isArray(beacons) ? beacons : []).map(b => {
      const lat = Number(b.lat ?? b.location_lat);
      const lng = Number(b.lng ?? b.location_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { ...b, lat, lng, kind: b.kind || b.beacon_category || b.type };
    }).filter(Boolean);
  }, [beacons, bloomMarkers]);

  const labelsData = useMemo(() => {
    return (Array.isArray(cities) ? cities : [])
      .map(c => ({
        ...c,
        lat: Number(c.lat),
        lng: Number(c.lng),
        text: c.name,
        color: 'white',
        size: 0.8
      }))
      .filter(c => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  }, [cities]);

  const ringsData = useMemo(() => {
    const pointRings = pointsData.filter(b => b.isRightNow || b.intensity > 1 || b.isRecovery);
    const sosRings = (Array.isArray(foundingSosRings) ? foundingSosRings : [])
      .map(r => ({ ...r, isSosRing: true }))
      .filter(r => Number.isFinite(Number(r.lat)) && Number.isFinite(Number(r.lng)));
    return [...pointRings, ...sosRings];
  }, [pointsData, foundingSosRings]);

  const htmlElementsData = useMemo(() => {
    return (Array.isArray(foundingHtmlElements) ? foundingHtmlElements : [])
      .filter(d => Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng)));
  }, [foundingHtmlElements]);

  const arcsData = useMemo(() => {
    return (Array.isArray(foundingArcs) ? foundingArcs : [])
      .filter(a =>
        Number.isFinite(Number(a.startLat)) &&
        Number.isFinite(Number(a.startLng)) &&
        Number.isFinite(Number(a.endLat)) &&
        Number.isFinite(Number(a.endLng))
      );
  }, [foundingArcs]);

  // Sync rotation state with the parent ref
  useEffect(() => {
    if (!globeRef.current || !rotationRef?.current) return;
    
    // Initial camera setup
    const isMobile = window.innerWidth < 768;
    globeRef.current.pointOfView({ 
      lat: rotationRef.current.lat || DEFAULT_ROTATION.lat, 
      lng: rotationRef.current.lng || DEFAULT_ROTATION.lng, 
      altitude: isMobile ? 3.0 : 2.5 
    }, 0);

    // Disable auto-rotate
    globeRef.current.controls().autoRotate = false;
    globeRef.current.controls().enableDamping = true;
    globeRef.current.controls().dampingFactor = 0.1;
    // Camera floor: react-globe.gl distance = (1+altitude)*100. Floor ~altitude 1.3
    // so manual pinch/scroll can't dive into the low-res-texture blur zone.
    globeRef.current.controls().minDistance = 230;
  }, [rotationRef]);

  // Update rotation ref when user moves the globe
  const handleCameraChange = () => {
    if (!globeRef.current) return;
    const { lat, lng, altitude } = globeRef.current.pointOfView();
    if (rotationRef?.current) rotationRef.current = { lat, lng, altitude };
    // Deep-zoom auto-handoff: fire once on an inward crossing of the city band so
    // the globe hands off to the local street map instead of degrading to a blur.
    const prev = prevAltRef.current;
    prevAltRef.current = altitude;
    if (onDeepZoom && prev >= DEEP_ZOOM_ALT && altitude < DEEP_ZOOM_ALT) {
      try { onDeepZoom({ lat, lng, altitude }); } catch (e) { /* non-fatal */ }
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-black" style={{ position: 'relative' }}>
      <Globe
        ref={globeRef}
        width={size.w || undefined}
        height={size.h || undefined}
        backgroundColor="#000000"
        
        // --- Earth Visuals ---
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        
        // Atmosphere Glow (Original Design)
        showAtmosphere={true}
        atmosphereColor="#00C2E0"
        atmosphereAltitude={0.15}
        
        // --- Stars / Background ---
        showGraticules={true}
        
        // --- Points (Beacons) ---
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.07}
        onPointClick={(point) => {
          console.log('[Globe] Point clicked:', point);
          // Subtle zoom-in to make the click feel responsive
          if (globeRef.current) {
            globeRef.current.pointOfView({ 
              lat: point.lat, 
              lng: point.lng, 
              altitude: 1.5 // city band (was 0.8 -> blurry) 
            }, 1000);
          }
          
          if (point.isRecovery) {
            if (onRecoveryClick) onRecoveryClick(point);
          } else {
            if (onBeaconClick) onBeaconClick(point);
          }
        }}

        // Individual interaction for Points
        pointsMerge={false} 

        pointLabel={b => `<div class="bg-black/80 border border-white p-2 text-white font-black uppercase text-[10px] tracking-widest">${b.name || b.title || 'UNKNOWN'}</div>`}

        // --- Bloom Sprites (interactive beacons) ---
        // objectsData uses three.js Object3D markers, so it NEVER registers the
        // isBehindGlobe checker that crashed the htmlElements path on pointOfView.
        // depthTest on the sprite material lets the globe occlude far-side blooms.
        objectsData={beaconObjects}
        objectLat="lat"
        objectLng="lng"
        objectAltitude={0.07}
        objectThreeObject={makeBloomSprite}
        objectLabel={(d) => {
          const cat = String(d.kind || d.beacon_category || d.type || 'signal');
          const name = d.title || d.name || (d.metadata && d.metadata.title) || 'Signal';
          return `<div style="font:600 11px/1.3 system-ui,sans-serif;color:#fff;background:rgba(5,5,7,0.88);border:1px solid rgba(200,150,44,0.5);padding:6px 10px;border-radius:8px;white-space:nowrap;box-shadow:0 6px 20px -8px rgba(0,0,0,0.8)"><div style="text-transform:uppercase;letter-spacing:0.12em;font-size:9px;color:#C8962C;margin-bottom:1px">${escapeHtml(cat)}</div>${escapeHtml(name)}</div>`;
        }}
        onObjectHover={(obj, prev) => {
          if (prev && prev.__sprite && prev.__sprite !== activeSpriteRef.current) setBloomHover(prev.__sprite, false);
          if (obj && obj.__sprite && obj.__sprite !== activeSpriteRef.current) setBloomHover(obj.__sprite, true);
          try { if (containerRef.current) containerRef.current.style.cursor = obj ? 'pointer' : ''; } catch (e) { /* non-fatal */ }
        }}
        onObjectClick={(obj) => {
          if (!obj) return;
          if (globeRef.current) {
            globeRef.current.pointOfView({ lat: obj.lat, lng: obj.lng, altitude: 1.5 }, 800);
          }
          // Single-selection: clear the previous active bloom, light the new one.
          if (activeSpriteRef.current && activeSpriteRef.current !== obj.__sprite) {
            setBloomActive(activeSpriteRef.current, false);
          }
          if (obj.__sprite) {
            setBloomActive(obj.__sprite, true);
            activeSpriteRef.current = obj.__sprite;
          }
          if (onBeaconClick) onBeaconClick(obj);
        }}

        // --- Labels (Cities) ---
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize="size"
        labelDotRadius={0.6}
        labelColor={() => "#C8962C"}
        labelResolution={2}
        onLabelClick={onCityClick}

        // --- Performance & Smoothness ---
        onZoom={handleCameraChange}
        onPan={handleCameraChange}
        rendererConfig={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance" 
        }}
        
        // --- Rings (Pulses) ---
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringColor={(d) => {
          if (d.isSosRing) return "#FF2D2D";
          if (d.isRecovery) return "#FFFFFF";
          return "#C8962C";
        }}

        // Keep these numeric. The current react-globe.gl integration is stable
        // with numeric ring controls; accessor functions here can crash Pulse on mount.
        ringMaxRadius={2.5}
        ringPropagationSpeed={2.5}
        ringRepeat={3}

        // --- HTML Elements (Founding Anchor named labels) ---
        htmlElementsData={htmlElementsData}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.1}
        htmlElement={renderHtmlElement}

        // --- Arcs (Founding Promoter migration animations) ---
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={3500}
        arcStroke={0.5}
      />
    </div>
  );
}

