/**
 * RadioMiniPlayer — Persistent mini player bar
 *
 * Sits just above OSBottomNav across the entire app when radio is playing.
 * Hidden when user is already on /radio (full screen player is visible).
 * Hidden when not playing.
 */

import { ChevronUp, Pause, Play, Radio, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
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

  // Phil exec review 2026-05-13: on /ghosted the full-width strip covers the
  // nav and SOS shield. Replaced with a floating play triangle that, when
  // pressed, expands a glass "now playing" rectangle. Triangle ↔ pause icon
  // reflects audio state. Card auto-collapses when audio pauses.
  const isGhosted = location.pathname.startsWith('/ghosted');
  const [expanded, setExpanded] = useState(false);
  const wasPlayingRef = useRef(isPlaying);

  // Open the card the first time audio starts playing while on /ghosted.
  // Close it whenever audio stops. Users can also dismiss manually.
  useEffect(() => {
    if (!isGhosted) return;
    if (isPlaying && !wasPlayingRef.current) setExpanded(true);
    if (!isPlaying) setExpanded(false);
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, isGhosted]);

  // ─── /ghosted: floating triangle + optional glass rectangle ─────────────
  if (isGhosted) {
    if (hidden) return null;

    const handlePress = () => {
      togglePlay();
      // If audio is about to start, open the card. If pausing, the useEffect
      // above will close it automatically.
      if (!isPlaying) setExpanded(true);
    };

    return (
      <>
        {/* Floating play / pause triangle. Left column, ABOVE the
            SafetyFAB (which lives at bottom-24 left-6, w-12 h-12 → 96–144).
            Inbox FAB has the right column; the triangle has the upper-left
            ambient slot. Never covers the nav. */}
        <button
          onClick={handlePress}
          aria-label={isPlaying ? 'Pause HOTMESS Radio' : 'Play HOTMESS Radio'}
          style={{
            position: 'fixed',
            bottom: 156,
            left: 24,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(20,16,12,0.62)',
            backdropFilter: 'blur(18px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
            border: '0.5px solid rgba(200,150,44,0.45)',
            color: 'rgba(200,150,44,0.92)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.40)',
            zIndex: 40,
            transition: 'transform 120ms ease, background 200ms ease',
          }}
        >
          {isPlaying
            ? <Pause size={14} strokeWidth={2.4} />
            : <Play  size={14} strokeWidth={2.4} style={{ marginLeft: 1 }} />}
        </button>

        {/* Glass "now playing" rectangle — visible only while audio plays
            AND user hasn't dismissed it. Slides up from the triangle. */}
        <AnimatePresence>
          {isPlaying && expanded && (
            <motion.div
              role="button"
              aria-label="HOTMESS Radio · now playing — tap to open full player"
              tabIndex={0}
              onClick={() => navigate('/radio')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/radio');
                }
              }}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{    opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.14 } }}
              transition={{ duration: 0.20, ease: [0.22, 0.61, 0.36, 1] }}
              style={{
                position: 'fixed',
                bottom: 204,
                left: 24,
                width: 240,
                padding: '12px 14px',
                borderRadius: 4,
                background: 'rgba(13,13,13,0.55)',
                backdropFilter: 'blur(26px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(26px) saturate(1.5)',
                border: '0.5px solid rgba(200,150,44,0.22)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.55)',
                zIndex: 40,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  aria-hidden
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(200,150,44,0.18)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Radio size={10} strokeWidth={2} style={{ color: 'rgba(200,150,44,0.92)' }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 9,
                      letterSpacing: '0.32em',
                      color: 'rgba(200,150,44,0.70)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      lineHeight: 1.2,
                    }}
                  >
                    HOTMESS Radio · Live
                  </span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 3,
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.78)',
                      lineHeight: 1.35,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentShowName || 'Streaming now'}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                  aria-label="Close now playing"
                  style={{
                    width: 18, height: 18,
                    marginTop: -2, marginRight: -4,
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.45)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ─── Legacy strip — non-Ghosted routes only ─────────────────────────────
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
