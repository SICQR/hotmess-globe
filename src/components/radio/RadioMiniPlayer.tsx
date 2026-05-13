/**
 * RadioMiniPlayer — Persistent mini player bar
 *
 * Sits just above OSBottomNav across the entire app when radio is playing.
 * Hidden when user is already on /radio (full screen player is visible).
 * Hidden when not playing.
 */

import { ChevronUp, Pause, Play, Radio } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useRadio } from '@/contexts/RadioContext';

const DRAG_THRESHOLD = -60; // drag up 60px to expand

interface RadioMiniPlayerProps {
  /** Hide the bar (used when on /radio route) */
  hidden?: boolean;
}

export function RadioMiniPlayer({ hidden = false }: RadioMiniPlayerProps) {
  const { isPlaying, currentShowName, togglePlay } = useRadio();
  const navigate = useNavigate();
  const location = useLocation();
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-80, 0], [0.6, 1]);

  if (!isPlaying || hidden) return null;

  // Phil exec review 2026-05-13: in Ghosted mode the player compresses to a
  // persistent system-audio strip — no Live pulse, smaller controls, less
  // gold. Media duplication with the top transmission strip is forbidden.
  const isGhosted = location.pathname.startsWith('/ghosted');

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < DRAG_THRESHOLD) {
      navigate('/radio');
    }
  };

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: -80, bottom: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
      className={`fixed left-0 right-0 z-40 flex items-center cursor-grab active:cursor-grabbing touch-none ${
        isGhosted ? 'gap-2 px-3 py-1' : 'gap-3 px-4 py-2'
      }`}
      style={{
        bottom: '83px',
        y,
        opacity,
        background: isGhosted ? 'rgba(13,13,13,0.92)' : '#0D0D0D',
        borderTop: isGhosted
          ? '0.5px solid rgba(200,150,44,0.08)'
          : '0.5px solid rgba(200,150,44,0.20)',
      }}
    >
      {/* Left: radio icon — gold dot only in Ghosted mode, full badge elsewhere */}
      {isGhosted ? (
        <span
          aria-hidden
          className="flex-shrink-0"
          style={{
            width: 14, height: 14, borderRadius: '50%',
            background: 'rgba(200,150,44,0.16)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Radio className="w-2.5 h-2.5" style={{ color: 'rgba(200,150,44,0.85)' }} />
        </span>
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#C8962C] flex items-center justify-center flex-shrink-0">
          <Radio className="w-4 h-4 text-black" />
        </div>
      )}

      {/* Middle: station + show name. In Ghosted mode: single quiet line,
          no Live pulse. */}
      <div className="flex-1 min-w-0">
        {isGhosted ? (
          <p
            className="leading-tight truncate"
            style={{
              fontSize: 10,
              letterSpacing: '0.22em',
              color: 'rgba(200,150,44,0.65)',
              fontWeight: 500,
              textTransform: 'uppercase',
            }}
          >
            {currentShowName || 'HOTMESS Radio · live'}
          </p>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Right: controls — compressed in Ghosted mode */}
      <div className={`flex items-center flex-shrink-0 ${isGhosted ? 'gap-1' : 'gap-2'}`}>
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause radio' : 'Play radio'}
          className={`rounded-full flex items-center justify-center active:scale-95 transition-transform ${
            isGhosted
              ? 'w-6 h-6 bg-transparent'
              : 'w-8 h-8 bg-[#C8962C]/10'
          }`}
          style={isGhosted ? { color: 'rgba(200,150,44,0.65)' } : undefined}
        >
          {isPlaying ? (
            <Pause className={isGhosted ? 'w-3 h-3' : 'w-4 h-4 text-[#C8962C]'} />
          ) : (
            <Play className={isGhosted ? 'w-3 h-3 ml-0.5' : 'w-4 h-4 text-[#C8962C] ml-0.5'} />
          )}
        </button>

        {!isGhosted && (
          <button
            onClick={() => navigate('/radio')}
            aria-label="Open radio player"
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center active:scale-95 transition-transform"
          >
            <ChevronUp className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default RadioMiniPlayer;
