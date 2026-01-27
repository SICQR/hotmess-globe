/**
 * Directions Page
 * 
 * Full-featured in-app navigation with turn-by-turn directions,
 * live tracking, voice guidance, and multiple travel modes.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Navigation, Pause, Maximize2, Volume2, VolumeX, Train } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '@/components/shell/PageShell';

import { fetchRoutingDirections } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { decodeGooglePolyline } from '@/utils/googlePolyline';
import { buildUberDeepLink, buildLyftDeepLink, getEstimatedFareRange } from '@/utils/uberDeepLink';
import { SmartTravelSelector } from '@/components/travel/SmartTravelSelector';

// Import new navigation components
import {
  NavigationHeader,
  NavigationStepCard,
  RouteProgress,
  ArrivalCard,
  FullScreenNavigation,
  findCurrentStep,
  checkArrival,
  checkOffRoute,
  useVoiceGuidance,
  isVoiceSupported,
} from '@/components/navigation';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const normalizeModeParam = (value) => {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'foot' || v === 'walk' || v === 'walking') return 'foot';
  if (v === 'bike' || v === 'bicycle' || v === 'bicycling') return 'bike';
  if (v === 'cab' || v === 'drive' || v === 'driving') return 'cab';
  if (v === 'transit' || v === 'bus' || v === 'train' || v === 'subway' || v === 'metro') return 'transit';
  if (v === 'uber') return 'uber';
  return 'foot';
};

const apiModeFor = (uiMode) => {
  if (uiMode === 'foot') return 'WALK';
  if (uiMode === 'bike') return 'BICYCLE';
  if (uiMode === 'transit') return 'TRANSIT';
  return 'DRIVE';
};

const minutesLabel = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  return `${Math.max(1, Math.round(Number(seconds) / 60))} min`;
};

const haversineMeters = (a, b) => {
  if (!a || !b) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
};

const makePinIcon = ({ label, color, glow }) => {
  const safeLabel = String(label || '').slice(0, 6);
  const safeColor = String(color || '#FFFFFF');
  const safeGlow = String(glow || safeColor);

  return L.divIcon({
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `
      <div style="
        width:44px;height:44px;border-radius:999px;
        display:flex;align-items:center;justify-content:center;
        background: rgba(0,0,0,0.7);
        border: 2px solid ${safeColor};
        box-shadow: 0 0 18px ${safeGlow};
        backdrop-filter: blur(6px);
        color: ${safeColor};
        font-weight: 900;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      ">${safeLabel}</div>
    `.trim(),
  });
};

const FollowUser = ({ isNavigating, origin }) => {
  const map = useMap();
  const lastCenterAtRef = useRef(0);

  useEffect(() => {
    if (!isNavigating) return;
    if (!origin) return;

    const now = Date.now();
    if (now - lastCenterAtRef.current < 1200) return;
    lastCenterAtRef.current = now;

    try {
      map.setView([origin.lat, origin.lng], Math.max(14, map.getZoom()), { animate: true });
    } catch {
      // ignore
    }
  }, [isNavigating, map, origin]);

  return null;
};

// Map component for reuse
function NavigationMap({ 
  origin, 
  destination, 
  polylinePoints, 
  isNavigating,
  originIcon,
  destinationIcon,
  mapCenter,
  className,
}) {
  return (
    <MapContainer
      center={mapCenter}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
      className={className}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <FollowUser isNavigating={isNavigating} origin={origin} />

      {origin && <Marker position={[origin.lat, origin.lng]} icon={originIcon} />}
      <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />

      {polylinePoints.length >= 2 && (
        <>
          <Polyline
            positions={polylinePoints}
            pathOptions={{ color: '#00D9FF', weight: 11, opacity: 0.35 }}
          />
          <Polyline
            positions={polylinePoints}
            pathOptions={{ color: '#E62020', weight: 7, opacity: 0.95 }}
          />
        </>
      )}
    </MapContainer>
  );
}

export default function Directions() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const destLat = Number(searchParams.get('lat'));
  const destLng = Number(searchParams.get('lng'));
  const label = String(searchParams.get('label') || '').trim();
  const initialMode = normalizeModeParam(searchParams.get('mode'));
  const debug = String(searchParams.get('debug') || '').trim() === '1';

  const [mode, setMode] = useState(initialMode);
  const [origin, setOrigin] = useState(null);
  const [originError, setOriginError] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToTurn, setDistanceToTurn] = useState(null);
  const [isArrived, setIsArrived] = useState(false);
  const [isOffRoute, setIsOffRoute] = useState(false);

  const watchIdRef = useRef(null);
  const lastFixRef = useRef(null);
  const lastFixAtRef = useRef(0);

  const destination = useMemo(() => {
    if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return null;
    return { lat: destLat, lng: destLng };
  }, [destLat, destLng]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (mode === 'uber') setIsNavigating(false);
  }, [mode]);

  // Get initial location
  useEffect(() => {
    if (!destination) return;
    if (!navigator.geolocation) {
      setOriginError('Geolocation is not available in this browser.');
      return;
    }

    let cancelled = false;

    safeGetViewerLatLng(
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
      { retries: 2, logKey: 'directions' }
    ).then((loc) => {
      if (cancelled) return;
      if (!loc) {
        setOriginError('Unable to get your location.');
        return;
      }
      setOrigin({ lat: loc.lat, lng: loc.lng });
      setOriginError(null);
    });

    return () => {
      cancelled = true;
    };
  }, [destination]);

  // Watch position during navigation
  useEffect(() => {
    if (!navigator.geolocation) return;
    if (!destination) return;
    if (mode === 'uber') return;
    if (!isNavigating) {
      if (watchIdRef.current !== null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch {
          // ignore
        }
        watchIdRef.current = null;
      }
      return;
    }

    const onPos = (pos) => {
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      const now = Date.now();
      const last = lastFixRef.current;
      const moved = last ? haversineMeters(last, next) : null;
      const movedEnough = moved === null ? true : moved >= 15;
      const timeEnough = now - lastFixAtRef.current >= 1200;
      if (!movedEnough && !timeEnough) return;

      lastFixRef.current = next;
      lastFixAtRef.current = now;
      setOrigin(next);
      setOriginError(null);
    };

    const onErr = (err) => {
      if (err?.code === 1) {
        setOriginError('Location permission denied.');
        setIsNavigating(false);
      }
    };

    const id = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    });
    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current === null) return;
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        // ignore
      }
      watchIdRef.current = null;
    };
  }, [destination, isNavigating, mode]);

  const canFetch = !!origin && !!destination && mode !== 'uber';

  const { data: directions, isLoading, error, refetch } = useQuery({
    queryKey: ['routing-directions', mode, origin?.lat, origin?.lng, destination?.lat, destination?.lng],
    queryFn: () => fetchRoutingDirections({ origin, destination, mode: apiModeFor(mode), ttlSeconds: 90 }),
    enabled: canFetch,
    retry: false,
    staleTime: 60000,
  });

  const steps = useMemo(() => {
    return Array.isArray(directions?.steps) ? directions.steps : [];
  }, [directions?.steps]);

  const polylinePoints = useMemo(() => {
    const encoded = directions?.polyline?.encoded;
    if (typeof encoded === 'string' && encoded.trim()) {
      return decodeGooglePolyline(encoded).map((p) => [p.lat, p.lng]);
    }

    const pts = directions?.polyline?.points;
    if (Array.isArray(pts) && pts.length) {
      return pts
        .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))
        .map((p) => [p.lat, p.lng]);
    }

    if (origin && destination) {
      return [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ];
    }

    return [];
  }, [destination, directions?.polyline?.encoded, directions?.polyline?.points, origin]);

  // Live step tracking
  useEffect(() => {
    if (!isNavigating || !origin || !steps.length) return;

    // Find current step
    const { stepIndex, distanceToTurn: dist } = findCurrentStep(origin, steps, polylinePoints);
    setCurrentStepIndex(stepIndex);
    setDistanceToTurn(dist);

    // Check arrival
    const arrived = checkArrival(origin, destination, 30);
    if (arrived && !isArrived) {
      setIsArrived(true);
      toast.success('You have arrived!');
    }

    // Check off-route
    const offRoute = checkOffRoute(origin, polylinePoints, 50);
    if (offRoute !== isOffRoute) {
      setIsOffRoute(offRoute);
      if (offRoute) {
        toast.warning('You appear to be off route');
        // Trigger re-route
        setTimeout(() => {
          refetch();
        }, 2000);
      }
    }
  }, [origin, steps, polylinePoints, isNavigating, destination, isArrived, isOffRoute, refetch]);

  // Voice guidance
  const currentStep = steps[currentStepIndex] || null;
  const nextStep = steps[currentStepIndex + 1] || null;

  useVoiceGuidance({
    enabled: voiceEnabled && isNavigating,
    currentStep,
    distanceToTurn,
    isArrived,
  });

  // Remaining distance/duration
  const remainingMeters = useMemo(() => {
    if (!origin || !destination) return null;
    if (!polylinePoints.length) return haversineMeters(origin, destination);

    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < polylinePoints.length; i += 1) {
      const pt = polylinePoints[i];
      const d = haversineMeters(origin, { lat: pt[0], lng: pt[1] });
      if (d !== null && d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    let sum = 0;
    for (let i = bestIdx; i < polylinePoints.length - 1; i += 1) {
      const a = { lat: polylinePoints[i][0], lng: polylinePoints[i][1] };
      const b = { lat: polylinePoints[i + 1][0], lng: polylinePoints[i + 1][1] };
      const d = haversineMeters(a, b);
      if (d) sum += d;
    }
    return Math.max(0, Math.round(sum));
  }, [destination, origin, polylinePoints]);

  const remainingDuration = useMemo(() => {
    if (!directions?.duration_seconds || !directions?.distance_meters) return null;
    if (!remainingMeters) return directions.duration_seconds;
    
    const ratio = remainingMeters / directions.distance_meters;
    return Math.round(directions.duration_seconds * ratio);
  }, [directions?.duration_seconds, directions?.distance_meters, remainingMeters]);

  const remainingLabel = useMemo(() => {
    if (!Number.isFinite(remainingMeters)) return null;
    if (remainingMeters < 1200) return `${remainingMeters} m`;
    return `${(remainingMeters / 1000).toFixed(1)} km`;
  }, [remainingMeters]);

  const mapCenter = useMemo(() => {
    if (destination) return [destination.lat, destination.lng];
    return [51.5074, -0.1278];
  }, [destination]);

  const etaLabel = minutesLabel(directions?.duration_seconds);

  const originIcon = useMemo(
    () => makePinIcon({ label: 'YOU', color: '#00D9FF', glow: 'rgba(0,217,255,0.75)' }),
    []
  );
  const destinationIcon = useMemo(
    () => makePinIcon({ label: 'GO', color: '#E62020', glow: 'rgba(255,20,147,0.75)' }),
    []
  );

  const rideServiceLinks = useMemo(() => {
    if (!destination) return { uber: null, lyft: null };
    const params = {
      dropoffLat: destination.lat,
      dropoffLng: destination.lng,
      dropoffNickname: label || 'Destination',
      pickupLat: origin?.lat,
      pickupLng: origin?.lng,
    };
    return {
      uber: buildUberDeepLink(params),
      lyft: buildLyftDeepLink(params),
    };
  }, [destination, label, origin]);

  // Rough fare estimate based on distance
  const fareEstimate = useMemo(() => {
    if (!remainingMeters) return null;
    return getEstimatedFareRange(remainingMeters / 1000);
  }, [remainingMeters]);

  // Keep uberUrl for backwards compatibility
  const uberUrl = rideServiceLinks.uber;

  const title = label ? `Directions to ${label}` : 'Directions';
  const subtitle =
    mode === 'uber'
      ? 'Request a ride (opens Uber).'
      : `${etaLabel ? `${etaLabel} • ` : ''}${remainingLabel ? `${remainingLabel} left • ` : ''}${isNavigating ? 'Live' : 'In-app'}`;

  // Handlers
  const handleStartNavigation = useCallback(() => {
    if (isLoading) return;
    setIsNavigating(true);
    setIsArrived(false);
    setCurrentStepIndex(0);
  }, [isLoading]);

  const handleStopNavigation = useCallback(() => {
    setIsNavigating(false);
    setIsFullScreen(false);
  }, []);

  const handleToggleFullScreen = useCallback(() => {
    if (!isNavigating) {
      handleStartNavigation();
    }
    setIsFullScreen(true);
  }, [isNavigating, handleStartNavigation]);

  const handleExitFullScreen = useCallback(() => {
    setIsFullScreen(false);
  }, []);

  const handleRecenter = useCallback(() => {
    // The FollowUser component handles this automatically
  }, []);

  // Missing destination
  if (!destination) {
    return (
      <div className="min-h-screen bg-black text-white">
        <PageShell
          eyebrow="PULSE"
          title="Directions"
          subtitle="Missing destination coordinates."
          maxWidth="2xl"
          back
          backLabel="Back"
        >
          <Button onClick={() => navigate(-1)} variant="outline" className="border-white/20">Go back</Button>
        </PageShell>
      </div>
    );
  }

  // Full-screen navigation mode
  if (isFullScreen && mode !== 'uber') {
    return (
      <FullScreenNavigation
        steps={steps}
        currentStepIndex={currentStepIndex}
        distanceToTurn={distanceToTurn}
        totalRemainingDistance={remainingMeters}
        totalRemainingDuration={remainingDuration}
        destinationLabel={label}
        userPosition={origin}
        destination={destination}
        polylinePoints={polylinePoints}
        isNavigating={isNavigating}
        isArrived={isArrived}
        isOffRoute={isOffRoute}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
        onRecenter={handleRecenter}
        onExit={handleExitFullScreen}
        onStepClick={(idx) => setCurrentStepIndex(idx)}
      >
        <NavigationMap
          origin={origin}
          destination={destination}
          polylinePoints={polylinePoints}
          isNavigating={isNavigating}
          originIcon={originIcon}
          destinationIcon={destinationIcon}
          mapCenter={mapCenter}
        />
      </FullScreenNavigation>
    );
  }

  // Standard view
  return (
    <div className="min-h-screen bg-black text-white">
      <PageShell
        eyebrow="PULSE"
        title={title}
        subtitle={subtitle}
        maxWidth="5xl"
        back
        backLabel="Back"
      >
        {/* Smart Travel Recommendation - shows best option based on context */}
        {origin && destination && etaLabel && (
          <div className="mb-4">
            <SmartTravelSelector
              destination={{
                lat: destination[0],
                lng: destination[1],
                name: label,
              }}
              origin={{
                lat: origin[0],
                lng: origin[1],
              }}
              travelTimes={{
                walking: directions?.duration_seconds && mode === 'foot' ? { mode: 'walk', durationSeconds: directions.duration_seconds, label: etaLabel } : null,
                bicycling: directions?.duration_seconds && mode === 'bike' ? { mode: 'bike', durationSeconds: directions.duration_seconds, label: etaLabel } : null,
                driving: directions?.duration_seconds && mode === 'cab' ? { mode: 'drive', durationSeconds: directions.duration_seconds, label: etaLabel } : null,
                transit: directions?.duration_seconds && mode === 'transit' ? { mode: 'transit', durationSeconds: directions.duration_seconds, label: etaLabel } : null,
              }}
              onNavigate={(navMode) => {
                const modeMap = { walk: 'foot', bike: 'bike', drive: 'cab', transit: 'transit' };
                const newMode = modeMap[navMode];
                if (newMode) setMode(newMode);
              }}
              showRideServices={true}
              showTransit={true}
              compact
              className="w-full"
            />
          </div>
        )}

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="bg-white/5 border border-white/10 flex-wrap gap-1">
            <TabsTrigger value="foot" className="min-h-[40px]">🚶 Foot</TabsTrigger>
            <TabsTrigger value="bike" className="min-h-[40px]">🚴 Bike</TabsTrigger>
            <TabsTrigger value="cab" className="min-h-[40px]">🚕 Cab</TabsTrigger>
            <TabsTrigger value="transit" className="min-h-[40px]">🚇 Transit</TabsTrigger>
            <TabsTrigger value="uber" className="min-h-[40px]">📱 Ride</TabsTrigger>
          </TabsList>

          <TabsContent value={mode} className="mt-4 space-y-4">
            {originError && mode !== 'uber' && (
              <div className="border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                {originError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Map */}
              <div className="lg:col-span-3 overflow-hidden border border-white/10 bg-white/5">
                <div className="h-[420px]">
                  <NavigationMap
                    origin={origin}
                    destination={destination}
                    polylinePoints={polylinePoints}
                    isNavigating={isNavigating}
                    originIcon={originIcon}
                    destinationIcon={destinationIcon}
                    mapCenter={mapCenter}
                  />
                </div>
              </div>

              {/* Directions panel */}
              <div className="lg:col-span-2 border border-white/10 bg-white/5">
                {/* Header with controls */}
                <div className="p-4 flex items-center justify-between border-b border-white/10">
                  <div className="text-sm">
                    <div className="font-black uppercase tracking-wider">
                      {mode === 'foot' ? 'Walking' : mode === 'bike' ? 'Cycling' : mode === 'cab' ? 'Driving' : mode === 'transit' ? 'Public Transit' : 'Uber'}
                    </div>
                    <div className="text-white/60">
                      {mode === 'uber' ? 'Leaves app' : mode === 'transit' ? 'Bus, Train, Metro' : 'Stays in app'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {mode !== 'uber' && isVoiceSupported() && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        className={voiceEnabled ? 'text-cyan-400' : 'text-white/50'}
                      >
                        {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </Button>
                    )}

                    {mode === 'uber' ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="hot"
                          className="font-black"
                          onClick={() => {
                            if (!rideServiceLinks.uber) return;
                            window.open(rideServiceLinks.uber, '_blank', 'noopener,noreferrer');
                          }}
                          disabled={!rideServiceLinks.uber}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Uber
                        </Button>
                        <Button
                          type="button"
                          variant="cyanGradient"
                          className="font-black"
                          onClick={() => {
                            if (!rideServiceLinks.lyft) return;
                            window.open(rideServiceLinks.lyft, '_blank', 'noopener,noreferrer');
                          }}
                          disabled={!rideServiceLinks.lyft}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Lyft
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleToggleFullScreen}
                          disabled={!canFetch || isLoading}
                          className="border-white/20"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="cyan"
                          className="font-black"
                          onClick={() => {
                            if (isNavigating) {
                              handleStopNavigation();
                            } else {
                              handleStartNavigation();
                            }
                          }}
                          disabled={!canFetch || isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : isNavigating ? (
                            <Pause className="w-4 h-4 mr-2" />
                          ) : (
                            <Navigation className="w-4 h-4 mr-2" />
                          )}
                          {isLoading ? 'Loading…' : isNavigating ? 'Stop' : 'Start'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Ride service content (Uber/Lyft) */}
                {mode === 'uber' && (
                  <div className="p-4 space-y-4">
                    {/* Fare estimate */}
                    {fareEstimate && (
                      <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                        <div className="text-xs text-white/60 uppercase tracking-wider mb-2">Estimated Fare</div>
                        <div className="text-2xl font-black text-white">
                          ${fareEstimate.low} - ${fareEstimate.high}
                        </div>
                        <div className="text-xs text-white/50 mt-1">{fareEstimate.disclaimer}</div>
                      </div>
                    )}

                    {/* Ride options */}
                    <div className="space-y-3">
                      <div className="text-sm text-white/70">Choose your ride service:</div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {/* Uber card */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!rideServiceLinks.uber) return;
                            window.open(rideServiceLinks.uber, '_blank', 'noopener,noreferrer');
                          }}
                          disabled={!rideServiceLinks.uber}
                          className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-black hover:bg-white/5 transition-colors disabled:opacity-50"
                        >
                          <div className="w-12 h-12 rounded-full bg-black border-2 border-white flex items-center justify-center mb-2">
                            <span className="text-lg font-black">U</span>
                          </div>
                          <span className="font-bold text-white">Uber</span>
                          <span className="text-xs text-white/50">Opens Uber app</span>
                        </button>

                        {/* Lyft card */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!rideServiceLinks.lyft) return;
                            window.open(rideServiceLinks.lyft, '_blank', 'noopener,noreferrer');
                          }}
                          disabled={!rideServiceLinks.lyft}
                          className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/10 bg-[#FF00BF]/10 hover:bg-[#FF00BF]/20 transition-colors disabled:opacity-50"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#FF00BF] flex items-center justify-center mb-2">
                            <span className="text-lg font-black text-white">L</span>
                          </div>
                          <span className="font-bold text-white">Lyft</span>
                          <span className="text-xs text-white/50">Opens Lyft app</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-white/40">
                      Prices and wait times may vary. Compare both apps for the best deal.
                    </div>
                  </div>
                )}

                {/* Navigation content */}
                {mode !== 'uber' && (
                  <div className="p-4 space-y-4">
                    {/* Current instruction */}
                    {isNavigating && (
                      <NavigationHeader
                        currentStep={currentStep}
                        nextStep={nextStep}
                        distanceToTurn={distanceToTurn}
                        totalRemainingDistance={remainingMeters}
                        totalRemainingDuration={remainingDuration}
                        destinationLabel={label}
                        isNavigating={isNavigating}
                        isArrived={isArrived}
                      />
                    )}

                    {/* Arrival card */}
                    {isArrived && (
                      <ArrivalCard
                        destinationLabel={label}
                        totalDistance={directions?.distance_meters}
                        totalDuration={directions?.duration_seconds}
                        onClose={() => navigate(-1)}
                      />
                    )}

                    {/* Progress */}
                    {isNavigating && steps.length > 0 && !isArrived && (
                      <RouteProgress
                        currentStepIndex={currentStepIndex}
                        totalSteps={steps.length}
                        totalDistance={directions?.distance_meters}
                        remainingDistance={remainingMeters}
                      />
                    )}

                    {/* Step list */}
                    {!isArrived && (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {error && (
                          <div className="text-sm text-red-300">
                            {String(error?.message || 'Failed to load directions')}
                          </div>
                        )}

                        {directions?.warning && !error && origin && (
                          <div className="border border-amber-400/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                            Approximate route shown — turn-by-turn steps unavailable right now.
                          </div>
                        )}

                        {steps.length > 0 ? (
                          steps.slice(0, 60).map((step, idx) => (
                            <NavigationStepCard
                              key={idx}
                              step={step}
                              stepNumber={idx + 1}
                              isCurrentStep={isNavigating && idx === currentStepIndex}
                              isCompleted={isNavigating && idx < currentStepIndex}
                              isUpcoming={isNavigating && idx > currentStepIndex}
                              compact
                            />
                          ))
                        ) : (
                          <div className="text-sm text-white/60">
                            {isLoading
                              ? 'Fetching route…'
                              : origin
                                ? 'No steps available for this route.'
                                : 'Enable location to see turn-by-turn steps.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PageShell>
    </div>
  );
}
