import React from 'react';

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

/**
 * Bottom Dock - mode switcher, does NOT route
 */
export function BottomDock({ activeMode = 'NOW', onModeChange, liveCount }: BottomDockProps) {
  const MODES: Mode[] = ['NOW', 'SOCIAL', 'EVENTS', 'RADIO', 'SHOP', 'PROFILE'];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around bg-[rgba(15,15,18,0.85)] backdrop-blur border-t border-[rgba(255,255,255,0.16)]">
      {MODES.map(mode => {
        const isActive = mode === activeMode;
        const showBadge = mode === 'NOW' && liveCount && liveCount > 0;
        
        return (
          <button
            key={mode}
            onClick={() => onModeChange?.(mode)}
            data-active={isActive}
            className={`
              flex flex-col items-center gap-1 px-3 py-2 relative
              text-xs transition-colors
              ${isActive ? 'text-white' : 'text-[#6B7280]'}
            `}
          >
            <span className="text-lg">{MODE_ICONS[mode]}</span>
            <span>{mode}</span>
            
            {showBadge && (
              <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[#39FF14] text-black text-[10px] flex items-center justify-center">
                {liveCount}
              </span>
            )}
            
            {mode === 'NOW' && isActive && (
              <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[#39FF14]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomDock;
