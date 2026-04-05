/**
 * MusicMiniPlayer — persistent mini player above bottom nav
 *
 * Shows current track, progress bar, play/pause, skip.
 * Mounts at shell level in OSArchitecture.
 * Sits at z-50, same level as nav (below sheets).
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, X, Music } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useRadio } from '@/contexts/RadioContext';

export function MusicMiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    isMiniPlayerVisible,
    togglePlayPause,
    skipNext,
    hasNext,
    dismissMiniPlayer,
  } = useMusicPlayer();
  const navigate = useNavigate();
  const { isPlaying: radioPlaying } = useRadio();

  return (
    <AnimatePresence>
      {isMiniPlayerVisible && currentTrack && (
        <motion.div
          initial={{ y: 56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 56, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed left-0 right-0 z-50 bg-[#1C1C1E]/95 backdrop-blur-xl border-t border-white/8"
          style={{ bottom: radioPlaying ? '131px' : '83px' }} /* above nav, shifts up when radio mini player visible */
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5">
            <div
              className="h-full bg-[#C8962C] transition-[width] duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-2">
            {/* Artwork */}
            <div
              className="w-10 h-10 rounded-lg bg-[#1C1C1E] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
              onClick={() => navigate('/music')}
            >
              {currentTrack.artwork_url ? (
                <img src={currentTrack.artwork_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music className="w-5 h-5 text-[#C8962C]/40" />
              )}
            </div>

            {/* Track info */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => navigate('/music')}
            >
              <p className="text-xs font-bold text-white truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-white/40 truncate">
                {currentTrack.artist || 'Smash Daddys'}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-[#C8962C] flex items-center justify-center active:scale-[0.93] transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-black" fill="black" />
                ) : (
                  <Play className="w-4 h-4 text-black ml-0.5" fill="black" />
                )}
              </button>
              {hasNext && (
                <button
                  onClick={skipNext}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <SkipForward className="w-4 h-4 text-white/50" />
                </button>
              )}
              <button
                onClick={dismissMiniPlayer}
                className="w-8 h-8 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-white/30" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MusicMiniPlayer;
