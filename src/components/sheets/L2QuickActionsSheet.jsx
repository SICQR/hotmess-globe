/**
 * L2QuickActionsSheet -- Per-tab contextual quick actions
 *
 * Opened via long-press on any bottom nav tab.
 * Shows different actions depending on which tab triggered it.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSheet } from '@/contexts/SheetContext';
import {
  Zap, Shield, Calendar, MapPin, Users, Filter,
  Search, ShoppingBag, Package, Music, ListMusic,
  User, Settings, Heart, Disc3,
} from 'lucide-react';

const GOLD = '#C8962C';
const CARD = '#1C1C1E';

const TAB_ACTIONS = {
  home: [
    { id: 'go-live', label: 'Go Live', icon: Zap, action: 'sheet', target: 'go-live' },
    { id: 'safety', label: 'Safety Check', icon: Shield, action: 'navigate', target: '/safety' },
    { id: 'events', label: "What's Happening", icon: Calendar, action: 'sheet', target: 'events' },
  ],
  pulse: [
    { id: 'beacon', label: 'Drop Beacon', icon: MapPin, action: 'sheet', target: 'create-event' },
    { id: 'nearby', label: 'Find Nearby', icon: Users, action: 'navigate', target: '/ghosted' },
    { id: 'tonight', label: "Tonight's Events", icon: Calendar, action: 'sheet', target: 'events' },
  ],
  ghosted: [
    { id: 'go-live', label: 'Go Live', icon: Zap, action: 'sheet', target: 'go-live' },
    { id: 'filters', label: 'Filters', icon: Filter, action: 'sheet', target: 'filters' },
    { id: 'online', label: "Who's Online Now", icon: Users, action: 'navigate', target: '/ghosted' },
  ],
  market: [
    { id: 'search', label: 'Search', icon: Search, action: 'sheet', target: 'search' },
    { id: 'cart', label: 'My Bag', icon: ShoppingBag, action: 'sheet', target: 'cart' },
    { id: 'sell', label: 'Sell Something', icon: Package, action: 'sheet', target: 'sell' },
    { id: 'orders', label: 'My Orders', icon: Package, action: 'sheet', target: 'my-orders' },
  ],
  music: [
    { id: 'playing', label: 'Now Playing', icon: Music, action: 'navigate', target: '/radio' },
    { id: 'releases', label: 'Browse Releases', icon: Disc3, action: 'navigate', target: '/music' },
    { id: 'schedule', label: 'Radio Schedule', icon: ListMusic, action: 'sheet', target: 'schedule' },
  ],
  more: [
    { id: 'profile', label: 'My Profile', icon: User, action: 'navigate', target: '/profile' },
    { id: 'settings', label: 'Settings', icon: Settings, action: 'sheet', target: 'settings' },
    { id: 'safety', label: 'Safety', icon: Shield, action: 'navigate', target: '/safety' },
    { id: 'care', label: 'Care', icon: Heart, action: 'navigate', target: '/care' },
  ],
};

export default function L2QuickActionsSheet({ tabOrigin }) {
  const navigate = useNavigate();
  const { openSheet, closeSheet } = useSheet();

  const actions = TAB_ACTIONS[tabOrigin] || TAB_ACTIONS.home;

  const handleAction = (item) => {
    closeSheet();
    if (item.action === 'navigate') {
      setTimeout(() => navigate(item.target), 100);
    } else if (item.action === 'sheet') {
      setTimeout(() => openSheet(item.target, {}), 100);
    }
  };

  return (
    <div className="px-4 pb-6 pt-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-3">
        Quick Actions
      </p>
      <div className="space-y-2">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleAction(item)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-white/5 active:scale-[0.98] transition-all"
              style={{ background: CARD }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${GOLD}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: GOLD }} />
              </div>
              <span className="text-white text-sm font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
