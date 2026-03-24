/**
 * TrackMiniCard — compact inline track card for embedding in non-music contexts
 *
 * Use cases:
 * - HNH Lube product listing → plays "HNH Mess" track
 * - Ghosted grid ambient audio toggle
 * - Any surface that wants a small playable track reference
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Music } from 'lucide-react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

export function TrackMiniCard({
  track,          // { id, title, artist, artwork_url, preview_url, duration_seconds }
  label = '',     // e.g. "HNH MESS Soundtrack"
  accentColor = '#C8962C',
  className = '',
}) {
  const player = useMusicPlayer();
  const isActive = player.currentTrack?.id === track?.id;
  const isPlaying = isActive && player.isPlaying;

  if (!track) return null;

  const handlePlay = () => {
    if (isActive) {
      player.togglePlayPause();
    } else {
      player.playTrack({
        ...track,
        artist: track.artist || 'Smash Daddys',
      });
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
        isActive
          ? 'border-white/10 bg-white/[0.04]'
          : 'border-white/5 bg-white/[0.02]'
      } ${className}`}
    >
      {/* Artwork / icon */}
      <button
        onClick={handlePlay}
        className="relative w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${accentColor}15` }}
      >
        {track.artwork_url ? (
          <img src={track.artwork_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music className="w-5 h-5" style={{ color: accentColor }} />
        )}
        {/* Play/pause overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" fill="white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          )}
        </div>
      </button>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        {label && (
          <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: accentColor }}>
            {label}
          </p>
        )}
        <p className="text-xs font-bold text-white truncate">{track.title}</p>
        <p className="text-[10px] text-white/30">{track.artist || 'Smash Daddys'}</p>
      </div>

      {/* Progress indicator when playing */}
      {isActive && (
        <div className="flex items-end gap-0.5 h-4 shrink-0">
          <span
            className="w-[2px] rounded-full animate-pulse"
            style={{ height: '40%', backgroundColor: accentColor }}
          />
          <span
            className="w-[2px] rounded-full animate-pulse"
            style={{ height: '70%', backgroundColor: accentColor, animationDelay: '0.15s' }}
          />
          <span
            className="w-[2px] rounded-full animate-pulse"
            style={{ height: '50%', backgroundColor: accentColor, animationDelay: '0.3s' }}
          />
        </div>
      )}
    </motion.div>
  );
}

export default TrackMiniCard;
