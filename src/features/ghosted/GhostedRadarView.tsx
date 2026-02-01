/**
 * GhostedRadarView - Radar-style visualization of nearby profiles
 * 
 * Shows profiles as blips on a pulsing radar, with distance
 * represented by position from center.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, MessageCircle, Navigation2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Profile } from '../profilesGrid/types';

interface GhostedRadarViewProps {
  profiles: Profile[];
  viewerLocation?: { lat: number; lng: number } | null;
  maxDistanceKm?: number;
  onSelectProfile?: (profile: Profile) => void;
  onMessageProfile?: (profile: Profile) => void;
  className?: string;
}

interface RadarBlip {
  profile: Profile;
  x: number;
  y: number;
  distance: number;
  angle: number;
}

function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
  
  return Math.atan2(y, x);
}

export default function GhostedRadarView({
  profiles,
  viewerLocation,
  maxDistanceKm = 5,
  onSelectProfile,
  onMessageProfile,
  className
}: GhostedRadarViewProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pulseKey, setPulseKey] = useState(0);

  // Trigger pulse animation periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseKey((k) => k + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Calculate radar blips from profiles
  const blips = useMemo<RadarBlip[]>(() => {
    if (!viewerLocation) return [];

    return profiles
      .filter((p) => p.geoLat && p.geoLng)
      .map((profile) => {
        const distance = calculateDistance(
          viewerLocation.lat,
          viewerLocation.lng,
          profile.geoLat!,
          profile.geoLng!
        );
        
        const angle = calculateBearing(
          viewerLocation.lat,
          viewerLocation.lng,
          profile.geoLat!,
          profile.geoLng!
        );

        // Convert distance to radar position (0-1 range)
        const normalizedDistance = Math.min(distance / maxDistanceKm, 1);
        
        // Convert polar to cartesian for positioning
        const x = Math.sin(angle) * normalizedDistance * 45; // 45% of container
        const y = -Math.cos(angle) * normalizedDistance * 45;

        return { profile, x, y, distance, angle };
      })
      .filter((b) => b.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);
  }, [profiles, viewerLocation, maxDistanceKm]);

  const handleBlipClick = (profile: Profile) => {
    setSelectedProfile(profile);
    onSelectProfile?.(profile);
  };

  if (!viewerLocation) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center p-8">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-pink-500/50" />
          <h3 className="text-xl font-black text-white mb-2">ENABLE LOCATION</h3>
          <p className="text-white/60">Turn on location to see the radar</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full flex items-center justify-center overflow-hidden', className)}>
      {/* Radar container */}
      <div className="relative w-[90vmin] h-[90vmin] max-w-[600px] max-h-[600px]">
        {/* Radar rings */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[0.25, 0.5, 0.75, 1].map((scale, idx) => (
            <div
              key={idx}
              className="absolute border border-pink-500/20 rounded-full"
              style={{
                width: `${scale * 100}%`,
                height: `${scale * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Radar sweep animation */}
        <motion.div
          key={pulseKey}
          className="absolute inset-0"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, ease: 'linear' }}
        >
          <div 
            className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
            style={{
              background: 'linear-gradient(90deg, rgba(236,72,153,0.5) 0%, transparent 100%)'
            }}
          />
        </motion.div>

        {/* Pulse effect */}
        <motion.div
          key={`pulse-${pulseKey}`}
          className="absolute inset-0 border-2 border-pink-500/50 rounded-full"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 0 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />

        {/* Center point (you) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-4 h-4 bg-pink-500 rounded-full" />
            <div className="absolute inset-0 w-4 h-4 bg-pink-500 rounded-full animate-ping opacity-50" />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-pink-500 uppercase whitespace-nowrap">
            You
          </div>
        </div>

        {/* Distance labels */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/40">
          {maxDistanceKm}km
        </div>
        <div className="absolute top-1/2 right-[27%] -translate-y-1/2 text-xs text-white/30">
          {(maxDistanceKm * 0.5).toFixed(1)}km
        </div>

        {/* Profile blips */}
        {blips.map((blip, idx) => (
          <motion.button
            key={blip.profile.id}
            type="button"
            className="absolute z-20"
            style={{
              top: `calc(50% + ${blip.y}%)`,
              left: `calc(50% + ${blip.x}%)`,
              transform: 'translate(-50%, -50%)'
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => handleBlipClick(blip.profile)}
          >
            <div className="relative group">
              {/* Blip dot */}
              <div 
                className={cn(
                  'w-10 h-10 rounded-full border-2 overflow-hidden transition-all',
                  blip.profile.rightNow 
                    ? 'border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]'
                    : blip.profile.onlineNow
                    ? 'border-cyan shadow-[0_0_8px_rgba(0,217,255,0.3)]'
                    : 'border-white/30 hover:border-pink-500'
                )}
              >
                <img
                  src={blip.profile.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(blip.profile.profileName || 'U')}&size=80&background=111111&color=ffffff`}
                  alt={blip.profile.profileName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Pulse for "Right Now" */}
              {blip.profile.rightNow && (
                <div className="absolute inset-0 w-10 h-10 border-2 border-green-500 rounded-full animate-ping opacity-50" />
              )}

              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-bold text-white">{blip.profile.profileName}</div>
                  <div className="text-xs text-white/60">
                    {blip.distance < 1 
                      ? `${Math.round(blip.distance * 1000)}m` 
                      : `${blip.distance.toFixed(1)}km`}
                    {' · '}
                    {Math.round((blip.distance / 5) * 60)}m walk
                  </div>
                </div>
              </div>
            </div>
          </motion.button>
        ))}

        {/* Empty state */}
        {blips.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8 bg-black/50 backdrop-blur-sm rounded-2xl">
              <div className="text-4xl mb-3">👻</div>
              <p className="text-white/60 text-sm">No one within {maxDistanceKm}km</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected profile card */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-0 inset-x-0 p-4 z-30"
          >
            <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-4 max-w-lg mx-auto">
              <div className="flex items-start gap-4">
                {/* Photo */}
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={selectedProfile.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfile.profileName || 'U')}&size=160&background=111111&color=ffffff`}
                    alt={selectedProfile.profileName}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black text-white truncate">
                      {selectedProfile.profileName}
                    </h3>
                    {selectedProfile.rightNow && (
                      <span className="px-2 py-0.5 bg-green-500 text-[10px] font-black text-white uppercase rounded-full">
                        Right Now
                      </span>
                    )}
                  </div>
                  {selectedProfile.title && (
                    <p className="text-sm text-white/70 truncate mb-1">{selectedProfile.title}</p>
                  )}
                  {selectedProfile.locationLabel && (
                    <p className="text-xs text-white/50">{selectedProfile.locationLabel}</p>
                  )}
                </div>

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setSelectedProfile(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    onMessageProfile?.(selectedProfile);
                    setSelectedProfile(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors"
                >
                  <MessageCircle className="w-5 h-5 text-white" />
                  <span className="font-bold text-white">Message</span>
                </button>

                {selectedProfile.geoLat && selectedProfile.geoLng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedProfile.geoLat},${selectedProfile.geoLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors"
                  >
                    <Navigation2 className="w-5 h-5 text-white" />
                    <span className="font-bold text-white">Directions</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute top-4 left-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span>Right Now</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <div className="w-3 h-3 bg-cyan rounded-full" />
          <span>Online</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <div className="w-3 h-3 bg-white/30 rounded-full" />
          <span>Recently active</span>
        </div>
      </div>
    </div>
  );
}
