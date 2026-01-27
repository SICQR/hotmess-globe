import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { badgePop } from '@/lib/animations';

// Badge types with priority (lower = higher priority)
type BadgeType = 
  | 'match'        // Match probability badge
  | 'proximity'    // "Close by" badge
  | 'live'         // "Right Now" active badge
  | 'profileType'  // Seller/Creator/Organizer/Premium
  | 'popular'      // High engagement badge
  | 'new'          // New profile badge
  | 'verified';    // Verified badge

interface BadgeConfig {
  type: BadgeType;
  label: string;
  icon?: string;
  value?: number; // For match percentage or distance
  priority: number;
}

interface SmartBadgeProps {
  badges: BadgeConfig[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

// Badge styling based on type
const getBadgeStyles = (type: BadgeType, value?: number) => {
  switch (type) {
    case 'match':
      // Color based on match percentage
      if (value && value >= 80) {
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-green-400',
          text: 'text-black',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.5)]',
        };
      }
      if (value && value >= 60) {
        return {
          bg: 'bg-gradient-to-r from-cyan-500 to-blue-400',
          text: 'text-black',
          glow: 'shadow-[0_0_12px_rgba(0,217,255,0.4)]',
        };
      }
      if (value && value >= 40) {
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-orange-400',
          text: 'text-black',
          glow: '',
        };
      }
      return {
        bg: 'bg-white/20',
        text: 'text-white',
        glow: '',
      };

    case 'proximity':
      return {
        bg: 'bg-gradient-to-r from-lime-500 to-emerald-400',
        text: 'text-black',
        glow: 'shadow-[0_0_12px_rgba(57,255,20,0.4)]',
      };

    case 'live':
      return {
        bg: 'bg-gradient-to-r from-red-500 to-orange-500',
        text: 'text-white',
        glow: 'shadow-[0_0_16px_rgba(239,68,68,0.6)] animate-glow-pulse',
      };

    case 'profileType':
      return {
        bg: 'bg-gradient-to-r from-[#E62020] to-[#B026FF]',
        text: 'text-white',
        glow: 'shadow-[0_0_10px_rgba(255,20,147,0.3)]',
      };

    case 'popular':
      return {
        bg: 'bg-gradient-to-r from-[#FFD700] to-[#FF6B35]',
        text: 'text-black',
        glow: 'shadow-[0_0_12px_rgba(255,215,0,0.4)]',
      };

    case 'new':
      return {
        bg: 'bg-gradient-to-r from-[#00D9FF] to-[#3B82F6]',
        text: 'text-white',
        glow: '',
      };

    case 'verified':
      return {
        bg: 'bg-gradient-to-r from-[#00D9FF] to-cyan-400',
        text: 'text-black',
        glow: 'shadow-[0_0_10px_rgba(0,217,255,0.4)]',
      };

    default:
      return {
        bg: 'bg-white/20',
        text: 'text-white',
        glow: '',
      };
  }
};

// Size configurations
const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px] rounded-md',
  md: 'px-2 py-1 text-xs rounded-lg',
  lg: 'px-3 py-1.5 text-sm rounded-xl',
};

/**
 * SmartBadge - Context-aware badge component
 * Automatically selects and displays the most relevant badge
 */
export function SmartBadge({
  badges,
  maxVisible = 1,
  size = 'md',
  className,
  animated = true,
}: SmartBadgeProps) {
  // Sort badges by priority and take top N
  const visibleBadges = useMemo(() => {
    return [...badges]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, maxVisible);
  }, [badges, maxVisible]);

  if (visibleBadges.length === 0) return null;

  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated ? badgePop : {};

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      <AnimatePresence mode="wait">
        {visibleBadges.map((badge, index) => {
          const styles = getBadgeStyles(badge.type, badge.value);
          
          return (
            <Wrapper
              key={`${badge.type}-${badge.label}`}
              {...(animated ? {
                initial: { scale: 0, opacity: 0 },
                animate: { scale: 1, opacity: 1 },
                exit: { scale: 0, opacity: 0 },
                transition: { delay: index * 0.05 },
              } : {})}
              className={cn(
                'inline-flex items-center gap-1 font-semibold backdrop-blur-sm',
                styles.bg,
                styles.text,
                styles.glow,
                sizeStyles[size],
                // Live badge gets extra attention
                badge.type === 'live' && 'relative'
              )}
            >
              {badge.type === 'live' && (
                <span className="absolute -left-0.5 -top-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
              
              {badge.icon && (
                <span className="text-[0.9em]">{badge.icon}</span>
              )}
              
              <span className="truncate">
                {badge.type === 'match' && badge.value !== undefined
                  ? `${badge.value}% Match`
                  : badge.type === 'proximity' && badge.value !== undefined
                  ? `${badge.value}m away`
                  : badge.label}
              </span>
            </Wrapper>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Helper to build badge configs from profile data
 */
export function buildSmartBadges(profile: {
  matchProbability?: number;
  distanceMeters?: number;
  rightNow?: boolean;
  profileType?: string;
  viewCount?: number;
  isNew?: boolean;
  isVerified?: boolean;
}): BadgeConfig[] {
  const badges: BadgeConfig[] = [];

  // Match probability (priority 1 if high)
  if (profile.matchProbability !== undefined) {
    badges.push({
      type: 'match',
      label: `${profile.matchProbability}% Match`,
      value: profile.matchProbability,
      priority: profile.matchProbability >= 80 ? 1 : 4,
    });
  }

  // Proximity (priority 2 if close)
  if (profile.distanceMeters !== undefined && profile.distanceMeters < 500) {
    const mins = Math.ceil(profile.distanceMeters / 80); // ~80m/min walking
    badges.push({
      type: 'proximity',
      label: mins <= 1 ? 'Right here' : `${mins} min walk`,
      icon: '📍',
      value: profile.distanceMeters,
      priority: 2,
    });
  }

  // Live/Right Now (priority 1 - always show if active)
  if (profile.rightNow) {
    badges.push({
      type: 'live',
      label: 'Right Now',
      icon: '🔥',
      priority: 1,
    });
  }

  // Profile type
  if (profile.profileType && profile.profileType !== 'standard') {
    const typeLabels: Record<string, { label: string; icon: string }> = {
      seller: { label: 'Seller', icon: '🛍️' },
      creator: { label: 'Creator', icon: '🎨' },
      organizer: { label: 'Organizer', icon: '📅' },
      premium: { label: 'Premium', icon: '💎' },
    };
    const config = typeLabels[profile.profileType];
    if (config) {
      badges.push({
        type: 'profileType',
        label: config.label,
        icon: config.icon,
        priority: 5,
      });
    }
  }

  // Popular
  if (profile.viewCount && profile.viewCount >= 100) {
    badges.push({
      type: 'popular',
      label: 'Popular',
      icon: '⚡',
      priority: 6,
    });
  }

  // New profile
  if (profile.isNew) {
    badges.push({
      type: 'new',
      label: 'New',
      icon: '✨',
      priority: 7,
    });
  }

  // Verified
  if (profile.isVerified) {
    badges.push({
      type: 'verified',
      label: 'Verified',
      icon: '✓',
      priority: 8,
    });
  }

  return badges;
}

export default SmartBadge;
