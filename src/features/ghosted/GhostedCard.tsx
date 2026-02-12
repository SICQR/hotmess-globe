/**
 * GhostedCard - Streamlined, mobile-first profile card for Ghosted
 * 
 * Design Principles:
 * - Photo-first: 85% photo, 15% info
 * - Single priority badge only
 * - One-line info: Name + ETA
 * - No hover states (tap to open)
 * - Optimized for grids of 2-3 columns on mobile
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  MapPin, 
  Heart, 
  Clock,
  MessageCircle,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface GhostedProfile {
  id: string;
  profileName: string;
  email?: string;
  title?: string;
  locationLabel?: string;
  bio?: string;
  age?: number;
  
  // Location
  geoLat?: number;
  geoLng?: number;
  
  // Photos
  photoUrl?: string;
  photos?: Array<string | { url: string; isPrimary?: boolean }>;
  
  // Status
  onlineNow?: boolean;
  rightNow?: boolean;
  
  // Match & Travel
  matchProbability?: number;
  travelTimeMinutes?: number;
  
  // Type
  profileType?: 'standard' | 'seller' | 'creator' | 'organizer' | 'premium';
  
  // Tags
  tags?: string[];
}

export type BadgePriority = 
  | 'live'      // Right Now - highest priority
  | 'match'     // 80%+ match
  | 'nearby'    // <5 min away
  | 'online'    // Currently online
  | null;       // No badge

export type CardVariant = 'grid' | 'featured' | 'compact';

interface GhostedCardProps {
  profile: GhostedProfile;
  variant?: CardVariant;
  onTap?: (profile: GhostedProfile) => void;
  onMessage?: (profile: GhostedProfile) => void;
  onQuickAction?: (profile: GhostedProfile, action: 'like' | 'pass' | 'uber') => void;
  showQuickActions?: boolean;
  index?: number;
  className?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the primary photo URL from profile data
 */
function getPhotoUrl(profile: GhostedProfile): string {
  if (profile.photoUrl) return profile.photoUrl;
  
  if (profile.photos?.length) {
    const first = profile.photos[0];
    if (typeof first === 'string') return first;
    if (first?.url) return first.url;
  }
  
  // Fallback avatar
  const name = profile.profileName || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=111&color=fff&bold=true`;
}

/**
 * Determine the single most important badge to show
 */
function selectBadge(profile: GhostedProfile): BadgePriority {
  // 1. Live/Right Now is always highest priority
  if (profile.rightNow) return 'live';
  
  // 2. High match score (80%+)
  if (profile.matchProbability && profile.matchProbability >= 80) return 'match';
  
  // 3. Very close (<5 min walk)
  if (profile.travelTimeMinutes !== undefined && profile.travelTimeMinutes < 5) return 'nearby';
  
  // 4. Online
  if (profile.onlineNow) return 'online';
  
  return null;
}

/**
 * Format travel time for display
 */
function formatETA(minutes: number | undefined): string | null {
  if (minutes === undefined || minutes === null) return null;
  if (minutes < 1) return 'Here';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// ============================================================================
// BADGE COMPONENT
// ============================================================================

interface BadgeProps {
  type: BadgePriority;
  matchScore?: number;
  minutes?: number;
}

function Badge({ type, matchScore, minutes }: BadgeProps) {
  if (!type) return null;
  
  const configs = {
    live: {
      icon: Zap,
      label: 'LIVE',
      bg: 'bg-[#39FF14]',
      text: 'text-black',
      glow: 'shadow-[0_0_12px_rgba(57,255,20,0.6)]',
      pulse: true,
    },
    match: {
      icon: Heart,
      label: matchScore ? `${Math.round(matchScore)}%` : 'MATCH',
      bg: 'bg-gradient-to-r from-[#FF1493] to-[#B026FF]',
      text: 'text-white',
      glow: 'shadow-[0_0_12px_rgba(255,20,147,0.5)]',
      pulse: true,
    },
    nearby: {
      icon: MapPin,
      label: minutes !== undefined ? formatETA(minutes) || 'NEAR' : 'NEAR',
      bg: 'bg-[#00D9FF]',
      text: 'text-black',
      glow: 'shadow-[0_0_10px_rgba(0,217,255,0.4)]',
      pulse: false,
    },
    online: {
      icon: Clock,
      label: 'NOW',
      bg: 'bg-[#39FF14]/80',
      text: 'text-black',
      glow: '',
      pulse: false,
    },
  };
  
  const config = configs[type];
  if (!config) return null;
  
  const Icon = config.icon;
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1',
        'text-[10px] font-black uppercase tracking-wider',
        config.bg,
        config.text,
        config.glow,
        config.pulse && 'animate-pulse'
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );
}

// ============================================================================
// MAIN CARD COMPONENT
// ============================================================================

export function GhostedCard({
  profile,
  variant = 'grid',
  onTap,
  onMessage,
  onQuickAction,
  showQuickActions = false,
  index = 0,
  className,
}: GhostedCardProps) {
  const photoUrl = useMemo(() => getPhotoUrl(profile), [profile]);
  const badge = useMemo(() => selectBadge(profile), [profile]);
  const eta = useMemo(() => formatETA(profile.travelTimeMinutes), [profile.travelTimeMinutes]);
  
  const handleTap = useCallback(() => {
    onTap?.(profile);
  }, [onTap, profile]);
  
  const handleMessage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMessage?.(profile);
  }, [onMessage, profile]);
  
  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAction?.(profile, 'like');
  }, [onQuickAction, profile]);
  
  const handleUber = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAction?.(profile, 'uber');
  }, [onQuickAction, profile]);

  // Variant-specific styles
  const variantStyles = {
    grid: {
      container: 'aspect-[3/4]',
      photoHeight: 'h-[85%]',
      infoHeight: 'h-[15%]',
    },
    featured: {
      container: 'aspect-[3/4] md:aspect-[4/5]',
      photoHeight: 'h-[80%]',
      infoHeight: 'h-[20%]',
    },
    compact: {
      container: 'aspect-[1/1]',
      photoHeight: 'h-[75%]',
      infoHeight: 'h-[25%]',
    },
  };
  
  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleTap}
      className={cn(
        'relative overflow-hidden rounded-xl cursor-pointer',
        'bg-black border border-white/10',
        'hover:border-white/30 transition-colors duration-200',
        styles.container,
        className
      )}
    >
      {/* Photo Section */}
      <div className={cn('relative w-full overflow-hidden', styles.photoHeight)}>
        <img
          src={photoUrl}
          alt={profile.profileName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
        
        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Badge - top left */}
        {badge && (
          <div className="absolute top-2 left-2">
            <Badge 
              type={badge} 
              matchScore={profile.matchProbability}
              minutes={profile.travelTimeMinutes}
            />
          </div>
        )}
        
        {/* Quick Actions - bottom right (optional) */}
        {showQuickActions && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              onClick={handleMessage}
              className="w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#FF1493] transition-colors"
              aria-label="Message"
            >
              <MessageCircle className="w-4 h-4 text-white" />
            </button>
            {profile.geoLat && profile.geoLng && (
              <button
                onClick={handleUber}
                className="w-9 h-9 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#00D9FF] transition-colors"
                aria-label="Get Uber"
              >
                <Car className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        )}
        
        {/* Live indicator dot (if live but no badge shown) */}
        {profile.rightNow && !badge && (
          <div className="absolute top-2 left-2">
            <div className="relative">
              <div className="w-3 h-3 bg-[#39FF14] rounded-full" />
              <div className="absolute inset-0 w-3 h-3 bg-[#39FF14] rounded-full animate-ping opacity-75" />
            </div>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className={cn(
        'w-full px-3 py-2 flex items-center justify-between',
        styles.infoHeight
      )}>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-white truncate">
              {profile.profileName}
            </span>
            {profile.age && (
              <span className="text-xs text-white/50">{profile.age}</span>
            )}
          </div>
        </div>
        
        {/* ETA Badge */}
        {eta && (
          <div className="flex items-center gap-1 text-[#00D9FF]">
            <MapPin className="w-3 h-3" />
            <span className="text-xs font-bold">{eta}</span>
          </div>
        )}
        
        {/* Online dot if no ETA */}
        {!eta && profile.onlineNow && !profile.rightNow && (
          <div className="w-2 h-2 bg-[#39FF14] rounded-full" />
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// COMPACT CARD (for lists/horizontal scroll)
// ============================================================================

interface GhostedCardCompactProps {
  profile: GhostedProfile;
  onTap?: (profile: GhostedProfile) => void;
  className?: string;
}

export function GhostedCardCompact({ 
  profile, 
  onTap,
  className 
}: GhostedCardCompactProps) {
  const photoUrl = useMemo(() => getPhotoUrl(profile), [profile]);
  const badge = useMemo(() => selectBadge(profile), [profile]);
  const eta = useMemo(() => formatETA(profile.travelTimeMinutes), [profile.travelTimeMinutes]);
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap?.(profile)}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg cursor-pointer',
        'bg-white/5 border border-white/10',
        'hover:bg-white/10 hover:border-white/20 transition-all',
        profile.rightNow && 'border-[#39FF14]/50 bg-[#39FF14]/5',
        className
      )}
    >
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={photoUrl}
          alt={profile.profileName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {profile.rightNow && (
          <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#39FF14] rounded-full border-2 border-black" />
        )}
        {profile.onlineNow && !profile.rightNow && (
          <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#39FF14]/60 rounded-full border-2 border-black" />
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white truncate">{profile.profileName}</span>
          {profile.age && <span className="text-xs text-white/40">{profile.age}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          {eta && (
            <span className="text-[#00D9FF]">{eta} away</span>
          )}
          {profile.locationLabel && !eta && (
            <span className="truncate">{profile.locationLabel}</span>
          )}
        </div>
      </div>
      
      {/* Match/Status */}
      {profile.matchProbability && profile.matchProbability >= 70 && (
        <div className="px-2 py-1 bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white text-[10px] font-bold rounded">
          {Math.round(profile.matchProbability)}%
        </div>
      )}
      {profile.rightNow && (
        <div className="px-2 py-1 bg-[#39FF14] text-black text-[10px] font-bold">
          LIVE
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

export function GhostedCardSkeleton({ variant = 'grid' }: { variant?: CardVariant }) {
  const aspectClass = variant === 'compact' ? 'aspect-[1/1]' : 'aspect-[3/4]';
  
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl bg-white/5 animate-pulse',
      aspectClass
    )}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="h-4 w-24 bg-white/10 rounded mb-1" />
        <div className="h-3 w-16 bg-white/5 rounded" />
      </div>
    </div>
  );
}

// ============================================================================
// GRID COMPONENT
// ============================================================================

interface GhostedGridProps {
  profiles: GhostedProfile[];
  onTap?: (profile: GhostedProfile) => void;
  onMessage?: (profile: GhostedProfile) => void;
  showQuickActions?: boolean;
  columns?: 2 | 3 | 4;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function GhostedGrid({
  profiles,
  onTap,
  onMessage,
  showQuickActions = false,
  columns = 2,
  loading = false,
  emptyMessage = "No one around right now",
  className,
}: GhostedGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };
  
  if (loading) {
    return (
      <div className={cn('grid gap-3', gridCols[columns], className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <GhostedCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-4">👻</div>
        <p className="text-white/60">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={cn('grid gap-3', gridCols[columns], className)}>
      {profiles.map((profile, index) => (
        <GhostedCard
          key={profile.id}
          profile={profile}
          onTap={onTap}
          onMessage={onMessage}
          showQuickActions={showQuickActions}
          index={index}
        />
      ))}
    </div>
  );
}

export default GhostedCard;
