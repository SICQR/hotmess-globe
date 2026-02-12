/**
 * MiniPlayer - Persistent bottom audio player
 * 
 * Shows current track with play/pause, always visible when audio is active.
 * Expands to full player on tap. Positioned above bottom nav.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Radio, SkipForward, ChevronUp, ChevronDown, X, Volume2, VolumeX, Globe, Calendar, User } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function MiniPlayer() {
  const navigate = useNavigate();
  const {
    isPlaying,
    currentTrack,
    isPlayerVisible,
    isPlayerExpanded,
    isLoading,
    isLive,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlayPause,
    skipNext,
    hidePlayer,
    toggleExpanded,
    setVolume,
    toggleMute,
    seekTo,
  } = useAudio();

  if (!isPlayerVisible || !currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Navigation handlers
  const goToGlobe = () => {
    toggleExpanded();
    navigate('/pulse');
  };

  const goToSchedule = () => {
    toggleExpanded();
    navigate('/music/schedule');
  };

  const goToArtist = () => {
    if (currentTrack.creator_email) {
      toggleExpanded();
      navigate(`/Profile?email=${encodeURIComponent(currentTrack.creator_email)}`);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className={cn(
          "fixed left-0 right-0 z-40 transition-all duration-300",
          isPlayerExpanded ? "bottom-0" : "bottom-16 md:bottom-0"
        )}
      >
        {/* Mini Player Bar */}
        {!isPlayerExpanded && (
          <div className="mx-2 mb-2 md:mx-4 md:mb-4">
            <div 
              className="bg-black/95 backdrop-blur-xl border border-[#FF1493]/30 rounded-xl overflow-hidden shadow-2xl shadow-[#FF1493]/10"
            >
              {/* Progress bar (for non-live tracks) */}
              {!isLive && duration > 0 && (
                <div className="h-0.5 bg-white/10">
                  <div 
                    className="h-full bg-gradient-to-r from-[#FF1493] to-[#B026FF] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              
              <div className="flex items-center gap-3 p-3">
                {/* Artwork/Live indicator */}
                <div 
                  className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={toggleExpanded}
                >
                  {currentTrack.artwork ? (
                    <img 
                      src={currentTrack.artwork} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                      <Radio className="w-6 h-6 text-white" />
                    </div>
                  )}
                  {isLive && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500 rounded text-[8px] font-black uppercase">
                      LIVE
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleExpanded}>
                  <p className="text-sm font-black text-white truncate">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {currentTrack.artist || currentTrack.description}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlayPause}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-full bg-[#FF1493] flex items-center justify-center hover:bg-[#FF1493]/80 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    )}
                  </button>

                  {/* Skip (non-live only) */}
                  {!isLive && (
                    <button
                      onClick={skipNext}
                      className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <SkipForward className="w-4 h-4 text-white/70" />
                    </button>
                  )}

                  {/* Expand */}
                  <button
                    onClick={toggleExpanded}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <ChevronUp className="w-4 h-4 text-white/70" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Player */}
        {isPlayerExpanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-black min-h-screen"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={toggleExpanded}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <span className="text-xs uppercase tracking-widest text-white/50 font-black">
                {isLive ? 'LIVE RADIO' : 'NOW PLAYING'}
              </span>
              <button
                onClick={hidePlayer}
                className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Artwork */}
            <div className="px-8 pt-8 pb-6">
              <div className="aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-[#FF1493]/20">
                {currentTrack.artwork ? (
                  <img 
                    src={currentTrack.artwork} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FF1493] via-[#B026FF] to-[#00D9FF] flex items-center justify-center">
                    <Radio className="w-24 h-24 text-white/80" />
                  </div>
                )}
              </div>
            </div>

            {/* Track Info */}
            <div className="px-8 text-center">
              {isLive && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-black text-red-500 uppercase">LIVE NOW</span>
                </div>
              )}
              <h2 className="text-2xl font-black text-white mb-1">{currentTrack.title}</h2>
              <p className="text-white/50">{currentTrack.artist || currentTrack.description}</p>
            </div>

            {/* Progress (non-live) */}
            {!isLive && duration > 0 && (
              <div className="px-8 mt-8">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF1493]"
                />
                <div className="flex justify-between mt-2 text-xs text-white/40">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mt-8 px-8">
              <button
                onClick={toggleMute}
                className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-6 h-6 text-white/50" />
                ) : (
                  <Volume2 className="w-6 h-6 text-white/50" />
                )}
              </button>

              <button
                onClick={togglePlayPause}
                disabled={isLoading}
                className="w-16 h-16 rounded-full bg-[#FF1493] flex items-center justify-center hover:bg-[#FF1493]/80 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8 text-white" fill="white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                )}
              </button>

              <button
                onClick={skipNext}
                className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <SkipForward className="w-6 h-6 text-white/50" />
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-3 px-8 mt-8">
              <VolumeX className="w-4 h-4 text-white/30" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />
              <Volume2 className="w-4 h-4 text-white/30" />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-4 mt-8 px-8">
              <button
                onClick={goToGlobe}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
              >
                <Globe className="w-4 h-4 text-[#00D9FF]" />
                <span className="text-sm font-bold">View on Globe</span>
              </button>
              <button
                onClick={goToSchedule}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#B026FF]" />
                <span className="text-sm font-bold">Schedule</span>
              </button>
              {currentTrack.creator_email && (
                <button
                  onClick={goToArtist}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  <User className="w-4 h-4 text-[#FF1493]" />
                  <span className="text-sm font-bold">Artist</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
