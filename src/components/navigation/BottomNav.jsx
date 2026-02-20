import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../../utils';
import { base44 } from '@/components/utils/supabaseClient';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { 
  Globe, 
  ShoppingBag, 
  LayoutGrid,
  Users,
  Calendar,
  Radio,
  Ticket,
  Shield,
  Sparkles,
  Navigation,
  BarChart3,
  Settings,
  X,
  MessageCircle,
  Package
} from 'lucide-react';

// The 11 apps within HOTMESS London OS
const ALL_APPS = [
  { id: 'social', name: 'SOCIAL', icon: Users, path: 'Social', color: '#FF1493', desc: 'Find people', sheetType: SHEET_TYPES.GHOSTED },
  { id: 'events', name: 'EVENTS', icon: Calendar, path: 'Events', color: '#00D9FF', desc: "What's on" },
  { id: 'radio', name: 'RADIO', icon: Radio, path: 'Music', color: '#B026FF', desc: 'Live shows' },
  { id: 'tickets', name: 'TICKETS', icon: Ticket, path: 'TicketMarketplace', color: '#FF6B35', desc: 'Buy & sell' },
  { id: 'community', name: 'COMMUNITY', icon: Sparkles, path: 'Community', color: '#FFEB3B', desc: 'Posts' },
  { id: 'safety', name: 'SAFETY', icon: Shield, path: 'Care', color: '#FF0000', desc: 'You good?' },
  { id: 'pulse', name: 'PULSE', icon: Globe, path: 'Pulse', color: '#39FF14', desc: 'Live map' },
  { id: 'directions', name: 'TRAVEL', icon: Navigation, path: 'Directions', color: '#00D9FF', desc: 'Get there' },
  { id: 'stats', name: 'STATS', icon: BarChart3, path: 'Stats', color: '#FFEB3B', desc: 'Your data' },
  { id: 'settings', name: 'SETTINGS', icon: Settings, path: 'Settings', color: '#FFFFFF', desc: 'Preferences' },
];

// Live counter component
function LiveCounter({ count, label, color = '#FF1493' }) {
  return (
    <div className="flex items-center gap-1">
      <span 
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: color }}
      />
      <span className="text-[10px] font-bold" style={{ color }}>
        {count}
      </span>
    </div>
  );
}

// Apps Grid Modal
function AppsGridModal({ isOpen, onClose, openSheet }) {
  if (!isOpen) return null;

  // Handle sheet-based navigation
  const handleSheetNav = (sheetType) => {
    onClose();
    setTimeout(() => openSheet(sheetType), 100);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="h-full flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div>
              <h2 className="text-xl font-black">HOTMESS APPS</h2>
              <p className="text-xs text-white/50 uppercase tracking-wider">London OS</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Apps Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-3">
              {ALL_APPS.map((app) => {
                const Icon = app.icon;
                
                // Use sheets for these apps
                if (app.sheetType) {
                  return (
                    <button
                      key={app.id}
                      onClick={() => handleSheetNav(app.sheetType)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-all active:scale-95"
                    >
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${app.color}20` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: app.color }} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-center">
                        {app.name}
                      </span>
                    </button>
                  );
                }
                
                return (
                  <Link
                    key={app.id}
                    to={createPageUrl(app.path)}
                    onClick={onClose}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-all active:scale-95"
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${app.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: app.color }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-center">
                      {app.name}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Quick Actions - Sheet-based */}
            <div className="mt-8">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">QUICK LINKS</p>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={createPageUrl('Care')}
                  onClick={onClose}
                  className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <Shield className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-black">You good?</p>
                    <p className="text-[10px] text-white/50">Care & support</p>
                  </div>
                </Link>
                <button
                  onClick={() => handleSheetNav(SHEET_TYPES.VAULT)}
                  className="flex items-center gap-3 p-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg text-left"
                >
                  <Package className="w-5 h-5 text-[#FFD700]" />
                  <div>
                    <p className="text-sm font-black">Vault</p>
                    <p className="text-[10px] text-white/50">Your stuff</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="mt-4">
              <button
                onClick={() => handleSheetNav(SHEET_TYPES.CHAT)}
                className="w-full flex items-center gap-3 p-4 bg-[#FF1493]/10 border border-[#FF1493]/30 rounded-lg text-left"
              >
                <MessageCircle className="w-5 h-5 text-[#FF1493]" />
                <div>
                  <p className="text-sm font-black">Messages</p>
                  <p className="text-[10px] text-white/50">Your conversations</p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">
              11 apps in one • London OS
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Bottom Navigation
export default function BottomNav({ currentPageName, user }) {
  const [showApps, setShowApps] = useState(false);
  const location = useLocation();
  const pathname = location?.pathname || '/';
  
  // Get sheet context
  let openSheet;
  try {
    const sheetContext = useSheet();
    openSheet = sheetContext?.openSheet;
  } catch {
    // SheetContext not available, fallback to navigation
    openSheet = null;
  }

  // Fetch REAL live counts from Supabase
  const { data: rightNowCount = 0 } = useQuery({
    queryKey: ['right-now-count'],
    queryFn: async () => {
      try {
        const statuses = await base44.entities.RightNowStatus.filter({ active: true });
        const valid = statuses.filter(s => new Date(s.expires_at) > new Date());
        return valid.length;
      } catch {
        return 0;
      }
    },
    refetchInterval: 15000, // Real-time feel
    staleTime: 10000,
  });

  const { data: eventCount = 0 } = useQuery({
    queryKey: ['active-events-count'],
    queryFn: async () => {
      try {
        const events = await base44.entities.Beacon.filter({ 
          kind: 'event', 
          status: 'published', 
          active: true 
        });
        // Filter to upcoming events (next 7 days)
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcoming = events.filter(e => {
          const eventDate = new Date(e.event_date || e.starts_at);
          return eventDate >= now && eventDate <= weekFromNow;
        });
        return upcoming.length;
      } catch {
        return 0;
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const liveCounts = {
    rightNow: rightNowCount,
    events: eventCount
  };

  const isActive = (path) => {
    if (path === 'Home') return pathname === '/' || currentPageName === 'Home';
    return currentPageName === path;
  };

  const isPulseActive = currentPageName === 'Pulse' || currentPageName === 'Globe';
  const isShopActive = currentPageName === 'Marketplace' || pathname.startsWith('/market');

  // Handle LIVE button click - opens Ghosted sheet
  const handleLiveClick = (e) => {
    if (openSheet) {
      e.preventDefault();
      openSheet(SHEET_TYPES.GHOSTED);
    }
    // If no openSheet, the Link will navigate normally
  };

  // Handle SHOP button click - opens Shop sheet
  const handleShopClick = (e) => {
    if (openSheet) {
      e.preventDefault();
      openSheet(SHEET_TYPES.SHOP);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar - 5 Mode OS */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 h-16">
          
          {/* GHOSTED (Grid) - Default */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              pathname === '/' || currentPageName === 'Social' || currentPageName === 'ProfilesGrid' ? 'text-white' : 'text-white/50'
            }`}
          >
            <LayoutGrid className={`w-6 h-6 ${pathname === '/' ? 'text-[#FF1493]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Ghosted</span>
          </Link>

          {/* PULSE (Globe) */}
          <Link
            to="/pulse"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              isPulseActive ? 'text-white' : 'text-white/50'
            }`}
          >
            <Globe className={`w-6 h-6 ${isPulseActive ? 'text-[#00D9FF]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Pulse</span>
          </Link>

          {/* MARKET (Unified Commerce) */}
          <Link
            to="/market"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              isShopActive ? 'text-white' : 'text-white/50'
            }`}
          >
            <ShoppingBag className={`w-6 h-6 ${isShopActive ? 'text-[#B026FF]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Market</span>
          </Link>

          {/* RADIO */}
          <Link
            to="/radio"
            className={`relative flex flex-col items-center justify-center flex-1 h-full transition-all ${
              currentPageName === 'Music' || currentPageName === 'Radio' ? 'text-white' : 'text-white/50'
            }`}
          >
            <Radio className={`w-6 h-6 ${currentPageName === 'Music' || currentPageName === 'Radio' ? 'text-[#39FF14]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Radio</span>
            {/* Live indicator */}
            <span className="absolute top-2 right-1/2 translate-x-4 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          </Link>

          {/* PROFILE */}
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
              currentPageName === 'Profile' || currentPageName === 'Settings' ? 'text-white' : 'text-white/50'
            }`}
          >
            <Users className={`w-6 h-6 ${currentPageName === 'Profile' || currentPageName === 'Settings' ? 'text-white' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Apps Grid Modal */}
      <AppsGridModal isOpen={showApps} onClose={() => setShowApps(false)} openSheet={openSheet} />
    </>
  );
}
