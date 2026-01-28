import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Users, Calendar, ShoppingBag, Trophy, Star, 
  Heart, MessageSquare, Zap, Radio, Music, Check,
  TrendingUp, Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Activity type configurations
const ACTIVITY_TYPES = {
  check_in: {
    icon: MapPin,
    color: '#00D9FF',
    verb: 'checked in at',
    getLink: (a) => a.beaconId ? `${createPageUrl('BeaconDetail')}?id=${a.beaconId}` : null,
  },
  match: {
    icon: Heart,
    color: '#FF1493',
    verb: 'matched with',
    getLink: (a) => a.targetEmail ? `${createPageUrl('Profile')}?email=${a.targetEmail}` : null,
  },
  event_rsvp: {
    icon: Calendar,
    color: '#B026FF',
    verb: 'is going to',
    getLink: (a) => a.eventId ? `${createPageUrl('BeaconDetail')}?id=${a.eventId}` : null,
  },
  purchase: {
    icon: ShoppingBag,
    color: '#39FF14',
    verb: 'bought',
    getLink: (a) => a.productId ? `${createPageUrl('ProductDetail')}?id=${a.productId}` : null,
  },
  achievement: {
    icon: Trophy,
    color: '#FFEB3B',
    verb: 'unlocked',
    getLink: () => null,
  },
  level_up: {
    icon: Zap,
    color: '#FFEB3B',
    verb: 'reached',
    getLink: (a) => a.userEmail ? `${createPageUrl('Profile')}?email=${a.userEmail}` : null,
  },
  beacon_created: {
    icon: MapPin,
    color: '#FF1493',
    verb: 'dropped a beacon at',
    getLink: (a) => a.beaconId ? `${createPageUrl('BeaconDetail')}?id=${a.beaconId}` : null,
  },
  follow: {
    icon: Users,
    color: '#00D9FF',
    verb: 'started following',
    getLink: (a) => a.targetEmail ? `${createPageUrl('Profile')}?email=${a.targetEmail}` : null,
  },
  message: {
    icon: MessageSquare,
    color: '#00D9FF',
    verb: 'sent a message',
    getLink: () => null,
  },
  radio_tune_in: {
    icon: Radio,
    color: '#B026FF',
    verb: 'tuned in to',
    getLink: () => createPageUrl('Radio'),
  },
  music_play: {
    icon: Music,
    color: '#B026FF',
    verb: 'is listening to',
    getLink: () => createPageUrl('Music'),
  },
  right_now: {
    icon: Flame,
    color: '#FF1493',
    verb: 'is active',
    getLink: (a) => a.userEmail ? `${createPageUrl('Profile')}?email=${a.userEmail}` : null,
  },
};

// Single activity item
function ActivityItem({ activity, onDismiss, compact = false }) {
  const config = ACTIVITY_TYPES[activity.type] || {
    icon: Star,
    color: '#FF1493',
    verb: 'did something',
    getLink: () => null,
  };

  const Icon = config.icon;
  const link = config.getLink(activity);
  const timeAgo = getTimeAgo(activity.timestamp);

  const content = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      layout
      className={cn(
        "flex items-center gap-3 p-3 bg-white/5 border border-white/10 transition-colors hover:bg-white/10",
        compact ? "rounded-lg" : "rounded-none border-l-2",
      )}
      style={{ borderLeftColor: compact ? 'transparent' : config.color }}
    >
      {/* User avatar */}
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
        style={{ 
          borderColor: config.color,
          backgroundColor: `${config.color}20`,
        }}
      >
        {activity.userAvatar ? (
          <img 
            src={activity.userAvatar} 
            alt={activity.userName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold" style={{ color: config.color }}>
            {activity.userName?.[0] || '?'}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-bold text-white">{activity.userName}</span>
          <span className="text-white/60"> {config.verb} </span>
          <span className="font-semibold" style={{ color: config.color }}>
            {activity.targetName || activity.content}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Icon className="w-3 h-3" style={{ color: config.color }} />
          <span className="text-xs text-white/40">{timeAgo}</span>
          {activity.xpEarned && (
            <span className="text-xs text-[#FFEB3B] font-bold">+{activity.xpEarned} XP</span>
          )}
        </div>
      </div>

      {/* Action indicator */}
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: config.color }} />
      </div>
    </motion.div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
}

// Trending/hot indicator
function TrendingBadge({ count, className }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
      className={cn(
        "flex items-center gap-1 px-2 py-1 bg-[#FF1493]/20 border border-[#FF1493]/50 rounded-full",
        className
      )}
    >
      <TrendingUp className="w-3 h-3 text-[#FF1493]" />
      <span className="text-xs font-bold text-[#FF1493]">
        {count} active now
      </span>
    </motion.div>
  );
}

// Live activity toast notification
export function ActivityToast({ activity, onDismiss, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const config = ACTIVITY_TYPES[activity.type] || {
    icon: Star,
    color: '#FF1493',
    verb: 'did something',
  };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-20 right-4 z-50 max-w-sm"
    >
      <div 
        className="flex items-center gap-3 p-4 bg-black border-2 border-white shadow-lg"
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}20`, borderColor: config.color }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">
            <span className="font-bold">{activity.userName}</span>
            <span className="text-white/60"> {config.verb} </span>
            <span className="font-semibold" style={{ color: config.color }}>
              {activity.targetName || activity.content}
            </span>
          </p>
        </div>
        <button 
          onClick={onDismiss}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <Check className="w-4 h-4 text-white/40" />
        </button>
      </div>
    </motion.div>
  );
}

// Main live activity feed component
export default function LiveActivityFeed({
  activities = [],
  maxItems = 10,
  showTrending = true,
  compact = false,
  autoRefresh = false,
  refreshInterval = 30000,
  onLoadMore,
  isLoading = false,
  className,
}) {
  const [visibleActivities, setVisibleActivities] = useState(activities.slice(0, maxItems));
  const activeCount = activities.filter(a => {
    const timestamp = new Date(a.timestamp);
    const now = new Date();
    return (now - timestamp) < 5 * 60 * 1000; // Active in last 5 minutes
  }).length;

  useEffect(() => {
    setVisibleActivities(activities.slice(0, maxItems));
  }, [activities, maxItems]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onLoadMore?.();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, onLoadMore]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with trending indicator */}
      {showTrending && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#FF1493]" />
            <h3 className="font-black uppercase text-sm">Live Activity</h3>
          </div>
          {activeCount > 0 && <TrendingBadge count={activeCount} />}
        </div>
      )}

      {/* Activity list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleActivities.map((activity, idx) => (
            <ActivityItem
              key={activity.id || idx}
              activity={activity}
              compact={compact}
            />
          ))}
        </AnimatePresence>

        {visibleActivities.length === 0 && !isLoading && (
          <div className="text-center py-8 text-white/40">
            <Flame className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No recent activity</p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-[#FF1493] border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>

      {/* Load more */}
      {activities.length > maxItems && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          View more activity
        </button>
      )}
    </div>
  );
}

// Hook for managing live activity
export function useLiveActivity(initialActivities = []) {
  const [activities, setActivities] = useState(initialActivities);
  const [toasts, setToasts] = useState([]);

  const addActivity = useCallback((activity) => {
    const newActivity = {
      ...activity,
      id: activity.id || Date.now(),
      timestamp: activity.timestamp || new Date().toISOString(),
    };

    setActivities(prev => [newActivity, ...prev]);
    
    // Show toast for important activities
    if (activity.showToast !== false) {
      setToasts(prev => [...prev, newActivity]);
    }
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return {
    activities,
    toasts,
    addActivity,
    dismissToast,
    clearActivities,
    ToastsContainer: () => (
      <AnimatePresence>
        {toasts.map((toast) => (
          <ActivityToast
            key={toast.id}
            activity={toast}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    ),
  };
}

// Helper function
function getTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
