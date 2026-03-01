import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LuxCountdownTimer - Countdown timer for limited offers and events
 * 
 * Features:
 * - Multiple display formats (full, compact, minimal)
 * - Urgency styling as time runs out
 * - Custom end time handling
 * - Animated number flips
 * - LED pulse effect
 */

export function LuxCountdownTimer({
  endTime, // Date object or ISO string
  title,
  description,
  variant = 'default', // 'default' | 'compact' | 'minimal' | 'banner'
  urgentThreshold = 3600000, // 1 hour in ms
  showDays = true,
  showSeconds = true,
  pulsing = false,
  className,
  onComplete,
  onUrgent,
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });
  const [isUrgent, setIsUrgent] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!endTime) return;

    const targetDate = new Date(endTime);

    const updateCountdown = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setIsComplete(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });
        onComplete?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, total: diff });

      // Check urgency threshold
      if (diff <= urgentThreshold && !isUrgent) {
        setIsUrgent(true);
        onUrgent?.();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endTime, urgentThreshold, isUrgent, onComplete, onUrgent]);

  if (isComplete) return null;

  const TimeUnit = ({ value, label, isLast }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          'relative min-w-[3rem] md:min-w-[4rem] px-2 py-3 md:px-3 md:py-4 bg-black/50 backdrop-blur-sm border-2 transition-colors',
          isUrgent ? 'border-[#C8962C] animate-pulse' : 'border-white/20'
        )}
      >
        <div
          className={cn(
            'text-2xl md:text-4xl font-black font-mono text-center',
            isUrgent ? 'text-[#C8962C]' : 'text-white'
          )}
        >
          {String(value).padStart(2, '0')}
        </div>
        {isUrgent && (
          <div className="absolute inset-0 bg-[#C8962C] opacity-10 animate-ping" />
        )}
      </motion.div>
      <div className="text-[10px] md:text-xs text-white/60 uppercase tracking-wider font-bold mt-2">
        {label}
      </div>
      {!isLast && (
        <div className="hidden md:block text-2xl md:text-4xl font-black text-white/40 mx-2">
          :
        </div>
      )}
    </div>
  );

  const variants = {
    default: (
      <div className={cn('lux-countdown-timer', className)}>
        {/* Header */}
        {(title || description) && (
          <div className="mb-6 text-center">
            {isUrgent && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-[#C8962C] animate-pulse" />
                <span className="text-sm font-black text-[#C8962C] uppercase tracking-wider">
                  ENDING SOON
                </span>
              </div>
            )}
            {title && (
              <h3 className="text-2xl md:text-3xl font-black text-white mb-2">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-white/70 uppercase tracking-wider">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Timer Display */}
        <div className="flex items-center justify-center gap-1 md:gap-2">
          {showDays && timeLeft.days > 0 && (
            <>
              <TimeUnit value={timeLeft.days} label="Days" />
              <div className="text-2xl md:text-4xl font-black text-white/40 mx-1">:</div>
            </>
          )}
          <TimeUnit value={timeLeft.hours} label="Hours" />
          <div className="text-2xl md:text-4xl font-black text-white/40 mx-1">:</div>
          <TimeUnit value={timeLeft.minutes} label="Min" />
          {showSeconds && (
            <>
              <div className="text-2xl md:text-4xl font-black text-white/40 mx-1">:</div>
              <TimeUnit value={timeLeft.seconds} label="Sec" isLast />
            </>
          )}
        </div>
      </div>
    ),

    compact: (
      <div
        className={cn(
          'inline-flex items-center gap-3 px-4 py-2 bg-white/5 border-2 transition-colors',
          isUrgent
            ? 'border-[#C8962C] animate-pulse'
            : 'border-white/10',
          className
        )}
      >
        <Clock className={cn('w-5 h-5', isUrgent ? 'text-[#C8962C]' : 'text-white')} />
        <div className="flex gap-1 font-mono text-lg md:text-xl font-black">
          {showDays && timeLeft.days > 0 && (
            <>
              <span className={isUrgent ? 'text-[#C8962C]' : 'text-white'}>
                {String(timeLeft.days).padStart(2, '0')}
              </span>
              <span className="text-white/40">:</span>
            </>
          )}
          <span className={isUrgent ? 'text-[#C8962C]' : 'text-white'}>
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-white/40">:</span>
          <span className={isUrgent ? 'text-[#C8962C]' : 'text-white'}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          {showSeconds && (
            <>
              <span className="text-white/40">:</span>
              <span className={isUrgent ? 'text-[#C8962C]' : 'text-white'}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </>
          )}
        </div>
      </div>
    ),

    minimal: (
      <div className={cn('inline-flex items-center gap-2 text-sm font-bold', className)}>
        {isUrgent && <Zap className="w-4 h-4 text-[#C8962C] animate-pulse" />}
        <span className={isUrgent ? 'text-[#C8962C]' : 'text-white'}>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}
          {showSeconds && `:${String(timeLeft.seconds).padStart(2, '0')}`}
        </span>
      </div>
    ),

    banner: (
      <div
        className={cn(
          'flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r transition-all',
          isUrgent
            ? 'from-[#C8962C] to-[#C8962C] animate-pulse'
            : 'from-[#C8962C] to-[#C8962C]',
          className
        )}
      >
        {isUrgent && <AlertCircle className="w-6 h-6 text-white animate-pulse" />}
        <div className="text-center">
          {title && (
            <div className="text-sm font-black text-white uppercase tracking-wider mb-1">
              {title}
            </div>
          )}
          <div className="flex gap-1 text-white font-mono text-2xl font-black">
            {showDays && timeLeft.days > 0 && (
              <>
                <span>{String(timeLeft.days).padStart(2, '0')}</span>
                <span className="opacity-60">:</span>
              </>
            )}
            <span>{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="opacity-60">:</span>
            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
            {showSeconds && (
              <>
                <span className="opacity-60">:</span>
                <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    ),
  };

  return variants[variant] || variants.default;
}

/**
 * LuxEventCountdown - Countdown specifically styled for events
 */
export function LuxEventCountdown({ eventDate, eventTitle, className }) {
  return (
    <LuxCountdownTimer
      endTime={eventDate}
      title={eventTitle}
      description="Event starts in"
      variant="default"
      showDays={true}
      showSeconds={false}
      urgentThreshold={24 * 60 * 60 * 1000} // 24 hours
      className={className}
    />
  );
}

/**
 * LuxOfferCountdown - Countdown for limited-time offers
 */
export function LuxOfferCountdown({ offerEndTime, offerTitle, className }) {
  return (
    <LuxCountdownTimer
      endTime={offerEndTime}
      title={offerTitle}
      description="Offer ends in"
      variant="banner"
      showDays={true}
      showSeconds={true}
      urgentThreshold={3600000} // 1 hour
      pulsing={true}
      className={className}
    />
  );
}

export default LuxCountdownTimer;
