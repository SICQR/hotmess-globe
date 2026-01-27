import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Profile, TravelTimeResponse } from './types';
import { SmartProfileCard } from './SmartProfileCard';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { cn } from '@/lib/utils';

type LatLng = { lat: number; lng: number };

interface BentoGridProps {
  profiles: Profile[];
  viewerLocation: LatLng | null;
  viewerProfile?: unknown;
  onOpenProfile: (profile: Profile) => void;
  onNavigateUrl: (url: string) => void;
  // Optional travel times map keyed by profile ID
  travelTimes?: Map<string, TravelTimeResponse>;
  // Layout options
  className?: string;
  maxSpotlights?: number;
  maxFeatured?: number;
}

// Calculate relevance score for sorting/sizing
const calculateRelevance = (profile: Profile): number => {
  let score = 0;

  // Match probability (0-40)
  if (profile.matchProbability) score += profile.matchProbability * 0.4;

  // Proximity bonus (0-20)
  if (profile.distanceKm !== undefined) {
    if (profile.distanceKm < 1) score += 20;
    else if (profile.distanceKm < 5) score += 15;
    else if (profile.distanceKm < 10) score += 10;
  }

  // Active status (0-15)
  if (profile.rightNow || profile.right_now_active) score += 15;
  else if (profile.onlineNow || profile.online_now) score += 8;

  // Engagement (0-10)
  const views = profile.profile_views_count || profile.viewCount || 0;
  if (views >= 100) score += 10;
  else if (views >= 50) score += 5;

  return Math.min(100, score);
};

// Determine card size based on relevance
type CardSize = 'standard' | 'featured' | 'spotlight';

const getCardSize = (
  relevance: number,
  index: number,
  spotlightCount: number,
  featuredCount: number,
  maxSpotlights: number,
  maxFeatured: number
): CardSize => {
  // First few high-relevance cards get spotlight
  if (relevance >= 90 && spotlightCount < maxSpotlights && index < 4) {
    return 'spotlight';
  }
  // Next tier gets featured
  if (relevance >= 75 && featuredCount < maxFeatured && index < 8) {
    return 'featured';
  }
  return 'standard';
};

/**
 * BentoGrid - Smart grid layout with variable card sizes
 * Cards are sized based on relevance score for visual hierarchy
 */
export function BentoGrid({
  profiles,
  viewerLocation,
  viewerProfile,
  onOpenProfile,
  onNavigateUrl,
  travelTimes,
  className,
  maxSpotlights = 1,
  maxFeatured = 3,
}: BentoGridProps) {
  // Calculate sizes for each profile
  const profilesWithSizes = useMemo(() => {
    // Sort by relevance first
    const sorted = [...profiles].map((profile) => ({
      profile,
      relevance: calculateRelevance(profile),
    }));

    // Assign sizes with limits
    let spotlightCount = 0;
    let featuredCount = 0;

    return sorted.map(({ profile, relevance }, index) => {
      const size = getCardSize(
        relevance,
        index,
        spotlightCount,
        featuredCount,
        maxSpotlights,
        maxFeatured
      );

      if (size === 'spotlight') spotlightCount++;
      if (size === 'featured') featuredCount++;

      return { profile, relevance, size };
    });
  }, [profiles, maxSpotlights, maxFeatured]);

  if (profiles.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-white/50">
        <p>No profiles to display</p>
      </div>
    );
  }

  return (
    <motion.div
      className={cn('bento-grid', className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {profilesWithSizes.map(({ profile, size }, index) => (
        <motion.div
          key={profile.id}
          variants={staggerItem}
          className={cn(
            // Base aspect ratio
            'aspect-[4/5]',
            // Size-specific grid spans
            size === 'spotlight' && 'col-span-2 row-span-2 aspect-square md:aspect-[4/5]',
            size === 'featured' && 'row-span-2'
          )}
        >
          <SmartProfileCard
            profile={profile}
            viewerLocation={viewerLocation}
            viewerProfile={viewerProfile}
            onOpenProfile={onOpenProfile}
            onNavigateUrl={onNavigateUrl}
            size={size}
            travelTime={travelTimes?.get(profile.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * BentoGridSkeleton - Loading state for BentoGrid
 */
export function BentoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="bento-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'aspect-[4/5] rounded-2xl overflow-hidden',
            'bg-white/5 animate-pulse',
            // First item is spotlight on larger screens
            i === 0 && 'md:col-span-2 md:row-span-2 md:aspect-square'
          )}
        >
          <div className="h-full flex flex-col justify-end p-4">
            <div className="space-y-2">
              <div className="h-4 w-2/3 bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-white/10 rounded" />
              <div className="flex gap-2 pt-2">
                <div className="h-8 flex-1 bg-white/10 rounded" />
                <div className="h-8 w-16 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BentoGrid;
