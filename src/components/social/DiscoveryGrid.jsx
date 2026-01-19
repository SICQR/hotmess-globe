import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Users, Filter, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FiltersDrawer from '@/components/discovery/FiltersDrawer';
import { fetchNearbyCandidates } from '@/api/connectProximity';
import useLiveViewerLocation, { bucketLatLng } from '@/hooks/useLiveViewerLocation';
import useRealtimeNearbyInvalidation from '@/hooks/useRealtimeNearbyInvalidation';

const formatDistanceMeters = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`;
  const km = distanceMeters / 1000;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
};

const formatEta = (etaSeconds) => {
  if (!Number.isFinite(etaSeconds) || etaSeconds <= 0) return null;
  const minutes = Math.round(etaSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
};

export default function DiscoveryGrid({ currentUser }) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const laneId = 'connect'; // Default lane for discovery

  const hasCurrentUser = !!currentUser;
  const hasGpsConsent = !!currentUser?.has_consented_gps;

  const { location: liveLocation } = useLiveViewerLocation({
    enabled: !!currentUser?.email && hasGpsConsent,
    enableHighAccuracy: false,
    timeoutMs: 10_000,
    maximumAgeMs: 15_000,
    minUpdateMs: 10_000,
    minDistanceM: 25,
  });

  const locationBucket = useMemo(() => bucketLatLng(liveLocation, 3), [liveLocation]);

  useRealtimeNearbyInvalidation({
    enabled: !!currentUser?.email && hasGpsConsent && !!locationBucket,
    queryKeys: [['social-discover-nearby', currentUser?.email, locationBucket?.lat, locationBucket?.lng]],
    minInvalidateMs: 5000,
  });

  const { data: nearbyPayload } = useQuery({
    queryKey: ['social-discover-nearby', currentUser?.email, locationBucket?.lat, locationBucket?.lng],
    queryFn: async () => {
      if (!hasGpsConsent) return { candidates: [], _meta: { status: 'gps_consent_off' } };
      if (!locationBucket) return { candidates: [], _meta: { status: 'geolocation_pending' } };

      try {

        const payload = await fetchNearbyCandidates({
          lat: locationBucket.lat,
          lng: locationBucket.lng,
          radiusMeters: 10_000,
          limit: 80,
          approximate: true,
        });

        if (!payload || typeof payload !== 'object') {
          return { candidates: [], _meta: { status: 'nearby_unavailable' } };
        }

        return { ...payload, _meta: { status: 'ok' } };
      } catch {
        return { candidates: [], _meta: { status: 'nearby_unavailable' } };
      }
    },
    enabled: !!currentUser?.email,
    staleTime: 10_000,
    cacheTime: 60_000,
    refetchInterval: hasGpsConsent && locationBucket ? 30_000 : false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const nearbyByEmail = useMemo(() => {
    const map = new Map();
    const candidates = Array.isArray(nearbyPayload?.candidates) ? nearbyPayload.candidates : [];

    for (const candidate of candidates) {
      const email = candidate?.profile?.email;
      if (!email) continue;

      map.set(String(email).toLowerCase(), {
        distanceMeters: Number.isFinite(candidate?.distance_meters) ? candidate.distance_meters : null,
        etaSeconds: Number.isFinite(candidate?.eta_seconds) ? candidate.eta_seconds : null,
        etaMode: candidate?.eta_mode ?? null,
      });
    }

    return map;
  }, [nearbyPayload]);

  const proximityStatus = nearbyPayload?._meta?.status || (hasGpsConsent ? 'idle' : 'gps_consent_off');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['discover-users', filters],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list('-created_date', 200);
      // Filter out current user
      return allUsers.filter(u => u.email !== currentUser?.email);
    },
    enabled: hasCurrentUser,
  });

  const enrichedUsers = useMemo(() => {
    const base = Array.isArray(users) ? users : [];
    const enriched = base.map((u) => {
      const emailKey = String(u?.email || '').toLowerCase();
      const proximity = emailKey ? nearbyByEmail.get(emailKey) : null;
      return {
        ...u,
        distanceMeters: proximity?.distanceMeters ?? null,
        etaSeconds: proximity?.etaSeconds ?? null,
        etaMode: proximity?.etaMode ?? null,
      };
    });

    // If GPS is enabled and we have proximity data, prioritize truly nearby profiles.
    if (proximityStatus === 'ok') {
      const sortable = enriched.slice();
      sortable.sort((a, b) => {
        const aEta = Number.isFinite(a?.etaSeconds) ? a.etaSeconds : Number.POSITIVE_INFINITY;
        const bEta = Number.isFinite(b?.etaSeconds) ? b.etaSeconds : Number.POSITIVE_INFINITY;
        if (aEta !== bEta) return aEta - bEta;

        const aDist = Number.isFinite(a?.distanceMeters) ? a.distanceMeters : Number.POSITIVE_INFINITY;
        const bDist = Number.isFinite(b?.distanceMeters) ? b.distanceMeters : Number.POSITIVE_INFINITY;
        if (aDist !== bDist) return aDist - bDist;

        return 0;
      });

      // Prefer candidates that actually have proximity computed.
      const nearbyFirst = sortable.filter(
        (u) => Number.isFinite(u?.etaSeconds) || Number.isFinite(u?.distanceMeters)
      );

      if (nearbyFirst.length) return nearbyFirst.slice(0, 20);
      return sortable.slice(0, 20);
    }

    return enriched.slice(0, 20);
  }, [nearbyByEmail, proximityStatus, users]);

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto mb-4 text-white/40" />
        <h3 className="text-2xl font-black mb-2">SIGN IN TO DISCOVER</h3>
        <p className="text-white/60 mb-6">Create an account to browse profiles and message.</p>
        <Link to={`/auth?next=${encodeURIComponent('/social')}`}>
          <Button className="bg-[#FF1493] hover:bg-white text-black font-black uppercase">
            SIGN IN
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white/5 aspect-[3/4] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-white/60 uppercase tracking-wider">
          {enrichedUsers.length} {enrichedUsers.length === 1 ? 'person' : 'people'}
          {hasGpsConsent ? ' nearby' : ''}
        </p>
        {!hasGpsConsent ? (
          <div className="flex items-center gap-3">
            <p className="text-xs text-white/40 uppercase tracking-wider">
              Location is off (sorting disabled)
            </p>
            <Link to={createPageUrl('AccountConsents')}>
              <Button
                variant="outline"
                className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
              >
                ENABLE LOCATION
              </Button>
            </Link>
          </div>
        ) : null}
        <Button
          onClick={() => setShowFilters(true)}
          variant="outline"
          className="border-2 border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
        >
          <Filter className="w-4 h-4 mr-2" />
          FILTERS
        </Button>
      </div>

      {enrichedUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h3 className="text-2xl font-black mb-2">NO ONE NEARBY</h3>
          <p className="text-white/60 mb-6">Try adjusting your filters</p>
          <Button 
            onClick={() => setShowFilters(true)}
            className="bg-[#FF1493] hover:bg-white text-black font-black uppercase"
          >
            ADJUST FILTERS
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {enrichedUsers.map((user) => (
            (() => {
              const uid = user?.auth_user_id || user?.authUserId;
              const email = user?.email;
              const to = uid
                ? `/social/u/${encodeURIComponent(uid)}`
                : createPageUrl(`Profile?email=${encodeURIComponent(email || '')}`);

              const distanceLabel = formatDistanceMeters(user?.distanceMeters);
              const etaLabel = formatEta(user?.etaSeconds);
              const etaMode = user?.etaMode ? String(user.etaMode).toLowerCase() : null;

              return (
            <Link 
              key={user.id}
              to={to}
              className="group"
            >
              <div className="bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-[#FF1493] transition-all aspect-[3/4] relative overflow-hidden">
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.full_name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                    <span className="text-4xl font-black">
                      {user.full_name?.[0] || user.email[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="font-black uppercase text-sm mb-1 truncate">
                    {user.full_name || 'Anonymous'}
                  </p>
                  {user.city && (
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      <MapPin className="w-3 h-3" />
                      <span>
                        {user.city}
                        {(proximityStatus === 'ok' || hasGpsConsent) && (etaLabel || distanceLabel) && (
                          <span className="text-white/60">
                            {' '}• {etaLabel ? `~${etaLabel}` : distanceLabel}
                            {etaLabel && etaMode ? ` ${etaMode}` : ''}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
              );
            })()
          ))}
        </div>
      )}

      {showFilters && (
        <FiltersDrawer
          open={showFilters}
          onClose={() => setShowFilters(false)}
          laneId={laneId}
          onApply={setFilters}
          initialValues={filters}
        />
      )}
    </>
  );
}