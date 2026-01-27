import React from 'react';
import { Star, Verified, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SponsoredBadge - Visual indicator for sponsored/featured content
 */
export function SponsoredBadge({ 
  type = 'sponsored', // 'sponsored', 'featured', 'premium'
  size = 'sm', // 'xs', 'sm', 'md', 'lg'
  className 
}) {
  const config = {
    sponsored: {
      icon: Star,
      label: 'Sponsored',
      colors: 'bg-[#E62020]/20 text-[#E62020] border-[#E62020]/40',
    },
    featured: {
      icon: Verified,
      label: 'Featured',
      colors: 'bg-[#FFEB3B]/20 text-[#FFEB3B] border-[#FFEB3B]/40',
    },
    premium: {
      icon: Crown,
      label: 'Premium',
      colors: 'bg-[#B026FF]/20 text-[#B026FF] border-[#B026FF]/40',
    },
  };

  const sizes = {
    xs: 'text-[8px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const { icon: Icon, label, colors } = config[type] || config.sponsored;

  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded border',
        colors,
        sizes[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {label}
    </span>
  );
}

/**
 * SponsoredGlowEffect - CSS animation for sponsored pins on globe
 */
export function SponsoredGlowEffect({ color = '#E62020', children, className }) {
  return (
    <div className={cn('relative', className)}>
      <div 
        className="absolute inset-0 rounded-full animate-pulse opacity-50 blur-md"
        style={{ backgroundColor: color }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * FeaturedVenueBadge - Special badge for featured venues
 */
export function FeaturedVenueBadge({ 
  venueName,
  className 
}) {
  return (
    <div className={cn(
      'inline-flex items-center gap-2 bg-gradient-to-r from-[#E62020] to-[#B026FF] text-white px-3 py-1.5 rounded-full shadow-lg',
      className
    )}>
      <Star className="w-4 h-4 fill-white" />
      <span className="font-bold text-sm uppercase tracking-wide">
        {venueName || 'Featured Venue'}
      </span>
    </div>
  );
}

export default SponsoredBadge;
