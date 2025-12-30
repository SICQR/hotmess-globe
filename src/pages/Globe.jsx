import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import LiveGlobe3D from '../components/globe/LiveGlobe3D';
import GlobeControls from '../components/globe/GlobeControls';
import GlobeDataPanel from '../components/globe/GlobeDataPanel';

// Demo beacons data - replace with Supabase real-time data
const DEMO_BEACONS = [
  { id: 'b1', title: 'HOTMESS LONDON', kind: 'event', lat: 51.5074, lng: -0.1278, city: 'LONDON', intensity: 1, ts: Date.now(), mode: 'hookup' },
  { id: 'b2', title: 'BERLIN UNDERGROUND', kind: 'drop', lat: 52.52, lng: 13.405, city: 'BERLIN', intensity: 0.85, ts: Date.now() - 1000 * 60 * 15, mode: 'crowd' },
  { id: 'b3', title: 'NYC AFTER HOURS', kind: 'event', lat: 40.7128, lng: -74.006, city: 'NEW YORK', intensity: 0.9, ts: Date.now() - 1000 * 60 * 5, mode: 'hookup' },
  { id: 'b4', title: 'TOKYO NEON', kind: 'event', lat: 35.6762, lng: 139.6503, city: 'TOKYO', intensity: 0.75, ts: Date.now() - 1000 * 60 * 30, mode: 'crowd' },
  { id: 'b5', title: 'MIAMI HEAT', kind: 'checkin', lat: 25.7617, lng: -80.1918, city: 'MIAMI', intensity: 0.7, ts: Date.now() - 1000 * 60 * 45, mode: 'hookup' },
  { id: 'b6', title: 'PARIS NIGHTS', kind: 'event', lat: 48.8566, lng: 2.3522, city: 'PARIS', intensity: 0.8, ts: Date.now() - 1000 * 60 * 20, mode: 'crowd' },
  { id: 'b7', title: 'AMSTERDAM VIBES', kind: 'drop', lat: 52.3676, lng: 4.9041, city: 'AMSTERDAM', intensity: 0.65, ts: Date.now() - 1000 * 60 * 60, mode: 'drop' },
  { id: 'b8', title: 'DUBAI LUXURY', kind: 'sponsor', lat: 25.2048, lng: 55.2708, city: 'DUBAI', sponsored: true, intensity: 0.95, ts: Date.now() - 1000 * 60 * 10, mode: 'ticket' },
  { id: 'b9', title: 'SYDNEY SUNSET', kind: 'event', lat: -33.8688, lng: 151.2093, city: 'SYDNEY', intensity: 0.6, ts: Date.now() - 1000 * 60 * 90, mode: 'crowd' },
  { id: 'b10', title: 'SAO PAULO BEATS', kind: 'event', lat: -23.5505, lng: -46.6333, city: 'SÃO PAULO', intensity: 0.72, ts: Date.now() - 1000 * 60 * 35, mode: 'radio' },
  { id: 'b11', title: 'BANGKOK GLOW', kind: 'checkin', lat: 13.7563, lng: 100.5018, city: 'BANGKOK', intensity: 0.55, ts: Date.now() - 1000 * 60 * 55, mode: 'care' },
  { id: 'b12', title: 'SINGAPORE SKYLINE', kind: 'event', lat: 1.3521, lng: 103.8198, city: 'SINGAPORE', intensity: 0.78, ts: Date.now() - 1000 * 60 * 25, mode: 'ticket' },
];

export default function GlobePage() {
  const [layers, setLayers] = useState({
    pins: true,
    heat: false,
    trails: false,
    cities: true,
  });

  const [activeMode, setActiveMode] = useState(null);
  const [selectedBeacon, setSelectedBeacon] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  // Filter beacons by mode
  const filteredBeacons = useMemo(() => {
    if (!activeMode) return DEMO_BEACONS;
    return DEMO_BEACONS.filter(b => b.mode === activeMode);
  }, [activeMode]);

  // Recent activity sorted by timestamp
  const recentActivity = useMemo(() => {
    return [...filteredBeacons].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [filteredBeacons]);

  const handleLayerToggle = useCallback((key) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleBeaconClick = useCallback((beacon) => {
    setSelectedBeacon(beacon);
    setSelectedCity(null);
  }, []);

  const handleCityClick = useCallback((city) => {
    setSelectedCity(city);
    setSelectedBeacon(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedBeacon(null);
    setSelectedCity(null);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden">
      {/* Globe */}
      <LiveGlobe3D
        className="w-full h-full"
        layers={layers}
        beacons={filteredBeacons}
        onBeaconClick={handleBeaconClick}
        onCityClick={handleCityClick}
      />

      {/* Controls */}
      <GlobeControls
        layers={layers}
        onLayerToggle={handleLayerToggle}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        liveCount={filteredBeacons.length}
      />

      {/* Data Panel */}
      <GlobeDataPanel
        selectedBeacon={selectedBeacon}
        selectedCity={selectedCity}
        recentActivity={recentActivity}
        onClose={handleClosePanel}
        onBeaconSelect={handleBeaconClick}
      />

      {/* Title overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-6 left-6 z-10"
      >
        <h1 className="text-white text-3xl font-black tracking-[0.15em] leading-none">
          HOTMESS
        </h1>
        <p className="text-white/40 text-[10px] tracking-[0.5em] mt-1">
          GLOBAL NIGHTLIFE NETWORK
        </p>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 right-6 z-10 text-right"
      >
        <p className="text-white/20 text-[9px] tracking-wider">
          DRAG TO ROTATE • SCROLL TO ZOOM • CLICK BEACONS
        </p>
      </motion.div>
    </div>
  );
}