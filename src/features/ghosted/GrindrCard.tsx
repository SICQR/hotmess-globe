/**
 * GrindrCard - Rich, photo-first profile card
 * 
 * Features:
 * - Full bleed photo with gradient
 * - Online/Now indicators with animations
 * - Verified badge
 * - Profile type badge (creator, seller, etc)
 * - Distance/travel time
 * - Match percentage indicator
 * - Hover states with subtle lift
 */

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, Star, Sparkles, Crown, Zap } from 'lucide-react';

export interface GrindrProfile {
  id: string;
  profileName?: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  email?: string;
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
  // Extended fields
  verified?: boolean;
  profileType?: 'standard' | 'creator' | 'seller' | 'host' | 'dj';
  matchProbability?: number;
  bio?: string;
  title?: string;
  locationLabel?: string;
  membership?: 'free' | 'plus' | 'chrome';
}

interface GrindrCardProps {
  profile: GrindrProfile;
  onTap: (profile: GrindrProfile) => void;
  index?: number;
  size?: 'small' | 'medium' | 'large';
  showMatchBadge?: boolean;
}

// Get photo URL
function getPhotoUrl(profile: GrindrProfile): string {
  if (profile.photoUrl) return profile.photoUrl;
  if (profile.avatar_url) return profile.avatar_url;
  if (profile.photos?.length) {
    const first = profile.photos[0];
    return typeof first === 'string' ? first : first?.url || '';
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.profileName || 'U')}&size=400&background=1a1a1a&color=fff&bold=true`;
}

// Get display name
function getDisplayName(profile: GrindrProfile): string {
  return profile.display_name || profile.profileName || profile.full_name || profile.username || 'Anonymous';
}

// Format distance
function formatDistance(meters?: number): string | null {
  if (!meters && meters !== 0) return null;
  if (meters < 100) return 'Here';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Profile type badge config
const profileTypeBadges: Record<string, { icon: any; color: string; label: string }> = {
  creator: { icon: Star, color: '#FFD700', label: 'Creator' },
  seller: { icon: Sparkles, color: '#FF6B35', label: 'Seller' },
  host: { icon: Crown, color: '#B026FF', label: 'Host' },
  dj: { icon: Zap, color: '#00D9FF', label: 'DJ' },
};

export function GrindrCard({ profile, onTap, index = 0, size = 'medium', showMatchBadge = true }: GrindrCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const photoUrl = useMemo(() => getPhotoUrl(profile), [profile]);
  const name = useMemo(() => getDisplayName(profile), [profile]);
  const distance = useMemo(() => formatDistance(profile.distanceMeters), [profile.distanceMeters]);
  
  const typeBadge = profile.profileType && profile.profileType !== 'standard' 
    ? profileTypeBadges[profile.profileType] 
    : null;

  const sizeConfig = {
    small: { aspect: 'aspect-square', fontSize: 'text-xs', padding: 'p-1.5' },
    medium: { aspect: 'aspect-[3/4]', fontSize: 'text-sm', padding: 'p-2' },
    large: { aspect: 'aspect-[2/3]', fontSize: 'text-base', padding: 'p-3' },
  };

  const config = sizeConfig[size];

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.2 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(profile)}
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-zinc-900 group',
        'focus:outline-none focus:ring-2 focus:ring-[#FF1493] focus:ring-offset-2 focus:ring-offset-black',
        'transition-shadow hover:shadow-lg hover:shadow-[#FF1493]/10',
        config.aspect
      )}
    >
      {/* Skeleton while loading */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      {/* Photo */}
      <img
        src={photoUrl}
        alt={name}
        className={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />

      {/* Error state */}
      {imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
          <span className="text-2xl font-black text-white/20">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Gradient overlay - stronger at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-70 transition-opacity" />

      {/* Top row: Status indicators */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
        {/* Left: Profile type badge */}
        {typeBadge && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 + 0.1 }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-sm"
            style={{ backgroundColor: `${typeBadge.color}30` }}
          >
            <typeBadge.icon className="w-3 h-3" style={{ color: typeBadge.color }} />
            <span className="text-[9px] font-bold uppercase" style={{ color: typeBadge.color }}>
              {typeBadge.label}
            </span>
          </motion.div>
        )}

        {/* Right: Online/Now indicator */}
        <div className="flex items-center gap-1">
          {/* Match percentage */}
          {showMatchBadge && profile.matchProbability && profile.matchProbability > 75 && (
            <div className="px-1.5 py-0.5 bg-[#FF1493]/80 backdrop-blur-sm rounded text-[9px] font-black">
              {profile.matchProbability}%
            </div>
          )}

          {/* Online indicator */}
          {profile.onlineNow && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#39FF14] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#39FF14] ring-2 ring-black/50" />
            </span>
          )}

          {/* Right Now badge */}
          {profile.rightNow && !profile.onlineNow && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="px-1.5 py-0.5 bg-[#FF1493] rounded text-[9px] font-black uppercase tracking-wider"
            >
              NOW
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className={cn('absolute bottom-0 left-0 right-0', config.padding)}>
        <div className="flex items-end justify-between gap-2">
          {/* Name & details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className={cn('text-white font-bold truncate', config.fontSize)}>
                {name}
              </p>
              {/* Verified badge */}
              {profile.verified && (
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#00D9FF] flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                </div>
              )}
            </div>
            
            {/* Age + Location */}
            <div className="flex items-center gap-2 mt-0.5">
              {profile.age && (
                <span className="text-white/60 text-[11px]">{profile.age}</span>
              )}
              {profile.locationLabel && (
                <span className="text-white/40 text-[10px] truncate">{profile.locationLabel}</span>
              )}
            </div>
          </div>
          
          {/* Distance */}
          {distance && (
            <span className="flex-shrink-0 text-[10px] text-white/70 font-bold bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
              {distance}
            </span>
          )}
        </div>

        {/* Mini bio preview (only on medium/large) */}
        {size !== 'small' && profile.bio && (
          <p className="text-[10px] text-white/50 mt-1 line-clamp-1 leading-tight">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Membership indicator (border glow) */}
      {profile.membership === 'chrome' && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-[#FFD700]/40 pointer-events-none" />
      )}
      {profile.membership === 'plus' && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-[#B026FF]/40 pointer-events-none" />
      )}
    </motion.button>
  );
}

// Grid component with better empty state
interface GrindrGridProps {
  profiles: GrindrProfile[];
  onTap: (profile: GrindrProfile) => void;
  columns?: 3 | 4;
  loading?: boolean;
  emptyMessage?: string;
}

export function GrindrGrid({ 
  profiles, 
  onTap, 
  columns = 3, 
  loading = false,
  emptyMessage = 'No one nearby'
}: GrindrGridProps) {
  if (loading) {
    return (
      <div className={cn('grid gap-1.5', columns === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden"
          >
            <div className="w-full h-full animate-pulse bg-gradient-to-b from-zinc-800 to-zinc-900" />
          </motion.div>
        ))}
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 text-center px-6"
      >
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/40 text-sm">{emptyMessage}</p>
        <p className="text-white/20 text-xs mt-1">Try expanding your distance filter</p>
      </motion.div>
    );
  }

  return (
    <div className={cn('grid gap-1.5', columns === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
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
