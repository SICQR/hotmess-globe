import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44, supabase } from '@/components/utils/supabaseClient';
import EnhancedGlobe3D from '../components/globe/EnhancedGlobe3D';
import CompactGlobeControls from '../components/globe/CompactGlobeControls';
import GlobeDataPanel from '../components/globe/GlobeDataPanel';
import GlobeSearch from '../components/globe/GlobeSearch';
import FloatingPanel from '../components/ui/FloatingPanel';
import { activityTracker } from '../components/globe/ActivityTracker';
import { useActivityStream, ActivityFeed, ActivityStats, getActivityConfig } from '../components/globe/ActivityStream';
import { globeActivity } from '@/lib/globeActivity';
import ProfilesGrid from '@/features/profilesGrid/ProfilesGrid';
import TelegramPanel from '@/features/profilesGrid/TelegramPanel';
import LocalBeaconsView from '../components/globe/LocalBeaconsView';
import BeaconPreviewPanel from '../components/globe/BeaconPreviewPanel';
import CityDataOverlay from '../components/globe/CityDataOverlay';
import { Settings, BarChart3, Home, Grid3x3, Activity, Zap, Crown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { debounce } from 'lodash';
import ErrorBoundary from '../components/error/ErrorBoundary';
import { fetchNearbyCandidates } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { getProfileUrl } from '@/lib/userPrivacy';
import { LuxLiveCounter } from '@/components/lux/LiveCounter';
import { LuxPageBanner } from '@/components/lux/LuxBanner';

export default function GlobePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch beacons and cities from Supabase
  const { data: beacons = [], isLoading: beaconsLoading } = useQuery({
    queryKey: ['beacons'],
    queryFn: async () => {
      // Be tolerant of schema drift:
      // - some DBs have created_at (not created_date)
      // - some DBs may not have status/active columns
      // Avoid orderBy/filter assumptions here; we filter/sort client-side.
      const rows = await base44.entities.Beacon.filter({}, null, 500);
      return Array.isArray(rows) ? rows : [];
    },
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
  const [showControls, setShowControls] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [radiusSearch, setRadiusSearch] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [activityVisibility, setActivityVisibility] = useState(activityTracker.isEnabled());
  const [showNearbyGrid, setShowNearbyGrid] = useState(false);
  const [showHotmessFeed, setShowHotmessFeed] = useState(false);
  const [showLocalBeacons, setShowLocalBeacons] = useState(false);
  const [localBeaconCenter, setLocalBeaconCenter] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [previewBeacon, setPreviewBeacon] = useState(null);
  const [showActivityStream, setShowActivityStream] = useState(true);
  const [liveActivityPulses, setLiveActivityPulses] = useState([]);

  // Real-time activity stream
  const { activities: streamActivities, stats: activityStats, addActivity, removeActivity } = useActivityStream(showActivityStream);

  // Subscribe to globe activity broadcasts from other parts of the app
  useEffect(() => {
    const unsubscribe = globeActivity.subscribe((activity) => {
      // Add to local pulses for visual display
      setLiveActivityPulses(prev => [...prev.slice(-20), activity]);
      
      // Auto-remove after animation
      setTimeout(() => {
        setLiveActivityPulses(prev => prev.filter(a => a.id !== activity.id));
      }, 3000);
    });
    
    return unsubscribe;
  }, []);

  const showPeoplePins = activeLayers.includes('people');

  const { data: nearbyResponse } = useQuery({
    queryKey: ['globe-nearby', userLocation?.lat, userLocation?.lng],
    queryFn: () =>
      fetchNearbyCandidates({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusMeters: 50000,
        limit: 40,
        approximate: true,
      }),
    enabled: !!currentUser && !!userLocation?.lat && !!userLocation?.lng && showPeoplePins,
    refetchInterval: 15000,
    retry: false,
  });

  const nearbyPeoplePins = useMemo(() => {
    const candidates = Array.isArray(nearbyResponse?.candidates) ? nearbyResponse.candidates : [];

    return candidates
      .map((candidate) => {
        const lat = Number(candidate?.last_lat);
        const lng = Number(candidate?.last_lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const profile = candidate?.profile && typeof candidate.profile === 'object' ? candidate.profile : {};
        const email = profile?.email ? String(profile.email) : null;
        if (!email) return null;

        const updated = profile?.updated_date || profile?.updated_at || null;
        const title = profile?.full_name || email;

        return {
          id: `person-${String(candidate.user_id || email)}`,
          kind: 'person',
          mode: 'hookup',
          title,
          description: profile?.bio || null,
          lat,
          lng,
          city: profile?.city || null,
          image_url: profile?.avatar_url || null,
          avatar_url: profile?.avatar_url || null,
          email,
          created_date: updated || new Date().toISOString(),
          updated_date: updated || null,
          source: 'nearby',
          distance_meters: candidate?.distance_meters ?? null,
          eta_seconds: candidate?.eta_seconds ?? null,
          eta_mode: candidate?.eta_mode ?? null,
        };
      })
      .filter(Boolean);
  }, [nearbyResponse]);

  // Get user's location
  useEffect(() => {
    let cancelled = false;

    safeGetViewerLatLng(
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      { retries: 2, logKey: 'globe' }
    ).then((loc) => {
      if (cancelled) return;
      if (!loc) return;
      setUserLocation({ lat: loc.lat, lng: loc.lng });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Filter beacons by mode, type, intensity, recency, and search (must be before conditional return)
  const filteredBeacons = useMemo(() => {
    const toNumberOrNull = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    const normalizeBeacon = (b) => {
      if (!b || typeof b !== 'object') return null;

      const lat = toNumberOrNull(b.lat ?? b.latitude ?? b?.location?.lat);
      const lng = toNumberOrNull(b.lng ?? b.lon ?? b.longitude ?? b?.location?.lng);

      return {
        ...b,
        lat,
        lng,
        created_date: b.created_date || b.created_at || b.updated_date || b.updated_at || null,
      };
    };

    // Combine regular beacons with Right Now users
    const beaconsList = (Array.isArray(beacons) ? beacons : [])
      .map(normalizeBeacon)
      .filter(Boolean)
      .filter((b) => {
        // Keep semantics close to the old query (`active:true` + `status:'published'`)
        // without requiring those columns to exist.
        const isActive = b.active !== false;
        const status = b.status ? String(b.status).toLowerCase() : null;
        const isPublished = status ? status === 'published' : true;

        const isShadow = !!b.is_shadow;
        const canSeeShadow = String(currentUser?.role || '').toLowerCase() === 'admin';
        if (isShadow && !canSeeShadow) return false;

        return isActive && isPublished;
      })
      .filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng));

    const rightNowList = Array.isArray(rightNowUsers) ? rightNowUsers : [];

    const peopleList = showPeoplePins ? nearbyPeoplePins : [];

    let filtered = [...beaconsList, ...rightNowList, ...peopleList].map(b => ({
      ...b,
      ts: new Date(b.created_date || Date.now()).getTime() // Convert created_date to timestamp
    }));

    // Apply search filter first
    if (searchResults) {
      const searchBeacons = Array.isArray(searchResults?.beacons) ? searchResults.beacons : [];
      const searchIds = new Set(searchBeacons.map((b) => b.id));
      filtered = filtered.filter((b) => searchIds.has(b.id));
    }

    // Apply radius search
    if (radiusSearch) {
      const radiusBeacons = Array.isArray(radiusSearch?.beacons) ? radiusSearch.beacons : [];
      const radiusIds = new Set(radiusBeacons.map((b) => b.id));
      filtered = filtered.filter((b) => radiusIds.has(b.id));
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
  }, [beacons, rightNowUsers, activeMode, beaconType, minIntensity, recencyFilter, searchResults, radiusSearch, nearbyPeoplePins, showPeoplePins, currentUser?.role]);

  // Sort by most recent
  const recentActivity = useMemo(() => {
    return [...filteredBeacons].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [filteredBeacons]);

  const handleBeaconClick = useCallback((beacon) => {
    // Don't handle cluster clicks
    if (beacon.isCluster) return;

    // People pins: go straight to profile using user ID.
    if (beacon?.kind === 'person' && (beacon?.auth_user_id || beacon?.id)) {
      navigate(getProfileUrl(beacon));
      return;
    }
    
    // Close all other panels first
    setShowControls(false);
    setShowPanel(false);
    setShowNearbyGrid(false);
    setShowLocalBeacons(false);
    
    // Show preview panel
    setPreviewBeacon(beacon);
    
    // Track activity
    activityTracker.trackActivity('beacon_click', { 
      beacon_id: beacon.id, 
      beacon_title: beacon.title 
    }, {
      lat: beacon.lat,
      lng: beacon.lng
    });
  }, [navigate]);

  const handleViewFullDetails = useCallback(() => {
    if (!previewBeacon) return;

    if (previewBeacon?.kind === 'person' && (previewBeacon?.auth_user_id || previewBeacon?.id)) {
      navigate(getProfileUrl(previewBeacon));
      setPreviewBeacon(null);
      return;
    }

    // Default: treat as a Beacon row.
    navigate(`${createPageUrl('BeaconDetail')}?id=${encodeURIComponent(previewBeacon.id ?? '')}`);
    setPreviewBeacon(null);
  }, [navigate, previewBeacon]);

  const [selectedCity, setSelectedCity] = useState(null);
  const globeRef = React.useRef(null);

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
          <p className="text-white/60 text-sm tracking-wider uppercase">Loading Pulse...</p>
        </div>
      </div>
    );
  }

  // Find the "Night King" - top active user
  const nightKing = useMemo(() => {
    const activeUsers = rightNowUsers.filter(u => u.isRightNow);
    if (activeUsers.length === 0) return null;
    return activeUsers[0];
  }, [rightNowUsers]);

  return (
    <ErrorBoundary>
      {/* Drop transition wrapper */}
      <motion.div
        initial={{ y: '-100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="relative w-full min-h-screen bg-black overflow-hidden"
      >
        {/* Night King Banner */}
        {nightKing && (
          <LuxPageBanner
            message={`👑 ${nightKing.title || 'Someone'} is the Night King - Most Active Right Now`}
            type="promo"
            dismissible
            storageKey="globe-night-king"
            fixed
          />
        )}

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
          highlightedIds={
            (Array.isArray(searchResults?.beacons) ? searchResults.beacons.map((b) => b.id) : null) ||
            (Array.isArray(radiusSearch?.beacons) ? radiusSearch.beacons.map((b) => b.id) : null) ||
            []
          }
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
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">PULSE</span>
          </div>
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
              const newState = !showNearbyGrid;
              setShowNearbyGrid(newState);
              if (newState) {
                setShowHotmessFeed(false);
                setShowControls(false);
                setShowPanel(false);
                setShowLocalBeacons(false);
                setPreviewBeacon(null);
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
              const newState = !showHotmessFeed;
              setShowHotmessFeed(newState);
              if (newState) {
                setShowNearbyGrid(false);
                setShowControls(false);
                setShowPanel(false);
                setShowLocalBeacons(false);
                setPreviewBeacon(null);
              }
            }}
            className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
              showHotmessFeed ? 'bg-[#FF1493] text-black' : 'bg-black/90 border border-white/10 text-white'
            }`}
            aria-label="Hotmess Feed"
          >
            <span className="text-[10px] font-black">FEED</span>
          </button>

          <button
            onClick={() => {
              const newState = !showControls;
              setShowControls(newState);
              if (newState) {
                setShowHotmessFeed(false);
                setShowPanel(false);
                setShowNearbyGrid(false);
                setShowLocalBeacons(false);
                setPreviewBeacon(null);
              }
            }}
            className={`p-2 rounded-lg backdrop-blur-xl transition-all ${
              showControls ? 'bg-[#FF1493] text-black' : 'bg-black/90 border border-white/10 text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const newState = !showPanel;
              setShowPanel(newState);
              if (newState) {
                setShowHotmessFeed(false);
                setShowControls(false);
                setShowNearbyGrid(false);
                setShowLocalBeacons(false);
                setPreviewBeacon(null);
              }
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
          title="Profile Cards" 
          position="right" 
          width="w-96"
          onClose={() => setShowNearbyGrid(false)}
        >
          <ProfilesGrid
            showHeader={false}
            showTelegramFeedButton
            containerClassName="mx-0 max-w-none p-0"
            onNavigateUrl={(url) => navigate(url)}
            onOpenProfile={(profile) => {
              const email = profile?.email;
              // Navigate using user ID, never expose email
              navigate(getProfileUrl(profile));
              return;
              if (uid) {
                navigate(createPageUrl(`Profile?uid=${encodeURIComponent(uid)}`));
              }
            }}
          />
        </FloatingPanel>
      )}

      {/* Local Beacons View */}
      {showLocalBeacons && localBeaconCenter && !previewBeacon && (
        <FloatingPanel 
          title="Local Area" 
          position="right" 
          width="w-[480px]"
          onClose={() => {
            setShowLocalBeacons(false);
            setLocalBeaconCenter(null);
            setSelectedBeacon(null);
          }}
        >
          <LocalBeaconsView 
            centerBeacon={localBeaconCenter}
            allBeacons={beacons}
            onClose={() => {
              setShowLocalBeacons(false);
              setLocalBeaconCenter(null);
              setSelectedBeacon(null);
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

      {/* Live Activity Stream Overlay */}
      <AnimatePresence>
        {showActivityStream && (
          <>
            {/* Activity Feed - Bottom Left */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute bottom-20 left-4 z-20"
            >
              <ActivityFeed activities={streamActivities} maxVisible={5} />
            </motion.div>

            {/* Activity Stats - Top Right */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 right-4 z-20"
            >
              <ActivityStats stats={activityStats} className="w-48" />
            </motion.div>

            {/* Live Activity Pulses */}
            {liveActivityPulses.map((activity) => {
              const config = getActivityConfig(activity.type);
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute z-30 pointer-events-none"
                  style={{
                    // Random position if no coordinates
                    left: activity.screenX || `${20 + Math.random() * 60}%`,
                    top: activity.screenY || `${20 + Math.random() * 60}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="relative">
                    {/* Outer glow ring */}
                    <motion.div
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full"
                      style={{
                        width: 40,
                        height: 40,
                        marginLeft: -20,
                        marginTop: -20,
                        backgroundColor: config.glowColor,
                        boxShadow: `0 0 30px ${config.glowColor}`,
                      }}
                    />
                    {/* Inner pulse */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.3 }}
                      className="absolute rounded-full"
                      style={{
                        width: 12,
                        height: 12,
                        marginLeft: -6,
                        marginTop: -6,
                        backgroundColor: config.color,
                        boxShadow: `0 0 15px ${config.color}`,
                      }}
                    />
                    {/* Label */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="absolute whitespace-nowrap text-xs font-bold uppercase tracking-wider"
                      style={{
                        left: 16,
                        top: -6,
                        color: config.color,
                        textShadow: `0 0 10px ${config.glowColor}`,
                      }}
                    >
                      {config.icon} {config.label}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </AnimatePresence>

      {/* Activity Stream Toggle Button */}
      <button
        onClick={() => setShowActivityStream(!showActivityStream)}
        className={`absolute bottom-4 left-4 z-30 p-3 rounded-full backdrop-blur-xl transition-all ${
          showActivityStream 
            ? 'bg-[#39FF14] text-black' 
            : 'bg-black/90 border border-white/10 text-white'
        }`}
        title={showActivityStream ? 'Hide Activity Stream' : 'Show Activity Stream'}
      >
        <Activity className="w-5 h-5" />
      </button>

      {/* Live Counter Badge */}
      {showActivityStream && activityStats.total > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-14 left-6 z-30 px-2 py-1 bg-[#FF1493] rounded-full text-xs font-black text-white"
        >
          {activityStats.total} LIVE
        </motion.div>
      )}

      <TelegramPanel open={showHotmessFeed} onClose={() => setShowHotmessFeed(false)} />
      </motion.div>
    </ErrorBoundary>
  );
}