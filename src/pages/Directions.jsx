import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Navigation, Pause } from 'lucide-react';
import { toast } from 'sonner';
import PageShell from '@/components/shell/PageShell';

import { fetchRoutingDirections } from '@/api/connectProximity';
import { safeGetViewerLatLng } from '@/utils/geolocation';
import { decodeGooglePolyline } from '@/utils/googlePolyline';
import { buildUberDeepLink } from '@/utils/uberDeepLink';

// Fix for default marker icons in Leaflet (same approach as EventsMapView)
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
  if (v === 'uber') return 'uber';
  return 'foot';
};

const apiModeFor = (uiMode) => {
  if (uiMode === 'foot') return 'WALK';
  if (uiMode === 'bike') return 'BICYCLE';
  return 'DRIVE'; // cab
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

    // Keep this gentle: don't fight the user's pan/zoom too aggressively.
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

export default function Directions() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const destLat = Number(searchParams.get('lat'));
  const destLng = Number(searchParams.get('lng'));
  const label = String(searchParams.get('label') || '').trim();
  const initialMode = normalizeModeParam(searchParams.get('mode'));
  const debug = String(searchParams.get('debug') || '').trim() === '1';

  const [mode, setMode] = useState(initialMode);
  const [origin, setOrigin] = useState(null);
  const [originError, setOriginError] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

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
    // Stop navigation when switching to Uber.
    if (mode === 'uber') setIsNavigating(false);
  }, [mode]);

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

    // Start watching only when explicitly navigating.
    const onPos = (pos) => {
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      // Throttle updates to reduce CoreLocation noise + rerenders.
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
      // Stop retrying if permission is denied.
      if (err?.code === 1) {
        setOriginError('Location permission denied.');
        setIsNavigating(false);
      }
    };

    const id = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5000,
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

  const { data: directions, isLoading, error } = useQuery({
    queryKey: ['routing-directions', mode, origin?.lat, origin?.lng, destination?.lat, destination?.lng],
    queryFn: () => fetchRoutingDirections({ origin, destination, mode: apiModeFor(mode), ttlSeconds: 90 }),
    enabled: canFetch,
    retry: false,
    staleTime: 60000,
  });

  const directionsErrorMessage = useMemo(() => {
    if (!error) return null;
    const status = error?.status;
    if (status === 401 || status === 403) return 'Sign in to load turn-by-turn directions.';
    const msg = String(error?.message || '').trim();
    return msg || 'Failed to load directions.';
  }, [error]);

  const debugInfo = useMemo(() => {
    if (!debug) return null;

    const status = error?.status ?? null;
    const payload = error?.payload ?? null;

    return {
      mode,
      api_mode: mode === 'uber' ? null : apiModeFor(mode),
      canFetch,
      isLoading,
      isNavigating,
      origin,
      destination,
      error: error
        ? {
            status,
            message: String(error?.message || ''),
            payload,
          }
        : null,
      directions: directions
        ? {
            provider: directions?.provider || null,
            duration_seconds: directions?.duration_seconds ?? null,
            distance_meters: directions?.distance_meters ?? null,
            steps_count: Array.isArray(directions?.steps) ? directions.steps.length : 0,
            has_encoded_polyline: !!directions?.polyline?.encoded,
          }
        : null,
    };
  }, [canFetch, debug, destination, directions, error, isLoading, isNavigating, mode, origin]);

  const debugDetails = useMemo(() => {
    if (!error) return null;
    const status = error?.status;
    const payload = error?.payload;
    const message = String(error?.message || '').trim() || null;

    return {
      status: Number.isFinite(status) ? status : null,
      message,
      payload: payload ?? null,
      mode,
      apiMode: apiModeFor(mode),
      origin,
      destination,
    };
  }, [destination, error, mode, origin]);

  const steps = Array.isArray(directions?.steps) ? directions.steps : [];

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

  const remainingMeters = useMemo(() => {
    if (!origin || !destination) return null;
    if (!polylinePoints.length) return haversineMeters(origin, destination);

    // Find the nearest polyline point to the user's current fix.
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

    // Sum remaining distance along the polyline.
    let sum = 0;
    for (let i = bestIdx; i < polylinePoints.length - 1; i += 1) {
      const a = { lat: polylinePoints[i][0], lng: polylinePoints[i][1] };
      const b = { lat: polylinePoints[i + 1][0], lng: polylinePoints[i + 1][1] };
      const d = haversineMeters(a, b);
      if (d) sum += d;
    }
    return Math.max(0, Math.round(sum));
  }, [destination, origin, polylinePoints]);

  const remainingLabel = useMemo(() => {
    if (!Number.isFinite(remainingMeters)) return null;
    if (remainingMeters < 1200) return `${remainingMeters} m`; 
    return `${(remainingMeters / 1000).toFixed(1)} km`;
  }, [remainingMeters]);

  const mapCenter = useMemo(() => {
    if (destination) return [destination.lat, destination.lng];
    return [51.5074, -0.1278]; // London fallback
  }, [destination]);

  const etaLabel = minutesLabel(directions?.duration_seconds);

  const originIcon = useMemo(
    () => makePinIcon({ label: 'YOU', color: '#00D9FF', glow: 'rgba(0,217,255,0.75)' }),
    []
  );
  const destinationIcon = useMemo(
    () => makePinIcon({ label: 'GO', color: '#FF1493', glow: 'rgba(255,20,147,0.75)' }),
    []
  );

  const uberUrl = useMemo(() => {
    if (!destination) return null;
    return buildUberDeepLink({ dropoffLat: destination.lat, dropoffLng: destination.lng, dropoffNickname: label || 'Destination' });
  }, [destination, label]);

  const title = label ? `Directions to ${label}` : 'Directions';

  const subtitle =
    mode === 'uber'
      ? 'Request a ride (opens Uber).'
      : `${etaLabel ? `${etaLabel} • ` : ''}${remainingLabel ? `${remainingLabel} left • ` : ''}${isNavigating ? 'Live' : 'In-app'}`;

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

        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="foot">Foot</TabsTrigger>
            <TabsTrigger value="bike">Bike</TabsTrigger>
            <TabsTrigger value="cab">Cab</TabsTrigger>
            <TabsTrigger value="uber">Uber</TabsTrigger>
          </TabsList>

          <TabsContent value={mode} className="mt-4 space-y-4">
            {debugInfo && (
              <div className="border border-white/10 bg-black/60 p-3 text-xs text-white/70">
                <div className="font-mono whitespace-pre-wrap break-words">{JSON.stringify(debugInfo, null, 2)}</div>
              </div>
            )}

            {originError && mode !== 'uber' && (
              <div className="border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                {originError}
              </div>
            )}

            {debugDetails && mode !== 'uber' && (
              <details className="border border-white/10 bg-black/40">
                <summary className="cursor-pointer select-none p-3 text-xs font-black uppercase tracking-wider text-white/70">
                  Debug details
                </summary>
                <div className="p-3 pt-0">
                  <pre className="text-[11px] leading-relaxed text-white/70 overflow-auto max-h-[240px] whitespace-pre-wrap break-words">
                    {JSON.stringify(debugDetails, null, 2)}
                  </pre>
                </div>
              </details>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 overflow-hidden border border-white/10 bg-white/5">
                <div className="h-[420px]">
                  <MapContainer
                    center={mapCenter}
                    zoom={14}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />

                    <FollowUser isNavigating={isNavigating && mode !== 'uber'} origin={origin} />

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
                          pathOptions={{ color: '#FF1493', weight: 7, opacity: 0.95 }}
                        />
                      </>
                    )}
                  </MapContainer>
                </div>
              </div>

              <div className="lg:col-span-2 border border-white/10 bg-white/5">
                <div className="p-4 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-black uppercase tracking-wider">{mode === 'foot' ? 'Foot' : mode === 'bike' ? 'Bike' : mode === 'cab' ? 'Cab' : 'Uber'}</div>
                    <div className="text-white/60">{mode === 'uber' ? 'Leaves app' : 'Stays in app'}</div>
                  </div>

                  {mode === 'uber' ? (
                    <Button
                      type="button"
                      variant="hot"
                      className="font-black"
                      onClick={() => {
                        if (!uberUrl) return;
                        window.open(uberUrl, '_blank', 'noopener,noreferrer');
                      }}
                      disabled={!uberUrl}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Request Uber
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="cyan"
                      className="font-black"
                      onClick={() => {
                        if (isLoading) return;
                        if (directionsErrorMessage) {
                          toast.error(directionsErrorMessage);
                        }

                        // Navigation is a location-follow mode; it should work even if
                        // turn-by-turn directions fail (we can still show a straight line).
                        setIsNavigating((v) => !v);
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
                  )}
                </div>

                {mode !== 'uber' && (
                  <div className="px-4 pb-4">
                    {directionsErrorMessage ? (
                      <div className="text-sm text-red-300">{directionsErrorMessage}</div>
                    ) : steps.length ? (
                      <ol className="space-y-2 text-sm">
                        {steps.slice(0, 60).map((s, idx) => (
                          <li key={idx} className="border border-white/10 bg-black/30 p-2">
                            <div className="font-medium">{s.instruction || 'Continue'}</div>
                            <div className="text-white/60">
                              {Number.isFinite(s.distance_meters) ? `${Math.round(s.distance_meters)}m` : null}
                              {Number.isFinite(s.duration_seconds)
                                ? `${Number.isFinite(s.distance_meters) ? ' • ' : ''}${minutesLabel(s.duration_seconds)}`
                                : null}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="text-sm text-white/60">
                        {isLoading ? 'Fetching route…' : origin ? 'No steps available for this route.' : 'Enable location to see turn-by-turn steps.'}
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
