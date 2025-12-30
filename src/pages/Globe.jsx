import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createClient } from '@supabase/supabase-js';
import EnhancedGlobe3D from '../components/globe/EnhancedGlobe3D';
import GlobeControls from '../components/globe/GlobeControls';
import GlobeDataPanel from '../components/globe/GlobeDataPanel';
import GlobeSearch from '../components/globe/GlobeSearch';
export default function GlobePage() {
  const queryClient = useQueryClient();

  // Fetch beacons and cities from Supabase
  const { data: beacons = [], isLoading: beaconsLoading } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }, '-created_date'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => base44.entities.City.list(),
    refetchInterval: 60000 // Refresh every minute
  });

  // Real-time subscriptions for beacons
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found - real-time updates disabled');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const channel = supabase
      .channel('beacons-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Beacon' },
        (payload) => {
          console.log('New beacon inserted:', payload.new);
          queryClient.setQueryData(['beacons'], (old = []) => {
            if (payload.new.active) {
              return [payload.new, ...old];
            }
            return old;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Beacon' },
        (payload) => {
          console.log('Beacon updated:', payload.new);
          queryClient.setQueryData(['beacons'], (old = []) => {
            return old.map(beacon => 
              beacon.id === payload.new.id ? payload.new : beacon
            );
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'Beacon' },
        (payload) => {
          console.log('Beacon deleted:', payload.old);
          queryClient.setQueryData(['beacons'], (old = []) => {
            return old.filter(beacon => beacon.id !== payload.old.id);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const [activeLayer, setActiveLayer] = useState('pins');
  const [activeMode, setActiveMode] = useState(null);
  const [selectedBeacon, setSelectedBeacon] = useState(null);
  const [beaconType, setBeaconType] = useState(null);
  const [minIntensity, setMinIntensity] = useState(0);
  const [recencyFilter, setRecencyFilter] = useState('all');
  const [showControls, setShowControls] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [radiusSearch, setRadiusSearch] = useState(null);

  // Filter beacons by mode, type, intensity, recency, and search (must be before conditional return)
  const filteredBeacons = useMemo(() => {
    let filtered = beacons.map(b => ({
      ...b,
      ts: new Date(b.created_date).getTime() // Convert created_date to timestamp
    }));

    // Apply search filter first
    if (searchResults) {
      const searchIds = new Set(searchResults.beacons.map(b => b.id));
      filtered = filtered.filter(b => searchIds.has(b.id));
    }

    // Apply radius search
    if (radiusSearch) {
      const radiusIds = new Set(radiusSearch.beacons.map(b => b.id));
      filtered = filtered.filter(b => radiusIds.has(b.id));
    }

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
  }, [beacons, activeMode, beaconType, minIntensity, recencyFilter, searchResults, radiusSearch]);

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

  const handleSearchResults = useCallback((results) => {
    setSearchResults(results);
    setRadiusSearch(null);
    
    // If single beacon or city, focus on it
    if (results.beacons.length === 1) {
      setSelectedBeacon(results.beacons[0]);
      setShowPanel(true);
    } else if (results.cities.length === 1) {
      // Zoom to city (handled by globe component)
      console.log('Focus on city:', results.cities[0]);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setRadiusSearch(null);
  }, []);

  const handleRadiusSearch = useCallback((results) => {
    setRadiusSearch(results);
    setSearchResults(null);
  }, []);

  if (beaconsLoading || citiesLoading) {
    return (
      <div className="relative w-full min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" />
          <p className="text-white/60 text-sm tracking-wider uppercase">Loading Globe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Hero Section & Search - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-4 md:top-8 left-4 md:left-8 right-4 md:right-auto z-30 pointer-events-auto"
      >
        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 mb-4">
          <div className="pointer-events-none">
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
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex-1 md:flex-initial md:min-w-[400px]"
          >
            <GlobeSearch
              beacons={beacons}
              cities={cities}
              onSearchResults={handleSearchResults}
              onClearSearch={handleClearSearch}
              onRadiusSearch={handleRadiusSearch}
            />
          </motion.div>
        </div>
        
        {/* Search/Radius indicator */}
        {(searchResults || radiusSearch) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-xl backdrop-blur-xl"
          >
            <span className="text-[#FF1493] text-xs font-semibold uppercase tracking-wider">
              {radiusSearch 
                ? `${radiusSearch.beacons.length} beacons within ${radiusSearch.radiusKm}km of ${radiusSearch.center.name || radiusSearch.center.title}`
                : `${(searchResults?.beacons.length || 0) + (searchResults?.cities.length || 0)} results for "${searchResults?.query}"`
              }
            </span>
            <button
              onClick={handleClearSearch}
              className="ml-auto text-white/60 hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Mobile Menu Buttons */}
      <div className="absolute top-20 right-4 z-40 flex gap-2 md:hidden pointer-events-auto">
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
          cities={cities}
          onBeaconClick={handleBeaconClick}
          highlightedIds={searchResults?.beacons.map(b => b.id) || radiusSearch?.beacons.map(b => b.id) || []}
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
        <div className="h-full md:h-auto bg-black/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none flex flex-col">
          <div className="md:hidden flex justify-between items-center p-4 border-b border-white/10 sticky top-0 bg-black/95 z-10">
            <span className="text-white font-bold tracking-wider uppercase text-sm">Activity</span>
            <button onClick={() => setShowPanel(false)} className="text-white/60 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 md:p-0 overflow-y-auto flex-1">
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
                <div className="text-white text-lg md:text-2xl font-bold">{cities.length}</div>
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