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
import NearbyGrid from '../components/globe/NearbyGrid';
import LocalBeaconsView from '../components/globe/LocalBeaconsView';
import BeaconPreviewPanel from '../components/globe/BeaconPreviewPanel';
import CityDataOverlay from '../components/globe/CityDataOverlay';
import { useBPMVisualization } from '../components/globe/BPMVisualizer';
import { Settings, BarChart3, Menu, Home, Grid3x3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { debounce } from 'lodash';
import ErrorBoundary from '../components/error/ErrorBoundary';

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

  const { data: userIntents = [] } = useQuery({
    queryKey: ['user-intents-globe'],
    queryFn: () => base44.entities.UserIntent.filter({ visible: true }, '-created_date', 100),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: rightNowUsers = [] } = useQuery({
    queryKey: ['right-now-users-globe'],
    queryFn: async () => {
      const statuses = await base44.entities.RightNowStatus.filter({ active: true });
      const validStatuses = statuses.filter(s => new Date(s.expires_at) > new Date());
      
      // Fetch users and cities
      const users = await base44.entities.User.list();
      const cities = await base44.entities.City.list();
      
      // Map to beacon format
      return validStatuses.map(status => {
        const user = users.find(u => u.email === status.user_email);
        if (!user || !user.city) return null;
        
        const city = cities.find(c => c.name === user.city);
        if (!city) return null;
        
        return {
          id: `rightnow-${status.id}`,
          title: `${user.full_name} is Right Now`,
          description: status.logistics?.join(', ') || 'Available now',
          lat: city.lat,
          lng: city.lng,
          city: city.name,
          mode: 'hookup',
          kind: 'hookup',
          intensity: 1,
          active: true,
          isRightNow: true,
          user_email: user.email,
          avatar_url: user.avatar_url
        };
      }).filter(Boolean);
    },
    refetchInterval: 15000 // Refresh every 15 seconds
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
  const [debouncedLayers, setDebouncedLayers] = useState(['pins']);
  const [activeMode, setActiveMode] = useState(null);
  const [selectedBeacon, setSelectedBeacon] = useState(null);

  // Debounce layer changes to prevent memory leak from rapid toggling
  const debouncedSetLayers = React.useMemo(
    () => debounce((layers) => setDebouncedLayers(layers), 300),
    []
  );

  useEffect(() => {
    debouncedSetLayers(activeLayers);
  }, [activeLayers, debouncedSetLayers]);
  const [beaconType, setBeaconType] = useState(null);
  const [minIntensity, setMinIntensity] = useState(0);
  const [recencyFilter, setRecencyFilter] = useState('all');
  const [showControls, setShowControls] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const [searchResults, setSearchResults] = useState(null);
  const [radiusSearch, setRadiusSearch] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [activityVisibility, setActivityVisibility] = useState(activityTracker.isEnabled());
  const [showNearbyGrid, setShowNearbyGrid] = useState(false);
  const [showLocalBeacons, setShowLocalBeacons] = useState(false);
  const [localBeaconCenter, setLocalBeaconCenter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [previewBeacon, setPreviewBeacon] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [globeScene, setGlobeScene] = useState(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log('Location access denied')
      );
    }
  }, []);

  // Filter beacons by mode, type, intensity, recency, and search (must be before conditional return)
  const filteredBeacons = useMemo(() => {
    // Combine regular beacons with Right Now users
    let filtered = [...beacons, ...rightNowUsers].map(b => ({
      ...b,
      ts: new Date(b.created_date || Date.now()).getTime() // Convert created_date to timestamp
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
  }, [beacons, rightNowUsers, activeMode, beaconType, minIntensity, recencyFilter, searchResults, radiusSearch]);

  // Sort by most recent
  const recentActivity = useMemo(() => {
    return [...filteredBeacons].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [filteredBeacons]);

  const handleBeaconClick = useCallback((beacon) => {
    // Don't handle cluster clicks
    if (beacon.isCluster) return;
    
    // Show preview panel instead of full detail
    setPreviewBeacon(beacon);
    
    // Track activity
    activityTracker.trackActivity('beacon_click', { 
      beacon_id: beacon.id, 
      beacon_title: beacon.title 
    }, {
      lat: beacon.lat,
      lng: beacon.lng
    });
  }, []);

  const handleViewFullDetails = useCallback(() => {
    if (previewBeacon) {
      setSelectedBeacon(previewBeacon);
      setLocalBeaconCenter(previewBeacon);
      setShowLocalBeacons(true);
      setShowPanel(false);
      setShowControls(false);
      setShowNearbyGrid(false);
      setPreviewBeacon(null);
    }
  }, [previewBeacon]);

  const [selectedCity, setSelectedCity] = useState(null);
  const globeRef = React.useRef(null);

  // Get current radio track from localStorage (synced with Radio player)
  useEffect(() => {
    const getRadioState = () => {
      try {
        const radioState = localStorage.getItem('radio_current_track');
        if (radioState) {
          const track = JSON.parse(radioState);
          setCurrentTrack(track);
        }
      } catch (error) {
        console.error('Failed to get radio state:', error);
      }
    };

    getRadioState();
    
    // Listen for radio state updates
    const handleStorageChange = (e) => {
      if (e.key === 'radio_current_track') {
        getRadioState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Poll every 5 seconds as fallback
    const interval = setInterval(getRadioState, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // BPM-driven visualization
  const { pulseData } = useBPMVisualization(globeScene, currentTrack, cities, filteredBeacons);

  const handleCityClick = useCallback((city) => {
    setSelectedCity(city);
    
    // Filter beacons by city
    const cityBeacons = beacons.filter(b => b.city === city.name);
    setSearchResults({
      query: city.name,
      beacons: cityBeacons,
      cities: [city]
    });
    
    // Track city click
    activityTracker.trackActivity('city_click', {
      city_name: city.name,
      beacon_count: cityBeacons.length
    }, {
      lat: city.lat,
      lng: city.lng
    });
  }, [beacons]);

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
    } else if (results.cities.length === 1 && results.cities[0]) {
      setSelectedCity(results.cities[0]);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchResults(null);
    setRadiusSearch(null);
    setSelectedCity(null);
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
    <ErrorBoundary>
      <div className="relative w-full min-h-screen bg-black overflow-hidden">
        {/* Globe - Full Screen */}
        <div className="relative w-full h-screen">
          <EnhancedGlobe3D
          ref={globeRef}
          beacons={filteredBeacons}
          cities={cities}
          activeLayers={debouncedLayers}
          userActivities={userActivities}
          userIntents={userIntents}
          onBeaconClick={handleBeaconClick}
          onCityClick={handleCityClick}
          selectedCity={selectedCity}
          highlightedIds={searchResults?.beacons.map(b => b.id) || radiusSearch?.beacons.map(b => b.id) || []}
          onSceneReady={(scene) => setGlobeScene(scene)}
          className="w-full h-full"
        />
      </div>

      {/* Compact Header */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <Link to={createPageUrl('Home')}>
            <button className="p-2 rounded-lg bg-black/90 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all">
              <Home className="w-4 h-4" />
            </button>
          </Link>
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
            onClick={() => {
              setShowNearbyGrid(!showNearbyGrid);
              if (!showNearbyGrid) {
                setShowControls(false);
                setShowPanel(false);
              }
            }}
            className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
              showNearbyGrid ? 'bg-[#FF1493] text-black' : 'bg-black/90 border border-white/10 text-white'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setShowControls(!showControls);
              if (!showControls) setShowNearbyGrid(false);
            }}
            className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
              showControls ? 'bg-[#FF1493] text-black' : 'bg-black/90 border border-white/10 text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setShowPanel(!showPanel);
              if (!showPanel) setShowNearbyGrid(false);
            }}
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

      {/* Nearby Grid Panel */}
      {showNearbyGrid && (
        <FloatingPanel 
          title="Nearby People" 
          position="right" 
          width="w-96"
          onClose={() => setShowNearbyGrid(false)}
        >
          <NearbyGrid userLocation={userLocation} />
        </FloatingPanel>
      )}

      {/* Local Beacons View */}
      {showLocalBeacons && localBeaconCenter && (
        <FloatingPanel 
          title="Local Area" 
          position="right" 
          width="w-[480px]"
          onClose={() => {
            setShowLocalBeacons(false);
            setLocalBeaconCenter(null);
          }}
        >
          <LocalBeaconsView 
            centerBeacon={localBeaconCenter}
            allBeacons={beacons}
            onClose={() => {
              setShowLocalBeacons(false);
              setLocalBeaconCenter(null);
            }}
            onBeaconSelect={handleBeaconClick}
          />
        </FloatingPanel>
      )}

      {/* Beacon Preview Panel */}
      {previewBeacon && (
        <BeaconPreviewPanel
          beacon={previewBeacon}
          onClose={() => setPreviewBeacon(null)}
          onViewFull={handleViewFullDetails}
        />
      )}

      {/* Real-time City Data Overlay */}
      <CityDataOverlay 
        selectedCity={selectedCity?.name || null} 
        onCitySelect={(cityName) => {
          const city = cities.find(c => c.name === cityName);
          if (city) handleCityClick(city);
        }}
      />
      </div>
    </ErrorBoundary>
  );
}