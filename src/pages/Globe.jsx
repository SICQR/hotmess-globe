import { supabase } from '@/components/utils/supabaseClient';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSheet } from '@/contexts/SheetContext';
import { useGlobe } from '@/contexts/GlobeContext';
import EnhancedGlobe3D from '../components/globe/EnhancedGlobe3D';
import {
  useFoundingTierLayer,
  mergeFoundingIntoBeacons,
  renderFoundingAnchorLabel,
} from '../components/globe/FoundingTierLayer';
import { activityTracker } from '../components/globe/ActivityTracker';
import BeaconPreviewPanel from '../components/globe/BeaconPreviewPanel';
import CityDataOverlay from '../components/globe/CityDataOverlay';
import { Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import ErrorBoundary from '../components/error/ErrorBoundary';
import { fetchNearbyCandidates } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { useRealtimeBeacons, useRightNowCount, useRealtimeLocations, useRealtimeRoutes } from '../components/globe/useRealtimeBeacons';
import { useGlobeActivity } from '@/hooks/useGlobeActivity';
import { useGlobeRealtime } from '@/hooks/useGlobeRealtime';
import { useProfileOpener } from '@/lib/profile';
import LocationShopPanel from '../components/globe/LocationShopPanel';
import { usePulsePlacesByType } from '@/hooks/usePulsePlaces';
import { useVenueIntensity } from '@/hooks/useVenueIntensity';
import BeaconDropModal from '../components/globe/BeaconDropModal';
import { MapPin, X } from 'lucide-react';

import LocalMapboxView from '../components/globe/LocalMapboxView';

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
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={0.2}
      onDragEnd={(e, { offset, velocity }) => {
        if (offset.y > 100 || velocity.y > 500) onClose();
      }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-[200] bg-[#0A0A0A] border-t border-white/10 rounded-t-[32px] px-6 pt-4 pb-[calc(80px+env(safe-area-inset-bottom,20px))] touch-none"
      data-pull-refresh-ignore
    >
      <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C8962C]/10 rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-[#C8962C]" />
          </div>
          <h3 className="text-xl font-black italic tracking-tight text-white uppercase">Globe Layers</h3>
        </div>
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-1">
        {LAYER_DEFS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-white text-sm font-medium">{label}</span>
            </div>
            <button
              onClick={() => setActiveLayer(prev => ({ ...prev, [key]: !prev[key] }))}
              className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors ${activeLayer[key] ? 'justify-end bg-[#C8962C]' : 'justify-start bg-white/10'}`}
            >
              <div className="w-5 h-5 rounded-full bg-white" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={onClose} className="w-full mt-4 py-3 bg-white/5 rounded-xl text-white/50 text-sm">Done</button>
    </motion.div>
  );
}

export default function GlobePage({ embedded = false }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { openProfile } = useProfileOpener();
  const { openSheet } = useSheet();
  const [showLayersSheet, setShowLayersSheet] = useState(false);
  const [localFocus, setLocalFocus] = useState(null);
  // Delay-unmount: globe stays mounted until the local map has finished loading
  // (onReady), then unmounts to free its WebGL context for the duration of local
  // mode. Unmounting DURING mapbox init regressed load badly, so we wait for 'load'.
  const [localMapReady, setLocalMapReady] = useState(false);
  const localModeEnabled = ((import.meta && import.meta.env && import.meta.env.VITE_LOCAL_MODE_ENABLED) === 'true') || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('localmode'));
  const [showBeaconModal, setShowBeaconModal] = useState(false);

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
    setFocusedPlace,
    rotationRef,
  } = useGlobe();

  const { beacons: realtimeBeacons, loading: rawBeaconsLoading } = useRealtimeBeacons();
  const founding = useFoundingTierLayer();
  const [beaconsLoading, setBeaconsLoading] = useState(true);
  useEffect(() => {
    if (!rawBeaconsLoading) setBeaconsLoading(false);
  }, [rawBeaconsLoading]);

  const onlineMemberCount = useRightNowCount();
  const { locations: realtimeLocations } = useRealtimeLocations();
  const { routes: realtimeRoutes } = useRealtimeRoutes();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email };
    },
  });

  const { cityHeat, globeEvents } = useGlobeRealtime();
  const cities = cityHeat.map((c) => ({
    id: c.city_id,
    name: c.city_name,
    lat: c.lat,
    lng: c.lng,
    active_beacons: c.active_beacons,
    heat_intensity: c.heat_intensity,
    scans_last_hour: c.scans_last_hour,
  }));

  const { data: userIntents = [] } = useQuery({
    queryKey: ['user-intents-globe'],
    queryFn: () => supabase
      .from('user_intents')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(100),
    refetchInterval: 30000
  });

  const [activeMode, setActiveMode] = useState(null);
  const [selectedBeacon, setSelectedBeacon] = useState(null);
  const [beaconType, setBeaconType] = useState(null);
  const [minIntensity, setMinIntensity] = useState(0);
  const [recencyFilter, setRecencyFilter] = useState('all');
  const [searchResults, setSearchResults] = useState(null);
  const [radiusSearch, setRadiusSearch] = useState(null);
  const [activityVisibility, setActivityVisibility] = useState(activityTracker.isEnabled());
  const [userLocation, setUserLocation] = useState(null);
  const [previewBeacon, setPreviewBeacon] = useState(null);
  const [locationShopBeacon, setLocationShopBeacon] = useState(null);
  const autoZoomedRef = React.useRef(false);

  const { recovery, allPlaces: pulsePlaces } = usePulsePlacesByType();
  const { intensityMap: venueIntensity } = useVenueIntensity();

  const { data: venueVibes } = useQuery({
    queryKey: ['globe-venue-vibes'],
    queryFn: async () => {
      const { data } = await supabase.from('venue_vibe_mix').select('place_slug, vibe, count');
      if (!data) return new Map();
      const map = new Map();
      for (const row of data) {
        const existing = map.get(row.place_slug);
        if (!existing) {
          map.set(row.place_slug, { dominant: row.vibe, total: Number(row.count) || 0, _maxCount: Number(row.count) || 0 });
        } else {
          existing.total += Number(row.count) || 0;
          if ((Number(row.count) || 0) > (existing._maxCount || 0)) {
            existing.dominant = row.vibe;
            existing._maxCount = Number(row.count) || 0;
          }
        }
      }
      return map;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const liveBeaconCount = realtimeBeacons?.length ?? 0;
  const globeActivity = useGlobeActivity(liveBeaconCount);
  const showPeoplePins = activeLayer.people;

  const { data: nearbyResponse } = useQuery({
    queryKey: ['globe-nearby', userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchNearbyCandidates({ lat: userLocation.lat, lng: userLocation.lng, radiusMeters: 50000, limit: 40, approximate: true }),
    enabled: !!currentUser && !!userLocation?.lat && !!userLocation?.lng && showPeoplePins,
    refetchInterval: 15000,
    retry: false,
  });

  const nearbyPeoplePins = useMemo(() => {
    const candidates = Array.isArray(nearbyResponse?.candidates) ? nearbyResponse.candidates : [];
    return candidates.map((candidate) => {
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
    }).filter(Boolean);
  }, [nearbyResponse]);

  useEffect(() => {
    let cancelled = false;
    safeGetViewerLatLng({ enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }, { retries: 2, logKey: 'globe' }).then((loc) => {
      if (cancelled || !loc) return;
      setUserLocation({ lat: loc.lat, lng: loc.lng });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userLocation || autoZoomedRef.current) return;
    if (globeRef.current?.rotateTo) {
      globeRef.current.rotateTo(userLocation.lat, userLocation.lng, 3.2);
      autoZoomedRef.current = true;
    }
  }, [userLocation]);

  const filteredBeacons = useMemo(() => {
    const beaconsList = Array.isArray(realtimeBeacons) ? realtimeBeacons : [];
    const peopleList = showPeoplePins ? nearbyPeoplePins : [];
    const locationSpikes = (Array.isArray(realtimeLocations) ? realtimeLocations : [])
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng))
      .map((l) => ({ ...l, kind: l.kind || 'spike', mode: 'location', active: true, ts: new Date(l.created_at || Date.now()).getTime(), shopify_handles: l.shopify_handles || [] }));

    let filtered = [...beaconsList, ...peopleList, ...locationSpikes].map(b => ({ ...b, ts: b.ts ?? new Date(b.created_date || b.created_at || Date.now()).getTime() }));

    if (searchResults) {
      const searchBeacons = Array.isArray(searchResults?.beacons) ? searchResults.beacons : [];
      const searchIds = new Set(searchBeacons.map((b) => b.id));
      filtered = filtered.filter((b) => searchIds.has(b.id));
    }
    if (radiusSearch) {
      const radiusBeacons = Array.isArray(radiusSearch?.beacons) ? radiusSearch.beacons : [];
      const radiusIds = new Set(radiusBeacons.map((b) => b.id));
      filtered = filtered.filter((b) => radiusIds.has(b.id));
    }
    if (activeMode) filtered = filtered.filter(b => b.mode === activeMode);
    if (beaconType) filtered = filtered.filter(b => b.kind === beaconType);
    if (minIntensity > 0) filtered = filtered.filter(b => (b.intensity || 0) >= minIntensity);

    if (recencyFilter !== 'all') {
      const recencyMinutes = { '5m': 5, '15m': 15, '30m': 30, '1h': 60 }[recencyFilter];
      if (recencyMinutes) {
        const cutoffTime = Date.now() - recencyMinutes * 60 * 1000;
        filtered = filtered.filter(b => (b.ts || 0) >= cutoffTime);
      }
    }

    const matches = (b, ...needles) => {
      const cat = String(b.beacon_category || '').toLowerCase();
      const type = String(b.type || '').toLowerCase();
      const kind = String(b.kind || '').toLowerCase();
      return needles.some(n => cat === n || type === n || kind === n);
    };
    if (!activeLayer.events) filtered = filtered.filter(b => !matches(b, 'event'));
    if (!activeLayer.venues) filtered = filtered.filter(b => !matches(b, 'venue'));
    if (!activeLayer.people) filtered = filtered.filter(b => !matches(b, 'person', 'user'));
    if (!activeLayer.safety) filtered = filtered.filter(b => !matches(b, 'safety'));
    if (!activeLayer.market) filtered = filtered.filter(b => !matches(b, 'market', 'vendor'));
    if (!activeLayer.radio)  filtered = filtered.filter(b => !matches(b, 'radio'));

    return filtered;
  }, [realtimeBeacons, activeMode, beaconType, minIntensity, recencyFilter, searchResults, radiusSearch, nearbyPeoplePins, showPeoplePins, realtimeLocations, activeLayer]);

  const handleBeaconClick = useCallback((beacon) => {
    if (!beacon || beacon.isCluster) return;
    setFocusedBeaconId(beacon.id);
    if (beacon?.kind === 'person' && beacon?.email) {
      openProfile({ userId: beacon.user_id || beacon.id, source: 'globe', email: beacon.email, preferSheet: true });
      return;
    }
    if (beacon?.mode === 'location' && Array.isArray(beacon.shopify_handles) && beacon.shopify_handles.length > 0) {
      setPreviewBeacon(null);
      setLocationShopBeacon(beacon);
      return;
    }
    setPreviewBeacon(beacon);
    setLocationShopBeacon(null);
    const category = beacon?.beacon_category || 'user';
    if (category === 'venue' || category === 'event' || category === 'hotmess') {
      openSheet('beacon', { beaconId: beacon.id, beacon });
      return;
    }
    activityTracker.trackActivity('beacon_click', { beacon_id: beacon.id, beacon_title: beacon.title }, { lat: beacon.lat, lng: beacon.lng });
  }, [openProfile, openSheet, setFocusedBeaconId]);

  const handleViewFullDetails = useCallback(() => {
    if (!previewBeacon) return;
    if (previewBeacon?.kind === 'person' && previewBeacon?.email) {
      openProfile({ userId: previewBeacon.user_id || previewBeacon.id, source: 'globe', email: previewBeacon.email, preferSheet: true });
      setPreviewBeacon(null);
      return;
    }
    navigate(`${createPageUrl('BeaconDetail')}?id=${encodeURIComponent(previewBeacon.id ?? '')}`);
    setPreviewBeacon(null);
  }, [navigate, previewBeacon, openProfile]);

  const [selectedCity, setSelectedCity] = useState(null);
  const [showCityOverlay, setShowCityOverlay] = useState(true);
  const globeRef = React.useRef(null);

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
    const cityBeacons = (Array.isArray(realtimeBeacons) ? realtimeBeacons : []).filter(b => b.city === city.name);
    setSearchResults({ query: city.name, beacons: cityBeacons, cities: [city] });
    activityTracker.trackActivity('city_click', { city_name: city.name, beacon_count: cityBeacons.length }, { lat: city.lat, lng: city.lng });
  }, [realtimeBeacons, setCameraCity, ctxSetSelectedCity]);

  const handleSearchResults = useCallback((results) => {
    setSearchResults(results);
    setRadiusSearch(null);
    if (results.beacons.length > 0 || results.cities.length > 0) {
      const firstResult = results.beacons[0] || results.cities[0];
      activityTracker.trackActivity('search', { query: results.query, result_count: results.beacons.length + results.cities.length }, firstResult ? { lat: firstResult.lat, lng: firstResult.lng } : null);
    }
    if (results.beacons.length === 1) {
      setSelectedBeacon(results.beacons[0]);
      setFocusedBeaconId(results.beacons[0].id);
    } else if (results.cities.length === 1 && results.cities[0]) {
      setSelectedCity(results.cities[0]);
    }
  }, [setFocusedBeaconId]);

  const handleRadiusSearch = useCallback((results) => {
    setRadiusSearch(results);
    setSearchResults(null);
    activityTracker.trackActivity('filter', { type: 'radius', radius_km: results.radiusKm, result_count: results.beacons.length }, { lat: results.center.lat, lng: results.center.lng });
  }, []);

  return (
    <ErrorBoundary>
      <div className="relative w-full h-full bg-black overflow-hidden">
        <div className="relative w-full h-full touch-none" data-pull-refresh-ignore data-globe-interactive>
          {/* Delay-unmount hardening: keep the globe mounted while the local map is
              still initialising (proven-fast init), then unmount it once the map is
              ready (localMapReady) to free the three.js WebGL context for the duration
              of local mode. If the map never loads, localMapReady stays false and the
              globe stays mounted — i.e. it degrades to the proven-good behaviour. */}
          {(!localFocus || !localMapReady) && (
          <EnhancedGlobe3D
            ref={globeRef}
            beacons={mergeFoundingIntoBeacons(filteredBeacons, founding.foundingBeacons)}
            foundingHtmlElements={founding.foundingHtmlElements}
            foundingArcs={founding.foundingArcs}
            foundingSosRings={founding.sosRings}
            renderHtmlElement={renderFoundingAnchorLabel}
            cities={cities}
            pulsePlaces={pulsePlaces}
            rotationRef={rotationRef}
            venueIntensity={venueIntensity}
            venueVibes={venueVibes}
            userIntents={userIntents}
            routesData={realtimeRoutes}
            globeActivity={globeActivity}
            globeEvents={globeEvents}
            onBeaconClick={(beacon) => {
              if (!beacon) return;
              handleBeaconClick(beacon);
              setFocusedBeaconId(beacon.id);
            }}
            onRecoveryClick={(place) => setPreviewBeacon({ ...place, title: place.name, kind: 'recovery', beacon_category: 'recovery', description: place.notes || place.description })}
            recoveryPins={recovery}
            onCityClick={(city) => {
              handleCityClick(city);
              setCameraCity(city.name);
              ctxSetSelectedCity(city.name);
            }}
            onPlaceClick={(place) => {
              if (place.type === 'city') handleCityClick({ ...place, active: true });
              else setFocusedPlace(place);
            }}
            selectedCity={selectedCity}
            highlightedIds={(Array.isArray(searchResults?.beacons) ? searchResults.beacons.map((b) => b.id) : null) || (Array.isArray(radiusSearch?.beacons) ? radiusSearch.beacons.map((b) => b.id) : null) || []}
            activeFilter={activeFilter}
            focusedBeaconId={focusedBeaconId}
            amplifiedBeaconIds={amplifiedBeaconIds}
            className="w-full h-full"
            autoRotate={false}
          />
          )}
        </div>

        <div className="absolute top-16 left-0 right-0 z-20 pointer-events-none text-center">
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mix-blend-plus-lighter drop-shadow-2xl">Pulse</motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-white/60 font-bold tracking-tight text-xs uppercase mt-1">The signal starts here.</motion.p>
        </div>

        <div className="absolute top-[calc(140px+env(safe-area-inset-top,0px))] left-4 z-30 pointer-events-none">
          <div className="px-3 py-1.5 bg-black/60 border border-white/20 backdrop-blur-md rounded-full flex items-center gap-2 pointer-events-auto shadow-lg">
            <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse shadow-[0_0_8px_#39FF14]" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">{
              /* polish-sweep 2026-05-18 Issue 6: humane copy for empty/lonely states.
                 0 / "first one here tonight"; 1 (you) / "signal's quiet right now";
                 2-49 / "N online"; 50+ / "N online" (drops the noun for width). */
              onlineMemberCount === 0
                ? "You're the first one here tonight"
                : onlineMemberCount === 1
                ? "You're online · the signal's quiet right now"
                : onlineMemberCount >= 50
                ? `${onlineMemberCount} online`
                : `${onlineMemberCount} ${onlineMemberCount === 2 ? 'member' : 'members'} online`
            }</span>
          </div>
        </div>

        <div className="absolute top-[calc(65px+env(safe-area-inset-top,0px))] right-4 z-30 pointer-events-none">
          <button onClick={() => setShowLayersSheet(true)} className="p-3 bg-black/60 border border-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all pointer-events-auto shadow-lg" data-pull-refresh-ignore>
            <Layers className="w-5 h-5" />
          </button>
        </div>

        {previewBeacon && (
          <BeaconPreviewPanel
            beacon={previewBeacon}
            onClose={() => setPreviewBeacon(null)}
            onViewFull={handleViewFullDetails}
            onViewProfile={(b) => {
              const userId = b.user_id || b.owner_id || b.id;
              if (!userId) return;
              setPreviewBeacon(null);
              openProfile({ userId, source: 'globe', email: b.email, preferSheet: true });
            }}
          />
        )}

        {locationShopBeacon && <LocationShopPanel location={locationShopBeacon} onClose={() => setLocationShopBeacon(null)} />}

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

        <div key="beacon-fab" className="absolute bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-6 z-[70]" data-pull-refresh-ignore>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowBeaconModal(true)} className="w-16 h-16 bg-[#C8962C] rounded-2xl flex items-center justify-center shadow-[0_15px_35px_-12px_rgba(200,150,44,0.6)] border border-white/30 overflow-hidden group backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <MapPin className="w-7 h-7 text-black" />
          </motion.button>
        </div>

        <BeaconDropModal
          key="beacon-modal"
          isOpen={showBeaconModal}
          onClose={() => setShowBeaconModal(false)}
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['beacons'] });
            queryClient.invalidateQueries({ queryKey: ['pulse-places'] });
          }}
        />

        {localModeEnabled && (
          <div className="absolute top-[calc(118px+env(safe-area-inset-top,0px))] right-4 z-30 pointer-events-none">
            <button onClick={() => { const c = (selectedCity && CITY_COORDS[selectedCity.name]) || CITY_COORDS['London']; setLocalFocus(c); }} className="p-3 bg-black/60 border border-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all pointer-events-auto shadow-lg" title="Local map" data-pull-refresh-ignore>
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        )}
        {localFocus && (
          <LocalMapboxView
            focus={localFocus}
            beacons={filteredBeacons}
            onReady={() => setLocalMapReady(true)}
            onClose={() => { setLocalFocus(null); setLocalMapReady(false); }}
          />
        )}
        <LayersSheet key="layers-sheet" open={showLayersSheet} onClose={() => setShowLayersSheet(false)} activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
      </div>
    </ErrorBoundary>
  );
}