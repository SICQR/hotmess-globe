import React, { useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';

const DEFAULT_ROTATION = { lat: 20, lng: 0 };

export default function EnhancedGlobe3D({ 
  beacons = [], 
  cities = [], 
  recoveryPins = [],
  onBeaconClick, 
  onCityClick,
  onRecoveryClick,
  rotationRef 
}) {

  const globeRef = useRef();
  console.log('[Globe] Recovery Pins:', recoveryPins?.length || 0);


  // Optimized data for the globe
  const pointsData = useMemo(() => {
    const beaconPoints = beacons.map(b => {
      const lat = Number(b.lat ?? b.location_lat);
      const lng = Number(b.lng ?? b.location_lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      
      return {
        ...b,
        lat,
        lng,
        size: b.kind === 'person' ? 0.4 : 0.6,
        color: b.kind === 'person' ? '#00C2E0' : '#FFEB3B'
      };
    }).filter(Boolean);

    const recoveryPoints = recoveryPins.map(r => {
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        ...r,
        lat,
        lng,
        size: 0.8,
        color: '#FFFFFF', // Pure White for Recovery
        isRecovery: true
      };
    }).filter(Boolean);



    return [...beaconPoints, ...recoveryPoints];
  }, [beacons, recoveryPins]);



  const labelsData = useMemo(() => {
    return cities.map(c => ({
      ...c,
      lat: Number(c.lat),
      lng: Number(c.lng),
      text: c.name,
      color: 'white',
      size: 0.8
    }));
  }, [cities]);

  // Sync rotation state with the parent ref
  useEffect(() => {
    if (!globeRef.current) return;
    
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
  }, []);

  // Update rotation ref when user moves the globe
  const handleCameraChange = () => {
    if (!globeRef.current) return;
    const { lat, lng, altitude } = globeRef.current.pointOfView();
    rotationRef.current = { lat, lng, altitude };
  };

  return (
    <div className="w-full h-full bg-black">
      <Globe
        ref={globeRef}
        backgroundColor="#000000"
        
        // --- Earth Visuals ---
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        
        // Atmosphere Glow (Original Design)
        showAtmosphere={true}
        atmosphereColor="#00C2E0"
        atmosphereAltitude={0.15}
        
        // --- Stars / Background ---
        showGraticules={true} // Add the grid lines back
        
        // --- Points (Beacons) ---
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        pointAltitude={0.05} // Raised higher to ensure easy clicking on mobile
        onPointClick={(point) => {
          console.log('[Globe] Point clicked:', point);
          // Subtle zoom-in to make the click feel responsive
          if (globeRef.current) {
            globeRef.current.pointOfView({ 
              lat: point.lat, 
              lng: point.lng, 
              altitude: 0.8 
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


        // --- Labels (Cities) ---
        labelsData={labelsData}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize="size"
        labelDotRadius={0.3}
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
        ringsData={pointsData.filter(b => b.isRightNow || b.intensity > 1 || b.isRecovery)}

        ringLat="lat"
        ringLng="lng"
        ringColor={(d) => d.isRecovery ? "#FFFFFF" : "#C8962C"}

        ringMaxRadius={2.5}
        ringPropagationSpeed={2.5}
        ringRepeat={3}
      />
    </div>
  );
}


