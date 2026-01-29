/**
 * Ad Slot Components
 * 
 * Placeholder ad slots for future monetization.
 * Supports multiple sizes and placements.
 */

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useState } from 'react';

// Ad sizes following IAB standards
const AD_SIZES = {
  // Mobile
  mobileBanner: { width: 320, height: 50, label: 'Mobile Banner' },
  largeMobileBanner: { width: 320, height: 100, label: 'Large Mobile Banner' },
  
  // Desktop
  leaderboard: { width: 728, height: 90, label: 'Leaderboard' },
  mediumRectangle: { width: 300, height: 250, label: 'Medium Rectangle' },
  wideSkyscraper: { width: 160, height: 600, label: 'Wide Skyscraper' },
  
  // Responsive
  responsive: { width: '100%', height: 'auto', label: 'Responsive' },
};

/**
 * Base Ad Slot Component
 */
export function AdSlot({
  size = 'mediumRectangle',
  className,
  showLabel = true,
  dismissible = false,
  onDismiss,
  children,
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const adSize = AD_SIZES[size] || AD_SIZES.mediumRectangle;

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        'relative bg-white/5 border border-white/10 rounded-lg overflow-hidden',
        'flex items-center justify-center',
        className
      )}
      style={{
        width: typeof adSize.width === 'number' ? `${adSize.width}px` : adSize.width,
        minHeight: typeof adSize.height === 'number' ? `${adSize.height}px` : '100px',
      }}
    >
      {/* Sponsored label */}
      {showLabel && (
        <div className="absolute top-1 left-2 text-[8px] text-white/30 uppercase tracking-wider">
          Sponsored
        </div>
      )}

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute top-1 right-1 p-1 text-white/30 hover:text-white/60 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Ad content or placeholder */}
      {children || (
        <div className="text-center text-white/20 p-4">
          <div className="text-xs uppercase tracking-wider mb-1">Ad Space</div>
          <div className="text-[10px]">{adSize.label}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Leaderboard Ad (728x90) - Top of page
 */
export function LeaderboardAd({ className, ...props }) {
  return (
    <div className={cn('flex justify-center py-2', className)}>
      <AdSlot 
        size="leaderboard" 
        className="hidden md:flex max-w-full"
        {...props} 
      />
      <AdSlot 
        size="mobileBanner" 
        className="flex md:hidden"
        {...props} 
      />
    </div>
  );
}

/**
 * Medium Rectangle Ad (300x250) - Sidebar/inline
 */
export function MediumRectangleAd({ className, ...props }) {
  return (
    <div className={cn('flex justify-center', className)}>
      <AdSlot size="mediumRectangle" {...props} />
    </div>
  );
}

/**
 * Mobile Banner Ad (320x50) - Bottom/inline
 */
export function MobileBannerAd({ className, ...props }) {
  return (
    <div className={cn('flex justify-center md:hidden', className)}>
      <AdSlot size="mobileBanner" {...props} />
    </div>
  );
}

/**
 * Native Ad Card - Blends with content
 */
export function NativeAdCard({
  image,
  title = 'Sponsored Content',
  description = 'Check out this amazing offer',
  cta = 'Learn More',
  onClick,
  className,
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white/5 border border-white/10 rounded-lg overflow-hidden cursor-pointer',
        'hover:border-white/20 transition-colors',
        className
      )}
    >
      {/* Sponsored label */}
      <div className="px-3 pt-2 text-[8px] text-white/30 uppercase tracking-wider">
        Sponsored
      </div>

      {/* Image */}
      {image && (
        <div className="aspect-video bg-white/5">
          <img src={image} alt={title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h4 className="font-bold text-white text-sm mb-1">{title}</h4>
        <p className="text-xs text-white/60 mb-2 line-clamp-2">{description}</p>
        <span className="text-xs text-[#FF1493] font-bold uppercase">{cta} →</span>
      </div>
    </div>
  );
}

/**
 * Sticky Footer Ad
 */
export function StickyFooterAd({ className, onClose, ...props }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-40 bg-black/95 border-t border-white/10 p-2',
      'flex justify-center items-center gap-2',
      className
    )}>
      <AdSlot size="mobileBanner" showLabel={false} {...props} />
      <button
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        className="p-2 text-white/40 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Interstitial Ad (Full screen)
 */
export function InterstitialAd({ 
  isOpen, 
  onClose, 
  autoCloseAfter = 5000,
  children 
}) {
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseAfter / 1000));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      {/* Close button */}
      <div className="absolute top-4 right-4">
        {countdown > 0 ? (
          <span className="text-white/40 text-sm">Skip in {countdown}s</span>
        ) : (
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Close
          </button>
        )}
      </div>

      {/* Ad content */}
      <div className="max-w-lg w-full mx-4">
        {children || (
          <AdSlot size="mediumRectangle" showLabel={false} />
        )}
      </div>
    </div>
  );
}

export default AdSlot;
