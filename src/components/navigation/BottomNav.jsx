import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home,
  Globe, 
  ShoppingBag, 
  Ghost,
  User,
  MessageCircle,
  Menu,
} from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useSheet } from '@/contexts/SheetContext';

/**
 * BottomNav — L1 HUD Navigation (z-50)
 * 
 * RULES:
 * 1. Exactly 6 modes: Home, Pulse, Ghosted, Shop, Profile, More
 * 2. 44px minimum touch targets (WCAG 2.1)
 * 3. No nested navigation or modals
 * 4. Active state indicated by color + top bar
 * 5. Safe area padding for iOS
 */

// Mode configuration
const MODES = [
  { id: 'home', path: '/', label: 'Home', icon: Home, color: '#FFFFFF' },
  { id: 'pulse', path: '/pulse', label: 'Pulse', icon: Globe, color: '#00C2E0' },
  { id: 'ghosted', path: '/ghosted', label: 'Ghosted', icon: Ghost, color: '#C8962C' },
  { id: 'market', path: '/market', label: 'Shop', icon: ShoppingBag, color: '#C8962C' },
  { id: 'messages', path: '#', label: 'Inbox', icon: MessageCircle, color: '#FFFFFF', isSheetAction: 'chat' },
  { id: 'profile', path: '/profile', label: 'Profile', icon: User, color: '#FFFFFF' },
  { id: 'more', path: '/more', label: 'More', icon: Menu, color: '#FFFFFF' },
];

// Determine active mode from pathname
function getActiveMode(pathname) {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/pulse')) return 'pulse';
  if (pathname.startsWith('/ghosted')) return 'ghosted';
  if (pathname.startsWith('/market')) return 'market';
  if (pathname.startsWith('/profile')) return 'profile';
  if (pathname.startsWith('/more')) return 'more';
  return 'home';
}

export default function BottomNav() {
  const location = useLocation();
  const activeMode = getActiveMode(location.pathname);
  const { unreadCount } = useUnreadCount();
  const { openSheet } = useSheet();

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto">
        {MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          const Icon = mode.icon;

          return (
            <Link
              key={mode.id}
              to={mode.path}
              onClick={(e) => {
                if (mode.isSheetAction) {
                  e.preventDefault();
                  openSheet(mode.isSheetAction);
                }
              }}
              className="relative flex flex-col items-center justify-center flex-1 min-w-[64px] min-h-[48px] touch-manipulation"
              aria-current={isActive ? 'page' : undefined}
              aria-label={mode.label}
            >
              {/* Active indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-indicator"
                  className="absolute -top-0.5 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: mode.color }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon */}
              <Icon 
                className="w-6 h-6 transition-colors duration-150"
                style={{ color: isActive ? mode.color : 'rgba(255,255,255,0.5)' }}
                aria-hidden="true"
              />

              {/* Label */}
              <span 
                className="text-[9px] font-black uppercase mt-1 tracking-wide transition-colors duration-150"
                style={{ color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}
              >
                {mode.label}
              </span>

              {/* Live indicator for Radio */}
              {mode.hasLive && (
                <span 
                  className="absolute top-2.5 right-1/2 translate-x-5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"
                  aria-label="Live"
                />
              )}

              {/* Unread Message Badge */}
              {mode.id === 'messages' && unreadCount > 0 && (
                <span 
                  className="absolute top-1.5 right-1/2 translate-x-3 bg-[#FF3B30] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-black shadow-sm"
                  style={{ animation: 'bounce 0.5s ease' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
