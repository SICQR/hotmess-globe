/**
 * MusicPlayerContext — global audio state for Smash Daddys music
 *
 * Provides play/pause/seek/queue across the entire OS.
 * MiniPlayer renders at shell level (above nav, below sheets).
 * Works alongside RadioContext (radio takes priority when live).
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { trackEvent } from '@/components/utils/analytics';

const MusicPlayerContext = createContext(null);

export function useMusicPlayer() {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) throw new Error('useMusicPlayer must be inside MusicPlayerProvider');
  return ctx;
}

export function MusicPlayerProvider({ children }) {
  const audioRef = useRef(null);
  const progressInterval = useRef(null);

  const [currentTrack, setCurrentTrack] = useState(null);  // { id, title, artist, artwork_url, preview_url, duration_seconds }
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);       // 0-1
  const [currentTime, setCurrentTime] = useState(0);  // seconds
  const [duration, setDuration] = useState(0);         // seconds

  // Tier-aware preview cap. Default Infinity = no cap (existing behaviour).
  // Set by a tiny <MusicTierGuard /> mounted near the provider — failure to
  // mount it leaves the cap as Infinity which means everyone gets full
  // playback (fail-open for media; never silently mid-cut someone).
  const [previewCapSeconds, setPreviewCapSecondsState] = useState(Infinity);
  const [previewCapHit, setPreviewCapHit] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);

  // Lazy init audio element
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = volume;

      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current.duration || 0);
      });

      audioRef.current.addEventListener('ended', () => {
        // Auto-advance queue
        if (queueIndex < queue.length - 1) {
          playIndex(queueIndex + 1);
        } else {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('[MusicPlayer] audio error:', e);
        setIsPlaying(false);
      });
    }
    return audioRef.current;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress tracking + tier preview cap enforcement
  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        const audio = audioRef.current;
        if (audio && audio.duration) {
          setCurrentTime(audio.currentTime);
          setProgress(audio.currentTime / audio.duration);
          // Tier preview cap: pause + flag if user hits the limit.
          // Number.isFinite excludes Infinity (no cap) and NaN.
          if (Number.isFinite(previewCapSeconds) && previewCapSeconds > 0 && audio.currentTime >= previewCapSeconds) {
            audio.pause();
            setIsPlaying(false);
            setPreviewCapHit(true);
            try {
              window.dispatchEvent(new CustomEvent('music:preview_cap_hit', {
                detail: { cap: previewCapSeconds, trackId: (currentTrack && currentTrack.id) || null },
              }));
            } catch { /* event dispatch best-effort */ }
          }
        }
      }, 250);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [isPlaying, previewCapSeconds, currentTrack]);

  // Volume sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const playTrack = useCallback((track, trackQueue = [], index = 0) => {
    const audio = getAudio();
    const url = track.preview_url || track.download_url;
    if (!url) return;

    audio.src = url;
    audio.play().catch(() => {});
    setPreviewCapHit(false);
    setCurrentTrack(track);
    setIsPlaying(true);
    try {
      trackEvent('music_play', {
        category: 'music',
        track_id: track.id || null,
        track_title: track.title || null,
        artist: track.artist || null,
        queue_size: trackQueue.length,
        queue_index: index,
      });
    } catch { /* ignore */ }
    setProgress(0);
    setCurrentTime(0);
    setIsMiniPlayerVisible(true);

    if (trackQueue.length > 0) {
      setQueue(trackQueue);
      setQueueIndex(index);
    } else {
      setQueue([track]);
      setQueueIndex(0);
    }
  }, [getAudio]);

  const playIndex = useCallback((idx) => {
    if (idx < 0 || idx >= queue.length) return;
    const track = queue[idx];
    const audio = getAudio();
    const url = track.preview_url || track.download_url;
    if (!url) return;

    audio.src = url;
    audio.play().catch(() => {});
    setCurrentTrack(track);
    setQueueIndex(idx);
    setIsPlaying(true);
    setProgress(0);
    setCurrentTime(0);
  }, [queue, getAudio]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((pct) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = pct * audio.duration;
      setProgress(pct);
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const skipNext = useCallback(() => {
    if (queueIndex < queue.length - 1) playIndex(queueIndex + 1);
  }, [queueIndex, queue.length, playIndex]);

  const skipPrev = useCallback(() => {
    const audio = audioRef.current;
    // If more than 3s in, restart current track
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setProgress(0);
      setCurrentTime(0);
    } else if (queueIndex > 0) {
      playIndex(queueIndex - 1);
    }
  }, [queueIndex, playIndex]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTrack(null);
    setProgress(0);
    setCurrentTime(0);
    setIsMiniPlayerVisible(false);
  }, []);

  const dismissMiniPlayer = useCallback(() => {
    stop();
  }, [stop]);

  // setPreviewCap is the only way external code mutates the cap. Caps below
  // 5 seconds are clamped to Infinity (= no cap) to defend against a misread
  // benefit accidentally cutting the track at 0.
  const setPreviewCap = useCallback((seconds) => {
    if (seconds == null || seconds < 0) { setPreviewCapSecondsState(Infinity); return; }
    if (typeof seconds === 'number' && seconds >= 5) setPreviewCapSecondsState(seconds);
    else setPreviewCapSecondsState(Infinity);
  }, []);

  const value = {
    // State
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    progress,
    currentTime,
    duration,
    volume,
    isMiniPlayerVisible,
    // Tier preview cap (Infinity when no cap; setter mounted by MusicTierGuard)
    previewCapSeconds,
    previewCapHit,
    // Actions
    playTrack,
    pause,
    resume,
    togglePlayPause,
    seek,
    skipNext,
    skipPrev,
    stop,
    setVolume,
    dismissMiniPlayer,
    setPreviewCap,
    // Helpers
    hasNext: queueIndex < queue.length - 1,
    hasPrev: queueIndex > 0,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export default MusicPlayerContext;
