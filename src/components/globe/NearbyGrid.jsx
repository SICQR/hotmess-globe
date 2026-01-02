import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, MapPin, Zap, Filter, Grid3x3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function NearbyGrid({ userLocation }) {
  const [distanceFilter, setDistanceFilter] = useState(10); // km
  const [showGrid, setShowGrid] = useState(true);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['recent-activities-nearby'],
    queryFn: () => base44.entities.UserActivity.filter({ visible: true }, '-created_date', 50),
    refetchInterval: 5000
  });

  const { data: rightNowStatuses = [] } = useQuery({
    queryKey: ['right-now-status-nearby'],
    queryFn: () => base44.entities.RightNowStatus.filter({ active: true }),
    refetchInterval: 5000
  });

  // Calculate distance between two points
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Limit results for performance
  const MAX_DISPLAYED_USERS = 50;

  // Get users with recent activity OR Right Now status
  const activeUsers = allUsers
    .filter(user => {
      const activity = recentActivities.find(a => a.user_email === user.email);
      const rightNowStatus = rightNowStatuses.find(s => 
        s.user_email === user.email && 
        s.active && 
        new Date(s.expires_at) > new Date()
      );
      
      // Show Right Now users even without recent activity
      if (rightNowStatus) return true;
      if (!activity) return false;
      
      // Check if within distance
      if (userLocation && activity.lat && activity.lng) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          activity.lat,
          activity.lng
        );
        return distance <= distanceFilter;
      }
      
      return true;
    })
    .map(user => {
      const activity = recentActivities.find(a => a.user_email === user.email);
      const rightNowStatus = rightNowStatuses.find(s => 
        s.user_email === user.email && 
        s.active && 
        new Date(s.expires_at) > new Date()
      );
      
      const distance = userLocation && activity?.lat && activity?.lng
        ? calculateDistance(userLocation.lat, userLocation.lng, activity.lat, activity.lng)
        : null;
      
      return {
        ...user,
        lastActivity: activity,
        rightNowStatus,
        distance,
        lastSeen: activity ? new Date(activity.created_date) : null
      };
    })
    .sort((a, b) => {
      // Prioritize Right Now users
      if (a.rightNowStatus && !b.rightNowStatus) return -1;
      if (!a.rightNowStatus && b.rightNowStatus) return 1;
      // Then sort by distance
      return (a.distance || Infinity) - (b.distance || Infinity);
    })
    .slice(0, MAX_DISPLAYED_USERS);

  const getTimeAgo = (date) => {
    if (!date) return 'Just now';
    const seconds = Math.floor((new Date() - date) / 1000);
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
        {activeUsers.length > 0 ? (
          <div className={showGrid 
            ? "grid grid-cols-2 gap-3" 
            : "space-y-3"
          }>
            {activeUsers.map((user, idx) => (
              <motion.div
                key={user.email}
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
                        alt={user.full_name}
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
                      {user.distance !== null && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-[10px] font-black uppercase">
                          {user.distance < 1 
                            ? `${Math.round(user.distance * 1000)}m`
                            : `${user.distance.toFixed(1)}km`
                          }
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-sm truncate group-hover:text-[#FF1493] transition-colors">
                          {user.full_name}
                        </h3>
                        <span className="text-[10px] text-white/40 font-mono whitespace-nowrap">
                          {getTimeAgo(user.lastSeen)}
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
                      {!user.rightNowStatus && user.lastActivity?.activity_type && (
                        <div className="text-[9px] text-white/40 font-mono uppercase">
                          {user.lastActivity.activity_type}
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