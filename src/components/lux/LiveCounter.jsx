import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LuxLiveCounter - Animated counter for live/online users
 * 
 * Features:
 * - Real-time count updates
 * - Animated number transitions
 * - LED pulse effect
 * - Multiple display variants
 * - Optional trend indicator
 */

export function LuxLiveCounter({
  count = 0,
  label = 'ONLINE NOW',
  icon: Icon = Users,
  variant = 'default', // 'default' | 'minimal' | 'badge' | 'floating'
  showTrend = false,
  trend = 0, // Positive or negative number
  pulsing = true,
  className,
  onCountUpdate,
}) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate count changes
  useEffect(() => {
    if (count === displayCount) return;

    setIsAnimating(true);
    const duration = 500;
    const steps = 20;
    const stepDuration = duration / steps;
    const diff = count - displayCount;
    const stepValue = diff / steps;

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayCount(count);
        setIsAnimating(false);
        clearInterval(interval);
        onCountUpdate?.(count);
      } else {
        setDisplayCount(Math.round(displayCount + stepValue * currentStep));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [count, displayCount, onCountUpdate]);

  const variants = {
    default: (
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 bg-white/5 border-2 border-white/10 hover:border-[#39FF14]/50 transition-colors',
          className
        )}
      >
        {/* Icon with pulse */}
        <div className="relative">
          <div className={cn('w-10 h-10 bg-[#39FF14]/20 flex items-center justify-center', pulsing && 'animate-pulse')}>
            <Icon className="w-5 h-5 text-[#39FF14]" />
          </div>
          {pulsing && (
            <div className="absolute inset-0 w-10 h-10 bg-[#39FF14] opacity-20 animate-ping" />
          )}
        </div>

        {/* Count and Label */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <motion.span
              key={displayCount}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-black text-white"
            >
              {displayCount.toLocaleString()}
            </motion.span>
            {showTrend && trend !== 0 && (
              <span
                className={cn(
                  'text-xs font-bold flex items-center gap-0.5',
                  trend > 0 ? 'text-[#39FF14]' : 'text-[#C8962C]'
                )}
              >
                <TrendingUp className={cn('w-3 h-3', trend < 0 && 'rotate-180')} />
                {Math.abs(trend)}
              </span>
            )}
          </div>
          <p className="text-xs text-white/60 uppercase tracking-wider font-bold">{label}</p>
        </div>
      </div>
    ),

    minimal: (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('w-2 h-2 rounded-full bg-[#39FF14]', pulsing && 'animate-pulse')} />
        <span className="text-sm font-bold text-white">
          {displayCount.toLocaleString()} {label}
        </span>
      </div>
    ),

    badge: (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 bg-[#39FF14]/20 border border-[#39FF14]/50',
          pulsing && 'animate-pulse',
          className
        )}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#39FF14]" />
        <span className="text-xs font-black text-[#39FF14] uppercase tracking-wider">
          {displayCount.toLocaleString()} {label}
        </span>
      </div>
    ),

    floating: (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-sm border-2 border-[#39FF14]/50 shadow-2xl',
          className
        )}
      >
        <div className="relative">
          <Zap className="w-5 h-5 text-[#39FF14]" />
          {pulsing && (
            <div className="absolute inset-0 w-5 h-5 bg-[#39FF14] opacity-30 animate-ping" />
          )}
        </div>
        <div>
          <motion.div
            key={displayCount}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-black text-white"
          >
            {displayCount.toLocaleString()}
          </motion.div>
          <div className="text-[10px] text-white/60 uppercase tracking-wider font-bold">
            {label}
          </div>
        </div>
      </motion.div>
    ),
  };

  return variants[variant] || variants.default;
}

/**
 * LuxActivityFeed - Shows recent activity notifications
 */
export function LuxActivityFeed({
  activities = [],
  maxItems = 3,
  duration = 5000,
  className,
}) {
  const [visibleActivities, setVisibleActivities] = useState([]);

  useEffect(() => {
    // Show new activities
    const newActivities = activities.slice(0, maxItems);
    setVisibleActivities(newActivities);

    // Auto-dismiss after duration
    if (newActivities.length > 0) {
      const timer = setTimeout(() => {
        setVisibleActivities([]);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [activities, maxItems, duration]);

  return (
    <div className={cn('fixed top-20 right-6 z-40 space-y-2', className)}>
      <AnimatePresence>
        {visibleActivities.map((activity, index) => (
          <motion.div
            key={activity.id || index}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ delay: index * 0.1 }}
            className="px-4 py-3 bg-black/90 backdrop-blur-sm border border-white/20 shadow-xl max-w-xs"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#39FF14] flex-shrink-0" />
              <p className="text-sm text-white font-medium">{activity.message}</p>
            </div>
            {activity.timestamp && (
              <p className="text-xs text-white/50 mt-1">
                {new Date(activity.timestamp).toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * LuxStatsCounter - Animated statistics counter
 */
export function LuxStatsCounter({
  stats = [],
  title,
  className,
}) {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="text-center p-4 bg-white/5 border border-white/10 hover:border-[#C8962C]/50 transition-colors"
        >
          <div className="text-4xl md:text-5xl font-black text-[#C8962C] mb-2">
            {stat.value}
          </div>
          <div className="text-xs text-white/60 uppercase tracking-wider font-bold">
            {stat.label}
          </div>
          {stat.description && (
            <div className="text-xs text-white/40 mt-1">{stat.description}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

export default LuxLiveCounter;
