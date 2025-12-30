import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import EnhancedGlobe3D from '../components/globe/EnhancedGlobe3D';
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
  const [beaconType, setBeaconType] = useState(null);
  const [minIntensity, setMinIntensity] = useState(0);
  const [recencyFilter, setRecencyFilter] = useState('all');
  const [showControls, setShowControls] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

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
    setShowPanel(true); // Auto-open panel on mobile when beacon clicked
  }, []);

  const handleCityClick = useCallback((city) => {
    console.log('City clicked:', city);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedBeacon(null);
    if (window.innerWidth < 768) {
      setShowPanel(false); // Close panel on mobile when closing beacon
    }
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Hero Section - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-4 md:top-8 left-4 md:left-8 z-30 pointer-events-none"
      >
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white text-xl md:text-3xl font-black tracking-tight mb-1 md:mb-2"
        >
          HOTMESS LONDON
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white/50 text-xs md:text-sm tracking-wider uppercase"
        >
          Live Global Activity
        </motion.p>
      </motion.div>

      {/* Mobile Menu Buttons */}
      <div className="absolute top-4 right-4 z-40 flex gap-2 md:hidden pointer-events-auto">
        <button
          onClick={() => setShowControls(!showControls)}
          className="p-3 bg-black/90 border border-white/20 rounded-xl backdrop-blur-xl"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="p-3 bg-black/90 border border-white/20 rounded-xl backdrop-blur-xl"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Globe */}
      <div className="relative w-full h-screen">
        <EnhancedGlobe3D
          beacons={filteredBeacons}
          cities={DEMO_CITIES}
          onBeaconClick={handleBeaconClick}
          className="w-full h-full"
        />
      </div>

      {/* Controls - Desktop always visible, Mobile drawer */}
      <div className={`
        fixed md:absolute top-0 left-0 h-full md:h-auto
        transform transition-transform duration-300 ease-in-out z-50
        ${showControls ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full md:h-auto overflow-y-auto md:overflow-visible bg-black/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none">
          <div className="md:hidden flex justify-between items-center p-4 border-b border-white/10">
            <span className="text-white font-bold tracking-wider uppercase text-sm">Controls</span>
            <button onClick={() => setShowControls(false)} className="text-white/60 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
        </div>
      </div>

      {/* Mobile overlay */}
      {(showControls || showPanel) && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => {
            setShowControls(false);
            setShowPanel(false);
          }}
        />
      )}

      {/* Data Panel - Desktop and Mobile drawer */}
      <div className={`
        fixed md:absolute top-0 md:top-6 right-0 md:right-6 
        h-full md:h-auto w-full md:w-80 z-50 md:z-20
        transform transition-transform duration-300 ease-in-out
        ${showPanel ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        <div className="h-full md:h-auto bg-black/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none">
          <div className="md:hidden flex justify-between items-center p-4 border-b border-white/10">
            <span className="text-white font-bold tracking-wider uppercase text-sm">Activity</span>
            <button onClick={() => setShowPanel(false)} className="text-white/60 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 md:p-0">
            <GlobeDataPanel
              selectedBeacon={selectedBeacon}
              recentActivity={recentActivity}
              onClose={handleClose}
              onBeaconSelect={handleBeaconClick}
            />
          </div>
        </div>
      </div>

      {/* Stats Bar - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="absolute bottom-4 md:bottom-8 left-4 md:left-8 right-4 md:right-8 z-10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-6 px-4 md:px-6 py-3 md:py-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl">
            <div className="flex items-center justify-around md:justify-start md:gap-6 lg:gap-8">
              <div className="text-center md:text-left">
                <div className="text-white/50 text-[10px] md:text-xs tracking-wider uppercase mb-0.5 md:mb-1">Live</div>
                <div className="text-white text-lg md:text-2xl font-bold">{filteredBeacons.length}</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-white/50 text-[10px] md:text-xs tracking-wider uppercase mb-0.5 md:mb-1">Cities</div>
                <div className="text-white text-lg md:text-2xl font-bold">{DEMO_CITIES.length}</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-white/50 text-[10px] md:text-xs tracking-wider uppercase mb-0.5 md:mb-1">Arcs</div>
                <div className="text-white text-lg md:text-2xl font-bold">{Math.max(0, filteredBeacons.length - 1)}</div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <p className="text-white/40 text-xs tracking-wider uppercase">
                Drag • Zoom • Hover Arcs
              </p>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}