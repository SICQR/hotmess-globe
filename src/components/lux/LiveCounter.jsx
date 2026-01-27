import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Radio, Eye, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/components/utils/supabaseClient';

/**
 * LiveCounter - Real-time user/activity counter with Supabase Realtime
 * 
 * Features:
 * - Real-time updates via Supabase Realtime
 * - Animated number changes
 * - LED pulse effect
 * - Multiple display variants
 */

export function LiveCounter({
  type = 'online', // 'online' | 'live' | 'viewing' | 'active'
  count: initialCount,
  label,
  showPulse = true,
  showIcon = true,
  size = 'default', // 'sm' | 'default' | 'lg'
  variant = 'default', // 'default' | 'compact' | 'badge'
  realtimeChannel, // Optional Supabase channel for live updates
  className,
  ...props
}) {
  const [count, setCount] = useState(initialCount || 0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Icon mapping
  const icons = {
    online: Users,
    live: Radio,
    viewing: Eye,
    active: Zap,
  };
  const Icon = icons[type] || Users;

  // Color mapping
  const colors = {
    online: '#39FF14', // Live green
    live: '#FF1493', // Chrome red
    viewing: '#E5A820', // Gold
    active: '#00D9FF', // Cyan
  };
  const color = colors[type] || colors.online;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    default: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-3',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    default: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    default: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  // Subscribe to realtime updates if channel provided
  useEffect(() => {
    if (!realtimeChannel) return;

    const channel = supabase
      .channel(realtimeChannel)
      .on('broadcast', { event: 'count_update' }, (payload) => {
        setIsUpdating(true);
        setCount(payload.payload.count);
        setTimeout(() => setIsUpdating(false), 300);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeChannel]);

  // Update count if initialCount changes
  useEffect(() => {
    if (initialCount !== undefined) {
      setIsUpdating(true);
      setCount(initialCount);
      setTimeout(() => setIsUpdating(false), 300);
    }
  }, [initialCount]);

  // Badge variant
  if (variant === 'badge') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 font-mono text-xs font-bold uppercase tracking-wider',
          'border-2',
          className
        )}
        style={{
          borderColor: color,
          color: color,
          boxShadow: `0 0 10px ${color}40`,
        }}
        {...props}
      >
        {showPulse && (
          <span
            className={cn('rounded-full animate-pulse', dotSizes.sm)}
            style={{ backgroundColor: color }}
          />
        )}
        {count.toLocaleString()}
        {label && <span className="text-white/60 ml-1">{label}</span>}
      </span>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-sm font-bold',
          className
        )}
        style={{ color }}
        {...props}
      >
        {showPulse && (
          <span
            className={cn('rounded-full animate-pulse', dotSizes.sm)}
            style={{ backgroundColor: color }}
          />
        )}
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tabular-nums"
        >
          {count.toLocaleString()}
        </motion.span>
        {label && <span className="text-white/60">{label}</span>}
      </span>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'lux-live-counter inline-flex items-center',
        'bg-transparent border-2 font-mono font-bold uppercase tracking-wider',
        sizeClasses[size],
        className
      )}
      style={{
        borderColor: color,
        color,
        boxShadow: `0 0 20px ${color}60`,
      }}
      {...props}
    >
      {/* Pulse dot */}
      {showPulse && (
        <motion.span
          className={cn('rounded-full', dotSizes[size])}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Icon */}
      {showIcon && <Icon className={iconSizes[size]} />}

      {/* Count with animation */}
      <AnimatePresence mode="wait">
        <motion.span
          key={count}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn('tabular-nums', isUpdating && 'text-white')}
        >
          {count.toLocaleString()}
        </motion.span>
      </AnimatePresence>

      {/* Label */}
      {label && <span className="text-white/60">{label}</span>}
    </div>
  );
}

/**
 * LiveOnlineCounter - Specific counter for online users with Supabase presence
 */
export function LiveOnlineCounter({
  showLabel = true,
  className,
  ...props
}) {
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    // Subscribe to presence channel
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: 'user',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <LiveCounter
      type="online"
      count={onlineCount}
      label={showLabel ? 'online' : undefined}
      className={className}
      {...props}
    />
  );
}

/**
 * LiveViewerCounter - Counter for viewers on a specific page/content
 */
export function LiveViewerCounter({
  contentId,
  contentType = 'page', // 'page' | 'profile' | 'event' | 'product'
  showLabel = true,
  className,
  ...props
}) {
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!contentId) return;

    const channel = supabase.channel(`viewers:${contentType}:${contentId}`, {
      config: {
        presence: {
          key: 'viewer',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setViewerCount(count);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            viewing_at: new Date().toISOString(),
            content_id: contentId,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId, contentType]);

  return (
    <LiveCounter
      type="viewing"
      count={viewerCount}
      label={showLabel ? 'viewing' : undefined}
      variant="compact"
      className={className}
      {...props}
    />
  );
}

/**
 * ActivityPulse - Shows recent activity with animated notifications
 */
export function ActivityPulse({
  activities = [], // Array of { id, message, timestamp }
  maxVisible = 3,
  autoHide = true,
  autoHideDelay = 5000,
  className,
  ...props
}) {
  const [visibleActivities, setVisibleActivities] = useState([]);

  useEffect(() => {
    // Show only the most recent activities
    setVisibleActivities(activities.slice(0, maxVisible));

    if (autoHide && activities.length > 0) {
      const timer = setTimeout(() => {
        setVisibleActivities([]);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [activities, maxVisible, autoHide, autoHideDelay]);

  return (
    <div className={cn('space-y-2', className)} {...props}>
      <AnimatePresence>
        {visibleActivities.map((activity) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex items-center gap-2 px-3 py-2 bg-[#0D0D0D]/80 border border-white/10 font-mono text-xs text-white/80"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF1493] animate-pulse" />
            {activity.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default LiveCounter;
