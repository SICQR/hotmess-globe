import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, ArrowRight, Zap, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

/**
 * LuxPageBanner - Full-width announcement bar (dismissible)
 * Position: Top of page, fixed or static
 */
export function LuxPageBanner({
  message,
  cta,
  ctaHref,
  type = 'info', // 'info' | 'warning' | 'success' | 'promo' | 'urgent'
  dismissible = true,
  storageKey, // If provided, remembers dismissal
  fixed = false,
  className,
  onDismiss,
  onClick,
}) {
  const [isVisible, setIsVisible] = useState(true);

  // Check if previously dismissed
  useEffect(() => {
    if (storageKey) {
      try {
        const dismissed = localStorage.getItem(`banner_dismissed_${storageKey}`);
        if (dismissed) setIsVisible(false);
      } catch {
        // Ignore
      }
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (storageKey) {
      try {
        localStorage.setItem(`banner_dismissed_${storageKey}`, 'true');
      } catch {
        // Ignore
      }
    }
    onDismiss?.();
  };

  const typeStyles = {
    info: 'bg-[#00D9FF] text-black',
    warning: 'bg-[#FFEB3B] text-black',
    success: 'bg-[#39FF14] text-black',
    promo: 'bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white',
    urgent: 'bg-[#FF1493] text-white animate-pulse',
  };

  const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    promo: Zap,
    urgent: AlertTriangle,
  };

  const Icon = typeIcons[type];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          'lux-page-banner w-full overflow-hidden',
          fixed && 'fixed top-0 left-0 right-0 z-50',
          className
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center gap-3 px-4 py-2 md:py-3',
            typeStyles[type],
            onClick && 'cursor-pointer hover:opacity-90'
          )}
          onClick={onClick}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          
          <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-center flex-1">
            {message}
          </p>

          {cta && ctaHref && (
            <Link
              to={ctaHref}
              className="flex items-center gap-1 text-xs font-black uppercase tracking-wider underline hover:no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              {cta}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}

          {dismissible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 hover:bg-black/10 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * LuxHeroBanner - Large editorial banner with CTA
 * For feature announcements, campaigns, etc.
 */
export function LuxHeroBanner({
  title,
  subtitle,
  description,
  cta,
  ctaHref,
  ctaVariant = 'primary',
  secondaryCta,
  secondaryCtaHref,
  image,
  video,
  overlay = true,
  alignment = 'center', // 'left' | 'center' | 'right'
  height = 'lg', // 'sm' | 'md' | 'lg' | 'full'
  className,
  children,
}) {
  const heightClasses = {
    sm: 'min-h-[300px]',
    md: 'min-h-[400px] md:min-h-[500px]',
    lg: 'min-h-[500px] md:min-h-[600px]',
    full: 'min-h-[100svh]',
  };

  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  const ctaVariants = {
    primary: 'bg-[#FF1493] text-white hover:bg-white hover:text-black border-2 border-[#FF1493] hover:border-white',
    secondary: 'bg-white text-black hover:bg-[#FF1493] hover:text-white border-2 border-white hover:border-[#FF1493]',
    outline: 'bg-transparent text-white border-2 border-white hover:bg-white hover:text-black',
    ghost: 'bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 hover:border-white/50',
  };

  return (
    <div
      className={cn(
        'lux-hero-banner relative overflow-hidden bg-black',
        heightClasses[height],
        className
      )}
    >
      {/* Background Image */}
      {image && !video && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Background Video */}
      {video && (
        <video
          src={video}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay */}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      )}

      {/* Content */}
      <div className={cn(
        'relative z-10 flex flex-col justify-center h-full px-6 md:px-12 py-16',
        alignmentClasses[alignment]
      )}>
        <div className={cn(
          'max-w-4xl',
          alignment === 'center' && 'mx-auto'
        )}>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xs uppercase tracking-[0.4em] text-white/70 mb-4"
            >
              {subtitle}
            </motion.p>
          )}

          {title && (
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black italic text-white leading-[0.9] tracking-tighter mb-6 drop-shadow-2xl"
            >
              {title}
            </motion.h2>
          )}

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-white/90 uppercase tracking-wider mb-8 max-w-2xl"
            >
              {description}
            </motion.p>
          )}

          {(cta || secondaryCta) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className={cn(
                'flex flex-wrap gap-4',
                alignment === 'center' && 'justify-center',
                alignment === 'right' && 'justify-end'
              )}
            >
              {cta && ctaHref && (
                <Link
                  to={ctaHref}
                  className={cn(
                    'inline-flex items-center gap-2 px-8 py-4 font-black uppercase tracking-wider text-lg transition-all duration-300 shadow-2xl',
                    ctaVariants[ctaVariant]
                  )}
                >
                  {cta}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              {secondaryCta && secondaryCtaHref && (
                <Link
                  to={secondaryCtaHref}
                  className={cn(
                    'inline-flex items-center gap-2 px-8 py-4 font-black uppercase tracking-wider text-lg transition-all duration-300 shadow-2xl',
                    ctaVariants.outline
                  )}
                >
                  {secondaryCta}
                </Link>
              )}
            </motion.div>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * LuxPromoBanner - Time-limited offer with countdown
 */
export function LuxPromoBanner({
  title,
  description,
  endTime, // Date object or ISO string
  cta,
  ctaHref,
  image,
  className,
  onExpire,
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!endTime) return;

    const targetDate = new Date(endTime);

    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        onExpire?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (isExpired) return null;

  return (
    <div
      className={cn(
        'lux-promo-banner relative overflow-hidden bg-gradient-to-r from-[#FF1493] via-[#B026FF] to-[#FF1493] bg-[length:200%_100%] animate-gradient',
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,white_10px,white_11px)]" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 px-6 md:px-12 py-8">
        {/* Content */}
        <div className="text-center md:text-left">
          {title && (
            <h3 className="text-2xl md:text-3xl font-black italic text-white mb-2 drop-shadow-lg">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-white/90 uppercase tracking-wider text-sm">
              {description}
            </p>
          )}
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-white" />
          <div className="flex gap-1 text-white font-mono text-xl md:text-2xl font-black">
            {timeLeft.days > 0 && (
              <>
                <span className="bg-black/30 px-2 py-1">{String(timeLeft.days).padStart(2, '0')}</span>
                <span className="opacity-60">:</span>
              </>
            )}
            <span className="bg-black/30 px-2 py-1">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="opacity-60">:</span>
            <span className="bg-black/30 px-2 py-1">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="opacity-60">:</span>
            <span className="bg-black/30 px-2 py-1">{String(timeLeft.seconds).padStart(2, '0')}</span>
          </div>
        </div>

        {/* CTA */}
        {cta && ctaHref && (
          <Link
            to={ctaHref}
            className="px-6 py-3 bg-white text-black font-black uppercase tracking-wider hover:bg-black hover:text-white transition-colors shadow-xl"
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * LuxAdBanner - Third party advertising slots
 * Supports standard IAB sizes
 */
export function LuxAdBanner({
  size = 'leaderboard', // 'leaderboard' | 'medium-rectangle' | 'mobile-banner' | 'skyscraper'
  adSlotId,
  fallbackImage,
  fallbackHref,
  label = 'Sponsored',
  className,
  onLoad,
  onError,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeConfigs = {
    leaderboard: { width: 728, height: 90, className: 'w-[728px] h-[90px] max-w-full' },
    'medium-rectangle': { width: 300, height: 250, className: 'w-[300px] h-[250px]' },
    'mobile-banner': { width: 320, height: 50, className: 'w-[320px] h-[50px]' },
    skyscraper: { width: 160, height: 600, className: 'w-[160px] h-[600px]' },
    'wide-skyscraper': { width: 300, height: 600, className: 'w-[300px] h-[600px]' },
    billboard: { width: 970, height: 250, className: 'w-[970px] h-[250px] max-w-full' },
  };

  const config = sizeConfigs[size] || sizeConfigs.leaderboard;

  // Simulate ad loading (in production, this would integrate with ad network)
  useEffect(() => {
    if (adSlotId) {
      // Here you would typically call your ad network's API
      // For now, we'll simulate with fallback
      const timer = setTimeout(() => {
        if (!fallbackImage) {
          setHasError(true);
          onError?.();
        } else {
          setIsLoaded(true);
          onLoad?.();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [adSlotId, fallbackImage, onLoad, onError]);

  if (hasError && !fallbackImage) return null;

  return (
    <div
      className={cn(
        'lux-ad-banner relative overflow-hidden bg-white/5 border border-white/10 hover:border-[#FF1493]/50 transition-colors group',
        config.className,
        className
      )}
    >
      {/* Sponsored Label */}
      <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-black/70 text-white/60 text-[9px] uppercase tracking-wider font-bold">
        {label}
      </div>

      {/* Ad Content or Fallback */}
      {fallbackImage ? (
        <a
          href={fallbackHref}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block w-full h-full"
        >
          <img
            src={fallbackImage}
            alt="Advertisement"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs uppercase">
          Ad Space
        </div>
      )}

      {/* Gradient border on hover */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#FF1493]/30 transition-colors pointer-events-none" />
    </div>
  );
}

/**
 * LuxFeatureBanner - Feature highlight banner
 */
export function LuxFeatureBanner({
  icon: Icon,
  title,
  description,
  stats = [],
  cta,
  ctaHref,
  variant = 'default', // 'default' | 'gradient' | 'dark'
  className,
}) {
  const variantStyles = {
    default: 'bg-white/5 border-white/10',
    gradient: 'bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 border-[#FF1493]/30',
    dark: 'bg-black border-white/20',
  };

  return (
    <div
      className={cn(
        'lux-feature-banner p-6 md:p-8 border-2 transition-all hover:border-[#FF1493]/50',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Icon */}
        {Icon && (
          <div className="w-16 h-16 bg-[#FF1493] flex items-center justify-center flex-shrink-0">
            <Icon className="w-8 h-8 text-white" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          {title && (
            <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
          )}
          {description && (
            <p className="text-white/70 uppercase tracking-wider text-sm">{description}</p>
          )}
        </div>

        {/* Stats */}
        {stats.length > 0 && (
          <div className="flex gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-black text-[#FF1493]">{stat.value}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {cta && ctaHref && (
          <Link
            to={ctaHref}
            className="px-6 py-3 bg-[#FF1493] text-white font-black uppercase tracking-wider hover:bg-white hover:text-black transition-colors flex-shrink-0"
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export default LuxPageBanner;
