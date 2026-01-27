/**
 * Enhanced Profile Stats Component
 * 
 * Dynamic animated stats display for profile views.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Heart, 
  MessageCircle, 
  Users, 
  Zap, 
  Star, 
  ShoppingBag,
  Music,
  Calendar,
  TrendingUp
} from 'lucide-react';

const STAT_CONFIGS = {
  views: { icon: Eye, color: '#00D9FF', label: 'Views' },
  likes: { icon: Heart, color: '#E62020', label: 'Likes' },
  messages: { icon: MessageCircle, color: '#B026FF', label: 'Messages' },
  followers: { icon: Users, color: '#39FF14', label: 'Followers' },
  following: { icon: Users, color: '#00D9FF', label: 'Following' },
  xp: { icon: Zap, color: '#FFEB3B', label: 'XP' },
  rating: { icon: Star, color: '#FFD700', label: 'Rating' },
  sales: { icon: ShoppingBag, color: '#FF6B35', label: 'Sales' },
  tracks: { icon: Music, color: '#E62020', label: 'Tracks' },
  events: { icon: Calendar, color: '#00D9FF', label: 'Events' },
  streak: { icon: TrendingUp, color: '#39FF14', label: 'Streak' },
};

const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

function StatItem({ type, value, delay = 0, size = 'md', showLabel = true, animate = true }) {
  const config = STAT_CONFIGS[type] || { icon: Zap, color: '#E62020', label: type };
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: { container: 'p-2', icon: 'w-4 h-4', value: 'text-lg', label: 'text-[9px]' },
    md: { container: 'p-3', icon: 'w-5 h-5', value: 'text-xl', label: 'text-[10px]' },
    lg: { container: 'p-4', icon: 'w-6 h-6', value: 'text-2xl', label: 'text-xs' },
  };
  
  const sizes = sizeClasses[size];

  const content = (
    <div 
      className={`
        glass-card rounded-xl ${sizes.container}
        hover:border-white/20 transition-all duration-300
        group cursor-default
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="p-1.5 rounded-lg transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className={sizes.icon} style={{ color: config.color }} />
        </div>
        {showLabel && (
          <span className={`${sizes.label} text-white/50 uppercase font-bold tracking-wider`}>
            {config.label}
          </span>
        )}
      </div>
      <div className={`${sizes.value} font-black text-white`}>
        {formatNumber(value)}
      </div>
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
    >
      {content}
    </motion.div>
  );
}

export function ProfileStats({ stats = {}, size = 'md', columns = 4, animate = true }) {
  const entries = Object.entries(stats).filter(([, value]) => value !== undefined && value !== null);
  
  if (entries.length === 0) return null;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-3`}>
      {entries.map(([type, value], index) => (
        <StatItem
          key={type}
          type={type}
          value={value}
          delay={animate ? index * 0.05 : 0}
          size={size}
          animate={animate}
        />
      ))}
    </div>
  );
}

/**
 * Inline stat row for compact displays
 */
export function InlineStats({ stats = [], size = 'sm' }) {
  const sizeClasses = {
    xs: 'text-[9px] gap-1',
    sm: 'text-[10px] gap-1.5',
    md: 'text-xs gap-2',
  };

  return (
    <div className={`flex items-center flex-wrap ${sizeClasses[size]}`}>
      {stats.map(({ type, value }, index) => {
        const config = STAT_CONFIGS[type] || { icon: Zap, color: '#E62020' };
        const Icon = config.icon;
        
        return (
          <div 
            key={type}
            className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full"
          >
            <Icon className="w-3 h-3" style={{ color: config.color }} />
            <span className="font-bold text-white/80">{formatNumber(value)}</span>
            {index < stats.length - 1 && <span className="text-white/20 ml-1">•</span>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * XP Display with animated glow
 */
export function XPDisplay({ xp, size = 'md', showLabel = true, animate = true }) {
  const sizeClasses = {
    sm: { container: 'px-2 py-1', icon: 'w-3 h-3', text: 'text-sm' },
    md: { container: 'px-3 py-1.5', icon: 'w-4 h-4', text: 'text-lg' },
    lg: { container: 'px-4 py-2', icon: 'w-5 h-5', text: 'text-xl' },
  };
  
  const sizes = sizeClasses[size];

  const content = (
    <div 
      className={`
        inline-flex items-center gap-1.5 ${sizes.container}
        bg-gradient-to-r from-yellow-500/20 to-orange-500/20
        border border-yellow-500/30 rounded-lg
        ${animate ? 'animate-glow-pulse' : ''}
      `}
      style={{ '--glow-color': 'rgba(255,235,59,0.4)' }}
    >
      <Zap className={`${sizes.icon} text-yellow-400`} />
      <span className={`${sizes.text} font-black text-yellow-400`}>{formatNumber(xp)}</span>
      {showLabel && <span className="text-[10px] text-yellow-400/60 uppercase font-bold">XP</span>}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200 }}
    >
      {content}
    </motion.div>
  );
}

/**
 * Rating stars display
 */
export function RatingDisplay({ rating, reviewCount, size = 'md' }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  const sizeClasses = {
    sm: { star: 'w-3 h-3', text: 'text-xs' },
    md: { star: 'w-4 h-4', text: 'text-sm' },
    lg: { star: 'w-5 h-5', text: 'text-base' },
  };
  
  const sizes = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={sizes.star}
            fill={i < fullStars ? '#FFD700' : (i === fullStars && hasHalfStar ? 'url(#half)' : 'none')}
            stroke={i < fullStars || (i === fullStars && hasHalfStar) ? '#FFD700' : '#666'}
          />
        ))}
      </div>
      <span className={`${sizes.text} font-bold text-white/80`}>
        {rating.toFixed(1)}
      </span>
      {reviewCount !== undefined && (
        <span className={`${sizes.text} text-white/50`}>
          ({formatNumber(reviewCount)})
        </span>
      )}
    </div>
  );
}

export default ProfileStats;
