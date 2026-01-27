import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * AdSlot - Chrome Luxury Brutalist Ad Placement Component
 * 
 * Supports:
 * - Google AdSense integration
 * - Custom ad campaigns (loaded from Supabase)
 * - Multiple standard sizes
 * - Fallback content
 * - Tracking/analytics
 */

// Standard ad sizes
const AD_SIZES = {
  leaderboard: { width: 728, height: 90 },
  'medium-rect': { width: 300, height: 250 },
  'mobile-banner': { width: 320, height: 50 },
  'large-rect': { width: 336, height: 280 },
  'half-page': { width: 300, height: 600 },
  'billboard': { width: 970, height: 250 },
  'skyscraper': { width: 160, height: 600 },
};

export function AdSlot({
  size = 'leaderboard',
  slotId,
  adClient, // Google AdSense client ID
  adSlot, // Google AdSense slot ID
  customAd, // Custom ad object { imageUrl, linkUrl, altText }
  fallbackContent,
  className,
  onImpression,
  onClick,
  testMode = false,
  ...props
}) {
  const adRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const dimensions = AD_SIZES[size] || AD_SIZES.leaderboard;

  // Track impressions
  useEffect(() => {
    if (!adRef.current || hasError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            setIsLoaded(true);
            onImpression?.({
              slotId,
              size,
              timestamp: new Date().toISOString(),
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(adRef.current);

    return () => observer.disconnect();
  }, [slotId, size, onImpression, isLoaded, hasError]);

  // Handle ad click
  const handleClick = (e) => {
    onClick?.({
      slotId,
      size,
      timestamp: new Date().toISOString(),
      customAd: !!customAd,
    });
  };

  // Render custom ad
  if (customAd) {
    return (
      <div
        ref={adRef}
        className={cn(
          'lux-ad-slot relative flex items-center justify-center',
          'bg-[#0D0D0D]/50 border border-white/10 overflow-hidden',
          className
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: '100%',
        }}
        data-slot-id={slotId}
        data-size={size}
        {...props}
      >
        {/* Sponsored label */}
        <span className="absolute top-1 right-2 z-10 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/40 bg-black/60 px-1">
          Sponsored
        </span>

        <a
          href={customAd.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="block w-full h-full"
        >
          <img
            src={customAd.imageUrl}
            alt={customAd.altText || 'Advertisement'}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        </a>
      </div>
    );
  }

  // Render Google AdSense
  if (adClient && adSlot && !testMode) {
    return (
      <div
        ref={adRef}
        className={cn(
          'lux-ad-slot relative',
          'bg-[#0D0D0D]/50 border border-white/10',
          className
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: '100%',
        }}
        data-slot-id={slotId}
        data-size={size}
        {...props}
      >
        {/* Sponsored label */}
        <span className="absolute top-1 right-2 z-10 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
          Sponsored
        </span>

        {/* Google AdSense */}
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: dimensions.width,
            height: dimensions.height,
          }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Render fallback or placeholder
  return (
    <div
      ref={adRef}
      className={cn(
        'lux-ad-slot relative flex items-center justify-center',
        'bg-[#0D0D0D]/30 border border-dashed border-white/10',
        className
      )}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: '100%',
      }}
      data-slot-id={slotId}
      data-size={size}
      {...props}
    >
      {/* Sponsored label */}
      <span className="absolute top-1 right-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">
        Sponsored
      </span>

      {fallbackContent || (
        <div className="text-center">
          <span className="font-mono text-xs text-white/30 uppercase tracking-wider block">
            Ad Space
          </span>
          <span className="font-mono text-[10px] text-white/20">
            {dimensions.width}x{dimensions.height}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * AdBanner - Pre-configured ad placements for common locations
 */
export function AdBanner({
  placement = 'inline', // 'header' | 'inline' | 'sidebar' | 'footer'
  className,
  ...props
}) {
  const placementConfigs = {
    header: {
      size: 'leaderboard',
      className: 'mx-auto my-4',
    },
    inline: {
      size: 'medium-rect',
      className: 'mx-auto my-6',
    },
    sidebar: {
      size: 'skyscraper',
      className: 'sticky top-4',
    },
    footer: {
      size: 'billboard',
      className: 'mx-auto my-4',
    },
    mobile: {
      size: 'mobile-banner',
      className: 'mx-auto my-2',
    },
  };

  const config = placementConfigs[placement] || placementConfigs.inline;

  return (
    <AdSlot
      size={config.size}
      className={cn(config.className, className)}
      {...props}
    />
  );
}

/**
 * SponsoredContent - Native ad format that matches content style
 */
export function SponsoredContent({
  title,
  description,
  imageUrl,
  linkUrl,
  sponsor,
  className,
  onImpression,
  onClick,
  ...props
}) {
  const ref = useRef(null);
  const [impressed, setImpressed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressed) {
            setImpressed(true);
            onImpression?.({ title, sponsor });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [impressed, onImpression, title, sponsor]);

  return (
    <a
      ref={ref}
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => onClick?.({ title, sponsor })}
      className={cn(
        'block bg-[#0D0D0D] border border-white/10 overflow-hidden',
        'transition-all duration-150 hover:border-white/30 hover:translate-y-[-2px]',
        className
      )}
      {...props}
    >
      {/* Image */}
      {imageUrl && (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          <span className="absolute top-2 right-2 px-2 py-1 bg-black/80 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/60">
            Sponsored
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {sponsor && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#FF1493] mb-1 block">
            {sponsor}
          </span>
        )}
        {title && (
          <h4 className="font-body text-sm font-semibold text-white mb-1">
            {title}
          </h4>
        )}
        {description && (
          <p className="font-body text-xs text-white/60 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </a>
  );
}

export default AdSlot;
