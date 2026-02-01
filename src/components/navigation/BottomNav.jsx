import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '../../utils';
import { 
  Radio,
  Zap, 
  Ghost,
  ShoppingBag, 
  MoreHorizontal,
  Ticket,
  Shield,
  Sparkles,
  Navigation,
  BarChart3,
  Settings,
  Globe,
  X
} from 'lucide-react';

// Apps available in MORE menu
const ALL_APPS = [
  { id: 'events', name: 'TONIGHT', icon: Zap, path: 'Events', color: '#00D9FF', desc: "What's on" },
  { id: 'ghosted', name: 'GHOSTED', icon: Ghost, path: 'Social', color: '#FF1493', desc: 'Find people' },
  { id: 'radio', name: 'RADIO', icon: Radio, path: 'Music', color: '#B026FF', desc: 'Live shows' },
  { id: 'pulse', name: 'GLOBE', icon: Globe, path: 'Pulse', color: '#39FF14', desc: 'Live map' },
  { id: 'safety', name: 'CARE', icon: Shield, path: 'Care', color: '#FF0000', desc: 'You good?' },
  { id: 'community', name: 'COMMUNITY', icon: Sparkles, path: 'Community', color: '#FFEB3B', desc: 'Posts' },
  { id: 'tickets', name: 'TICKETS', icon: Ticket, path: 'TicketMarketplace', color: '#FF6B35', desc: 'Buy & sell' },
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
function AppsGridModal({ isOpen, onClose }) {
  if (!isOpen) return null;

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
              <h2 className="text-xl font-black">MORE</h2>
              <p className="text-xs text-white/50 uppercase tracking-wider">HOTMESS London</p>
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

            {/* Quick Actions */}
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
                <Link
                  to={createPageUrl('MembershipUpgrade')}
                  onClick={onClose}
                  className="flex items-center gap-3 p-4 bg-[#FFD700]/10 border border-[#FFD700]/30 rounded-lg"
                >
                  <Sparkles className="w-5 h-5 text-[#FFD700]" />
                  <div>
                    <p className="text-sm font-black">Upgrade</p>
                    <p className="text-[10px] text-white/50">PLUS / CHROME</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Features */}
            <div className="mt-8">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-3">DISCOVER</p>
              <Link
                to="/features"
                onClick={onClose}
                className="block p-4 bg-gradient-to-r from-[#FF1493]/20 to-[#B026FF]/20 border border-[#FF1493]/30 rounded-lg"
              >
                <p className="text-sm font-black mb-1">All Features</p>
                <p className="text-[10px] text-white/50">Explore everything HOTMESS offers</p>
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest">
              18+ • Consent-first • Care always
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
  const [liveCounts, setLiveCounts] = useState({
    rightNow: 34,
    online: 127,
    events: 8
  });
  const location = useLocation();

  // Simulate live counts (in production, fetch from API)
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCounts(prev => ({
        rightNow: Math.max(10, prev.rightNow + Math.floor(Math.random() * 5) - 2),
        online: Math.max(50, prev.online + Math.floor(Math.random() * 10) - 5),
        events: Math.max(3, prev.events + (Math.random() > 0.8 ? 1 : 0) - (Math.random() > 0.8 ? 1 : 0))
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path) => {
    if (path === 'Home' || path === 'Music') return location.pathname === '/' || currentPageName === 'Home' || currentPageName === 'Music';
    return currentPageName === path;
  };

  const isRadioActive = location.pathname === '/' || currentPageName === 'Home' || currentPageName === 'Music';
  const isTonightActive = currentPageName === 'Events' || currentPageName === 'Beacons' || currentPageName === 'Pulse';
  const isGhostedActive = currentPageName === 'Social' || currentPageName === 'ProfilesGrid' || currentPageName === 'Connect';
  const isShopActive = currentPageName === 'Marketplace' || location.pathname.startsWith('/market');

  return (
    <>
      {/* Bottom Navigation Bar - RADIO • TONIGHT • GHOSTED • SHOP • MORE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-end justify-around px-2 py-1">
          
          {/* RADIO - The heartbeat */}
          <Link
            to="/"
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isRadioActive ? 'text-white' : 'text-white/50'
            }`}
          >
            <Radio className={`w-6 h-6 ${isRadioActive ? 'text-[#B026FF]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Radio</span>
            {isRadioActive && (
              <span className="w-1 h-1 rounded-full bg-[#39FF14] mt-0.5 animate-pulse" />
            )}
          </Link>

          {/* TONIGHT - What's happening */}
          <Link
            to={createPageUrl('Events')}
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isTonightActive ? 'text-white' : 'text-white/50'
            }`}
          >
            <Zap className={`w-6 h-6 ${isTonightActive ? 'text-[#00D9FF]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Tonight</span>
            {liveCounts.events > 0 && (
              <span className="text-[8px] text-[#00D9FF]">{liveCounts.events} on</span>
            )}
          </Link>

          {/* GHOSTED - Social discovery (center, but not dominant) */}
          <Link
            to={createPageUrl('Social')}
            className={`flex flex-col items-center py-2 px-3 transition-all ${
              isGhostedActive ? 'text-white' : 'text-white/50'
            }`}
          >
            <Ghost className={`w-6 h-6 ${isGhostedActive ? 'text-[#FF1493]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-1">Ghosted</span>
            {liveCounts.rightNow > 0 && (
              <span className="text-[8px] text-[#FF1493]">{liveCounts.rightNow} out</span>
            )}
          </Link>

          {/* SHOP */}
          <Link
            to="/market"
            className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] py-1.5 px-2 rounded-lg transition-all active:scale-95 ${
              isShopActive ? 'text-white bg-white/5' : 'text-white/50'
            }`}
          >
            <ShoppingBag className={`w-6 h-6 ${isShopActive ? 'text-[#FFB800]' : ''}`} />
            <span className="text-[9px] font-black uppercase mt-0.5">Shop</span>
          </Link>

          {/* MORE */}
          <button
            onClick={() => setShowApps(true)}
            className="flex flex-col items-center justify-center min-w-[52px] min-h-[48px] py-1.5 px-2 rounded-lg text-white/50 active:text-white active:bg-white/5 transition-all active:scale-95"
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Apps Grid Modal */}
      <AppsGridModal isOpen={showApps} onClose={() => setShowApps(false)} />
    </>
  );
}
