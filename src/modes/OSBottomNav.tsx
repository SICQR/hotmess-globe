/**
 * OSBottomNav - Fixed 5-icon bottom navigation
 *
 * Exactly 5 modes: Home, Pulse, Ghosted, Market, Profile
 * Active icon sits inside an amber filled circle.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Activity, Ghost, ShoppingBag, LayoutGrid, Music, User, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { OSMode, MODES, MODE_ORDER, getModeFromPath } from '@/modes';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useNotifCount } from '@/hooks/useNotifCount';
import { useLongPress } from '@/hooks/useLongPress';
import { useSheet } from '@/contexts/SheetContext';
import { hapticLight } from '@/lib/haptics';
import PersonaSwitcherSheet from '@/components/sheets/PersonaSwitcherSheet';

const ICONS: Record<OSMode, React.FC<{ className?: string }>> = {
  home: Home,
  pulse: Activity,
  ghosted: Ghost,
  market: ShoppingBag,
  radio: Activity, // fallback, not shown in nav
  music: Music,
  profile: User,
  more: LayoutGrid,
  inbox: MessageCircle,
};

interface OSBottomNavProps {
  className?: string;
}

export function OSBottomNav({ className = '' }: OSBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMode = getModeFromPath(location.pathname);
  const { unreadCount, clearTapsBadge, fetchChatCount } = useUnreadCount();
  const { notifCount, clearNotifBadge } = useNotifCount();
  const { openSheet } = useSheet();
  const [showSwitcher, setShowSwitcher] = useState(false);

  // Scroll preservation — save/restore scroll per route
  const scrollPositions = useRef<Record<string, number>>({});

  useEffect(() => {
    // Save scroll position for current route on location change
    return () => {
      try {
        scrollPositions.current[location.pathname] = window.scrollY;
      } catch { }
    };
  }, [location.pathname]);

  // Auto-clear taps badge and refresh chat count when entering Ghosted mode
  useEffect(() => {
    if (currentMode === 'ghosted') {
      clearTapsBadge();
      fetchChatCount?.();
    }
  }, [currentMode, clearTapsBadge, fetchChatCount]);

  const handleModeChange = (mode: OSMode) => {
    if (mode === currentMode) {
      // Double-tap on active tab: scroll to top
      hapticLight();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    hapticLight();
    // Save current scroll position
    try {
      scrollPositions.current[location.pathname] = window.scrollY;
    } catch { }

    navigate(MODES[mode].path);
    // Restore scroll position for target route
    requestAnimationFrame(() => {
      const saved = scrollPositions.current[MODES[mode].path];
      if (saved) window.scrollTo(0, saved);
    });
  };

  // Long-press handlers for each tab — opens quick actions sheet
  const lpHome = useLongPress(() => { hapticLight(); openSheet('quick-actions', { tabOrigin: 'home' }); });
  const lpPulse = useLongPress(() => { hapticLight(); openSheet('quick-actions', { tabOrigin: 'pulse' }); });
  const lpGhosted = useLongPress(() => { hapticLight(); openSheet('quick-actions', { tabOrigin: 'ghosted' }); });
  const lpMarket = useLongPress(() => { hapticLight(); openSheet('quick-actions', { tabOrigin: 'market' }); });
  const lpMusic = useLongPress(() => { hapticLight(); openSheet('quick-actions', { tabOrigin: 'music' }); });
  // More tab: long-press opens persona switcher (existing behaviour)
  const lpMore = useLongPress(() => setShowSwitcher(true));

  const longPressMap: Record<string, ReturnType<typeof useLongPress>> = {
    home: lpHome,
    pulse: lpPulse,
    ghosted: lpGhosted,
    market: lpMarket,
    music: lpMusic,
    more: lpMore,
  };

  return (
    <>
    <nav
        className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-xl border-t border-white/8 ${className}`}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {MODE_ORDER.map((modeId) => {
            const mode = MODES[modeId];
            const Icon = ICONS[modeId];
            const isActive = currentMode === modeId;
            const isMore = modeId === 'more';

            return (
              <button
                key={modeId}
                onClick={() => handleModeChange(modeId)}
                {...(longPressMap[modeId] || {})}
                className="relative flex flex-col items-center justify-center flex-1 h-full min-w-[44px] min-h-[44px] active:opacity-70 transition-opacity"
                aria-label={mode.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon — amber circle when active, 44px min touch target */}
                {isActive ? (
                  <motion.div
                    className="relative w-9 h-9 rounded-full hm-gold-gradient flex items-center justify-center"
                    style={{ boxShadow: '0 0 12px -2px rgba(200,150,44,0.3)' }}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 15 }}
                    key={`active-${modeId}`}
                  >
                    <Icon className="w-5 h-5 text-black" />
                    {modeId === 'ghosted' && unreadCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearTapsBadge();
                          openSheet('taps');
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none"
                        aria-label="View taps"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </button>
                    )}

                    {modeId === 'inbox' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF3B30] text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none" style={{ animation: 'bounce 0.5s ease' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </motion.div>
                ) : (
                  <div className="relative hm-nav-inactive">
                    <Icon className="w-6 h-6" />
                    {modeId === 'ghosted' && unreadCount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearTapsBadge();
                          openSheet('taps');
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none"
                        aria-label="View taps"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </button>
                    )}

                    {modeId === 'inbox' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF3B30] text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none" style={{ animation: 'bounce 0.5s ease' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Label */}
                <span
                  className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${isActive ? 'text-[#C8962C]' : 'text-white/30'
                    }`}
                >
                  {mode.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Persona switcher sheet — long-press Profile tab to open */}
      <AnimatePresence>
        {showSwitcher && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSwitcher(false)}
            />
            <PersonaSwitcherSheet onClose={() => setShowSwitcher(false)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default OSBottomNav;
