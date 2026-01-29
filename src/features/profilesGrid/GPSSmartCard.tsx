/**
 * GPS Smart Card
 * 
 * Enhanced profile card with location-aware features:
 * - Distance display
 * - Google Maps integration
 * - Uber deep link
 * - Walking directions
 * - Venue context (if at a venue)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation2, 
  Car, 
  Footprints,
  Clock,
  X,
  ExternalLink,
  ChevronUp
} from 'lucide-react';

interface GPSSmartCardProps {
  profile: {
    id: string;
    display_name: string;
    photo_url?: string;
    latitude?: number;
    longitude?: number;
    location_name?: string;
    distance_km?: number;
    venue_name?: string;
    last_active?: string;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  onClose?: () => void;
  className?: string;
}

export default function GPSSmartCard({
  profile,
  userLocation,
  onClose,
  className = ''
}: GPSSmartCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Calculate distance if not provided
  const distance = useMemo(() => {
    if (profile.distance_km) return profile.distance_km;
    if (!profile.latitude || !profile.longitude || !userLocation) return null;

    const R = 6371; // Earth's radius in km
    const dLat = toRad(profile.latitude - userLocation.latitude);
    const dLon = toRad(profile.longitude - userLocation.longitude);
    const lat1 = toRad(userLocation.latitude);
    const lat2 = toRad(profile.latitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }, [profile, userLocation]);

  // Estimate walking time (avg 5km/h)
  const walkingTime = distance ? Math.round((distance / 5) * 60) : null;
  
  // Estimate driving time (avg 30km/h in city)
  const drivingTime = distance ? Math.round((distance / 30) * 60) : null;

  // Format distance
  const formatDistance = (km: number | null) => {
    if (!km) return 'Unknown';
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  // Generate maps URL
  const getMapsUrl = () => {
    if (!profile.latitude || !profile.longitude) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${profile.latitude},${profile.longitude}`;
  };

  // Generate Uber deep link
  const getUberUrl = () => {
    if (!profile.latitude || !profile.longitude) return null;
    const pickup = userLocation 
      ? `pickup[latitude]=${userLocation.latitude}&pickup[longitude]=${userLocation.longitude}` 
      : '';
    return `https://m.uber.com/ul/?action=setPickup&${pickup}&dropoff[latitude]=${profile.latitude}&dropoff[longitude]=${profile.longitude}&dropoff[nickname]=${encodeURIComponent(profile.display_name || 'Destination')}`;
  };

  // Get time since active
  const getActiveBadge = () => {
    if (!profile.last_active) return null;
    
    const now = new Date();
    const active = new Date(profile.last_active);
    const diffMinutes = Math.floor((now.getTime() - active.getTime()) / (1000 * 60));
    
    if (diffMinutes < 5) return { text: 'Online now', color: '#39FF14' };
    if (diffMinutes < 30) return { text: `${diffMinutes}m ago`, color: '#FFEB3B' };
    if (diffMinutes < 60) return { text: `${diffMinutes}m ago`, color: '#FFB800' };
    return null;
  };

  const activeBadge = getActiveBadge();
  const mapsUrl = getMapsUrl();
  const uberUrl = getUberUrl();

  return (
    <motion.div
      className={`
        bg-black/95 backdrop-blur-lg border border-white/20
        overflow-hidden ${className}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      {/* Compact view */}
      <div 
        className="p-3 flex items-center gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Distance badge */}
        <div className="flex flex-col items-center justify-center min-w-[60px]">
          <MapPin className="w-4 h-4 text-[#FF1493] mb-1" />
          <span className="text-lg font-black text-white">
            {formatDistance(distance)}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-white/20" />

        {/* User info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{profile.display_name}</span>
            {activeBadge && (
              <span 
                className="px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: `${activeBadge.color}20`, color: activeBadge.color }}
              >
                {activeBadge.text}
              </span>
            )}
          </div>
          {profile.venue_name && (
            <p className="text-xs text-white/60">@ {profile.venue_name}</p>
          )}
          {profile.location_name && !profile.venue_name && (
            <p className="text-xs text-white/60">{profile.location_name}</p>
          )}
        </div>

        {/* Expand indicator */}
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="w-5 h-5 text-white/40" />
        </motion.div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>

      {/* Expanded view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            {/* Time estimates */}
            <div className="p-3 grid grid-cols-2 gap-3">
              {/* Walking */}
              {walkingTime && walkingTime <= 60 && (
                <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10">
                  <Footprints className="w-4 h-4 text-[#00D9FF]" />
                  <div>
                    <p className="text-xs text-white/60">Walk</p>
                    <p className="font-bold text-white">{walkingTime} min</p>
                  </div>
                </div>
              )}

              {/* Driving */}
              {drivingTime && (
                <div className="flex items-center gap-2 p-2 bg-white/5 border border-white/10">
                  <Car className="w-4 h-4 text-[#FFB800]" />
                  <div>
                    <p className="text-xs text-white/60">Drive</p>
                    <p className="font-bold text-white">{drivingTime} min</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="p-3 pt-0 flex gap-2">
              {/* Google Maps */}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-[#4285F4] hover:bg-[#4285F4]/80 transition-colors"
                >
                  <Navigation2 className="w-4 h-4 text-white" />
                  <span className="font-bold text-white text-sm">Directions</span>
                </a>
              )}

              {/* Uber */}
              {uberUrl && (
                <a
                  href={uberUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-black hover:bg-white/10 border border-white/20 transition-colors"
                >
                  <Car className="w-4 h-4 text-white" />
                  <span className="font-bold text-white text-sm">Uber</span>
                </a>
              )}
            </div>

            {/* Venue info if applicable */}
            {profile.venue_name && (
              <div className="p-3 pt-0">
                <div className="p-3 bg-[#FF1493]/10 border border-[#FF1493]/30">
                  <p className="text-xs text-[#FF1493] uppercase font-bold mb-1">At a venue</p>
                  <p className="text-sm text-white">{profile.venue_name}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
