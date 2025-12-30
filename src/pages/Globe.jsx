import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createClient } from '@supabase/supabase-js';
import EnhancedGlobe3D from '../components/globe/EnhancedGlobe3D';
import CompactGlobeControls from '../components/globe/CompactGlobeControls';
import GlobeDataPanel from '../components/globe/GlobeDataPanel';
import GlobeSearch from '../components/globe/GlobeSearch';
import FloatingPanel from '../components/ui/FloatingPanel';
import { activityTracker } from '../components/globe/ActivityTracker';
import { Settings, BarChart3 } from 'lucide-react';
export default function GlobePage() {
  const queryClient = useQueryClient();

  // Fetch beacons and cities from Supabase
  const { data: beacons = [], isLoading: beaconsLoading } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true, status: 'published' }, '-created_date'),
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

  // Real-time subscriptions for user activities
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent activities
    const fetchActivities = async () => {
      try {
        const activities = await base44.entities.UserActivity.filter(
          { visible: true },
          '-created_date',
          50
        );
        setUserActivities(activityTracker.pruneOldActivities(activities));
      } catch (error) {
        console.error('Failed to fetch activities:', error);
      }
    };

    fetchActivities();

    const activityChannel = supabase
      .channel('user-activities-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'UserActivity' },
        (payload) => {
          if (payload.new.visible) {
            setUserActivities((old) => {
              const updated = [payload.new, ...old];
              return activityTracker.pruneOldActivities(updated);
            });
          }
        }
      )
      .subscribe();

    // Prune old activities every 10 seconds
    const pruneInterval = setInterval(() => {
      setUserActivities((old) => activityTracker.pruneOldActivities(old));
    }, 10000);

    return () => {
      supabase.removeChannel(activityChannel);
      clearInterval(pruneInterval);
    };
  }, []);

  const [activeLayers, setActiveLayers] = useState(['pins']);
  const [activeMode, setActiveMode] = useState(null);
  const [selectedBeacon, setSelectedBeacon] = useState(null);
  const [beaconType, setBeaconType] = useState(null);
  const [minIntensity, setMinIntensity] = useState(0);
  const [recencyFilter, setRecencyFilter] = useState('all');
  const [showControls, setShowControls] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [radiusSearch, setRadiusSearch] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [activityVisibility, setActivityVisibility] = useState(activityTracker.isEnabled());

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
    setShowPanel(true);
    
    // Track activity
    activityTracker.trackActivity('beacon_click', { 
      beacon_id: beacon.id, 
      beacon_title: beacon.title 
    }, {
      lat: beacon.lat,
      lng: beacon.lng
    });
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
    
    // Track search activity
    if (results.beacons.length > 0 || results.cities.length > 0) {
      const firstResult = results.beacons[0] || results.cities[0];
      activityTracker.trackActivity('search', { 
        query: results.query,
        result_count: results.beacons.length + results.cities.length
      }, firstResult ? {
        lat: firstResult.lat,
        lng: firstResult.lng
      } : null);
    }
    
    // If single beacon or city, focus on it
    if (results.beacons.length === 1) {
      setSelectedBeacon(results.beacons[0]);
      setShowPanel(true);
    } else if (results.cities.length === 1) {
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
    
    // Track radius search
    activityTracker.trackActivity('filter', {
      type: 'radius',
      radius_km: results.radiusKm,
      result_count: results.beacons.length
    }, {
      lat: results.center.lat,
      lng: results.center.lng
    });
  }, []);

  const handleActivityVisibilityToggle = useCallback(() => {
    const newVisibility = !activityVisibility;
    setActivityVisibility(newVisibility);
    activityTracker.setEnabled(newVisibility);
  }, [activityVisibility]);

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
      {/* Globe - Full Screen */}
      <div className="relative w-full h-screen">
        <EnhancedGlobe3D
          beacons={filteredBeacons}
          cities={cities}
          activeLayers={activeLayers}
          userActivities={userActivities}
          onBeaconClick={handleBeaconClick}
          highlightedIds={searchResults?.beacons.map(b => b.id) || radiusSearch?.beacons.map(b => b.id) || []}
          className="w-full h-full"
        />
      </div>

      {/* Compact Header */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-white text-lg md:text-xl font-black tracking-tight hidden md:block">
            HOTMESS
          </h1>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/90 border border-white/10 rounded-lg backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-[#FF1493] animate-pulse" />
            <span className="text-xs font-bold">{filteredBeacons.length}</span>
          </div>
        </div>

        <div className="flex-1 max-w-md">
          <GlobeSearch
            beacons={beacons}
            cities={cities}
            onSearchResults={handleSearchResults}
            onClearSearch={handleClearSearch}
            onRadiusSearch={handleRadiusSearch}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
              showControls ? 'bg-[#FF1493] text-black' : 'bg-black/90 border border-white/10 text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
              showPanel ? 'bg-[#FF1493] text-black' : 'bg-black/90 border border-white/10 text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Results Indicator */}
      {(searchResults || radiusSearch) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-16 left-4 right-4 z-30 flex items-center justify-center"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded-lg backdrop-blur-xl">
            <span className="text-[#FF1493] text-xs font-semibold">
              {radiusSearch 
                ? `${radiusSearch.beacons.length} within ${radiusSearch.radiusKm}km`
                : `${(searchResults?.beacons.length || 0) + (searchResults?.cities.length || 0)} results`
              }
            </span>
            <button onClick={handleClearSearch} className="text-white/60 hover:text-white">
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* Floating Controls Panel */}
      {showControls && (
        <FloatingPanel 
          title="Controls" 
          position="left" 
          width="w-72"
          onClose={() => setShowControls(false)}
        >
          <CompactGlobeControls
            activeLayers={activeLayers}
            onLayersChange={setActiveLayers}
            activeMode={activeMode}
            onModeChange={setActiveMode}
            minIntensity={minIntensity}
            onMinIntensityChange={setMinIntensity}
            activityVisibility={activityVisibility}
            onActivityVisibilityToggle={handleActivityVisibilityToggle}
          />
        </FloatingPanel>
      )}

      {/* Floating Activity Panel */}
      {showPanel && (
        <FloatingPanel 
          title="Activity" 
          position="right" 
          width="w-80"
          onClose={() => setShowPanel(false)}
        >
          <GlobeDataPanel
            selectedBeacon={selectedBeacon}
            recentActivity={recentActivity}
            onClose={handleClose}
            onBeaconSelect={handleBeaconClick}
          />
        </FloatingPanel>
      )}
    </div>
  );
}