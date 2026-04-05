import { supabase } from '@/components/utils/supabaseClient';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSheet } from '@/contexts/SheetContext';
import { useGlobe } from '@/contexts/GlobeContext';
import EnhancedGlobe3D from '../components/globe/EnhancedGlobe3D';
import { activityTracker } from '../components/globe/ActivityTracker';
import BeaconPreviewPanel from '../components/globe/BeaconPreviewPanel';
import CityDataOverlay from '../components/globe/CityDataOverlay';
import { Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { debounce } from 'lodash';
import ErrorBoundary from '../components/error/ErrorBoundary';
import { fetchNearbyCandidates } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { useRealtimeBeacons, useRightNowCount, useRealtimeLocations, useRealtimeRoutes } from '../components/globe/useRealtimeBeacons';
import { useGlobeActivity } from '@/hooks/useGlobeActivity';
import { useGlobeRealtime } from '@/hooks/useGlobeRealtime';
import { useProfileOpener } from '@/lib/profile';
import LocationShopPanel from '../components/globe/LocationShopPanel';
import { usePulsePlacesByType } from '@/hooks/usePulsePlaces';

// ── City coords for programmatic flyTo ──────────────────────────────────────
const CITY_COORDS = {
  'London':    { lat: 51.5074, lng: -0.1278 },
  'Berlin':    { lat: 52.52,   lng: 13.405  },
  'New York':  { lat: 40.7128, lng: -74.006 },
  'Barcelona': { lat: 41.3851, lng: 2.1734  },
  'Amsterdam': { lat: 52.3676, lng: 4.9041  },
  'Paris':     { lat: 48.8566, lng: 2.3522  },
  'Tokyo':     { lat: 35.6762, lng: 139.65  },
  'Sydney':    { lat: -33.865, lng: 151.209 },
};

// ── Layers Sheet ─────────────────────────────────────────────────────────────
const LAYER_DEFS = [
  { key: 'events',  label: 'Events',  color: '#FF4F9A' },
  { key: 'venues',  label: 'Venues',  color: '#00C2E0' },
  { key: 'people',  label: 'People',  color: '#39FF14' },
  { key: 'safety',  label: 'Safety',  color: '#FF3B30' },
  { key: 'market',  label: 'Market',  color: '#FFD700' },
  { key: 'radio',   label: 'Radio',   color: '#B026FF' },
];

function LayersSheet({ open, onClose, activeLayer, setActiveLayer }) {
  if (!open) return null;
  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-[80] bg-black/95 border-t border-white/10 rounded-t-3xl"
      style={{ padding: '16px 16px calc(20px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
      <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Globe Layers</h3>
      <div className="space-y-1">
        {LAYER_DEFS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-white text-sm font-medium">{label}</span>
            </div>
            <button
              onClick={() => setActiveLayer(prev => ({ ...prev, [key]: !prev[key] }))}
              className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                activeLayer[key] ? 'justify-end bg-[#C8962C]' : 'justify-start bg-white/10'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        className="w-full mt-4 py-3 bg-white/5 rounded-xl text-white/50 text-sm"
      >
        Done
      </button>
    </motion.div>
  );
}

export default function GlobePage({ embedded = false }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { openProfile } = useProfileOpener();
  const { openSheet } = useSheet();
  const [showLayersSheet, setShowLayersSheet] = useState(false);

  // ── GlobeContext bridge ──────────────────────────────────────────────────
  const {
    selectedCity: ctxSelectedCity,
    setSelectedCity: ctxSetSelectedCity,
    activeFilter,
    focusedBeaconId,
    setFocusedBeaconId,
    setCameraCity,
    activeLayer,
    setActiveLayer,
    amplifiedBeaconIds,
  } = useGlobe();

  // Realtime presence beacons from presence table (TTL-based)
  const { beacons: presenceBeacons, presenceCount } = useRealtimeBeacons();
  const rightNowCount = useRightNowCount();

  // Realtime locations (spikes) and routes (arcs) from dedicated tables
  const { locations: realtimeLocations } = useRealtimeLocations();
  const { routes: realtimeRoutes }       = useRealtimeRoutes();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
    },
  });

  // Fetch beacons from Supabase beacons table
  const { data: beacons = [], isLoading: beaconsLoading } = useQuery({
    queryKey: ['beacons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beacons')
        .select('id, code, type, beacon_category, title, status, geo_lat, geo_lng, city_slug, globe_color, globe_pulse_type, globe_size_base, intensity, checkin_count, venue_id, ends_at, owner_id, starts_at, description, active')
        .eq('status', 'active')
        .not('geo_lat', 'is', null);
      if (error) {
        console.warn('[Globe] beacons query error:', error.message);
        return [];
      }
      // Normalize to shape expected by EnhancedGlobe3D
      const now = new Date();
      return (data ?? [])
        .filter((b) => !b.ends_at || new Date(b.ends_at) > now)
        .map((b) => ({
          ...b,
          lat: Number(b.geo_lat),
          lng: Number(b.geo_lng),
          kind: b.type,
          mode: b.beacon_category === 'venue' ? 'venue' : 'user',
          active: true,
        }));
    },
    refetchInterval: 30000,
  });

  // Live city heat from night_pulse_realtime (polled every 60s)
  // and globe_events realtime subscription for visual effects
  const { cityHeat, globeEvents } = useGlobeRealtime();

  // Map city heat to the cities format the globe expects
  const cities = cityHeat.map((c) => ({
    id: c.city_id,
    name: c.city_name,
    lat: c.lat,
    lng: c.lng,
    active_beacons: c.active_beacons,
    heat_intensity: c.heat_intensity,
    scans_last_hour: c.scans_last_hour,
  }));
  const citiesLoading = false;

  const { data: userIntents = [] } = useQuery({
    queryKey: ['user-intents-globe'],
    queryFn: () => supabase.from('user_intents').select('*').order('-created_date', { ascending: false }).limit(100),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: rightNowUsers = [] } = useQuery({
    queryKey: ['right-now-users-globe'],
    queryFn: async () => {
      // Read directly from Supabase — this is where RightNowModal writes
      const { data: statuses, error } = await supabase
        .from('right_now_status')
        .select('*')
        .eq('active', true)
        .gt('expires_at', new Date().toISOString())
        .limit(100);
      if (error) throw error;

      return (statuses || [])
        .filter(s => s.location?.lat && s.location?.lng)
        .map(s => ({
          id: `rightnow-${s.id}`,
          title: 'Right Now',
          description: s.preferences?.logistics?.join(', ') || 'Available now',
          lat: s.location.lat,
          lng: s.location.lng,
          mode: 'hookup',
          kind: 'hookup',
          intensity: 1,
          active: true,
          isRightNow: true,
          user_id: s.user_id,
        }));
    },
    refetchInterval: 30000,
  });

  // Real-time subscriptions for beacons
  useEffect(() => {
    const channel = supabase
      .channel('beacons-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'beacons' },
        (payload) => {
          queryClient.setQueryData(['beacons'], (old = []) => {
            if (payload.new.active) {
              const b = payload.new;
              const normalized = {
                ...b,
                lat:    Number(b.geo_lat),
                lng:    Number(b.geo_lng),
                kind:   b.type,
                mode:   b.beacon_category === 'venue' ? 'venue' : 'user',
                active: true,
              };
              return [normalized, ...old];
            }
            return old;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'beacons' },
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
        { event: 'DELETE', schema: 'public', table: 'beacons' },
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

  // Real-time: right_now_status changes → immediately re-fetch Right Now beacons
  useEffect(() => {
    const channel = supabase
      .channel('right-now-status-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'right_now_status' }, () => {
        queryClient.invalidateQueries({ queryKey: ['right-now-users-globe'] });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [queryClient]);

  // Real-time subscriptions for user activities
  useEffect(() => {
    // Fetch recent activities
    const fetchActivities = async () => {
      try {
        const activities = await supabase.from('user_activity').select('*').eq(
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
  const [searchResults, setSearchResults] = useState(null);
  const [radiusSearch, setRadiusSearch] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [activityVisibility, setActivityVisibility] = useState(activityTracker.isEnabled());
  const [userLocation, setUserLocation] = useState(null);
  const [previewBeacon, setPreviewBeacon] = useState(null);
  const [locationShopBeacon, setLocationShopBeacon] = useState(null);
  const autoZoomedRef = React.useRef(false);

  // Pulse Places: cultural anchor layer (cities, zones, clubs, curated)
  const { cities: placeCities, zones: placeZones, clubs: placeClubs, curated: placeCurated, allPlaces: pulsePlaces } = usePulsePlacesByType();

  // Living Globe: activity reactor (seed heat + venue glow)
  const liveBeaconCount = (rightNowUsers?.length ?? 0) + (beacons?.length ?? 0);
  const globeActivity = useGlobeActivity(liveBeaconCount);

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
        const title = profile?.full_name || profile?.display_name || 'Nearby';

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

  // Auto-zoom to user's location on first GPS fix
  useEffect(() => {
    if (!userLocation || autoZoomedRef.current) return;
    if (globeRef.current?.rotateTo) {
      globeRef.current.rotateTo(userLocation.lat, userLocation.lng, 3.2);
      autoZoomedRef.current = true;
    }
  }, [userLocation]);

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

    // Realtime presence beacons from presence table
    const realtimePresence = Array.isArray(presenceBeacons) ? presenceBeacons : [];

    // Realtime location spikes from `locations` table — convert to beacon format
    const locationSpikes = (Array.isArray(realtimeLocations) ? realtimeLocations : [])
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .map((l) => ({
        ...l,
        kind:   l.kind || 'spike',
        mode:   'location',
        active: true,
        ts:     new Date(l.created_at || Date.now()).getTime(),
        // Preserve shopify_handles so LocationShopPanel can pick them up
        shopify_handles: l.shopify_handles || [],
      }));

    let filtered = [...beaconsList, ...rightNowList, ...peopleList, ...realtimePresence, ...locationSpikes].map(b => ({
      ...b,
      ts: b.ts ?? new Date(b.created_date || Date.now()).getTime(),
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

    // Layer filtering from GlobeContext
    if (!activeLayer.events)  filtered = filtered.filter(b => b.type !== 'event'  && b.kind !== 'event');
    if (!activeLayer.venues)  filtered = filtered.filter(b => b.beacon_category !== 'venue');
    if (!activeLayer.people)  filtered = filtered.filter(b => b.kind !== 'person');
    if (!activeLayer.safety)  filtered = filtered.filter(b => b.type !== 'safety' && b.kind !== 'safety');
    if (!activeLayer.market)  filtered = filtered.filter(b => b.type !== 'market' && b.kind !== 'market');

    return filtered;
  }, [beacons, rightNowUsers, activeMode, beaconType, minIntensity, recencyFilter, searchResults, radiusSearch, nearbyPeoplePins, showPeoplePins, currentUser?.role, presenceBeacons, realtimeLocations, activeLayer]);

  // Sort by most recent
  const recentActivity = useMemo(() => {
    return [...filteredBeacons].sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }, [filteredBeacons]);

  const handleBeaconClick = useCallback((beacon) => {
    // Null = empty space tap (dismiss focused state)
    if (!beacon) return;
    // Don't handle cluster clicks
    if (beacon.isCluster) return;

    // Update globe context focused beacon
    setFocusedBeaconId(beacon.id);

    // People pins: use Profile Authority contract (Stage 4)
    if (beacon?.kind === 'person' && beacon?.email) {
      openProfile({
        userId: beacon.user_id || beacon.id,
        source: 'globe',
        email: beacon.email,
        preferSheet: true,
      });
      return;
    }

    // Location spikes with Shopify products → open shop panel
    if (beacon?.mode === 'location' && Array.isArray(beacon.shopify_handles) && beacon.shopify_handles.length > 0) {
      setPreviewBeacon(null);
      setLocationShopBeacon(beacon);
      return;
    }

    setLocationShopBeacon(null);

    // Route to beacon sheet based on beacon_category
    const category = beacon?.beacon_category || 'user';
    if (category === 'venue' || category === 'event' || category === 'hotmess') {
      openSheet('beacon', { beaconId: beacon.id, beacon });
      return;
    }
    if (category === 'user' && beacon?.owner_id) {
      openSheet('beacon', { beaconId: beacon.id, beacon });
      return;
    }

    // Fallback: show preview panel for unrecognized beacons
    setPreviewBeacon(beacon);
    
    // Track activity
    activityTracker.trackActivity('beacon_click', { 
      beacon_id: beacon.id, 
      beacon_title: beacon.title 
    }, {
      lat: beacon.lat,
      lng: beacon.lng
    });
  }, [openProfile]);

  const handleViewFullDetails = useCallback(() => {
    if (!previewBeacon) return;

    // People: use Profile Authority contract (Stage 4)
    if (previewBeacon?.kind === 'person' && previewBeacon?.email) {
      openProfile({
        userId: previewBeacon.user_id || previewBeacon.id,
        source: 'globe',
        email: previewBeacon.email,
        preferSheet: true,
      });
      setPreviewBeacon(null);
      return;
    }

    // Default: treat as a Beacon row.
    navigate(`${createPageUrl('BeaconDetail')}?id=${encodeURIComponent(previewBeacon.id ?? '')}`);
    setPreviewBeacon(null);
  }, [navigate, previewBeacon]);

  const [selectedCity, setSelectedCity] = useState(null);
  const [showCityOverlay, setShowCityOverlay] = useState(true);
  const globeRef = React.useRef(null);

  // Fly globe to city when context selectedCity changes
  useEffect(() => {
    if (ctxSelectedCity && globeRef.current?.rotateTo) {
      const coords = CITY_COORDS[ctxSelectedCity];
      if (coords) globeRef.current.rotateTo(coords.lat, coords.lng, 3.2);
    }
  }, [ctxSelectedCity]);

  const handleCityClick = useCallback((city) => {
    setSelectedCity(city);
    setCameraCity(city.name);
    ctxSetSelectedCity(city.name);

    // Filter beacons by city
    const cityBeacons = beacons.filter(b => b.city === city.name);
    setSearchResults({
      query: city.name,
      beacons: cityBeacons,
      cities: [city]
    });

    activityTracker.trackActivity('city_click', {
      city_name: city.name,
      beacon_count: cityBeacons.length
    }, {
      lat: city.lat,
      lng: city.lng
    });
  }, [beacons, setCameraCity, ctxSetSelectedCity]);

  const handleClose = useCallback(() => {
    setSelectedBeacon(null);
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
    
    // If single beacon, focus it; if single city, fly to it
    if (results.beacons.length === 1) {
      setSelectedBeacon(results.beacons[0]);
      setFocusedBeaconId(results.beacons[0].id);
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
          <div className="w-12 h-12 border-4 border-[#C8962C]/30 border-t-[#C8962C] rounded-full animate-spin" />
          <p className="text-white/60 text-sm tracking-wider uppercase">Loading Pulse...</p>
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
            pulsePlaces={pulsePlaces}
            activeLayers={debouncedLayers}
            userActivities={userActivities}
            userIntents={userIntents}
            routesData={realtimeRoutes}
            globeActivity={globeActivity}
            globeEvents={globeEvents}
            onBeaconClick={(beacon) => {
              if (!beacon) return; // Empty tap — dismiss
              handleBeaconClick(beacon);
              setFocusedBeaconId(beacon.id);
            }}
            onCityClick={(city) => {
              handleCityClick(city);
              setCameraCity(city.name);
              ctxSetSelectedCity(city.name);
            }}
            onPlaceClick={(place) => {
              // Cities: zoom in. Zones/clubs/curated: open micro flow.
              if (place.type === 'city') {
                handleCityClick({ ...place, active: true });
              } else {
                // Treat as a beacon-like pin → preview
                handleBeaconClick({
                  id: `place-${place.slug}`,
                  title: place.name,
                  kind: place.type,
                  beacon_category: place.type === 'curated' ? 'hotmess' : 'venue',
                  lat: place.lat,
                  lng: place.lng,
                  description: place.notes,
                  placeData: place,
                });
              }
            }}
            selectedCity={selectedCity}
            highlightedIds={
              (Array.isArray(searchResults?.beacons) ? searchResults.beacons.map((b) => b.id) : null) ||
              (Array.isArray(radiusSearch?.beacons) ? radiusSearch.beacons.map((b) => b.id) : null) ||
              []
            }
            activeFilter={activeFilter}
            focusedBeaconId={focusedBeaconId}
            amplifiedBeaconIds={amplifiedBeaconIds}
            className="w-full h-full"
          />
      </div>

      {/* ── Minimal header: Layers button only ──────────────────────── */}
      <div className="absolute top-3 right-3 z-30">
        <button
          onClick={() => setShowLayersSheet(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-black/80 border border-white/10 backdrop-blur-xl active:scale-95 transition-transform"
          aria-label="Toggle layers"
        >
          <Layers className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Beacon Preview Panel */}
      {previewBeacon && (
        <BeaconPreviewPanel
          beacon={previewBeacon}
          onClose={() => setPreviewBeacon(null)}
          onViewFull={handleViewFullDetails}
        />
      )}

      {/* Location Shop Panel — Shopify products pinned to a globe location */}
      {locationShopBeacon && (
        <LocationShopPanel
          location={locationShopBeacon}
          onClose={() => setLocationShopBeacon(null)}
        />
      )}

      {/* Real-time City Data Overlay */}
      {showCityOverlay && (
        <CityDataOverlay
          selectedCity={selectedCity?.name || null}
          onCitySelect={(cityName) => {
            const city = cities.find(c => c.name === cityName);
            if (city) handleCityClick(city);
          }}
          onDismiss={() => setShowCityOverlay(false)}
        />
      )}

      {/* Layers sheet */}
      <AnimatePresence>
        <LayersSheet
          open={showLayersSheet}
          onClose={() => setShowLayersSheet(false)}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
        />
      </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}