/**
 * SponsoredBannerDisplay - Component to fetch and display active sponsored banners
 * Can be placed on any page to show relevant advertising
 */

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Sparkles } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * Fetch active banners for a specific placement location
 */
async function fetchActiveBanners(location = 'all') {
  const now = new Date().toISOString();
  
  let query = supabase
    .from('sponsored_placements')
    .select('*')
    .eq('placement_type', 'banner')
    .eq('status', 'active')
    .lt('start_date', now)
    .gt('end_date', now);

  if (location !== 'all') {
    query = query.or(`placement_location.eq.${location},placement_location.eq.all`);
  }

  const { data, error } = await query.limit(3);
  
  if (error) {
    console.error('Failed to fetch banners:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Track banner impression
 */
async function trackImpression(bannerId) {
  try {
    await supabase.rpc('increment_sponsorship_impressions', { placement_id: bannerId });
  } catch (error) {
    console.warn('Failed to track impression:', error);
  }
}

/**
 * Track banner click
 */
async function trackClick(bannerId) {
  try {
    await supabase.rpc('increment_sponsorship_clicks', { placement_id: bannerId });
  } catch (error) {
    console.warn('Failed to track click:', error);
  }
}

/**
 * SponsoredBanner - Single banner display
 */
function SponsoredBanner({ banner, variant = 'default', onDismiss }) {
  useEffect(() => {
    // Track impression when banner is displayed
    if (banner?.id) {
      trackImpression(banner.id);
    }
  }, [banner?.id]);

  const handleClick = () => {
    if (banner?.id) {
      trackClick(banner.id);
    }
    if (banner?.destination_url) {
      window.open(banner.destination_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!banner) return null;

  if (variant === 'slim') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="relative group cursor-pointer"
        onClick={handleClick}
      >
        <div className="bg-gradient-to-r from-[#E62020]/20 to-[#B026FF]/20 border border-[#E62020]/30 rounded-lg p-3 flex items-center justify-between hover:border-[#E62020]/50 transition-colors">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-[#E62020]" />
            <span className="text-sm font-medium">{banner.name || 'Sponsored'}</span>
            {banner.description && (
              <span className="text-xs text-white/60 hidden md:inline">
                {banner.description}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase">Ad</span>
            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'image') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative group cursor-pointer rounded-xl overflow-hidden"
        onClick={handleClick}
      >
        {banner.image_url ? (
          <img 
            src={banner.image_url} 
            alt={banner.name || 'Sponsored'} 
            className="w-full h-auto"
          />
        ) : (
          <div className="bg-gradient-to-br from-[#E62020] to-[#B026FF] aspect-[4/1] flex items-center justify-center">
            <span className="text-2xl font-black text-white">
              {banner.name || 'Sponsored'}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white/60 uppercase">
          Ad
        </div>
        {onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm p-1 rounded text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="relative group cursor-pointer"
      onClick={handleClick}
    >
      <div className="bg-gradient-to-r from-[#E62020]/10 to-[#B026FF]/10 border border-[#E62020]/30 rounded-xl p-4 hover:border-[#E62020]/50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {banner.image_url && (
              <img 
                src={banner.image_url} 
                alt="" 
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            <h4 className="font-bold text-sm mb-1">{banner.name || 'Sponsored'}</h4>
            {banner.description && (
              <p className="text-xs text-white/60 line-clamp-2">{banner.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] text-white/40 uppercase px-2 py-0.5 bg-white/5 rounded">Ad</span>
            {banner.destination_url && (
              <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-[#E62020]" />
            )}
          </div>
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute -top-2 -right-2 bg-black border border-white/20 p-1 rounded-full text-white/60 hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

/**
 * SponsoredBannerDisplay - Container that fetches and displays banners
 */
export default function SponsoredBannerDisplay({ 
  location = 'all', // 'homepage', 'events', 'social', 'all'
  variant = 'default', // 'default', 'slim', 'image'
  maxBanners = 1,
  dismissible = true,
  className = ''
}) {
  const [dismissed, setDismissed] = React.useState([]);

  const { data: banners = [] } = useQuery({
    queryKey: ['sponsored-banners', location],
    queryFn: () => fetchActiveBanners(location),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const visibleBanners = banners
    .filter(b => !dismissed.includes(b.id))
    .slice(0, maxBanners);

  if (visibleBanners.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence mode="popLayout">
        {visibleBanners.map((banner) => (
          <SponsoredBanner
            key={banner.id}
            banner={banner}
            variant={variant}
            onDismiss={dismissible ? () => setDismissed(prev => [...prev, banner.id]) : undefined}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Export individual components for flexibility
export { SponsoredBanner, fetchActiveBanners, trackImpression, trackClick };
