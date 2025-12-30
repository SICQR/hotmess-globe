import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import NightPulseGlobe from '../components/globe/NightPulseGlobe';
import GlobeControls from '../components/globe/GlobeControls';
import GlobeDataPanel from '../components/globe/GlobeDataPanel';

// Demo data - replace with Supabase real-time queries
const DEMO_BEACONS = [
  { 
    id: 'b1', 
    title: 'VAULT FESTIVAL', 
    description: 'Underground techno in the arches',
    kind: 'event', 
    lat: 51.5074, 
    lng: -0.1278, 
    city: 'LONDON', 
    intensity: 0.95, 
    ts: Date.now(),
    xp_scan: 50,
    mode: 'crowd'
  },
  { 
    id: 'b2', 
    title: 'BERGHAIN SUNDAY', 
    description: 'The most infamous Sunday session',
    kind: 'event', 
    lat: 52.5109, 
    lng: 13.4432, 
    city: 'BERLIN', 
    intensity: 1.0, 
    ts: Date.now() - 1000 * 60 * 15,
    xp_scan: 100,
    mode: 'crowd'
  },
  { 
    id: 'b3', 
    title: 'UNDER', 
    description: 'Late night connections',
    kind: 'hookup', 
    lat: 40.7128, 
    lng: -74.006, 
    city: 'NEW YORK', 
    intensity: 0.85, 
    ts: Date.now() - 1000 * 60 * 5,
    xp_scan: 30,
    mode: 'hookup'
  },
  { 
    id: 'b4', 
    title: 'ARC TOKYO', 
    description: 'Warehouse rave under the highway',
    kind: 'event', 
    lat: 35.6762, 
    lng: 139.6503, 
    city: 'TOKYO', 
    intensity: 0.8, 
    ts: Date.now() - 1000 * 60 * 30,
    xp_scan: 75,
    mode: 'crowd'
  },
  { 
    id: 'b5', 
    title: 'TRADE', 
    description: 'After hours til dawn',
    kind: 'event', 
    lat: 25.7617, 
    lng: -80.1918, 
    city: 'MIAMI', 
    intensity: 0.75, 
    ts: Date.now() - 1000 * 60 * 45,
    xp_scan: 50,
    mode: 'hookup'
  },
  { 
    id: 'b6', 
    title: 'LE DEPOT', 
    description: 'Iconic cruising club',
    kind: 'venue', 
    lat: 48.8566, 
    lng: 2.3522, 
    city: 'PARIS', 
    intensity: 0.7, 
    ts: Date.now() - 1000 * 60 * 20,
    xp_scan: 25,
    mode: 'hookup'
  },
  { 
    id: 'b7', 
    title: 'GARAGE NOORD', 
    description: 'Industrial techno warehouse',
    kind: 'event', 
    lat: 52.3676, 
    lng: 4.9041, 
    city: 'AMSTERDAM', 
    intensity: 0.65, 
    ts: Date.now() - 1000 * 60 * 60,
    xp_scan: 50,
    mode: 'crowd'
  },
  { 
    id: 'b8', 
    title: 'NASIMI BEACH', 
    description: 'Luxury poolside sessions',
    kind: 'event', 
    lat: 25.2048, 
    lng: 55.2708, 
    city: 'DUBAI', 
    sponsored: true, 
    intensity: 0.9, 
    ts: Date.now() - 1000 * 60 * 10,
    xp_scan: 100,
    mode: 'ticket'
  },
  { 
    id: 'b9', 
    title: 'ARQ', 
    description: 'Multi-level madness',
    kind: 'venue', 
    lat: -33.8688, 
    lng: 151.2093, 
    city: 'SYDNEY', 
    intensity: 0.6, 
    ts: Date.now() - 1000 * 60 * 90,
    xp_scan: 25,
    mode: 'crowd'
  },
  { 
    id: 'b10', 
    title: 'THE WEEK', 
    description: 'Massive multi-floor complex',
    kind: 'venue', 
    lat: -23.5505, 
    lng: -46.6333, 
    city: 'SÃO PAULO', 
    intensity: 0.72, 
    ts: Date.now() - 1000 * 60 * 35,
    xp_scan: 50,
    mode: 'crowd'
  },
  { 
    id: 'b11', 
    title: 'DJ STATION', 
    description: 'Multi-floor dance complex',
    kind: 'venue', 
    lat: 13.7563, 
    lng: 100.5018, 
    city: 'BANGKOK', 
    intensity: 0.55, 
    ts: Date.now() - 1000 * 60 * 55,
    xp_scan: 25,
    mode: 'crowd'
  },
  { 
    id: 'b12', 
    title: 'TANTRIC', 
    description: 'Rooftop sessions',
    kind: 'event', 
    lat: 1.3521, 
    lng: 103.8198, 
    city: 'SINGAPORE', 
    intensity: 0.78, 
    ts: Date.now() - 1000 * 60 * 25,
    xp_scan: 50,
    mode: 'ticket'
  },
  { 
    id: 'b13', 
    title: 'THE EAGLE', 
    description: 'Classic leather bar',
    kind: 'venue', 
    lat: 51.5074, 
    lng: -0.1278, 
    city: 'LONDON', 
    intensity: 0.5, 
    ts: Date.now() - 1000 * 60 * 120,
    xp_scan: 25,
    mode: 'hookup'
  },
  { 
    id: 'b14', 
    title: 'UNION', 
    description: 'Raw industrial energy',
    kind: 'drop', 
    lat: 52.5200, 
    lng: 13.4050, 
    city: 'BERLIN', 
    intensity: 0.82, 
    ts: Date.now() - 1000 * 60 * 8,
    xp_scan: 50,
    mode: 'drop'
  },
];

const DEMO_CITIES = [
  { name: 'LONDON', lat: 51.5074, lng: -0.1278, tier: 1, active: true },
  { name: 'BERLIN', lat: 52.52, lng: 13.405, tier: 1, active: true },
  { name: 'NEW YORK', lat: 40.7128, lng: -74.006, tier: 1, active: true },
  { name: 'PARIS', lat: 48.8566, lng: 2.3522, tier: 1, active: false },
  { name: 'AMSTERDAM', lat: 52.3676, lng: 4.9041, tier: 1, active: false },
  { name: 'TOKYO', lat: 35.6762, lng: 139.6503, tier: 1, active: false },
  { name: 'MIAMI', lat: 25.7617, lng: -80.1918, tier: 1, active: false },
  { name: 'SYDNEY', lat: -33.8688, lng: 151.2093, tier: 1, active: false },
  { name: 'SÃO PAULO', lat: -23.5505, lng: -46.6333, tier: 1, active: false },
  { name: 'DUBAI', lat: 25.2048, lng: 55.2708, tier: 1, active: false },
  { name: 'BANGKOK', lat: 13.7563, lng: 100.5018, tier: 2, active: false },
  { name: 'SINGAPORE', lat: 1.3521, lng: 103.8198, tier: 2, active: false },
];

export default function GlobePage() {
  const [activeLayer, setActiveLayer] = useState('pins');
  const [activeMode, setActiveMode] = useState(null);
  const [selectedBeacon, setSelectedBeacon] = useState(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [beaconType, setBeaconType] = useState(null);
  const [minIntensity, setMinIntensity] = useState(0);
  const [recencyFilter, setRecencyFilter] = useState('all');

  // Get Mapbox token from localStorage or environment
  const [mapboxToken, setMapboxToken] = useState(() => {
    return localStorage.getItem('mapbox_token') || import.meta.env.VITE_MAPBOX_TOKEN || '';
  });

  // Filter beacons by mode, type, intensity, and recency (must be before conditional return)
  const filteredBeacons = useMemo(() => {
    let filtered = DEMO_BEACONS;

    // Filter by mode
    if (activeMode) {
      filtered = filtered.filter(b => b.mode === activeMode);
    }

    // Filter by beacon type (kind)
    if (beaconType) {
      filtered = filtered.filter(b => b.kind === beaconType);
    }

    // Filter by minimum intensity
    if (minIntensity > 0) {
      filtered = filtered.filter(b => (b.intensity || 0) >= minIntensity);
    }

    // Filter by recency
    if (recencyFilter !== 'all') {
      const recencyMinutes = {
        '5m': 5,
        '15m': 15,
        '30m': 30,
        '1h': 60
      }[recencyFilter];

      if (recencyMinutes) {
        const cutoffTime = Date.now() - recencyMinutes * 60 * 1000;
        filtered = filtered.filter(b => (b.ts || 0) >= cutoffTime);
      }
    }

    return filtered;
  }, [activeMode, beaconType, minIntensity, recencyFilter]);

  // Sort by most recent
  const recentActivity = useMemo(() => {
    return [...filteredBeacons].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [filteredBeacons]);

  const handleBeaconClick = useCallback((beacon) => {
    setSelectedBeacon(beacon);
  }, []);

  const handleCityClick = useCallback((city) => {
    console.log('City clicked:', city);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedBeacon(null);
  }, []);

  const handleSaveToken = useCallback(() => {
    localStorage.setItem('mapbox_token', tokenInput);
    setMapboxToken(tokenInput);
    setShowTokenInput(false);
  }, [tokenInput]);

  // Show token input if no token (after all hooks)
  if (!mapboxToken) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <h1 className="text-white text-2xl font-bold mb-4 text-center">MAPBOX TOKEN REQUIRED</h1>
          <p className="text-white/60 text-sm mb-4 text-center">
            Get a free token at <a href="https://account.mapbox.com/access-tokens" target="_blank" rel="noopener noreferrer" className="text-[#FF1493] hover:underline">mapbox.com</a>
          </p>
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="pk.eyJ1IjoieW91ci10b2tlbiIsImEiOiJ..."
            className="w-full bg-white/10 text-white px-4 py-3 rounded-lg mb-4 border border-white/20 focus:border-[#FF1493] focus:outline-none"
          />
          <button
            onClick={handleSaveToken}
            disabled={!tokenInput}
            className="w-full bg-[#FF1493] text-white py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#FF1493]/90"
          >
            SAVE TOKEN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Globe */}
      <NightPulseGlobe
        mapboxToken={mapboxToken}
        beacons={filteredBeacons}
        cities={DEMO_CITIES}
        activeLayer={activeLayer}
        onBeaconClick={handleBeaconClick}
        onCityClick={handleCityClick}
        className="w-full h-full"
      />

      {/* Controls */}
      <GlobeControls
        activeLayer={activeLayer}
        onLayerChange={setActiveLayer}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        beaconType={beaconType}
        onBeaconTypeChange={setBeaconType}
        minIntensity={minIntensity}
        onMinIntensityChange={setMinIntensity}
        recencyFilter={recencyFilter}
        onRecencyFilterChange={setRecencyFilter}
        liveCount={filteredBeacons.length}
      />

      {/* Data Panel */}
      <GlobeDataPanel
        selectedBeacon={selectedBeacon}
        recentActivity={recentActivity}
        onClose={handleClose}
        onBeaconSelect={handleBeaconClick}
      />

      {/* Branding */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 left-8 z-10"
      >
        <h1 className="text-white text-4xl font-black tracking-[0.2em] leading-none mb-2">
          HOTMESS
        </h1>
        <p className="text-[#FF1493] text-[11px] tracking-[0.5em] font-medium uppercase">
          NIGHT PULSE
        </p>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 right-8 z-10 text-right"
      >
        <p className="text-white/30 text-[10px] tracking-[0.15em] uppercase font-medium">
          DRAG • ZOOM • CLICK BEACONS
        </p>
        <button
          onClick={() => setShowTokenInput(true)}
          className="text-white/20 hover:text-white/40 text-[9px] mt-2 underline"
        >
          Change Mapbox Token
        </button>
      </motion.div>

      {/* Token change modal */}
      {showTokenInput && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
          <div className="max-w-md w-full px-6">
            <h2 className="text-white text-xl font-bold mb-4">UPDATE MAPBOX TOKEN</h2>
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={mapboxToken}
              className="w-full bg-white/10 text-white px-4 py-3 rounded-lg mb-4 border border-white/20 focus:border-[#FF1493] focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowTokenInput(false)}
                className="flex-1 bg-white/10 text-white py-3 rounded-lg font-bold hover:bg-white/20"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveToken}
                disabled={!tokenInput}
                className="flex-1 bg-[#FF1493] text-white py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-[#FF1493]/90"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}