/**
 * Globe Activity Stream - Real-time activity visualization
 * 
 * Shows animated beacons and arcs for all platform actions,
 * similar to GitHub's famous globe visualization.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';

// Activity type configurations with colors and icons
export const ACTIVITY_TYPES = {
  // Social Actions
  message_sent: {
    label: 'Message',
    color: '#C8962C',
    glowColor: 'rgba(200, 150, 44, 0.6)',
    icon: '💬',
    pulseSize: 1.2,
    arcEnabled: true,
    sound: false,
  },
  profile_view: {
    label: 'Profile View',
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.6)',
    icon: '👁️',
    pulseSize: 0.8,
    arcEnabled: false,
    sound: false,
  },
  follow: {
    label: 'New Follow',
    color: '#C8962C',
    glowColor: 'rgba(200, 150, 44, 0.6)',
    icon: '➕',
    pulseSize: 1.0,
    arcEnabled: true,
    sound: false,
  },
  match: {
    label: 'Match Made',
    color: '#39FF14',
    glowColor: 'rgba(57, 255, 20, 0.8)',
    icon: '💚',
    pulseSize: 1.5,
    arcEnabled: true,
    sound: true,
  },
  
  // Beacon Actions
  beacon_scan: {
    label: 'Beacon Scan',
    color: '#FFEB3B',
    glowColor: 'rgba(255, 235, 59, 0.7)',
    icon: '📍',
    pulseSize: 1.3,
    arcEnabled: false,
    sound: false,
  },
  beacon_created: {
    label: 'New Beacon',
    color: '#FF6B35',
    glowColor: 'rgba(255, 107, 53, 0.7)',
    icon: '🔥',
    pulseSize: 1.8,
    arcEnabled: false,
    sound: true,
  },
  event_rsvp: {
    label: 'Event RSVP',
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.6)',
    icon: '🎫',
    pulseSize: 1.2,
    arcEnabled: true,
    sound: false,
  },
  event_checkin: {
    label: 'Event Check-in',
    color: '#39FF14',
    glowColor: 'rgba(57, 255, 20, 0.8)',
    icon: '✅',
    pulseSize: 1.4,
    arcEnabled: false,
    sound: true,
  },
  
  // Commerce Actions
  purchase: {
    label: 'Purchase',
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.8)',
    icon: '💰',
    pulseSize: 1.6,
    arcEnabled: true,
    sound: true,
  },
  product_listed: {
    label: 'New Listing',
    color: '#C8962C',
    glowColor: 'rgba(200, 150, 44, 0.6)',
    icon: '🏷️',
    pulseSize: 1.2,
    arcEnabled: false,
    sound: false,
  },
  // Presence Actions
  right_now: {
    label: 'Going Live',
    color: '#39FF14',
    glowColor: 'rgba(57, 255, 20, 0.9)',
    icon: '🟢',
    pulseSize: 2.0,
    arcEnabled: false,
    sound: true,
  },
  online: {
    label: 'Online',
    color: '#39FF14',
    glowColor: 'rgba(57, 255, 20, 0.5)',
    icon: '●',
    pulseSize: 0.6,
    arcEnabled: false,
    sound: false,
  },
  
  // Music Actions
  track_play: {
    label: 'Track Playing',
    color: '#C8962C',
    glowColor: 'rgba(200, 150, 44, 0.7)',
    icon: '🎵',
    pulseSize: 1.0,
    arcEnabled: false,
    sound: false,
  },
  radio_tune_in: {
    label: 'Radio Tune-in',
    color: '#C8962C',
    glowColor: 'rgba(200, 150, 44, 0.6)',
    icon: '📻',
    pulseSize: 1.1,
    arcEnabled: false,
    sound: false,
  },
  
  // Safety Actions
  safety_checkin: {
    label: 'Safety Check',
    color: '#00D9FF',
    glowColor: 'rgba(0, 217, 255, 0.6)',
    icon: '🛡️',
    pulseSize: 1.0,
    arcEnabled: false,
    sound: false,
  },
  
  // Default
  default: {
    label: 'Activity',
    color: '#FFFFFF',
    glowColor: 'rgba(255, 255, 255, 0.5)',
    icon: '•',
    pulseSize: 1.0,
    arcEnabled: false,
    sound: false,
  },
};

// Get activity configuration
export const getActivityConfig = (type) => {
  return ACTIVITY_TYPES[type] || ACTIVITY_TYPES.default;
};

// Activity pulse component for 2D overlay
export function ActivityPulse({ activity, onComplete }) {
  const config = getActivityConfig(activity.type);
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(1);
  
  useEffect(() => {
    // Animate in
    const timer1 = setTimeout(() => setScale(config.pulseSize), 50);
    const timer2 = setTimeout(() => setOpacity(0), 1500);
    const timer3 = setTimeout(() => onComplete?.(activity.id), 2000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [activity.id, config.pulseSize, onComplete]);
  
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: activity.screenX,
        top: activity.screenY,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease-out',
      }}
    >
      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
          backgroundColor: config.glowColor,
          boxShadow: `0 0 20px ${config.glowColor}, 0 0 40px ${config.glowColor}`,
        }}
      />
      {/* Inner pulse */}
      <div
        className="absolute rounded-full"
        style={{
          width: 16,
          height: 16,
          marginLeft: -8,
          marginTop: -8,
          backgroundColor: config.color,
          boxShadow: `0 0 10px ${config.color}`,
        }}
      />
      {/* Label */}
      <div
        className="absolute whitespace-nowrap text-xs font-bold uppercase tracking-wider"
        style={{
          left: 20,
          top: -4,
          color: config.color,
          textShadow: `0 0 10px ${config.glowColor}`,
        }}
      >
        {config.icon} {config.label}
      </div>
    </div>
  );
}

// Activity arc for connections between two points
export function ActivityArc({ from, to, color, onComplete }) {
  const pathRef = useRef(null);
  const [dashOffset, setDashOffset] = useState(1000);
  
  useEffect(() => {
    // Animate dash offset
    const timer1 = setTimeout(() => setDashOffset(0), 50);
    const timer2 = setTimeout(() => onComplete?.(), 2000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);
  
  // Calculate curved path
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 50; // Curve upward
  const path = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  
  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        ref={pathRef}
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="1000"
        strokeDashoffset={dashOffset}
        filter="url(#glow)"
        style={{
          transition: 'stroke-dashoffset 1.5s ease-out',
        }}
      />
    </svg>
  );
}

// Hook to subscribe to real-time activities
export function useActivityStream(enabled = true) {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    byType: {},
  });
  
  // Add new activity
  const addActivity = useCallback((activity) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newActivity = {
      ...activity,
      id,
      timestamp: Date.now(),
    };
    
    setActivities(prev => [...prev.slice(-50), newActivity]); // Keep last 50
    setStats(prev => ({
      total: prev.total + 1,
      byType: {
        ...prev.byType,
        [activity.type]: (prev.byType[activity.type] || 0) + 1,
      },
    }));
    
    return id;
  }, []);
  
  // Remove activity
  const removeActivity = useCallback((id) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);
  
  // Subscribe to real-time events
  useEffect(() => {
    if (!enabled) return;
    
    const subscriptions = [];
    
    // Subscribe to user activities table
    const activitySub = supabase
      .channel('globe-activities')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_interactions',
      }, (payload) => {
        const data = payload.new;
        if (data?.lat && data?.lng) {
          addActivity({
            type: data.interaction_type || 'default',
            lat: data.lat,
            lng: data.lng,
            metadata: data.metadata,
          });
        }
      })
      .subscribe();
    subscriptions.push(activitySub);
    
    // Subscribe to beacon check-ins
    const checkinSub = supabase
      .channel('globe-checkins')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'beacon_checkins',
      }, (payload) => {
        const data = payload.new;
        addActivity({
          type: 'beacon_scan',
          beaconId: data.beacon_id,
          metadata: { title: data.beacon_title },
        });
      })
      .subscribe();
    subscriptions.push(checkinSub);
    
    // Subscribe to Right Now status changes
    const rightNowSub = supabase
      .channel('globe-rightnow')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rightnow',
      }, (payload) => {
        if (payload.eventType === 'INSERT' || (payload.new?.active && !payload.old?.active)) {
          const data = payload.new;
          if (data?.lat && data?.lng) {
            addActivity({
              type: 'right_now',
              lat: data.lat,
              lng: data.lng,
              metadata: { duration: data.duration },
            });
          }
        }
      })
      .subscribe();
    subscriptions.push(rightNowSub);
    
    // Subscribe to messages
    const messageSub = supabase
      .channel('globe-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        addActivity({
          type: 'message_sent',
          metadata: { threadId: payload.new?.thread_id },
        });
      })
      .subscribe();
    subscriptions.push(messageSub);
    
    // Subscribe to orders (purchases)
    const orderSub = supabase
      .channel('globe-orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Order',
      }, (payload) => {
        addActivity({
          type: 'purchase',
          metadata: { amount: payload.new?.total_gbp },
        });
      })
      .subscribe();
    subscriptions.push(orderSub);
    
    // Subscribe to event RSVPs
    const rsvpSub = supabase
      .channel('globe-rsvps')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_rsvps',
      }, (payload) => {
        addActivity({
          type: 'event_rsvp',
          metadata: { eventId: payload.new?.event_id },
        });
      })
      .subscribe();
    subscriptions.push(rsvpSub);
    
    return () => {
      subscriptions.forEach(sub => {
        supabase.removeChannel(sub);
      });
    };
  }, [enabled, addActivity]);
  
  return {
    activities,
    stats,
    addActivity,
    removeActivity,
  };
}

// Activity Feed overlay component
export function ActivityFeed({ activities, maxVisible = 5 }) {
  const visibleActivities = activities.slice(-maxVisible).reverse();
  
  if (visibleActivities.length === 0) return null;
  
  return (
    <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
      <div className="space-y-2">
        {visibleActivities.map((activity, idx) => {
          const config = getActivityConfig(activity.type);
          const age = Date.now() - activity.timestamp;
          const opacity = Math.max(0.3, 1 - (age / 10000));
          
          return (
            <div
              key={activity.id}
              className="flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10"
              style={{
                opacity,
                transform: `translateX(${idx * -2}px)`,
                transition: 'opacity 0.3s ease',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
              />
              <span className="text-xs text-white/80">
                {config.icon} {config.label}
              </span>
              <span className="text-xs text-white/40">
                {Math.floor(age / 1000)}s ago
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Activity stats display
export function ActivityStats({ stats, className = '' }) {
  const topTypes = Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return (
    <div className={`bg-black/60 backdrop-blur-sm rounded-lg border border-white/10 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-white/60">Live Activity</span>
        <span className="text-lg font-black text-white">{stats.total}</span>
      </div>
      <div className="space-y-2">
        {topTypes.map(([type, count]) => {
          const config = getActivityConfig(type);
          return (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-white/70">{config.label}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: config.color }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simulated activity generator for demo/testing
export function useSimulatedActivities(enabled = false, interval = 2000) {
  const { addActivity } = useActivityStream(false);
  
  useEffect(() => {
    if (!enabled) return;
    
    const types = Object.keys(ACTIVITY_TYPES).filter(t => t !== 'default');
    const cities = [
      { lat: 51.5074, lng: -0.1278, name: 'London' },
      { lat: 40.7128, lng: -74.0060, name: 'New York' },
      { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
      { lat: 48.8566, lng: 2.3522, name: 'Paris' },
      { lat: 52.5200, lng: 13.4050, name: 'Berlin' },
      { lat: -33.8688, lng: 151.2093, name: 'Sydney' },
      { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
      { lat: 55.7558, lng: 37.6173, name: 'Moscow' },
      { lat: 19.4326, lng: -99.1332, name: 'Mexico City' },
      { lat: -23.5505, lng: -46.6333, name: 'São Paulo' },
    ];
    
    const timer = setInterval(() => {
      const type = types[Math.floor(Math.random() * types.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      
      // Add some randomness to location
      const lat = city.lat + (Math.random() - 0.5) * 2;
      const lng = city.lng + (Math.random() - 0.5) * 2;
      
      addActivity({
        type,
        lat,
        lng,
        metadata: { city: city.name },
      });
    }, interval);
    
    return () => clearInterval(timer);
  }, [enabled, interval, addActivity]);
}

export default {
  ACTIVITY_TYPES,
  getActivityConfig,
  useActivityStream,
  useSimulatedActivities,
  ActivityPulse,
  ActivityArc,
  ActivityFeed,
  ActivityStats,
};
