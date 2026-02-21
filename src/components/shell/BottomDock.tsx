import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { useNavigate } from 'react-router-dom';
import { LAYER, DURATION, EASE } from '@/lib/layerSystem';

export type Mode = 'NOW' | 'SOCIAL' | 'EVENTS' | 'RADIO' | 'SHOP' | 'PROFILE';

interface BottomDockProps {
  activeMode?: Mode;
  onModeChange?: (mode: Mode) => void;
  liveCount?: number;
}

const MODE_ICONS: Record<Mode, string> = {
  NOW: '◉',
  SOCIAL: '👥',
  EVENTS: '📅',
  RADIO: '📻',
  SHOP: '🛒',
  PROFILE: '👤'
};

const MODE_TO_SHEET: Record<Mode, string | null> = {
  NOW: SHEET_TYPES.GHOSTED,
  SOCIAL: SHEET_TYPES.SOCIAL,
  EVENTS: SHEET_TYPES.EVENTS,
  RADIO: null,
  SHOP: SHEET_TYPES.MARKETPLACE,
  PROFILE: SHEET_TYPES.PROFILE,
};

const MODES: Mode[] = ['NOW', 'SOCIAL', 'EVENTS', 'RADIO', 'SHOP', 'PROFILE'];

/**
 * BottomDock — L1 Shell (z-hud / z-[50])
 *
 * Persistent navigation bar. Sits below sheets (L2 z-[80]) but above globe (L0).
 * Active-indicator animates with a deliberate NORMAL (250ms) ease — one motion,
 * not competing with sheet slide or globe camera.
 */
export function BottomDock({ activeMode = 'NOW', onModeChange, liveCount }: BottomDockProps) {
  const { openSheet, closeSheet, activeSheet } = useSheet();
  const navigate = useNavigate();

  const handleModeClick = (mode: Mode) => {
    onModeChange?.(mode);
    const sheetType = MODE_TO_SHEET[mode];
    if (sheetType) {
      activeSheet === sheetType ? closeSheet() : openSheet(sheetType);
    } else if (mode === 'RADIO') {
      navigate('/music/live');
    }
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 ${LAYER.HUD} flex items-center bg-[rgba(5,5,7,0.92)] backdrop-blur-[20px] border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)]`}
    >
      {MODES.map((mode) => {
        const isActive   = mode === activeMode || activeSheet === MODE_TO_SHEET[mode];
        const showBadge  = mode === 'NOW' && liveCount && liveCount > 0;

        return (
          <button
            key={mode}
            onClick={() => handleModeClick(mode)}
            data-active={isActive}
            aria-label={mode}
            className={`
              flex flex-1 flex-col items-center justify-center gap-0.5
              min-h-[52px] py-2 relative
              font-black uppercase tracking-wider
              transition-colors duration-[${DURATION.NORMAL}ms]
              ${isActive ? 'text-white' : 'text-[#6B7280] hover:text-white/60'}
              active:scale-95 active:opacity-70
            `}
            style={{ transitionTimingFunction: `cubic-bezier(${EASE.UI.join(',')})` }}
          >
            <span className="text-xl leading-none select-none">{MODE_ICONS[mode]}</span>
            <span className="text-[11px] leading-tight">{mode}</span>

            {/* Live badge — appears instantly (micro timing) */}
            {showBadge && (
              <span className="absolute top-1.5 right-[18%] h-[18px] min-w-[18px] px-1 rounded-full bg-[#39FF14] text-black text-[10px] font-black flex items-center justify-center">
                {(liveCount ?? 0) > 99 ? '99+' : liveCount}
              </span>
            )}

            {/* Active underline — animates on presence change, NORMAL timing */}
            <AnimatePresence>
              {isActive && (
                <motion.span
                  layoutId="dock-indicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#FF1493]"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0 }}
                  transition={{ duration: DURATION.NORMAL / 1000, ease: 'easeInOut' }}
                />
              )}
            </AnimatePresence>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomDock;
