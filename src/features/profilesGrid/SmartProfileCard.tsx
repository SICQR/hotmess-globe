import React, { useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Profile, TravelTimeResponse } from './types';
import { Button } from '@/components/ui/button';
import { SmartBadge, buildSmartBadges } from './components/SmartBadge';
import { useCursorGlow } from '@/hooks/useCursorGlow';
import { useLongPress } from './useLongPress';
import { useVisibility } from './useVisibility';
import { cardHover, springConfig } from '@/lib/animations';
import { cn } from '@/lib/utils';

type LatLng = { lat: number; lng: number };

interface SmartProfileCardProps {
  profile: Profile;
  viewerLocation: LatLng | null;
  viewerProfile?: unknown;
  onOpenProfile: (profile: Profile) => void;
  onNavigateUrl: (url: string) => void;
  // Smart sizing
  size?: 'standard' | 'featured' | 'spotlight';
  // Travel data
  travelTime?: TravelTimeResponse | null;
  // Context for smart features
  viewerInterests?: string[];
}

// Get photo URLs from profile (handles legacy formats)
const getPhotoUrls = (profile: Profile): string[] => {
  const urls: string[] = [];
  const push = (value: unknown) => {
    const url = typeof value === 'string' ? value.trim() : '';
    if (url && !urls.includes(url)) urls.push(url);
  };

  // Canonical: profile.photos
  if (Array.isArray(profile.photos)) {
    for (const item of profile.photos) {
      if (typeof item === 'string') push(item);
      else if (item && typeof item === 'object') push(item.url || item.file_url);
    }
  }

  // Fallbacks
  push(profile.avatar_url);
  push(profile.avatarUrl);
  if (Array.isArray(profile.photo_urls)) profile.photo_urls.forEach(push);
  if (Array.isArray(profile.images)) {
    for (const img of profile.images) {
      if (typeof img === 'string') push(img);
      else if (img && typeof img === 'object') {
        push((img as any).url || (img as any).src || (img as any).file_url);
      }
    }
  }

  return urls.filter(Boolean).slice(0, 5);
};

// Calculate relevance score for dynamic sizing
const calculateRelevanceScore = (
  profile: Profile,
  viewerInterests?: string[]
): number => {
  let score = 0;

  // Match probability (0-40 points)
  if (profile.matchProbability) {
    score += profile.matchProbability * 0.4;
  }

  // Proximity bonus (0-20 points)
  if (profile.distanceKm !== undefined) {
    if (profile.distanceKm < 1) score += 20;
    else if (profile.distanceKm < 5) score += 15;
    else if (profile.distanceKm < 10) score += 10;
  }

  // Active status (0-15 points)
  if (profile.rightNow || profile.right_now_active) score += 15;
  else if (profile.onlineNow || profile.online_now) score += 8;

  // Profile completeness (0-10 points)
  if (profile.bio) score += 3;
  if (profile.tags && profile.tags.length > 0) score += 3;
  if (getPhotoUrls(profile).length > 1) score += 4;

  // Engagement (0-10 points)
  const views = profile.profile_views_count || profile.viewCount || 0;
  if (views >= 100) score += 10;
  else if (views >= 50) score += 5;

  // Premium/verified bonus (0-5 points)
  if (profile.verified) score += 3;
  if (profile.profileType === 'premium') score += 2;

  return Math.min(100, score);
};

// Get smart size based on relevance
const getSmartSize = (relevance: number): 'standard' | 'featured' | 'spotlight' => {
  if (relevance >= 90) return 'spotlight';
  if (relevance >= 75) return 'featured';
  return 'standard';
};

// Primary action based on profile type
const getPrimaryAction = (profile: Profile) => {
  const isSeller = profile.profileType === 'seller';
  const isCreator = profile.profileType === 'creator';
  const hasProducts = profile.hasProducts || (profile.productPreviews?.length ?? 0) > 0;

  if (isSeller && hasProducts) return { key: 'shop', label: 'Shop', variant: 'hotGradient' as const };
  if (isCreator) return { key: 'listen', label: 'Listen', variant: 'cyanGradient' as const };
  if (profile.email) return { key: 'message', label: 'Message', variant: 'hotGradient' as const };
  return { key: 'view', label: 'View', variant: 'glass' as const };
};

/**
 * SmartProfileCard - Context-aware profile card with dynamic styling
 */
export function SmartProfileCard({
  profile,
  viewerLocation,
  viewerProfile,
  onOpenProfile,
  onNavigateUrl,
  size: sizeProp,
  travelTime,
  viewerInterests,
}: SmartProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { isVisible, ref: visibilityRef } = useVisibility({ threshold: 0.1 });

  // Calculate relevance and smart size
  const relevance = useMemo(
    () => calculateRelevanceScore(profile, viewerInterests),
    [profile, viewerInterests]
  );
  const size = sizeProp || getSmartSize(relevance);
  const isHighMatch = (profile.matchProbability ?? 0) >= 80;
  const isNearby = (profile.distanceKm ?? 999) < 1;
  const isLive = profile.rightNow || profile.right_now_active;

  // Build smart badges
  const badges = useMemo(
    () =>
      buildSmartBadges({
        matchProbability: profile.matchProbability,
        distanceMeters: profile.distanceKm ? profile.distanceKm * 1000 : undefined,
        rightNow: isLive,
        profileType: profile.profileType,
        viewCount: profile.profile_views_count || profile.viewCount,
        isVerified: profile.verified,
      }),
    [profile, isLive]
  );

  // Photos
  const photos = useMemo(() => getPhotoUrls(profile), [profile]);
  const primaryPhoto = photos[0] || '';

  // Cursor glow effect (only on desktop)
  useCursorGlow(cardRef, {
    enabled: typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches,
    glowColor: isHighMatch ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 20, 147, 0.15)',
    intensity: isHighMatch ? 1.2 : 1,
  });

  // Long press for mobile
  const longPressHandlers = useLongPress({ delayMs: 300 });

  // Primary action
  const primaryAction = useMemo(() => getPrimaryAction(profile), [profile]);

  // Handle card click
  const handleClick = useCallback(() => {
    onOpenProfile(profile);
  }, [onOpenProfile, profile]);

  // Handle action button click
  const handleActionClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (primaryAction.key === 'message' && profile.email) {
        onNavigateUrl(`/social/inbox?to=${encodeURIComponent(profile.email)}`);
      } else if (primaryAction.key === 'shop') {
        onNavigateUrl(`/marketplace?seller=${profile.id}`);
      } else {
        onOpenProfile(profile);
      }
    },
    [primaryAction, profile, onNavigateUrl, onOpenProfile]
  );

  // CSS class for card size
  const sizeClass = {
    standard: '',
    featured: 'smart-card--featured',
    spotlight: 'smart-card--spotlight',
  }[size];

  return (
    <motion.div
      ref={(el) => {
        (cardRef as any).current = el;
        (visibilityRef as any).current = el;
      }}
      className={cn(
        'smart-card cursor-glow relative rounded-2xl overflow-hidden',
        'bg-black/40 backdrop-blur-md border border-white/10',
        'cursor-pointer group',
        sizeClass,
        isHighMatch && 'smart-card--high-match',
        isLive && 'ring-2 ring-red-500/50'
      )}
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      transition={springConfig.gentle}
      onClick={handleClick}
      {...longPressHandlers}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {primaryPhoto ? (
          <img
            src={primaryPhoto}
            alt={profile.profileName || 'Profile'}
            className={cn(
              'w-full h-full object-cover',
              'transition-transform duration-500 ease-out',
              'group-hover:scale-105'
            )}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <span className="text-4xl font-bold text-white/30">
              {(profile.profileName?.[0] || 'H').toUpperCase()}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-3 md:p-4">
        {/* Top: Badges */}
        <div className="flex justify-between items-start">
          <SmartBadge badges={badges} maxVisible={size === 'spotlight' ? 2 : 1} size="sm" />
          
          {/* Photo count indicator */}
          {photos.length > 1 && (
            <div className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/80 text-xs">
              1/{photos.length}
            </div>
          )}
        </div>

        {/* Bottom: Info + Actions */}
        <div className="space-y-2">
          {/* Name and title */}
          <div>
            <h3 className="font-bold text-white text-base md:text-lg truncate">
              {profile.profileName || 'Anonymous'}
            </h3>
            {profile.title && (
              <p className="text-white/70 text-xs md:text-sm truncate">
                {profile.title}
              </p>
            )}
          </div>

          {/* Location + Travel time */}
          {(profile.locationLabel || travelTime) && (
            <div className="flex items-center gap-2 text-white/60 text-xs">
              {profile.locationLabel && (
                <span className="truncate">{profile.locationLabel}</span>
              )}
              {travelTime?.fastest && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">
                  {Math.ceil(travelTime.fastest.durationSeconds / 60)}m
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {profile.tags && profile.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {profile.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button
              variant={primaryAction.variant}
              size="sm"
              className="flex-1"
              onClick={handleActionClick}
            >
              {primaryAction.label}
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfile(profile);
              }}
            >
              Open
            </Button>
          </div>
        </div>
      </div>

      {/* Live indicator pulse */}
      {isLive && (
        <div className="absolute top-3 right-3 z-20">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default SmartProfileCard;
