import React from 'react';
import { Flame, Zap, Clock, Star, MessageCircle, Sparkles } from 'lucide-react';

export type SocialProofType = 
  | 'popular'      // High engagement
  | 'hot'          // Trending/spike in views
  | 'online'       // Currently online
  | 'new'          // Joined recently
  | 'verified'     // Verified profile
  | 'responsive'   // Quick message responses
  | 'active';      // Recently active

export type SocialProofBadge = {
  type: SocialProofType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
};

const BADGE_CONFIG: Record<SocialProofType, Omit<SocialProofBadge, 'type'>> = {
  popular: {
    label: 'Popular',
    icon: Flame,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.2)',
  },
  hot: {
    label: 'Hot',
    icon: Zap,
    color: '#FF1493',
    bgColor: 'rgba(255, 20, 147, 0.2)',
  },
  online: {
    label: 'Online',
    icon: () => <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.2)',
  },
  new: {
    label: 'New',
    icon: Sparkles,
    color: '#B026FF',
    bgColor: 'rgba(176, 38, 255, 0.2)',
  },
  verified: {
    label: 'Verified',
    icon: Star,
    color: '#00D9FF',
    bgColor: 'rgba(0, 217, 255, 0.2)',
  },
  responsive: {
    label: 'Quick Reply',
    icon: MessageCircle,
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.2)',
  },
  active: {
    label: 'Active',
    icon: Clock,
    color: '#64748b',
    bgColor: 'rgba(100, 116, 139, 0.2)',
  },
};

type SocialProofBadgeProps = {
  type: SocialProofType;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
};

/**
 * Single social proof badge
 */
export function SocialProofBadgeItem({
  type,
  size = 'sm',
  showLabel = true,
  className = '',
}: SocialProofBadgeProps) {
  const config = BADGE_CONFIG[type];
  if (!config) return null;

  const Icon = config.icon;
  const sizes = {
    sm: 'px-1.5 py-0.5 text-[9px] gap-1',
    md: 'px-2 py-1 text-[10px] gap-1.5',
  };

  return (
    <div
      className={`
        inline-flex items-center rounded-full font-bold uppercase tracking-wider
        ${sizes[size]}
        ${className}
      `}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.color}30`,
      }}
    >
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}

/**
 * Determine social proof badges for a profile
 */
export function getSocialProofBadges(profile: {
  onlineNow?: boolean;
  rightNow?: boolean;
  lastSeen?: string | Date;
  createdAt?: string | Date;
  created_at?: string | Date;
  viewCount?: number;
  messageResponseRate?: number;
  isVerified?: boolean;
  isPremium?: boolean;
}): SocialProofType[] {
  const badges: SocialProofType[] = [];

  // Online now - highest priority
  if (profile.onlineNow || profile.rightNow) {
    badges.push('online');
  }

  // New user (joined in last 7 days)
  const createdAt = profile.createdAt || profile.created_at;
  if (createdAt) {
    const createdDate = new Date(createdAt);
    const daysSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated <= 7) {
      badges.push('new');
    }
  }

  // Verified
  if (profile.isVerified || profile.isPremium) {
    badges.push('verified');
  }

  // Popular (high view count)
  if (profile.viewCount && profile.viewCount > 100) {
    badges.push('popular');
  } else if (profile.viewCount && profile.viewCount > 50) {
    badges.push('hot');
  }

  // Quick responder
  if (profile.messageResponseRate && profile.messageResponseRate > 0.8) {
    badges.push('responsive');
  }

  // Recently active (if not online)
  if (!profile.onlineNow && !profile.rightNow && profile.lastSeen) {
    const lastSeenDate = new Date(profile.lastSeen);
    const hoursSince = (Date.now() - lastSeenDate.getTime()) / (1000 * 60 * 60);
    if (hoursSince <= 1) {
      badges.push('active');
    }
  }

  // Limit to top 2 badges to avoid clutter
  return badges.slice(0, 2);
}

type SocialProofBadgesProps = {
  profile: Parameters<typeof getSocialProofBadges>[0];
  size?: 'sm' | 'md';
  showLabels?: boolean;
  maxBadges?: number;
  className?: string;
};

/**
 * Display social proof badges for a profile
 */
export function SocialProofBadges({
  profile,
  size = 'sm',
  showLabels = true,
  maxBadges = 2,
  className = '',
}: SocialProofBadgesProps) {
  const badges = getSocialProofBadges(profile).slice(0, maxBadges);

  if (badges.length === 0) return null;

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {badges.map((type) => (
        <SocialProofBadgeItem
          key={type}
          type={type}
          size={size}
          showLabel={showLabels}
        />
      ))}
    </div>
  );
}

export default SocialProofBadges;
