/**
 * OSBottomNav - Fixed 5-icon bottom navigation
 * 
 * Exactly 5 modes: Ghosted, Pulse, Market, Radio, Profile
 * No secondary navigation clusters.
 * No app grid launcher.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Grid3X3, Globe, ShoppingBag, Radio, User } from 'lucide-react';
import { OSMode, MODES, MODE_ORDER, getModeFromPath } from '@/modes';

const ICONS: Record<OSMode, React.FC<{ className?: string }>> = {
  ghosted: Grid3X3,
  pulse: Globe,
  market: ShoppingBag,
  radio: Radio,
  profile: User,
};

interface OSBottomNavProps {
  className?: string;
}

export function OSBottomNav({ className = '' }: OSBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMode = getModeFromPath(location.pathname);

  const handleModeChange = (mode: OSMode) => {
    if (mode === currentMode) return;
    navigate(MODES[mode].path);
  };

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe ${className}`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {MODE_ORDER.map((modeId) => {
          const mode = MODES[modeId];
          const Icon = ICONS[modeId];
          const isActive = currentMode === modeId;

          return (
            <button
              key={modeId}
              onClick={() => handleModeChange(modeId)}
              className="relative flex flex-col items-center justify-center flex-1 h-full touch-target"
              aria-label={mode.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-8 h-0.5 bg-gradient-to-r from-[#FF1493] to-[#00D9FF] rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon */}
              <Icon 
                className={`w-6 h-6 transition-colors duration-200 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-white/50 group-hover:text-white/70'
                }`}
              />

              {/* Label */}
              <span 
                className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-white/40'
                }`}
              >
                {mode.label}
              </span>

              {/* Pulse animation for Radio when live */}
              {modeId === 'radio' && (
                <span className="absolute top-2 right-1/2 translate-x-4 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default OSBottomNav;
