import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { fetchNearbyCandidates } from '@/api/connectProximity';
import { Users, Zap, Filter, Grid3x3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function NearbyGrid({ userLocation }) {
  const [distanceFilter, setDistanceFilter] = useState(10); // km
  const [showGrid, setShowGrid] = useState(true);

  const haversineMeters = (a, b) => {
    if (!a || !b) return Infinity;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const { data: rightNowStatuses = [] } = useQuery({
    queryKey: ['right-now-status-nearby'],
    queryFn: () => base44.entities.RightNowStatus.filter({ active: true }),
    refetchInterval: 5000
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const tier = String(currentUser?.subscription_tier || currentUser?.membership_tier || 'FREE').toUpperCase();
  const isPaid = tier === 'PAID';

  const { data: nearbyResponse } = useQuery({
    queryKey: ['connect-nearby', userLocation?.lat, userLocation?.lng, distanceFilter],
    queryFn: () =>
      fetchNearbyCandidates({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radiusMeters: distanceFilter * 1000,
        limit: 50,
      }),
    enabled: !!currentUser && !!userLocation?.lat && !!userLocation?.lng,
    refetchInterval: 15000,
    retry: false,
  });

  // Limit results for performance
  const MAX_DISPLAYED_USERS = 50;

  const nearbyCandidates = Array.isArray(nearbyResponse?.candidates) ? nearbyResponse.candidates : [];

  const activeUsers = nearbyCandidates
    .map((candidate) => {
      const profile = candidate?.profile && typeof candidate.profile === 'object' ? candidate.profile : {};
      const user = {
        ...profile,
        // keep a stable ID for links/keys
        id: profile?.id || candidate.user_id,
        auth_user_id: profile?.auth_user_id || candidate.user_id,
        email: profile?.email,
      };

      if (!user?.email) return null;

      const rightNowStatus = rightNowStatuses.find(
        (s) => s.user_email === user.email && s.active && new Date(s.expires_at) > new Date()
      );

      const origin = userLocation?.lat && userLocation?.lng ? { lat: userLocation.lat, lng: userLocation.lng } : null;
      const candLat = Number(candidate?.last_lat);
      const candLng = Number(candidate?.last_lng);
      const dest = Number.isFinite(candLat) && Number.isFinite(candLng)
        ? { lat: candLat, lng: candLng }
        : null;
      const localDistanceMeters = origin && dest ? haversineMeters(origin, dest) : null;

      return {
        ...user,
        rightNowStatus,
        // Per spec: straight-line distance is computed locally for FREE tier.
        distanceMeters: Number.isFinite(localDistanceMeters) ? localDistanceMeters : candidate.distance_meters,
        etaSeconds: candidate.eta_seconds,
        etaMode: candidate.eta_mode,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.rightNowStatus && !b.rightNowStatus) return -1;
      if (!a.rightNowStatus && b.rightNowStatus) return 1;

      if (isPaid) {
        const aEta = Number.isFinite(a.etaSeconds) ? a.etaSeconds : Number.POSITIVE_INFINITY;
        const bEta = Number.isFinite(b.etaSeconds) ? b.etaSeconds : Number.POSITIVE_INFINITY;
        if (aEta !== bEta) return aEta - bEta;
      }

      const aDist = Number.isFinite(a.distanceMeters) ? a.distanceMeters : Number.POSITIVE_INFINITY;
      const bDist = Number.isFinite(b.distanceMeters) ? b.distanceMeters : Number.POSITIVE_INFINITY;
      return aDist - bDist;
    })
    .slice(0, MAX_DISPLAYED_USERS);

  const getTimeAgo = (date) => {
    if (!date) return 'Just now';
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return 'Just now';
    const seconds = Math.floor((new Date() - parsed) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="p-4 border-b-2 border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-[#FF1493]" />
            <h2 className="text-lg font-black uppercase">NEARBY</h2>
          </div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="px-3 py-1 bg-[#FF1493] text-black text-xs font-black uppercase border-2 border-white"
          >
            {showGrid ? 'LIST' : 'GRID'}
          </button>
        </div>

        {/* Distance Filter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3" />
              <span className="font-mono uppercase">Within {distanceFilter}km</span>
            </div>
            <span className="text-[#FF1493] font-bold">
              {activeUsers.length} online
              {activeUsers.length >= MAX_DISPLAYED_USERS && '+'}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={distanceFilter}
            onChange={(e) => setDistanceFilter(parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF1493]"
          />
        </div>
      </div>

      {/* Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {!currentUser ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <Users className="w-12 h-12 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm uppercase tracking-wider">Login required</p>
              <p className="text-white/20 text-xs mt-2">Sign in to see nearby people</p>
            </div>
          </div>
        ) : !userLocation?.lat || !userLocation?.lng ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <Users className="w-12 h-12 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm uppercase tracking-wider">Location needed</p>
              <p className="text-white/20 text-xs mt-2">Allow location access to find people nearby</p>
            </div>
          </div>
        ) : activeUsers.length > 0 ? (
          <div className={showGrid 
            ? "grid grid-cols-2 gap-3" 
            : "space-y-3"
          }>
            {activeUsers.map((user, idx) => (
              <motion.div
                key={user.email || user.auth_user_id || idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Link to={createPageUrl(`Profile?email=${user.email}`)}>
                  <div className="bg-black border-2 border-white hover:border-[#FF1493] transition-all group overflow-hidden">
                    {/* Profile Image */}
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&size=400&background=FF1493&color=000`}
                        alt={user.full_name || user.email}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                      
                      {/* Online Indicator */}
                      <div className="absolute top-2 right-2">
                        <div className={`w-3 h-3 rounded-full border-2 border-white animate-pulse ${
                          user.rightNowStatus ? 'bg-[#FF1493]' : 'bg-[#00D9FF]'
                        }`} />
                      </div>
                      
                      {/* Right Now Badge */}
                      {user.rightNowStatus && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-[#FF1493] text-black text-[9px] font-black uppercase flex items-center gap-1 border-2 border-white">
                          <Zap className="w-2.5 h-2.5" />
                          RIGHT NOW
                        </div>
                      )}

                      {/* Distance Badge */}
                      {(Number.isFinite(user.etaSeconds) || Number.isFinite(user.distanceMeters)) && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black uppercase">
                          {isPaid && Number.isFinite(user.etaSeconds)
                            ? `${Math.max(1, Math.round(user.etaSeconds / 60))}m ${String(user.etaMode || '').toLowerCase()}`
                            : user.distanceMeters < 1000
                              ? `${Math.round(user.distanceMeters)}m`
                              : `${(user.distanceMeters / 1000).toFixed(1)}km`}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-sm truncate group-hover:text-[#FF1493] transition-colors">
                          {user.full_name || user.email}
                        </h3>
                        <span className="text-[10px] text-white/40 font-mono whitespace-nowrap">
                          {getTimeAgo(user.updated_date || user.updated_at)}
                        </span>
                      </div>

                      {user.bio && (
                        <p className="text-[10px] text-white/60 line-clamp-2">
                          {user.bio}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-[#FFEB3B]" />
                          <span className="text-white/80 font-mono">{user.xp || 0}</span>
                        </div>
                        {user.preferred_vibes && user.preferred_vibes[0] && (
                          <span className="px-1.5 py-0.5 bg-[#FF1493]/20 border border-[#FF1493] text-[#FF1493] uppercase font-bold">
                            {user.preferred_vibes[0]}
                          </span>
                        )}
                      </div>

                      {/* Right Now Logistics */}
                      {user.rightNowStatus?.logistics && user.rightNowStatus.logistics.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {user.rightNowStatus.logistics.map(log => (
                            <span key={log} className="text-[9px] px-1.5 py-0.5 bg-[#FF1493]/20 border border-[#FF1493]/40 text-[#FF1493] uppercase font-mono">
                              {log.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Activity Status */}
                      {!user.rightNowStatus && (
                        <div className="text-[9px] text-white/40 font-mono uppercase">
                          {user.availability_status || 'nearby'}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <Users className="w-12 h-12 mx-auto mb-3 text-white/20" />
              <p className="text-white/40 text-sm uppercase tracking-wider">No one nearby</p>
              <p className="text-white/20 text-xs mt-2">Increase the distance radius</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}