import React from 'react';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { useNavigate } from 'react-router-dom';

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

// Map modes to sheet types
const MODE_TO_SHEET: Record<Mode, string | null> = {
  NOW: SHEET_TYPES.GHOSTED,
  SOCIAL: SHEET_TYPES.SOCIAL,
  EVENTS: SHEET_TYPES.EVENTS,
  RADIO: null, // Radio opens in side drawer, not sheet
  SHOP: SHEET_TYPES.MARKETPLACE,
  PROFILE: SHEET_TYPES.PROFILE,
};

/**
 * Bottom Dock (L1 - Z-50) - NavigationHub for Sheet Switching
 * 
 * Persistent navigation bar that opens sheets instead of routing.
 * Uses SheetContext to manage sheet state and URL params.
 */
export function BottomDock({ activeMode = 'NOW', onModeChange, liveCount }: BottomDockProps) {
  const MODES: Mode[] = ['NOW', 'SOCIAL', 'EVENTS', 'RADIO', 'SHOP', 'PROFILE'];
  const { openSheet, closeSheet, activeSheet } = useSheet();
  const navigate = useNavigate();

  const handleModeClick = (mode: Mode) => {
    // Call optional callback
    onModeChange?.(mode);

    // Handle sheet navigation
    const sheetType = MODE_TO_SHEET[mode];
    
    if (sheetType) {
      // Open corresponding sheet
      if (activeSheet === sheetType) {
        // If already open, close it
        closeSheet();
      } else {
        // Open the sheet
        openSheet(sheetType);
      }
    } else {
      // Special handling for non-sheet modes
      if (mode === 'RADIO') {
        // Radio uses side drawer - navigate to Radio page
        navigate('/music/live');
      }
    }
  };

  return (
    /* h-16 (64px) gives enough room; safe-area padding handles iPhone notch */
    <nav className="fixed bottom-0 left-0 right-0 z-[50] flex items-center justify-around bg-[rgba(5,5,7,0.92)] backdrop-blur-[20px] border-t-2 border-white/10 pb-[env(safe-area-inset-bottom)]">
      {MODES.map(mode => {
        const isActive = mode === activeMode || activeSheet === MODE_TO_SHEET[mode];
        const showBadge = mode === 'NOW' && liveCount && liveCount > 0;
        
        return (
          <button
            key={mode}
            onClick={() => handleModeClick(mode)}
            data-active={isActive}
            /* min-h-[44px] ensures iOS/Android 44dp touch target; flex-1 shares width equally */
            className={`
              flex flex-1 flex-col items-center justify-center gap-0.5
              min-h-[52px] py-2 relative
              transition-colors font-black uppercase tracking-wider
              ${isActive ? 'text-white' : 'text-[#6B7280]'}
              active:opacity-70
            `}
            aria-label={mode}
          >
            {/* Icon — text-xl (20px) so finger can land reliably */}
            <span className="text-xl leading-none">{MODE_ICONS[mode]}</span>
            {/* Label — text-[11px] is readable but compact */}
            <span className="text-[11px] leading-tight">{mode}</span>
            
            {showBadge && (
              <span className="absolute top-1.5 right-[18%] h-[18px] min-w-[18px] px-1 rounded-full bg-[#39FF14] text-black text-[10px] font-black flex items-center justify-center">
                {liveCount > 99 ? '99+' : liveCount}
              </span>
            )}
            
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#FF1493]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomDock;
