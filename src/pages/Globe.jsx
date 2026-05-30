import { supabase } from '@/components/utils/supabaseClient';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSheet } from '@/contexts/SheetContext';
import { useGlobe } from '@/contexts/GlobeContext';
import { activityTracker } from '../components/globe/ActivityTracker';
import BeaconPreviewPanel from '../components/globe/BeaconPreviewPanel';
import CityDataOverlay from '../components/globe/CityDataOverlay';
import { Layers, Globe2, Bell, Map, Building2, Crosshair, Navigation } from 'lucide-react';
import { useNotifCount } from '@/hooks/useNotifCount';
import { useNavigate, useLocation} from 'react-router-dom';
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
import { MapPin } from 'lucide-react';

import LocalMapboxView from '../components/globe/LocalMapboxView';
import PulseMap from '../components/globe/PulseMap';
import BeaconA11yList from '../components/globe/BeaconA11yList';
import DistrictEditorialCard from '../components/editorial/DistrictEditorialCard';
import CareDecompressionCue from '../components/editorial/CareDecompressionCue';
import AtmosphereCue from '../components/environment/AtmosphereCue';
import ArrivalSignal from '@/components/arrival/ArrivalSignal';

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

// Right-rail control: icons-only by default, label slides out on hover. Used for
// the grouped vertical rail (Layers / My area / Globe) below the pinned SOS.
function RailButton({ icon: Icon, label, onClick, badge = 0, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      data-pull-refresh-ignore
      className="group pointer-events-auto flex items-center justify-end gap-0 hover:gap-2 h-11 px-3 bg-black/60 border border-white/20 backdrop-blur-md rounded-full text-white shadow-lg overflow-hidden transition-all hover:bg-white hover:text-black"
    >
      <span className="max-w-0 group-hover:max-w-[120px] overflow-hidden whitespace-nowrap text-[11px] font-black uppercase tracking-wider transition-[max-width] duration-200">{label}</span>
      <span className="relative flex-shrink-0">
        <Icon className="w-5 h-5" />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 bg-[#C8962C] text-black text-[9px] font-black rounded-full flex items-center justify-center leading-none border border-[#050507]">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
    </button>
  );
}

export default function GlobePage({ embedded = false }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { openProfile } = useProfileOpener();
  const { openSheet } = useSheet();
  const { notifCount, clearNotifBadge } = useNotifCount();
  const [showLayersSheet, setShowLayersSheet] = useState(false);
  const [localFocus, setLocalFocus] = useState(null);
  const [pulseTier, setPulseTier] = useState('globe');
  const [tierToast, setTierToast] = useState('');
  // Tier auto-detect listener — PulseMap emits 'pulse:tier' on every moveend
  // when tier crosses a boundary. We highlight the active rail button + show
  // a brief atmospheric toast ("WORLDWIDE" / "IN REGION" / "IN CITY" / "NEARBY").
  useEffect(() => {
    const TOAST = { globe: 'WORLDWIDE', region: 'IN REGION', city: 'IN CITY', local: 'NEARBY' };
    const handler = (e) => {
      const t = e?.detail?.tier;
      if (!t) return;
      setPulseTier(t);
      setTierToast(TOAST[t] || '');
      window.clearTimeout(handler.__tid);
      handler.__tid = window.setTimeout(() => setTierToast(''), 900);
    };
    window.addEventListener('pulse:tier', handler);
    return () => { window.removeEventListener('pulse:tier', handler); window.clearTimeout(handler.__tid); };
  }, []);

  // Flag flipped 2026-05-25: the single-engine Mapbox globe is now the default for
  // everyone. The react-globe path is being removed in the cleanup PR; this constant
  // stays only so the existing localModeEnabled gates resolve true until that lands.
  const localModeEnabled = true;
  const [showBeaconModal, setShowBeaconModal] = useState(false);
  const [beaconDropLocation, setBeaconDropLocation] = useState(null); // local-map drop point (null = use GPS)

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

  const { beacons: realtimeBeacons, loading: rawBeaconsLoading, refresh: refreshBeacons } = useRealtimeBeacons();
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
  const pulseApiRef = React.useRef(null); // imperative camera api from PulseMap (single-engine)

  // Pending flyTo dispatched via navigation state (e.g. ProfileBeaconsSection tap).
  // The map handshake (onMapApi) drains this; the effect below fires it directly
  // if the map is already ready when the state arrives.
  const pendingFlyToRef = React.useRef(null);
  const __location = useLocation();
  React.useEffect(() => {
    const ft = __location.state && __location.state.flyTo;
    if (!ft || !Number.isFinite(ft.lat) || !Number.isFinite(ft.lng)) return;
    pendingFlyToRef.current = ft;
    if (pulseApiRef.current && pulseApiRef.current.flyTo) {
      try { pulseApiRef.current.flyTo(ft); } catch (e) { /* non-fatal */ }
      pendingFlyToRef.current = null;
    }
  }, [__location.state]);

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
    // Dev location override: ?loc=lat,lng spoofs presence (e.g. faking a London
    // W12 0NP presence while abroad) so dive-to-local / nearby / drop-at-me behave
    // as if home. Bypasses GPS entirely when present.
    try {
      const raw = new URLSearchParams(window.location.search).get('loc');
      if (raw) {
        const [la, ln] = raw.split(',').map((n) => Number(n.trim()));
        if (Number.isFinite(la) && Number.isFinite(ln)) {
          setUserLocation({ lat: la, lng: ln });
          return () => { cancelled = true; };
        }
      }
    } catch (e) { /* fall through to GPS */ }
    safeGetViewerLatLng({ enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }, { retries: 2, logKey: 'globe' }).then((loc) => {
      if (cancelled || !loc) return;
      setUserLocation({ lat: loc.lat, lng: loc.lng });
    });
    return () => { cancelled = true; };
  }, []);

  // Search lives in the global top nav (TopHUD); it reaches the map via a window
  // event so the two don't need a shared ref across the shell/page boundary.
  useEffect(() => {
    const onFlyTo = (e) => {
      try { if (pulseApiRef.current && pulseApiRef.current.flyTo) pulseApiRef.current.flyTo(e.detail); } catch (err) { /* non-fatal */ }
    };
    window.addEventListener('pulse:flyto', onFlyTo);
    return () => window.removeEventListener('pulse:flyto', onFlyTo);
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

  // Single-engine map feed: live beacons + persistent places (venues/recovery) so
  // there's real density to cluster (the macro "city glow") and individual blooms
  // at street zoom. Privacy + category mapping happens in the layer stack.
  // 2026-05-27 Phil: Layer toggles now also filter places (gyms/saunas/clubs =>
  // venues; AA/NA rooms => safety; etc). Previously only realtimeBeacons were
  // filtered which meant toggling "Venues" off did nothing to gym pins.
  const mapSignals = useMemo(() => {
    const bs = Array.isArray(filteredBeacons) ? filteredBeacons : [];
    const placesRaw = Array.isArray(pulsePlaces) ? pulsePlaces : [];
    const placeMatches = (p, ...needles) => {
      const cat = String(p.beacon_category || '').toLowerCase();
      const type = String(p.type || '').toLowerCase();
      const kind = String(p.kind || '').toLowerCase();
      const placeType = String(p.place_type || '').toLowerCase();
      return needles.some(n => cat === n || type === n || kind === n || placeType === n);
    };
    const places = placesRaw.filter(p => {
      if (!activeLayer.venues && placeMatches(p, 'venue', 'signal', 'gym', 'sauna', 'club', 'bar')) return false;
      if (!activeLayer.safety && placeMatches(p, 'safety', 'recovery', 'support', 'harm_reduction')) return false;
      if (!activeLayer.events && placeMatches(p, 'event')) return false;
      if (!activeLayer.market && placeMatches(p, 'market', 'vendor')) return false;
      if (!activeLayer.radio  && placeMatches(p, 'radio')) return false;
      return true;
    });
    return [...bs, ...places];
  }, [filteredBeacons, pulsePlaces, activeLayer]);

  const handleBeaconClick = useCallback((beacon) => {
    if (!beacon) return;

    // Cluster tap → cluster preview sheet (Phil locked 2026-05-29).
    // PulseMap pre-resolves the cluster leaves and hands them through with
    // isCluster=true. We open the cluster preview sheet at peek so the user
    // sees "N signals here" + the constituent list before committing to a
    // zoom-in or picking a specific signal to open.
    if (beacon.isCluster) {
      openSheet('beacon-cluster', {
        count: beacon.count,
        lat: beacon.lat,
        lng: beacon.lng,
        leaves: beacon.leaves || [],
        expansion_resolver: beacon.expansion_resolver,
      });
      return;
    }

    setFocusedBeaconId(beacon.id);

    // Phil 2026-05-29 — locked interaction contract.
    //
    // Every beacon tap opens the L2 beacon sheet. The sheet's own kind-router
    // branches by `beacon.type` + `beacon.beacon_category` (+ metadata.curated).
    // It is NEVER a route navigation — sheets slide up from the bottom, drag
    // to dismiss, X to close. owner_id plays no role in routing; the sheet
    // consults it only inside the user-beacon branch.
    //
    // The prior "navigate to /profile/:userId?beacon=:id" architecture was
    // wrong for two reasons: (1) curated district beacons rendered as if
    // they belonged to the operator account that seeded them — "Boo SMASH"
    // on Soho · Warming; (2) a full route page is a trapped state from the
    // user's perspective with no reverse action.
    //
    // Doctrine: 11-arrival-state-doctrine (Pulse Doctrine), 07-visual-hierarchy.

    // Shop overlay short-circuit: location beacons carrying shopify handles
    // open the merch overlay directly. Only non-sheet path — established
    // commerce surface, leave as-is.
    if (beacon?.mode === 'location' && Array.isArray(beacon.shopify_handles) && beacon.shopify_handles.length > 0) {
      setPreviewBeacon(null);
      setLocationShopBeacon(beacon);
      return;
    }

    activityTracker.trackActivity('beacon_click', { beacon_id: beacon.id, beacon_title: beacon.title }, { lat: beacon.lat, lng: beacon.lng });

    // The id arriving from the globe layer is prefixed (`beacon:` from
    // useRealtimeBeacons.js, `beacon_` from the pulse_signals view). Strip
    // it so the sheet's Supabase fetch hits the right row. The full beacon
    // object is also passed through so the viewer renders synchronously even
    // before the fetch resolves.
    const cleanId = typeof beacon.id === 'string' ? beacon.id.replace(/^beacon[:_]/, '') : beacon.id;
    openSheet('beacon', { beaconId: cleanId, beacon });
  }, [openSheet, setFocusedBeaconId]);

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
          {/* Globe stays mounted; LocalMapboxView overlays on top in local mode.
              Two globe-unmount optimisations were tried and both regressed local mode
              (unmount-on-open → 40s+ load via teardown-during-init; unmount-after-load
              → map flickers then the globe reappears). Dual-engine mounted is the
              proven-clean state — accept the modest extra memory for reliability. */}
          <PulseMap
            beacons={mapSignals}
            userLocation={userLocation}
            onBeaconClick={handleBeaconClick}
            onMapApi={(api) => {
              pulseApiRef.current = api;
              // Drain any pending flyTo queued via navigation state before
              // the map was ready (e.g. profile beacons tap -> /pulse).
              const pft = pendingFlyToRef.current;
              if (pft && api && api.flyTo) {
                try { api.flyTo(pft); } catch (e) { /* non-fatal */ }
                pendingFlyToRef.current = null;
              }
            }}
            onLocalFocus={(focus) => setLocalFocus(focus)}
          />
        </div>

        {/* Map mode is search-first: the big PULSE wordmark + tagline collide with the
            search bar and cover the map, so it's suppressed in localmode (the HOTMESS
            header already carries the brand). Legacy globe keeps the hero title. */}
        {!localModeEnabled && (
          <div className="absolute top-16 left-0 right-0 z-20 pointer-events-none text-center">
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mix-blend-plus-lighter drop-shadow-2xl">Pulse</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-white/60 font-bold tracking-tight text-xs uppercase mt-1">The signal starts here.</motion.p>
          </div>
        )}

                {/* Tier toast — brief atmospheric label on tier change (Phil 2026-05-27) */}
        {tierToast && (
          <div
            className="absolute bottom-[calc(96px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[60] pointer-events-none transition-opacity duration-300"
            style={{ opacity: tierToast ? 1 : 0 }}
          >
            <div className="px-3 py-1 bg-black/70 backdrop-blur-md border border-[#C8962C]/40 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C8962C]">{tierToast}</span>
            </div>
          </div>
        )}
        <div className="absolute top-[calc(56px+env(safe-area-inset-top,0px))] left-4 z-30 pointer-events-none">
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
                : `${onlineMemberCount} members online`
            }</span>
          </div>
        </div>

        {/* Right control rail — grouped vertical, icons-only with hover-expand labels,
            below the pinned SOS shield. Legacy globe gets Layers only; the single-
            engine map adds My-area (dive in) + Globe (pull out). */}
        <div className="absolute top-[calc(88px+env(safe-area-inset-top,0px))] right-4 z-30 flex flex-col items-end gap-2 pointer-events-none">
          <RailButton icon={Bell} label="Alerts" badge={notifCount} onClick={() => { clearNotifBadge(); openSheet('notification-inbox'); }} />
          <RailButton icon={Layers} label="Layers" onClick={() => setShowLayersSheet(true)} />
          {localModeEnabled && (
            <>
              {/* 4-tier spatial rail — Phil 2026-05-27 (replaces binary GLOBE/LOCAL toggle).
                  Active tier highlighted in gold; auto-updates on pinch/drag via the
                  'pulse:tier' window event dispatched by PulseMap. */}
              <RailButton icon={Globe2}    label="Globe"  onClick={() => pulseApiRef.current?.setTier?.('globe')}  active={pulseTier === 'globe'} />
              <RailButton icon={Map}       label="Region" onClick={() => pulseApiRef.current?.setTier?.('region')} active={pulseTier === 'region'} />
              <RailButton icon={Building2} label="City"   onClick={() => pulseApiRef.current?.setTier?.('city')}   active={pulseTier === 'city'} />
              <RailButton icon={Crosshair} label="Local"  onClick={() => pulseApiRef.current?.setTier?.('local')}  active={pulseTier === 'local'} />
              <RailButton icon={Navigation} label="Me"    onClick={() => {
                if (!navigator.geolocation || !pulseApiRef.current?.flyTo) return;
                navigator.geolocation.getCurrentPosition(
                  (pos) => pulseApiRef.current.flyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 14 }),
                  () => {},
                  { enableHighAccuracy: true, timeout: 8000 },
                );
              }} />
            </>
          )}
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

        {/* HOTFIX 2026-05-30 (Phil mobile screenshots): FAB at bottom=76px was visually colliding
            with CareDecompressionCue (bottom=84px, w=92vw). At narrow viewports (390px iPhone)
            the care card's right edge extended past the FAB's left edge — the FAB rendered
            half-clipped behind the care card. Push FAB above the care card band (~52px tall)
            with breathing room. Now: 150px+SAI keeps the FAB clear of the care card AND
            the bottom nav. Z-index unchanged. */}
        <div key="beacon-fab" className="absolute bottom-[calc(150px+env(safe-area-inset-bottom,0px))] right-6 z-[70]" data-pull-refresh-ignore>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {
            // Single-engine: drop where the user is looking (map centre); else GPS.
            if (localModeEnabled && pulseApiRef.current && pulseApiRef.current.getCenter) {
              const c = pulseApiRef.current.getCenter();
              if (c) setBeaconDropLocation(c);
            }
            setShowBeaconModal(true);
          }} className="w-16 h-16 bg-[#C8962C] rounded-2xl flex items-center justify-center shadow-[0_15px_35px_-12px_rgba(200,150,44,0.6)] border border-white/30 overflow-hidden group backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <MapPin className="w-7 h-7 text-black" />
          </motion.button>
        </div>

        <BeaconDropModal
          key="beacon-modal"
          isOpen={showBeaconModal}
          location={beaconDropLocation}
          onClose={() => { setShowBeaconModal(false); setBeaconDropLocation(null); }}
          onComplete={(drop) => {
            // Invalidate React Query caches (for any feeds using rq)
            queryClient.invalidateQueries({ queryKey: ['beacons'] });
            queryClient.invalidateQueries({ queryKey: ['pulse-places'] });
            // useRealtimeBeacons is a custom useState hook — manually refresh it.
            // Don't trust realtime INSERT subscription alone (latency / channel hiccup).
            try { refreshBeacons && refreshBeacons(); } catch (_e) { /* non-fatal */ }
            // Fly the camera to the drop point at street-zoom so Phil
            // actually SEES the beacon land — at globe-zoom a single
            // beacon is invisible. Phil 2026-05-27: drops confirmed by
            // DB but never visible on the map.
            if (drop && Number.isFinite(drop.lat) && Number.isFinite(drop.lng) && pulseApiRef.current && pulseApiRef.current.flyTo) {
              try { pulseApiRef.current.flyTo({ lat: drop.lat, lng: drop.lng, zoom: 14 }); } catch (_e) { /* non-fatal */ }
            }
          }}
        />

        {/* Search now lives in the top nav (TopHUD) → drives the map via window event. */}
        {/* Legacy globe→local overlay (react-globe path only; dead while single-engine). */}
        {!localModeEnabled && localFocus && (
          <LocalMapboxView focus={localFocus} beacons={filteredBeacons} onClose={() => setLocalFocus(null)} onDropBeacon={(c) => { setBeaconDropLocation(c); setShowBeaconModal(true); }} />
        )}
        {/* District editorial + care surfaces. In single-engine mode localFocus is set
            by PulseMap (onLocalFocus) when the camera dives into an editorial city. */}
        {/* PR 4 (Phil 2026-05-29) — single-shot arrival confirmation pill.
            Reads hm_arrival_signal from sessionStorage (set by
            claimPendingBetaCode in /auth/callback or BootRouter fallback).
            Quiet gold ribbon under safe-area. Dismisses on tap or 4s timeout. */}
        <ArrivalSignal />
        {localFocus && <DistrictEditorialCard citySlug={localFocus.slug} />}
        {localFocus && <AtmosphereCue />}
        {localFocus && <CareDecompressionCue />}
        {/* Keyboard / screen-reader parity for the bloom sprites (sr-only). Mirror the
            EXACT beacon set the globe blooms from — incl. founding anchors — so keyboard
            users can reach every bloom a mouse user can. */}
        {localModeEnabled && (
          <BeaconA11yList beacons={mapSignals} viewerLocation={userLocation} onSelect={handleBeaconClick} />
        )}
        <LayersSheet key="layers-sheet" open={showLayersSheet} onClose={() => setShowLayersSheet(false)} activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
      </div>
    </ErrorBoundary>
  );
}



