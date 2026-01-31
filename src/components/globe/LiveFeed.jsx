import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, MapPin, Users, ShoppingBag, Ticket, Sparkles, Heart, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isEligible, prepareFeedItems, getClickRoute, FEED_ITEM_TYPES } from '@/lib/globe/glassFeed';
import { filterBySafety } from '@/lib/safety/killSwitch';

// Stable default to prevent infinite re-renders
const DEFAULT_VIEWER_CONTEXT = {};

// Icon mapping for feed item types
const ICONS = {
  CITY_HEAT: MapPin,
  RADIO_START: Radio,
  RADIO_SPIKE: Radio,
  EVENT_LIVE: Ticket,
  TICKET_VELOCITY: Ticket,
  NOW_SIGNAL: Sparkles,
  CARE_AVAILABLE: Heart,
  WORLD_PULSE: Users,
};

// Color mapping (visual language)
const COLORS = {
  CITY_HEAT: 'text-pink-500',    // heat = presence
  RADIO_START: 'text-green-400', // wave = radio
  RADIO_SPIKE: 'text-green-500',
  EVENT_LIVE: 'text-yellow-500', // pulse = time-bound
  TICKET_VELOCITY: 'text-yellow-400',
  NOW_SIGNAL: 'text-blue-400',
  CARE_AVAILABLE: 'text-red-400',
  WORLD_PULSE: 'text-purple-500',
};

// Sample feed items (would come from API in production)
const RAW_FEED_ITEMS = [
  { 
    id: '1', 
    type: 'RADIO_START', 
    timestamp: new Date(Date.now() - 120000).toISOString(),
    k_count: 25,
    data: { city: 'London', showName: 'Wake The Mess' }
  },
  { 
    id: '2', 
    type: 'CITY_HEAT', 
    timestamp: new Date(Date.now() - 600000).toISOString(),
    k_count: 80,
    data: { city: 'Berlin' }
  },
  { 
    id: '3', 
    type: 'TICKET_VELOCITY', 
    timestamp: new Date(Date.now() - 700000).toISOString(),
    k_count: 47,
    data: { city: 'London', eventName: 'MESS @ Fabric' }
  },
  { 
    id: '4', 
    type: 'NOW_SIGNAL', 
    timestamp: new Date(Date.now() - 400000).toISOString(),
    k_count: 35,
    data: { city: 'Tokyo' }
  },
  { 
    id: '5', 
    type: 'WORLD_PULSE', 
    timestamp: new Date(Date.now() - 1000000).toISOString(),
    k_count: 150,
    data: { city1: 'Tokyo', city2: 'Berlin' }
  },
  { 
    id: '6', 
    type: 'EVENT_LIVE', 
    timestamp: new Date(Date.now() - 180000).toISOString(),
    k_count: 28,
    data: { city: 'Paris', eventName: 'Le Marais Nuit' }
  },
];

export default function LiveFeed({ viewerContext = DEFAULT_VIEWER_CONTEXT }) {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  // Process and filter feed items through Glass Feed rules
  const eligibleItems = useMemo(() => {
    // 1. Filter by kill switch
    const safeItems = filterBySafety(RAW_FEED_ITEMS, 'data.city');
    
    // 2. Apply Glass Feed eligibility rules
    const processed = prepareFeedItems(safeItems, viewerContext);
    
    return processed;
  }, [viewerContext]);

  useEffect(() => {
    // Initialize with eligible items
    setItems(eligibleItems.slice(0, 4));
    
    // Rotate items periodically
    const interval = setInterval(() => {
      setItems(prev => {
        if (eligibleItems.length <= 4) return prev;
        const first = prev[0];
        const rest = prev.slice(1);
        const nextIdx = (eligibleItems.findIndex(i => i.id === first?.id) + 4) % eligibleItems.length;
        return [...rest, eligibleItems[nextIdx]].filter(Boolean);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [eligibleItems]);

  // Handle click with routing
  const handleItemClick = (item) => {
    const route = getClickRoute(item);
    if (route) {
      navigate(route);
    }
  };

  return (
    <div className="bg-black/60 backdrop-blur-md rounded-lg border border-white/10 p-4 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs uppercase tracking-widest text-white/50">Glass Feed</span>
      </div>
      
      <div className="space-y-2 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {items.map((item, i) => {
            const Icon = ICONS[item.type] || Sparkles;
            const color = COLORS[item.type] || 'text-white/60';
            const isClickable = !!item.clickTarget;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1 - i * 0.2, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-center gap-3 py-2 border-b border-white/5 last:border-0 ${
                  isClickable ? 'cursor-pointer hover:bg-white/5 -mx-2 px-2 rounded transition-colors' : ''
                } ${item.isQuiet ? 'opacity-60' : ''}`}
                onClick={() => isClickable && handleItemClick(item)}
              >
                <Icon className={`w-4 h-4 ${color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.displayText}</p>
                  <p className="text-[10px] text-white/40 uppercase">
                    {item.data?.city || 'Global'}
                    {item.clickTarget && (
                      <span className="ml-2 text-pink-500/60">→ {item.clickTarget}</span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Feed rules indicator */}
      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30">
        <span>k-anon protected</span>
        <span>5min delay</span>
      </div>
    </div>
  );
}
