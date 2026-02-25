/**
 * OSBottomNav - Fixed 5-icon bottom navigation
 *
 * Exactly 5 modes: Home, Pulse, Ghosted, Market, Profile
 * Active icon sits inside an amber filled circle.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Activity, Ghost, ShoppingBag, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { OSMode, MODES, MODE_ORDER, getModeFromPath } from '@/modes';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useLongPress } from '@/hooks/useLongPress';
import PersonaSwitcherSheet from '@/components/sheets/PersonaSwitcherSheet';

const ICONS: Record<OSMode, React.FC<{ className?: string }>> = {
  home: Home,
  pulse: Activity,
  ghosted: Ghost,
  market: ShoppingBag,
  radio: Activity, // fallback, not shown in nav
  profile: User,
};

interface OSBottomNavProps {
  className?: string;
}

export function OSBottomNav({ className = '' }: OSBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMode = getModeFromPath(location.pathname);
  const { unreadCount } = useUnreadCount();
  const [showSwitcher, setShowSwitcher] = useState(false);

  const handleModeChange = (mode: OSMode) => {
    if (mode === currentMode) return;
    navigate(MODES[mode].path);
  };

  const longPress = useLongPress(() => setShowSwitcher(true));

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
            const isProfile = modeId === 'profile';

            return (
              <button
                key={modeId}
                onClick={() => handleModeChange(modeId)}
                className="relative flex flex-col items-center justify-center flex-1 h-full touch-target"
                aria-label={mode.label}
                aria-current={isActive ? 'page' : undefined}
                {...(isProfile ? longPress : {})}
              >
                {/* Icon — amber circle when active */}
                {isActive ? (
                  <div className="relative w-9 h-9 rounded-full bg-[#C8962C] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-black" />
                    {modeId === 'ghosted' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <Icon className="w-6 h-6 text-white/40" />
                    {modeId === 'ghosted' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Label */}
                <span
                  className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                    isActive ? 'text-[#C8962C]' : 'text-white/30'
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
