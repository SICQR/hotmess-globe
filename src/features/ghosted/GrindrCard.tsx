/**
 * GrindrCard - Tight, photo-first profile card
 * 
 * Design:
 * - Full bleed photo
 * - Minimal overlay: name, age, distance
 * - Green dot for online
 * - Tap = open bottom sheet
 * - Press state with scale
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GrindrProfile {
  id: string;
  profileName?: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  age?: number;
  photoUrl?: string;
  avatar_url?: string;
  photos?: Array<{ url: string } | string>;
  onlineNow?: boolean;
  lastSeen?: string;
  distanceMeters?: number;
  travelTimeMinutes?: number;
  travelMode?: 'walk' | 'drive' | 'bike' | 'transit';
  rightNow?: boolean;
  geoLat?: number;
  geoLng?: number;
}

interface GrindrCardProps {
  profile: GrindrProfile;
  onTap: (profile: GrindrProfile) => void;
  index?: number;
  size?: 'small' | 'medium' | 'large';
}

// Get photo URL
function getPhotoUrl(profile: GrindrProfile): string {
  if (profile.photoUrl) return profile.photoUrl;
  if (profile.avatar_url) return profile.avatar_url;
  if (profile.photos?.length) {
    const first = profile.photos[0];
    return typeof first === 'string' ? first : first?.url || '';
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.profileName || 'U')}&size=400&background=111&color=fff`;
}

// Get display name
function getDisplayName(profile: GrindrProfile): string {
  return profile.display_name || profile.profileName || profile.full_name || profile.username || 'Anonymous';
}

// Format distance
function formatDistance(meters?: number): string | null {
  if (!meters && meters !== 0) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Format travel time
function formatTravelTime(minutes?: number, mode?: string): string | null {
  if (!minutes && minutes !== 0) return null;
  const icon = mode === 'drive' ? '🚗' : mode === 'bike' ? '🚴' : '🚶';
  return `${icon} ${minutes}m`;
}

export function GrindrCard({ profile, onTap, index = 0, size = 'medium' }: GrindrCardProps) {
  const photoUrl = useMemo(() => getPhotoUrl(profile), [profile]);
  const name = useMemo(() => getDisplayName(profile), [profile]);
  const distance = useMemo(() => formatDistance(profile.distanceMeters), [profile.distanceMeters]);
  const travelTime = useMemo(() => formatTravelTime(profile.travelTimeMinutes, profile.travelMode), [profile.travelTimeMinutes, profile.travelMode]);

  const sizeClasses = {
    small: 'aspect-square',
    medium: 'aspect-[3/4]',
    large: 'aspect-[2/3]',
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onTap(profile)}
      className={cn(
        'relative w-full overflow-hidden rounded-lg bg-zinc-900',
        'focus:outline-none focus:ring-2 focus:ring-[#FF1493] focus:ring-offset-2 focus:ring-offset-black',
        sizeClasses[size]
      )}
    >
      {/* Photo */}
      <img
        src={photoUrl}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Online indicator */}
      {profile.onlineNow && (
        <div className="absolute top-2 right-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39FF14]" />
          </span>
        </div>
      )}

      {/* Right Now indicator */}
      {profile.rightNow && !profile.onlineNow && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#FF1493] rounded text-[8px] font-black uppercase">
          NOW
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <div className="flex items-end justify-between">
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">
              {name}
              {profile.age && <span className="text-white/60 font-normal ml-1">{profile.age}</span>}
            </p>
          </div>
          
          {/* Distance or travel time */}
          {(travelTime || distance) && (
            <span className="text-[10px] text-white/80 font-bold whitespace-nowrap ml-2">
              {travelTime || distance}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// Grid component
interface GrindrGridProps {
  profiles: GrindrProfile[];
  onTap: (profile: GrindrProfile) => void;
  columns?: 3 | 4;
  loading?: boolean;
}

export function GrindrGrid({ profiles, onTap, columns = 3, loading = false }: GrindrGridProps) {
  if (loading) {
    return (
      <div className={cn('grid gap-1', columns === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-zinc-900 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40">
        <p>No one nearby</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-1', columns === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
      {profiles.map((profile, index) => (
        <GrindrCard
          key={profile.id}
          profile={profile}
          onTap={onTap}
          index={index}
          size="medium"
        />
      ))}
    </div>
  );
}

export default GrindrCard;
