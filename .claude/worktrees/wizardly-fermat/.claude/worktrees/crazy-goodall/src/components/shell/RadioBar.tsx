import React from 'react';

interface RadioBarProps {
  isPlaying?: boolean;
  trackTitle?: string;
  bpm?: number;
  isLive?: boolean;
  onToggle?: () => void;
}

/**
 * Radio Bar - persistent audio player, never unmounts
 */
export function RadioBar({ 
  isPlaying = false, 
  trackTitle = 'Track', 
  bpm = 92, 
  isLive = false,
  onToggle 
}: RadioBarProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-20 flex h-14 items-center gap-3 px-4 bg-[#0E0E12] border-t border-[rgba(255,255,255,0.08)]">
      <button 
        onClick={onToggle}
        className="w-10 h-10 flex items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-white"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#A1A1AA]">
          {isLive ? (
            <span className="text-[#C8962C]">● LIVE</span>
          ) : (
            'NOW PLAYING'
          )}
        </div>
        <div className="text-sm text-white truncate">
          {trackTitle} • {bpm} BPM
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-[rgba(255,255,255,0.08)]" />
      </div>
    </div>
  );
}

export default RadioBar;
