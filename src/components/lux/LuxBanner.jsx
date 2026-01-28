import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * LuxBanner - Chrome Luxury Brutalist Banner System
 * 
 * Variants:
 * - Announcement: Top-of-page dismissible banner
 * - Hero: Large editorial banner with CTA
 * - Promotional: Time-limited offer with countdown
 * - Ad: Third-party advertising slot
 */

/**
 * Announcement Banner - Top of page, dismissible
 */
export function LuxAnnouncementBanner({
  message,
  linkText,
  linkHref,
  onDismiss,
  dismissible = true,
  variant = 'default', // 'default' | 'urgent' | 'success'
  className,
  ...props
}) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const variantStyles = {
    default: 'bg-[#FF1493] text-white',
    urgent: 'bg-[#E5A820] text-black',
    success: 'bg-[#10B981] text-white',
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className={cn(
        'lux-banner-announcement flex items-center justify-center gap-3 px-4 py-3',
        variantStyles[variant],
        className
      )}
      role="alert"
      {...props}
    >
      <p className="font-body text-sm font-semibold uppercase tracking-wider">
        {message}
      </p>
      
      {linkText && linkHref && (
        <a
          href={linkHref}
          className="font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-2 hover:no-underline flex items-center gap-1"
        >
          {linkText}
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {dismissible && (
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 hover:bg-black/20 transition-colors"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

/**
 * Hero Banner - Large editorial banner with background
 */
export function LuxHeroBanner({
  title,
  subtitle,
  description,
  backgroundImage,
  backgroundVideo,
  ctaText,
  ctaHref,
  onCtaClick,
  secondaryCtaText,
  secondaryCtaHref,
  onSecondaryCtaClick,
  overlayGradient = true,
  minHeight = '400px',
  align = 'left', // 'left' | 'center' | 'right'
  className,
  children,
  ...props
}) {
  const alignmentClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  return (
    <div
      className={cn(
        'lux-banner-hero relative overflow-hidden',
        className
      )}
      style={{ minHeight }}
      {...props}
    >
      {/* Background image */}
      {backgroundImage && !backgroundVideo && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      {/* Background video */}
      {backgroundVideo && (
        <video
          src={backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient overlay */}
      {overlayGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/60 to-transparent" />
      )}

      {/* Content */}
      <div
        className={cn(
          'lux-banner-hero-content relative z-10 h-full flex flex-col justify-end p-6 md:p-12',
          alignmentClasses[align]
        )}
        style={{ minHeight }}
      >
        {subtitle && (
          <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#FF1493] mb-2">
            {subtitle}
          </span>
        )}

        {title && (
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-white mb-4">
            {title}
          </h1>
        )}

        {description && (
          <p className="font-body text-lg text-white/80 max-w-2xl mb-6">
            {description}
          </p>
        )}

        {/* CTAs */}
        {(ctaText || secondaryCtaText) && (
          <div className={cn(
            'flex gap-4 flex-wrap',
            align === 'center' && 'justify-center'
          )}>
            {ctaText && (
              <Button
                variant="luxSolid"
                size="lg"
                asChild={!!ctaHref}
                onClick={onCtaClick}
              >
                {ctaHref ? <a href={ctaHref}>{ctaText}</a> : ctaText}
              </Button>
            )}
            {secondaryCtaText && (
              <Button
                variant="luxTertiary"
                size="lg"
                asChild={!!secondaryCtaHref}
                onClick={onSecondaryCtaClick}
              >
                {secondaryCtaHref ? <a href={secondaryCtaHref}>{secondaryCtaText}</a> : secondaryCtaText}
              </Button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

/**
 * Promotional Banner - Time-limited offer with countdown
 */
export function LuxPromoBanner({
  title,
  message,
  ctaText,
  ctaHref,
  onCtaClick,
  endTime, // Date object or ISO string
  backgroundGradient = true,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'lux-banner-promo relative overflow-hidden',
        backgroundGradient && 'bg-gradient-to-r from-[#1a0000] via-[#0D0D0D] to-[#FF1493]',
        'border-2 border-[#FF1493] p-6',
        className
      )}
      {...props}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Content */}
        <div className="flex-1">
          {title && (
            <h3 className="font-display text-2xl md:text-3xl font-bold uppercase text-white mb-1">
              {title}
            </h3>
          )}
          {message && (
            <p className="font-body text-white/80">{message}</p>
          )}
        </div>

        {/* Countdown (if endTime provided) */}
        {endTime && (
          <div className="flex items-center gap-2 text-[#FF1493]">
            <Clock className="w-5 h-5" />
            <CountdownTimer targetDate={endTime} compact />
          </div>
        )}

        {/* CTA */}
        {ctaText && (
          <Button
            variant="luxSecondary"
            size="lg"
            asChild={!!ctaHref}
            onClick={onCtaClick}
          >
            {ctaHref ? <a href={ctaHref}>{ctaText}</a> : ctaText}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Ad Banner - Third-party advertising slot
 */
export function LuxAdBanner({
  size = 'leaderboard', // 'leaderboard' | 'medium-rect' | 'mobile-banner'
  adSlotId,
  fallbackContent,
  className,
  ...props
}) {
  const sizeClasses = {
    leaderboard: 'w-full max-w-[728px] h-[90px]',
    'medium-rect': 'w-[300px] h-[250px]',
    'mobile-banner': 'w-full max-w-[320px] h-[50px]',
  };

  return (
    <div
      className={cn(
        'lux-banner-ad relative flex items-center justify-center',
        'bg-[#0D0D0D]/50 border border-white/10',
        sizeClasses[size],
        className
      )}
      data-ad-slot={adSlotId}
      {...props}
    >
      {/* Sponsored label */}
      <span className="lux-banner-ad-label absolute top-2 right-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/40">
        Sponsored
      </span>

      {/* Ad content or fallback */}
      {fallbackContent || (
        <span className="font-mono text-xs text-white/30 uppercase tracking-wider">
          Ad Space
        </span>
      )}
    </div>
  );
}

/**
 * CountdownTimer - Used in promotional banners
 */
export function CountdownTimer({
  targetDate,
  compact = false,
  onComplete,
  className,
  ...props
}) {
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        onComplete?.();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (compact) {
    return (
      <span className={cn('font-mono text-sm font-bold', className)} {...props}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    );
  }

  return (
    <div className={cn('lux-countdown flex gap-4', className)} {...props}>
      {timeLeft.days > 0 && (
        <div className="lux-countdown-segment text-center">
          <span className="lux-countdown-value font-display text-4xl md:text-5xl font-bold text-[#FF1493] block">
            {timeLeft.days}
          </span>
          <span className="lux-countdown-label font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
            Days
          </span>
        </div>
      )}
      <div className="lux-countdown-segment text-center">
        <span className="lux-countdown-value font-display text-4xl md:text-5xl font-bold text-[#FF1493] block">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="lux-countdown-label font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
          Hours
        </span>
      </div>
      <div className="lux-countdown-segment text-center">
        <span className="lux-countdown-value font-display text-4xl md:text-5xl font-bold text-[#FF1493] block">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="lux-countdown-label font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
          Mins
        </span>
      </div>
      <div className="lux-countdown-segment text-center">
        <span className="lux-countdown-value font-display text-4xl md:text-5xl font-bold text-[#FF1493] block">
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="lux-countdown-label font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/50">
          Secs
        </span>
      </div>
    </div>
  );
}

export default LuxHeroBanner;
