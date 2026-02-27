/**
 * RadioMiniPlayer — Persistent mini player bar
 *
 * Sits just above OSBottomNav across the entire app when radio is playing.
 * Hidden when user is already on /radio (full screen player is visible).
 * Hidden when not playing.
 */

import { ChevronUp, Pause, Play, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRadio } from '@/contexts/RadioContext';

interface RadioMiniPlayerProps {
  /** Hide the bar (used when on /radio route) */
  hidden?: boolean;
}

export function RadioMiniPlayer({ hidden = false }: RadioMiniPlayerProps) {
  const { isPlaying, currentShowName, togglePlay } = useRadio();
  const navigate = useNavigate();

  if (!isPlaying || hidden) return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 bg-[#0D0D0D] border-t border-[#C8962C]/20 px-4 py-2 flex items-center gap-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}
    >
      {/* Left: amber radio icon badge */}
      <div className="w-8 h-8 rounded-full bg-[#C8962C] flex items-center justify-center flex-shrink-0">
        <Radio className="w-4 h-4 text-black" />
      </div>

      {/* Middle: station + show name + LIVE badge */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[#C8962C] font-black text-xs leading-tight tracking-wide">
            HOTMESS RADIO
          </p>
          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-[8px] font-black uppercase tracking-wider">Live</span>
          </span>
        </div>
        {currentShowName ? (
          <p className="text-white/40 text-[10px] leading-tight truncate">{currentShowName}</p>
        ) : (
          <p className="text-white/40 text-[10px] leading-tight">Streaming via RadioKing</p>
        )}
      </div>

      {/* Right: play/pause + expand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
          className="w-8 h-8 rounded-full bg-[#C8962C]/10 flex items-center justify-center active:scale-95 transition-transform"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-[#C8962C]" />
          ) : (
            <Play className="w-4 h-4 text-[#C8962C] ml-0.5" />
          )}
        </button>

        <button
          onClick={() => navigate('/radio')}
          aria-label="Open radio player"
          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronUp className="w-4 h-4 text-white/40" />
        </button>
      </div>
    </div>
  );
}

export default RadioMiniPlayer;
