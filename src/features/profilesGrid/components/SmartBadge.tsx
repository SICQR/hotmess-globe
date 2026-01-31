import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  MapPin, 
  Crown, 
  ShoppingBag, 
  Mic2, 
  Calendar,
  Star,
  Heart,
  Clock,
  Sparkles,
  BadgeCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeType = 
  | 'match'        // High compatibility
  | 'nearby'       // Close proximity
  | 'live'         // Currently active (Right Now)
  | 'premium'      // Premium profile
  | 'seller'       // Seller profile
  | 'creator'      // Creator profile
  | 'organizer'    // Event organizer
  | 'verified'     // Verified profile
  | 'new'          // New member
  | 'online'       // Currently online
  | 'mutual';      // Mutual match/follow

interface SmartBadgeProps {
  type: BadgeType;
  value?: string | number;
  className?: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const badgeConfig: Record<BadgeType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  glow?: string;
  pulse?: boolean;
}> = {
  match: {
    label: 'Match',
    icon: Heart,
    color: 'text-white',
    bgColor: 'bg-gradient-to-r from-hot to-neon-purple',
    borderColor: 'border-hot',
    glow: 'shadow-[0_0_15px_theme(colors.hot.glow)]',
    pulse: true,
  },
  nearby: {
    label: 'Nearby',
    icon: MapPin,
    color: 'text-black',
    bgColor: 'bg-cyan',
    borderColor: 'border-cyan',
    glow: 'shadow-[0_0_10px_theme(colors.cyan.glow)]',
  },
  live: {
    label: 'Live',
    icon: Zap,
    color: 'text-black',
    bgColor: 'bg-neon-green',
    borderColor: 'border-neon-green',
    glow: 'shadow-[0_0_15px_rgba(57,255,20,0.5)]',
    pulse: true,
  },
  premium: {
    label: 'Premium',
    icon: Crown,
    color: 'text-black',
    bgColor: 'bg-gradient-to-r from-neon-gold to-neon-orange',
    borderColor: 'border-neon-gold',
    glow: 'shadow-[0_0_10px_rgba(255,215,0,0.4)]',
  },
  seller: {
    label: 'Shop',
    icon: ShoppingBag,
    color: 'text-black',
    bgColor: 'bg-cyan',
    borderColor: 'border-cyan',
  },
  creator: {
    label: 'Creator',
    icon: Mic2,
    color: 'text-white',
    bgColor: 'bg-neon-purple',
    borderColor: 'border-neon-purple',
  },
  organizer: {
    label: 'Events',
    icon: Calendar,
    color: 'text-black',
    bgColor: 'bg-cyan',
    borderColor: 'border-cyan',
  },
  verified: {
    label: 'Verified',
    icon: BadgeCheck,
    color: 'text-white',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
  },
  new: {
    label: 'New',
    icon: Sparkles,
    color: 'text-black',
    bgColor: 'bg-neon-yellow',
    borderColor: 'border-neon-yellow',
  },
  online: {
    label: 'Online',
    icon: Clock,
    color: 'text-black',
    bgColor: 'bg-neon-green',
    borderColor: 'border-neon-green',
  },
  mutual: {
    label: 'Mutual',
    icon: Star,
    color: 'text-black',
    bgColor: 'bg-neon-gold',
    borderColor: 'border-neon-gold',
  },
};

/**
 * SmartBadge - Context-aware badge component
 * Shows the most relevant badge based on profile context
 */
export function SmartBadge({ 
  type, 
  value, 
  className, 
  animate = true,
  size = 'md'
}: SmartBadgeProps) {
  const config = badgeConfig[type];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[9px] gap-0.5',
    md: 'px-2 py-1 text-[10px] gap-1',
    lg: 'px-3 py-1.5 text-xs gap-1.5',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const BadgeContent = (
    <>
      <Icon className={iconSizes[size]} />
      <span className="font-black uppercase tracking-wider">
        {value || config.label}
      </span>
    </>
  );

  if (!animate) {
    return (
      <div
        className={cn(
          'inline-flex items-center',
          sizeClasses[size],
          config.bgColor,
          config.color,
          config.glow,
          className
        )}
      >
        {BadgeContent}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center',
        sizeClasses[size],
        config.bgColor,
        config.color,
        config.glow,
        config.pulse && 'animate-glow-pulse',
        className
      )}
    >
      {config.pulse && (
        <motion.span
          className="absolute inset-0 rounded-sm bg-inherit opacity-50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      {BadgeContent}
    </motion.div>
  );
}

/**
 * SmartBadgeSelector - Determines the most relevant badge to show
 */
interface ProfileContext {
  matchScore?: number;       // 0-100
  distanceMinutes?: number;  // ETA in minutes
  isLive?: boolean;          // Right Now active
  profileType?: string;      // 'standard' | 'seller' | 'creator' | 'organizer' | 'premium'
  isVerified?: boolean;
  isOnline?: boolean;
  isMutual?: boolean;
  isNew?: boolean;           // Joined within last 7 days
}

export function selectBestBadge(context: ProfileContext): BadgeType | null {
  // Priority order for badge selection
  
  // 1. Live status is highest priority
  if (context.isLive) {
    return 'live';
  }
  
  // 2. High match score (80%+)
  if (context.matchScore && context.matchScore >= 80) {
    return 'match';
  }
  
  // 3. Very close proximity (<5 min)
  if (context.distanceMinutes && context.distanceMinutes < 5) {
    return 'nearby';
  }
  
  // 4. Mutual connection
  if (context.isMutual) {
    return 'mutual';
  }
  
  // 5. Profile type badges
  if (context.profileType === 'premium') {
    return 'premium';
  }
  if (context.profileType === 'creator') {
    return 'creator';
  }
  if (context.profileType === 'organizer') {
    return 'organizer';
  }
  if (context.profileType === 'seller') {
    return 'seller';
  }
  
  // 6. Verified
  if (context.isVerified) {
    return 'verified';
  }
  
  // 7. New member
  if (context.isNew) {
    return 'new';
  }
  
  // 8. Online status (lowest priority)
  if (context.isOnline) {
    return 'online';
  }
  
  return null;
}

/**
 * SmartBadgeStack - Shows multiple badges in a stack
 */
interface SmartBadgeStackProps {
  badges: Array<{ type: BadgeType; value?: string | number }>;
  maxVisible?: number;
  className?: string;
}

export function SmartBadgeStack({ 
  badges, 
  maxVisible = 2,
  className 
}: SmartBadgeStackProps) {
  const visibleBadges = badges.slice(0, maxVisible);
  const hiddenCount = badges.length - maxVisible;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visibleBadges.map((badge, index) => (
        <SmartBadge
          key={badge.type}
          type={badge.type}
          value={badge.value}
          size="sm"
        />
      ))}
      {hiddenCount > 0 && (
        <span className="px-1.5 py-0.5 bg-white/10 text-white/60 text-[9px] font-bold">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

/**
 * MatchScoreBadge - Specialized badge for match scores
 */
interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

export function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  const getVariant = (score: number) => {
    if (score >= 90) return { color: 'from-hot to-neon-gold', label: 'Perfect Match' };
    if (score >= 80) return { color: 'from-hot to-neon-purple', label: 'Great Match' };
    if (score >= 70) return { color: 'from-neon-purple to-cyan', label: 'Good Match' };
    return { color: 'from-cyan to-blue-500', label: 'Potential' };
  };

  const variant = getVariant(score);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1',
        `bg-gradient-to-r ${variant.color}`,
        'text-white text-[10px] font-black uppercase tracking-wider',
        score >= 80 && 'shadow-[0_0_15px_theme(colors.hot.glow)] animate-glow-pulse',
        className
      )}
    >
      <Heart className="w-3 h-3" />
      <span>{score}%</span>
    </motion.div>
  );
}

/**
 * ProximityBadge - Specialized badge for distance/ETA
 */
interface ProximityBadgeProps {
  minutes: number;
  className?: string;
}

export function ProximityBadge({ minutes, className }: ProximityBadgeProps) {
  const getLabel = (mins: number) => {
    if (mins < 1) return 'Here';
    if (mins < 5) return `${mins}m`;
    if (mins < 60) return `${mins} min`;
    return `${Math.round(mins / 60)}h`;
  };

  const isVeryClose = minutes < 5;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1',
        isVeryClose 
          ? 'bg-neon-green text-black shadow-[0_0_10px_rgba(57,255,20,0.4)]'
          : 'bg-cyan text-black',
        'text-[10px] font-black uppercase tracking-wider',
        className
      )}
    >
      <MapPin className="w-3 h-3" />
      <span>{getLabel(minutes)}</span>
    </motion.div>
  );
}

export default SmartBadge;
