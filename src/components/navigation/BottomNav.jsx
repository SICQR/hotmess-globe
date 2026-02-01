/**
 * BottomNav - Polished mobile navigation
 * 
 * Features:
 * - Haptic feedback simulation
 * - No layout shifts from live counts
 * - Safe area support
 * - Smooth transitions
 * - Active state indicators
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  X,
  MessageCircle,
  User
} from 'lucide-react';

// Apps available in MORE menu
const ALL_APPS = [
  { id: 'events', name: 'TONIGHT', icon: Zap, path: 'Events', color: '#00D9FF', desc: "What's on" },
  { id: 'ghosted', name: 'GHOSTED', icon: Ghost, path: 'Social', color: '#FF1493', desc: 'Find people' },
  { id: 'radio', name: 'RADIO', icon: Radio, path: 'Music', color: '#B026FF', desc: 'Live shows' },
  { id: 'pulse', name: 'GLOBE', icon: Globe, path: 'Pulse', color: '#39FF14', desc: 'Live map' },
  { id: 'messages', name: 'MESSAGES', icon: MessageCircle, path: 'Messages', color: '#FF1493', desc: 'DMs' },
  { id: 'profile', name: 'PROFILE', icon: User, path: 'Profile', color: '#FFFFFF', desc: 'Your page' },
  { id: 'safety', name: 'CARE', icon: Shield, path: 'Care', color: '#FF0000', desc: 'You good?' },
  { id: 'community', name: 'COMMUNITY', icon: Sparkles, path: 'Community', color: '#FFEB3B', desc: 'Posts' },
  { id: 'tickets', name: 'TICKETS', icon: Ticket, path: 'TicketMarketplace', color: '#FF6B35', desc: 'Buy & sell' },
  { id: 'directions', name: 'TRAVEL', icon: Navigation, path: 'Directions', color: '#00D9FF', desc: 'Get there' },
  { id: 'stats', name: 'STATS', icon: BarChart3, path: 'Stats', color: '#FFEB3B', desc: 'Your data' },
  { id: 'settings', name: 'SETTINGS', icon: Settings, path: 'Settings', color: '#FFFFFF', desc: 'Preferences' },
];

// Nav item component with consistent sizing
function NavItem({ to, icon: Icon, label, isActive, color, badge, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex flex-col items-center justify-center w-16 py-2 transition-all active:scale-95"
    >
      <div className="relative">
        <Icon 
          className={`w-6 h-6 transition-colors ${isActive ? '' : 'text-white/50'}`}
          style={{ color: isActive ? color : undefined }}
        />
        {/* Badge - fixed position, won't cause layout shift */}
        {badge && (
          <span 
            className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-black flex items-center justify-center px-0.5"
            style={{ backgroundColor: color, color: '#000' }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`text-[9px] font-black uppercase mt-1 transition-colors ${isActive ? 'text-white' : 'text-white/50'}`}>
        {label}
      </span>
      {/* Active indicator */}
      <div 
        className={`w-1 h-1 rounded-full mt-0.5 transition-all ${isActive ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundColor: color }}
      />
    </Link>
  );
}

// Apps Grid Modal
function AppsGridModal({ isOpen, onClose }) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 safe-area-top">
              <div>
                <h2 className="text-xl font-black">More</h2>
                <p className="text-xs text-white/50 uppercase tracking-wider">HOTMESS London</p>
              </div>
              <button
                onClick={onClose}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Apps Grid */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="grid grid-cols-4 gap-3">
                {ALL_APPS.map((app, index) => {
                  const Icon = app.icon;
                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link
                        to={createPageUrl(app.path)}
                        onClick={onClose}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all active:scale-95"
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform"
                          style={{ backgroundColor: `${app.color}15` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: app.color }} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">
                          {app.name}
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-8">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-3 px-1">Quick Links</p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to={createPageUrl('Care')}
                    onClick={onClose}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/15 transition-colors active:scale-98"
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
                    className="flex items-center gap-3 p-4 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl hover:bg-[#FFD700]/15 transition-colors active:scale-98"
                  >
                    <Sparkles className="w-5 h-5 text-[#FFD700]" />
                    <div>
                      <p className="text-sm font-black">Upgrade</p>
                      <p className="text-[10px] text-white/50">PLUS / CHROME</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Discover */}
              <div className="mt-6">
                <Link
                  to="/features"
                  onClick={onClose}
                  className="block p-4 bg-gradient-to-r from-[#FF1493]/10 to-[#B026FF]/10 border border-[#FF1493]/20 rounded-xl hover:from-[#FF1493]/15 hover:to-[#B026FF]/15 transition-all active:scale-98"
                >
                  <p className="text-sm font-black mb-1">Explore Features</p>
                  <p className="text-[10px] text-white/50">Everything HOTMESS offers</p>
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 text-center safe-area-bottom">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">
                18+ • Consent-first • Care always
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Main Bottom Navigation
export default function BottomNav({ currentPageName, user }) {
  const [showApps, setShowApps] = useState(false);
  const location = useLocation();

  // Check active states
  const isRadioActive = location.pathname === '/' || currentPageName === 'Home' || currentPageName === 'Music';
  const isTonightActive = currentPageName === 'Events' || currentPageName === 'Beacons' || currentPageName === 'Pulse';
  const isGhostedActive = currentPageName === 'Social' || currentPageName === 'ProfilesGrid' || currentPageName === 'Connect' || currentPageName === 'Messages';
  const isShopActive = currentPageName === 'Marketplace' || currentPageName === 'Shop' || location.pathname.startsWith('/market');

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl border-t border-white/10" />
        
        {/* Nav items */}
        <div 
          className="relative flex items-center justify-around"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <NavItem
            to="/"
            icon={Radio}
            label="Radio"
            isActive={isRadioActive}
            color="#B026FF"
          />

          <NavItem
            to={createPageUrl('Events')}
            icon={Zap}
            label="Tonight"
            isActive={isTonightActive}
            color="#00D9FF"
          />

          <NavItem
            to={createPageUrl('Social')}
            icon={Ghost}
            label="Ghosted"
            isActive={isGhostedActive}
            color="#FF1493"
          />

          <NavItem
            to="/market"
            icon={ShoppingBag}
            label="Shop"
            isActive={isShopActive}
            color="#FFB800"
          />

          {/* More button */}
          <button
            onClick={() => setShowApps(true)}
            className="flex flex-col items-center justify-center w-16 py-2 transition-all active:scale-95"
          >
            <MoreHorizontal className="w-6 h-6 text-white/50" />
            <span className="text-[9px] font-black uppercase mt-1 text-white/50">More</span>
            <div className="w-1 h-1 rounded-full mt-0.5 opacity-0" />
          </button>
        </div>
      </nav>

      {/* Apps Grid Modal */}
      <AppsGridModal isOpen={showApps} onClose={() => setShowApps(false)} />
    </>
  );
}
