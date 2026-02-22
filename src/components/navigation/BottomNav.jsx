import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Globe, 
  ShoppingBag, 
  LayoutGrid,
  User,
  Radio,
} from 'lucide-react';

/**
 * BottomNav — L1 HUD Navigation (z-50)
 * 
 * RULES:
 * 1. Exactly 5 modes: Ghosted, Pulse, Market, Radio, Profile
 * 2. 44px minimum touch targets (WCAG 2.1)
 * 3. No nested navigation or modals
 * 4. Active state indicated by color + top bar
 * 5. Safe area padding for iOS
 */

// Mode configuration
const MODES = [
  { id: 'ghosted', path: '/', label: 'Ghosted', icon: LayoutGrid, color: '#FF1493' },
  { id: 'pulse', path: '/pulse', label: 'Pulse', icon: Globe, color: '#00D9FF' },
  { id: 'market', path: '/market', label: 'Market', icon: ShoppingBag, color: '#B026FF' },
  { id: 'radio', path: '/radio', label: 'Radio', icon: Radio, color: '#39FF14', hasLive: true },
  { id: 'profile', path: '/profile', label: 'Profile', icon: User, color: '#FFFFFF' },
];

// Determine active mode from pathname
function getActiveMode(pathname) {
  if (pathname === '/' || pathname.startsWith('/ghosted') || pathname.startsWith('/social')) return 'ghosted';
  if (pathname.startsWith('/pulse') || pathname.startsWith('/globe') || pathname.startsWith('/events')) return 'pulse';
  if (pathname.startsWith('/market') || pathname.startsWith('/shop') || pathname.startsWith('/preloved')) return 'market';
  if (pathname.startsWith('/radio') || pathname.startsWith('/music')) return 'radio';
  if (pathname.startsWith('/profile') || pathname.startsWith('/settings') || pathname.startsWith('/account')) return 'profile';
  return 'ghosted';
}

export default function BottomNav() {
  const location = useLocation();
  const activeMode = getActiveMode(location.pathname);

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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
