/**
 * RadioMiniPlayer — Persistent mini player bar
 *
 * Sits just above OSBottomNav across the entire app when radio is playing.
 * Hidden when user is already on /radio (full screen player is visible).
 * Hidden when not playing.
 */

import { ChevronUp, Pause, Play, Radio } from 'lucide-react';
import { HotmessText } from '@/components/brand/HotmessWordmark';
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

  // /ghosted has its own Radio button in the right rail (Phil 2026-05-25), so the
  // mini-player renders nothing here -- no floating triangle, no overlap with the
  // Ghosted chat FAB. Radio access on Ghosted is the rail -> /radio.
  const isGhosted = location.pathname.startsWith('/ghosted');

  if (isGhosted) return null;
  if (!isPlaying || hidden) return null;

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
      className="fixed left-0 right-0 z-40 flex items-center gap-3 px-4 py-2 cursor-grab active:cursor-grabbing touch-none"
      style={{
        bottom: '83px',
        y,
        opacity,
        background: '#0D0D0D',
        borderTop: '0.5px solid rgba(200,150,44,0.20)',
      }}
    >
      <div className="w-8 h-8 rounded-full bg-[#C8962C] flex items-center justify-center flex-shrink-0">
        <Radio className="w-4 h-4 text-black" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs leading-tight tracking-wide font-medium">
            <HotmessText accent="#C8962C" /> <span style={{ color: '#FFFFFF' }}>RADIO</span>
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
      <div className="flex items-center flex-shrink-0 gap-2">
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
    </motion.div>
  );
}

export default RadioMiniPlayer;
