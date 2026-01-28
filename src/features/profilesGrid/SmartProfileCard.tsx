import React, { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  MessageCircle, 
  MapPin, 
  Heart,
  ChevronRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCursorGlow } from '@/hooks/useCursorGlow';
import { cardHover, springConfig } from '@/lib/animations';
import { 
  SmartBadge, 
  selectBestBadge, 
  MatchScoreBadge, 
  ProximityBadge
} from './components/SmartBadge';

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  photos?: Array<string | { url: string }>;
  profile_type?: 'standard' | 'seller' | 'creator' | 'organizer' | 'premium';
  bio?: string;
  city?: string;
  age?: number;
  is_verified?: boolean;
  is_online?: boolean;
  is_right_now?: boolean;
  tags?: string[];
  xp?: number;
  last_seen?: string;
  created_date?: string;
}

export interface ViewerContext {
  location?: { lat: number; lng: number } | null;
  interests?: string[];
  recentViews?: string[];
}

export type CardSize = 'standard' | 'featured' | 'spotlight';

interface SmartProfileCardProps {
  profile: Profile;
  viewerContext?: ViewerContext;
  matchScore?: number;
  distanceMinutes?: number;
  isMutual?: boolean;
  onClick?: (profile: Profile) => void;
  onMessage?: (profile: Profile) => void;
  displayMode?: 'grid' | 'list' | 'spotlight';
  forceSize?: CardSize;
  className?: string;
  index?: number;
}

/**
 * Calculate relevance score to determine card size
 */
function calculateRelevance(
  profile: Profile, 
  context: ViewerContext | undefined,
  matchScore?: number,
  distanceMinutes?: number
): number {
  let score = 50; // Base score
  
  // Match score contribution (up to 40 points)
  if (matchScore) {
    score += (matchScore / 100) * 40;
  }
  
  // Proximity contribution (up to 20 points)
  if (distanceMinutes !== undefined) {
    if (distanceMinutes < 5) score += 20;
    else if (distanceMinutes < 15) score += 15;
    else if (distanceMinutes < 30) score += 10;
  }
  
  // Right Now bonus (10 points)
  if (profile.is_right_now) {
    score += 10;
  }
  
  // Premium/Creator bonus (5 points)
  if (profile.profile_type === 'premium' || profile.profile_type === 'creator') {
    score += 5;
  }
  
  // Verified bonus (5 points)
  if (profile.is_verified) {
    score += 5;
  }
  
  return Math.min(100, score);
}

/**
 * Determine card size based on relevance
 */
function getCardSize(relevance: number, forceSize?: CardSize): CardSize {
  if (forceSize) return forceSize;
  if (relevance > 90) return 'spotlight';
  if (relevance > 75) return 'featured';
  return 'standard';
}

/**
 * SmartProfileCard - Context-aware profile card with dynamic styling
 */
export function SmartProfileCard({
  profile,
  viewerContext,
  matchScore,
  distanceMinutes,
  isMutual,
  onClick,
  onMessage,
  displayMode = 'grid',
  forceSize,
  className,
  index = 0,
}: SmartProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useCursorGlow(cardRef);

  // Calculate relevance and card size
  const relevance = useMemo(
    () => calculateRelevance(profile, viewerContext, matchScore, distanceMinutes),
    [profile, viewerContext, matchScore, distanceMinutes]
  );
  
  const cardSize = getCardSize(relevance, forceSize);

  // Determine the best badge to show
  const badgeContext = {
    matchScore,
    distanceMinutes,
    isLive: profile.is_right_now,
    profileType: profile.profile_type,
    isVerified: profile.is_verified,
    isOnline: profile.is_online,
    isMutual,
    isNew: profile.created_date 
      ? (Date.now() - new Date(profile.created_date).getTime()) < 7 * 24 * 60 * 60 * 1000
      : false,
  };
  
  const primaryBadge = selectBestBadge(badgeContext);

  // Get avatar URL
  const avatarUrl = useMemo(() => {
    if (profile.avatar_url) return profile.avatar_url;
    if (profile.photos?.length) {
      const first = profile.photos[0];
      return typeof first === 'string' ? first : first?.url;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'U')}&size=400&background=111111&color=ffffff`;
  }, [profile]);

  // Style variants based on context
  const isHighMatch = matchScore && matchScore >= 80;
  const isNearby = distanceMinutes !== undefined && distanceMinutes < 10;
  const isLive = profile.is_right_now;
  const isPremium = profile.profile_type === 'premium';

  // Card size classes
  const sizeClasses = {
    standard: 'col-span-1 row-span-1',
    featured: 'col-span-1 row-span-1 md:row-span-2',
    spotlight: 'col-span-1 md:col-span-2 row-span-1 md:row-span-2',
  };

  const aspectClasses = {
    standard: 'aspect-[4/5]',
    featured: 'aspect-[4/5] md:aspect-[3/5]',
    spotlight: 'aspect-[4/5] md:aspect-[16/10]',
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ...springConfig.gentle }}
      whileHover="hover"
      variants={cardHover}
      className={cn(
        'smart-card cursor-glow relative overflow-hidden rounded-lg transition-all duration-300',
        sizeClasses[cardSize],
        // Border styling based on context
        'border-2',
        isHighMatch && 'border-[#FF1493] shadow-glow-hot',
        isNearby && !isHighMatch && 'border-[#00D9FF] shadow-glow-cyan',
        isLive && !isHighMatch && !isNearby && 'border-[#39FF14] shadow-glow-green animate-glow-pulse',
        isPremium && !isHighMatch && !isNearby && !isLive && 'border-[#FFD700] shadow-glow-gold',
        !isHighMatch && !isNearby && !isLive && !isPremium && 'border-white/10 hover:border-white/30',
        className
      )}
      onClick={() => onClick?.(profile)}
    >
      {/* Image */}
      <div className={cn('relative overflow-hidden', aspectClasses[cardSize])}>
        <img
          src={avatarUrl}
          alt={profile.full_name || 'Profile'}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* High Match Animated Gradient Border */}
        {isHighMatch && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF1493]/20 via-transparent to-[#B026FF]/20 animate-gradient-shift" 
                 style={{ backgroundSize: '200% 100%' }} />
          </div>
        )}

        {/* Premium Holographic Effect */}
        {isPremium && (
          <div className="absolute inset-0 pointer-events-none holographic" />
        )}

        {/* Live Indicator Ripple */}
        {isLive && (
          <div className="absolute top-3 left-3 z-10">
            <div className="relative">
              <div className="w-3 h-3 bg-[#39FF14] rounded-full" />
              <div className="absolute inset-0 w-3 h-3 bg-[#39FF14] rounded-full animate-ping opacity-75" />
            </div>
          </div>
        )}

        {/* Primary Badge */}
        {primaryBadge && (
          <div className="absolute top-3 right-3 z-10">
            <SmartBadge type={primaryBadge} />
          </div>
        )}

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          {/* Name & Age */}
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="text-xl font-black text-white truncate">
              {profile.full_name || 'Anonymous'}
            </h3>
            {profile.age && (
              <span className="text-white/60 text-sm">{profile.age}</span>
            )}
          </div>

          {/* Location */}
          {profile.city && (
            <div className="flex items-center gap-1 text-white/60 text-sm mb-2">
              <MapPin className="w-3 h-3" />
              <span>{profile.city}</span>
            </div>
          )}

          {/* Secondary Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Match Score (if high and not primary) */}
            {matchScore && matchScore >= 70 && primaryBadge !== 'match' && (
              <MatchScoreBadge score={matchScore} />
            )}

            {/* Proximity (if close and not primary) */}
            {distanceMinutes !== undefined && distanceMinutes < 30 && primaryBadge !== 'nearby' && (
              <ProximityBadge minutes={distanceMinutes} />
            )}

            {/* Online indicator (if not primary) */}
            {profile.is_online && primaryBadge !== 'online' && primaryBadge !== 'live' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-[9px] font-bold uppercase">
                <span className="w-1.5 h-1.5 bg-[#39FF14] rounded-full" />
                Online
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions (on hover) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute bottom-16 right-4 z-10 flex gap-2"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMessage?.(profile);
            }}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-full hover:bg-[#FF1493] hover:text-white transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </motion.div>
      </div>

      {/* Spotlight Card Extra Content */}
      {cardSize === 'spotlight' && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-20 bg-gradient-to-t from-black to-transparent">
          {profile.bio && (
            <p className="text-white/70 text-sm line-clamp-2 mb-3">
              {profile.bio}
            </p>
          )}
          
          <Link
            to={`/profile?email=${encodeURIComponent(profile.email || '')}`}
            className="inline-flex items-center gap-1 text-[#FF1493] text-sm font-bold hover:text-white transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            View Profile
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

/**
 * SmartProfileCardCompact - Smaller variant for lists
 */
interface SmartProfileCardCompactProps {
  profile: Profile;
  matchScore?: number;
  distanceMinutes?: number;
  onClick?: (profile: Profile) => void;
  className?: string;
}

export function SmartProfileCardCompact({
  profile,
  matchScore,
  distanceMinutes,
  onClick,
  className,
}: SmartProfileCardCompactProps) {
  const avatarUrl = profile.avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'U')}&size=80&background=111111&color=ffffff`;

  const isLive = profile.is_right_now;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick?.(profile)}
      className={cn(
        'flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer',
        'hover:bg-white/10 hover:border-white/20 transition-all',
        isLive && 'border-[#39FF14]/50 bg-[#39FF14]/5',
        className
      )}
    >
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={avatarUrl}
          alt={profile.full_name || 'Profile'}
          className="w-full h-full object-cover"
        />
        {isLive && (
          <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#39FF14] rounded-full border-2 border-black" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-white truncate">{profile.full_name}</h4>
          {profile.is_verified && (
            <span className="text-[#3B82F6]">✓</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          {profile.city && <span>{profile.city}</span>}
          {distanceMinutes !== undefined && distanceMinutes < 60 && (
            <span className="text-[#00D9FF]">• {distanceMinutes} min</span>
          )}
        </div>
      </div>

      {/* Match Score */}
      {matchScore && matchScore >= 70 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white text-xs font-bold rounded">
          <Heart className="w-3 h-3" />
          {matchScore}%
        </div>
      )}

      {/* Live Badge */}
      {isLive && (
        <div className="flex items-center gap-1 px-2 py-1 bg-[#39FF14] text-black text-xs font-bold">
          <Zap className="w-3 h-3" />
          Live
        </div>
      )}
    </motion.div>
  );
}

export default SmartProfileCard;
