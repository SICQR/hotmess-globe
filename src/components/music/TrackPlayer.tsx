import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Play, Pause, Volume2, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { trackEvent } from '@/components/utils/analytics';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useRadio } from '@/contexts/RadioContext';

interface TrackPlayerProps {
  trackTitle: string;
  trackSource: string;
  trackId?: string;
  artistName?: string;
  artworkUrl?: string;
  minimal?: boolean;
  className?: string;
  themeColor?: string;
  onPlay?: () => void;
  // New prop to determine if it should use the global persistent player
  useGlobalContext?: boolean;
}

export const TrackPlayer: React.FC<TrackPlayerProps> = ({
  trackTitle,
  trackSource,
  trackId,
  artistName = 'HOTMESS',
  artworkUrl,
  minimal = false,
  className = '',
  themeColor = '#C8962C',
  onPlay,
  useGlobalContext = false, // Default to local playback as requested
}) => {
  // --- CONTEXT STATE ---
  const globalPlayer = useMusicPlayer();
  const { isPlaying: radioPlaying, togglePlay: toggleRadio } = useRadio();

  // --- LOCAL STATE (for when useGlobalContext is false) ---
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [localVolume, setLocalVolume] = useState(0.8);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- DERIVED STATE ---
  const isThisTrackActive = useMemo(() => {
    if (!useGlobalContext) return true; // Always active if local
    if (!globalPlayer.currentTrack) return false;
    if (trackId && globalPlayer.currentTrack.id === trackId) return true;
    return (globalPlayer.currentTrack.preview_url === trackSource || globalPlayer.currentTrack.download_url === trackSource);
  }, [useGlobalContext, globalPlayer.currentTrack, trackId, trackSource]);

  const isPlaying = useGlobalContext 
    ? (isThisTrackActive && globalPlayer.isPlaying)
    : localIsPlaying;

  const progress = useGlobalContext 
    ? (isThisTrackActive ? globalPlayer.progress * 100 : 0)
    : (localProgress * 100);

  const currentTime = useGlobalContext 
    ? (isThisTrackActive ? globalPlayer.currentTime : 0)
    : localCurrentTime;

  const duration = useGlobalContext 
    ? (isThisTrackActive ? globalPlayer.duration : 0)
    : localDuration;

  const volume = useGlobalContext ? globalPlayer.volume : localVolume;

  // --- LOCAL AUDIO CLEANUP ---
  useEffect(() => {
    if (useGlobalContext) return;

    return () => {
      if (localAudioRef.current) {
        localAudioRef.current.pause();
        localAudioRef.current.src = '';
        localAudioRef.current = null;
      }
    };
  }, [useGlobalContext]);

  // --- LOCAL SYNC ---
  useEffect(() => {
    if (useGlobalContext || !localAudioRef.current) return;
    localAudioRef.current.volume = localVolume;
  }, [localVolume, useGlobalContext]);

  const togglePlay = async () => {
    if (radioPlaying) toggleRadio();

    if (useGlobalContext) {
      if (isThisTrackActive) {
        globalPlayer.togglePlayPause();
      } else {
        if (onPlay) onPlay();
        trackEvent('track_play', { title: trackTitle });
        globalPlayer.playTrack({
          id: trackId || trackSource,
          title: trackTitle,
          artist: artistName,
          artwork_url: artworkUrl,
          preview_url: trackSource,
        });
      }
    } else {
      // LOCAL PLAYBACK LOGIC
      if (!localAudioRef.current) {
        const audio = new Audio(trackSource);
        audio.volume = localVolume;
        
        audio.addEventListener('loadedmetadata', () => setLocalDuration(audio.duration));
        audio.addEventListener('timeupdate', () => {
          setLocalCurrentTime(audio.currentTime);
          setLocalProgress(audio.currentTime / audio.duration);
        });
        audio.addEventListener('ended', () => {
          setLocalIsPlaying(false);
          setLocalProgress(0);
          setLocalCurrentTime(0);
        });
        localAudioRef.current = audio;
      }

      if (localIsPlaying) {
        localAudioRef.current.pause();
        setLocalIsPlaying(false);
      } else {
        // Pause global music if it's playing
        if (globalPlayer.isPlaying) globalPlayer.pause();
        
        if (onPlay) onPlay();
        trackEvent('track_play', { title: trackTitle });
        await localAudioRef.current.play().catch(() => {});
        setLocalIsPlaying(true);
      }
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    if (useGlobalContext) {
      if (isThisTrackActive) globalPlayer.seek(val);
    } else if (localAudioRef.current) {
      localAudioRef.current.currentTime = val * localAudioRef.current.duration;
      setLocalProgress(val);
      setLocalCurrentTime(localAudioRef.current.currentTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    if (useGlobalContext) {
      globalPlayer.setVolume(newVol);
    } else {
      setLocalVolume(newVol);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- UI RENDER (Same as before, just uses the derived/local state) ---
  if (minimal) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 active:scale-95 transition-transform"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-white uppercase tracking-wider truncate">
            {trackTitle}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full"
                style={{ background: themeColor }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
              />
            </div>
            <span className="text-[8px] font-bold text-white/30 w-6">
              {formatTime(duration - currentTime)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] bg-[#0A0A0C] border border-white/[0.04] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden group/player ${className}`}>
      <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[160%] blur-[120px] opacity-[0.1] pointer-events-none transition-all duration-1000" style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)` }} />
      
      <div className="flex items-center gap-4 sm:gap-5 mb-5 sm:mb-6 relative z-10">
        <div className="relative flex-shrink-0">
          {artworkUrl ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-20">
              <img src={artworkUrl} alt={trackTitle} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-white/[0.1] to-transparent border border-white/10 flex items-center justify-center shadow-2xl relative z-20">
              <Music className="w-7 h-7 sm:w-9 sm:h-9 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 blur-3xl opacity-40 scale-125 -z-0 translate-y-3" style={{ backgroundColor: themeColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 mb-1 sm:mb-1.5">
            <span className="text-[9px] sm:text-[9.5px] font-black text-[#C8962C] uppercase tracking-[0.4em] opacity-90">STUDIO MASTER</span>
            {isPlaying && (
              <div className="flex gap-[2px] sm:gap-[3px] h-3 items-center">
                {[0.4, 0.7, 0.5, 0.9].map((h, i) => (
                  <motion.div key={i} className="w-[1.5px] sm:w-[2px] bg-[#C8962C] rounded-full" animate={{ height: ['40%', '100%', '60%'] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} />
                ))}
              </div>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white truncate leading-none uppercase tracking-tighter mb-0.5">{trackTitle}</h3>
          <p className="text-[10px] sm:text-[12px] font-bold text-white/30 uppercase tracking-[0.25em]">{artistName}</p>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-5 relative z-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-5 flex-1">
            <motion.button whileHover={{ scale: 1.05, backgroundColor: '#fff' }} whileTap={{ scale: 0.95 }} onClick={togglePlay} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all bg-white text-black shadow-[0_12px_35px_rgba(255,255,255,0.2)] flex-shrink-0">
              {isPlaying ? <Pause className="w-6 h-6 fill-black" /> : <Play className="w-6 h-6 fill-black ml-1" />}
            </motion.button>
            <div className="flex-1">
              <div className="relative h-9 flex items-center group/scrub">
                <input type="range" min="0" max="100" value={progress} onChange={handleProgressChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                <div className="w-full h-1.5 sm:h-2 bg-white/[0.06] rounded-full overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10 flex justify-between px-2 items-center pointer-events-none">
                    {Array.from({ length: 25 }).map((_, i) => <div key={i} className="w-[1px] h-1.5 sm:h-1.5 bg-white" />)}
                  </div>
                  <motion.div className="h-full rounded-full relative z-10" style={{ backgroundColor: themeColor }} animate={{ width: `${progress}%` }} transition={{ type: 'spring', bounce: 0, duration: 0.15 }}>
                     <div className="absolute top-0 right-0 w-16 h-full bg-white/40 blur-lg rounded-full" />
                  </motion.div>
                </div>
              </div>
              <div className="flex justify-between items-center -mt-2.5 px-0.5">
                <span className="text-[10px] sm:text-[11px] font-black text-white/20 tracking-widest tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-[10px] sm:text-[11px] font-black text-white/20 tracking-widest tabular-nums">{formatTime(duration)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/[0.04] px-4 py-2 sm:px-4 sm:py-3 rounded-2xl border border-white/5 group/vol shadow-inner self-end sm:self-auto">
            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40 group-hover/vol:text-white transition-colors" />
            <div className="w-20 sm:w-20 relative h-1 flex items-center">
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
              <div className="w-full h-full bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full" style={{ background: themeColor }} animate={{ width: `${volume * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
