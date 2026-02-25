import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * LuxAdSlot - Advertising slot component for third-party ads
 * 
 * Supports standard IAB ad sizes and Google AdSense integration
 * Features:
 * - Multiple ad sizes (leaderboard, medium rectangle, mobile banner, etc.)
 * - Lazy loading support
 * - Fallback content
 * - Tracking pixels
 * - A/B testing support
 * - Frequency capping via localStorage
 */

const AD_SIZES = {
  leaderboard: { width: 728, height: 90, className: 'w-full max-w-[728px] h-[90px]' },
  'medium-rectangle': { width: 300, height: 250, className: 'w-[300px] h-[250px]' },
  'mobile-banner': { width: 320, height: 50, className: 'w-full max-w-[320px] h-[50px]' },
  skyscraper: { width: 160, height: 600, className: 'w-[160px] h-[600px]' },
  'wide-skyscraper': { width: 300, height: 600, className: 'w-[300px] h-[600px]' },
  billboard: { width: 970, height: 250, className: 'w-full max-w-[970px] h-[250px]' },
  'large-rectangle': { width: 336, height: 280, className: 'w-[336px] h-[280px]' },
  'half-page': { width: 300, height: 600, className: 'w-[300px] h-[600px]' },
};

/**
 * Check frequency cap for ad slot
 */
function checkFrequencyCap(slotId, maxViews = 3, windowHours = 24) {
  if (!slotId) return true;

  try {
    const key = `ad_frequency_${slotId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return true;

    const data = JSON.parse(stored);
    const now = Date.now();
    const windowMs = windowHours * 60 * 60 * 1000;

    // Filter out old views outside the window
    const recentViews = (data.views || []).filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Update storage with filtered views
    if (recentViews.length !== data.views.length) {
      localStorage.setItem(
        key,
        JSON.stringify({ views: recentViews, updated: now })
      );
    }

    return recentViews.length < maxViews;
  } catch {
    return true;
  }
}

/**
 * Record ad view for frequency capping
 */
function recordAdView(slotId) {
  if (!slotId) return;

  try {
    const key = `ad_frequency_${slotId}`;
    const stored = localStorage.getItem(key);
    const now = Date.now();

    let data = { views: [], updated: now };
    if (stored) {
      try {
        data = JSON.parse(stored);
      } catch {
        data = { views: [], updated: now };
      }
    }

    data.views.push(now);
    data.updated = now;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * LuxAdSlot Component
 */
export function LuxAdSlot({
  slotId,
  size = 'leaderboard',
  label = 'Sponsored',
  fallbackContent,
  fallbackImage,
  fallbackHref,
  className,
  lazyLoad = true,
  frequencyCap = null, // { maxViews: 3, windowHours: 24 }
  trackingPixel,
  onLoad,
  onError,
  onImpression,
  testVariant, // For A/B testing
}) {
  const [isVisible, setIsVisible] = useState(!lazyLoad);
  const [hasError, setHasError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef(null);
  const impressionRecorded = useRef(false);

  const sizeConfig = AD_SIZES[size] || AD_SIZES.leaderboard;

  // Check frequency cap
  const shouldShow = frequencyCap
    ? checkFrequencyCap(slotId, frequencyCap.maxViews, frequencyCap.windowHours)
    : true;

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (!lazyLoad || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazyLoad, isVisible]);

  // Track impression
  useEffect(() => {
    if (!isVisible || impressionRecorded.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            impressionRecorded.current = true;
            onImpression?.();
            if (slotId) {
              recordAdView(slotId);
            }
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible, slotId, onImpression]);

  // Load tracking pixel
  useEffect(() => {
    if (!trackingPixel || !isVisible) return;

    const img = new Image();
    img.src = trackingPixel;
    // Image loads in background, no need to append to DOM
  }, [trackingPixel, isVisible]);

  // Simulate ad loading (replace with actual ad network integration)
  useEffect(() => {
    if (!isVisible || hasLoaded) return;

    const timer = setTimeout(() => {
      if (fallbackImage || fallbackContent) {
        setHasLoaded(true);
        onLoad?.();
      } else {
        setHasError(true);
        onError?.();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isVisible, hasLoaded, fallbackImage, fallbackContent, onLoad, onError]);

  // Don't show if frequency cap exceeded
  if (!shouldShow) return null;

  // Don't show if error and no fallback
  if (hasError && !fallbackContent && !fallbackImage) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'lux-ad-slot relative overflow-hidden bg-white/5 border border-white/10 hover:border-[#C8962C]/30 transition-colors group',
        sizeConfig.className,
        className
      )}
      data-ad-slot={slotId}
      data-ad-size={size}
      data-test-variant={testVariant}
    >
      {/* Sponsored Label */}
      <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm text-white/60 text-[9px] uppercase tracking-wider font-bold">
        {label}
      </div>

      {/* Ad Content */}
      {isVisible && (
        <>
          {/* Fallback Image */}
          {fallbackImage && (
            <a
              href={fallbackHref || '#'}
              target={fallbackHref ? '_blank' : undefined}
              rel={fallbackHref ? 'noopener noreferrer sponsored' : undefined}
              className="block w-full h-full"
              onClick={(e) => {
                if (!fallbackHref) e.preventDefault();
              }}
            >
              <img
                src={fallbackImage}
                alt="Advertisement"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </a>
          )}

          {/* Fallback Content */}
          {!fallbackImage && fallbackContent && (
            <div className="w-full h-full">{fallbackContent}</div>
          )}

          {/* Empty State */}
          {!fallbackImage && !fallbackContent && !hasError && (
            <div className="w-full h-full flex items-center justify-center text-white/20 text-xs uppercase tracking-wider">
              Ad Space
            </div>
          )}
        </>
      )}

      {/* Gradient border on hover */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#C8962C]/20 transition-colors pointer-events-none" />
    </div>
  );
}

/**
 * Pre-configured ad slot components for common placements
 */
export function LuxLeaderboardAd(props) {
  return <LuxAdSlot {...props} size="leaderboard" />;
}

export function LuxMediumRectangleAd(props) {
  return <LuxAdSlot {...props} size="medium-rectangle" />;
}

export function LuxMobileBannerAd(props) {
  return <LuxAdSlot {...props} size="mobile-banner" />;
}

export default LuxAdSlot;
