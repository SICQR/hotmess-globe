/**
 * Dynamic Status Badge Component
 * 
 * Animated status badges for profile cards and discovery.
 * Aligned with UI_DESIGN_SPEC.md
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Crown, 
  Flame, 
  Star, 
  CheckCircle, 
  Clock, 
  Heart,
  Sparkles,
  TrendingUp,
  Users,
  ShoppingBag,
  Palette
} from 'lucide-react';

/**
 * Badge configurations per UI Design Spec
 * Status Badges: Right Now (red→orange, pulse), Online (lime, pulse), 
 * Popular (purple→pink), Verified (cyan→blue), Premium (gold→orange, shimmer)
 */
const BADGE_CONFIGS = {
  // Activity states (per spec)
  rightNow: {
    icon: Zap,
    label: 'Right Now',
    className: 'bg-gradient-to-r from-red-500 to-orange-500 text-white',
    animate: 'pulse',
  },
  online: {
    icon: null,
    label: 'Online',
    className: 'bg-[#39FF14] text-black',
    dot: true,
    dotColor: '#39FF14',
    animate: 'pulse',
  },
  active: {
    icon: Clock,
    label: 'Active',
    className: 'bg-white/20 text-white',
  },
  
  // Social proof (per spec)
  popular: {
    icon: TrendingUp,
    label: 'Popular',
    className: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  },
  trending: {
    icon: Flame,
    label: 'Trending',
    className: 'bg-gradient-to-r from-orange-500 to-red-500 text-white',
  },
  verified: {
    icon: CheckCircle,
    label: 'Verified',
    className: 'bg-gradient-to-r from-[#00D9FF] to-blue-500 text-white',
  },
  
  // Profile types (per spec)
  premium: {
    icon: Crown,
    label: 'Premium',
    className: 'bg-gradient-to-r from-[#FFD700] to-orange-500 text-black',
    animate: 'shimmer',
    glow: true,
  },
  seller: {
    icon: ShoppingBag,
    label: 'Seller',
    className: 'bg-[#B026FF] text-white',
  },
  creator: {
    icon: Star,
    label: 'Creator',
    className: 'bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white',
  },
  organizer: {
    icon: Users,
    label: 'Organizer',
    className: 'bg-gradient-to-r from-[#00D9FF] to-blue-500 text-white',
  },
  
  // Match states (per spec: 80%+ emerald, 60-79% cyan, 40-59% yellow)
  match: {
    icon: Heart,
    label: 'Match',
    className: 'bg-white/20 text-white',
  },
  highMatch: {
    icon: Sparkles,
    label: 'Great Match',
    className: 'bg-gradient-to-r from-[#00D9FF] to-blue-500 text-white',
  },
  superMatch: {
    icon: Star,
    label: 'Super Match',
    className: 'bg-gradient-to-r from-emerald-400 to-[#39FF14] text-black',
    glow: true,
  },
};

export function StatusBadge({ 
  type, 
  label, 
  icon: CustomIcon,
  className = '',
  size = 'sm',
  showLabel = true,
  animate = false,
  glow = false,
}) {
  const config = BADGE_CONFIGS[type] || {};
  const Icon = CustomIcon || config.icon;
  const displayLabel = label || config.label || type;
  const animationType = animate || config.animate;
  const shouldGlow = glow || config.glow;
  
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[10px] px-2 py-1 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  // Animation classes per spec
  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer',
    glow: 'animate-glow-pulse',
  };

  const animClass = animationType && animationClasses[animationType] ? animationClasses[animationType] : '';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        inline-flex items-center rounded-full font-black uppercase tracking-wider
        ${sizeClasses[size]}
        ${config.className || 'bg-white/10 text-white'}
        ${shouldGlow ? 'shadow-lg' : ''}
        ${animClass}
        ${className}
      `}
      style={shouldGlow ? { boxShadow: '0 0 20px currentColor' } : undefined}
    >
      {config.dot && (
        <span 
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: config.dotColor || '#39FF14' }}
        />
      )}
      {Icon && <Icon className={iconSizes[size]} />}
      {showLabel && <span>{displayLabel}</span>}
    </motion.div>
  );
}

/**
 * Match percentage badge with dynamic color
 * Per UI Design Spec:
 * - 80%+ = Emerald gradient ("Super Match")
 * - 60-79% = Cyan gradient ("Great Match")
 * - 40-59% = Yellow/Amber ("Good Match")
 * - <40% = Gray ("Match")
 */
export function MatchBadge({ percentage, size = 'sm', showLabel = true }) {
  const getStyle = (p) => {
    if (p >= 80) return { 
      bg: 'from-emerald-400 to-[#39FF14]', 
      text: 'text-black', 
      label: 'Super Match',
      icon: Star,
      glow: true,
      glowColor: 'rgba(57,255,20,0.4)'
    };
    if (p >= 60) return { 
      bg: 'from-[#00D9FF] to-blue-500', 
      text: 'text-white', 
      label: 'Great Match',
      icon: Sparkles,
    };
    if (p >= 40) return { 
      bg: 'from-yellow-400 to-amber-500', 
      text: 'text-black', 
      label: 'Good Match',
      icon: Sparkles,
    };
    return { 
      bg: 'from-gray-500 to-gray-600', 
      text: 'text-white', 
      label: 'Match',
      icon: Heart,
    };
  };

  const style = getStyle(percentage);
  const Icon = style.icon || Sparkles;
  
  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-[10px] px-2 py-1 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        inline-flex items-center rounded-full font-black uppercase tracking-wider
        bg-gradient-to-r ${style.bg} ${style.text}
        ${sizeClasses[size]}
      `}
      style={style.glow ? { boxShadow: `0 0 20px ${style.glowColor}` } : undefined}
    >
      <Icon className={iconSizes[size]} />
      <span>{Math.round(percentage)}%</span>
      {showLabel && style.label && <span className="opacity-80 ml-0.5">{style.label}</span>}
    </motion.div>
  );
}

/**
 * Distance/ETA badge
 */
export function DistanceBadge({ distance, eta, mode, size = 'sm' }) {
  const modeIcons = {
    walking: '🚶',
    driving: '🚗',
    bicycling: '🚴',
    uber: '🚕',
  };

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-1',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full
      bg-black/40 backdrop-blur-sm border border-white/10
      text-white/80 font-bold
      ${sizeClasses[size]}
    `}>
      {mode && modeIcons[mode] && <span>{modeIcons[mode]}</span>}
      {distance && <span>{distance}</span>}
      {eta && <span className="text-white/60">• {eta}</span>}
    </div>
  );
}

/**
 * Animated online indicator dot
 */
export function OnlineIndicator({ size = 'md', pulse = true }) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span className="relative inline-flex">
      <span className={`${sizes[size]} rounded-full bg-green-500`} />
      {pulse && (
        <span className={`absolute inset-0 ${sizes[size]} rounded-full bg-green-500 animate-ping-slow`} />
      )}
    </span>
  );
}

export default StatusBadge;
