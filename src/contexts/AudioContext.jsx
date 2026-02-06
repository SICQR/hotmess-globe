/**
 * AudioContext - Unified persistent audio player state
 * 
 * This context manages audio playback that persists across ALL route changes.
 * The audio element lives at the app root level, not in individual components.
 * 
 * Features:
 * - Persistent playback across navigation
 * - Live radio stream + on-demand tracks
 * - Volume/mute state
 * - Track queue management
 * - Mini-player visibility
 * - XP rewards for listening
 */

import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const AudioContext = createContext(null);

// Radio stream URL
const LIVE_STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454';

// Live track object
const LIVE_TRACK = {
  id: '__live__',
  type: 'live',
  title: 'HOTMESS RADIO',
  artist: 'LIVE NOW',
  description: 'Live stream',
  audio_url: LIVE_STREAM_URL,
  artwork: '/radio-live.jpg',
};

export function AudioProvider({ children }) {
  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(LIVE_TRACK);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // UI state
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  
  // Queue state
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  
  // XP tracking
  const [listenStartTime, setListenStartTime] = useState(null);
  const xpIntervalRef = useRef(null);
  
  // Audio element ref (lives at app root)
  const audioRef = useRef(null);
  
  // Fetch available audio tracks (beacons with audio)
  const { data: audioTracks = [] } = useQuery({
    queryKey: ['audio-tracks-global'],
    queryFn: async () => {
      try {
        const beacons = await base44.entities.Beacon.filter({ mode: 'radio', active: true });
        return beacons.filter(b => b.audio_url).map(b => ({
          id: b.id,
          type: 'track',
          title: b.title || 'Untitled Track',
          artist: b.creator_name || 'Unknown Artist',
          description: b.description,
          audio_url: b.audio_url,
          artwork: b.image_url,
          duration: b.duration,
        }));
      } catch (error) {
        console.warn('Failed to fetch audio tracks:', error);
        return [];
      }
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      
      // Event listeners
      audioRef.current.addEventListener('loadstart', () => setIsLoading(true));
      audioRef.current.addEventListener('canplay', () => setIsLoading(false));
      audioRef.current.addEventListener('playing', () => {
        setIsPlaying(true);
        setIsLoading(false);
      });
      audioRef.current.addEventListener('pause', () => setIsPlaying(false));
      audioRef.current.addEventListener('ended', handleTrackEnd);
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current.currentTime);
      });
      audioRef.current.addEventListener('durationchange', () => {
        setDuration(audioRef.current.duration);
      });
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsLoading(false);
        setIsPlaying(false);
      });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // XP rewards - award 10 XP every 5 minutes of listening
  useEffect(() => {
    if (isPlaying && !listenStartTime) {
      setListenStartTime(Date.now());
    }
    
    if (isPlaying) {
      xpIntervalRef.current = setInterval(async () => {
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) {
            await base44.integrations.DataAnalytics.trackEvent({
              event_name: 'radio_listen_xp',
              properties: { minutes: 5, track_id: currentTrack?.id },
            });
          }
        } catch (e) {
          // Silent fail for XP
        }
      }, 5 * 60 * 1000); // Every 5 minutes
    }
    
    return () => {
      if (xpIntervalRef.current) {
        clearInterval(xpIntervalRef.current);
      }
    };
  }, [isPlaying, currentTrack]);

  // Handle track ending
  const handleTrackEnd = useCallback(() => {
    if (currentTrack?.type === 'live') {
      // Live stream shouldn't end, try to reconnect
      audioRef.current?.play().catch(() => {});
      return;
    }
    
    // Play next in queue or loop back to live
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      playTrack(queue[queueIndex + 1]);
      setQueueIndex(prev => prev + 1);
    } else {
      // Return to live stream
      playTrack(LIVE_TRACK);
      setQueue([]);
      setQueueIndex(0);
    }
  }, [currentTrack, queue, queueIndex]);

  // Play a track
  const playTrack = useCallback((track) => {
    if (!track?.audio_url || !audioRef.current) return;
    
    const isSameTrack = currentTrack?.id === track.id;
    
    if (isSameTrack && isPlaying) {
      // Already playing this track
      return;
    }
    
    if (!isSameTrack) {
      setCurrentTrack(track);
      audioRef.current.src = track.audio_url;
      setCurrentTime(0);
    }
    
    audioRef.current.play().catch((e) => {
      console.warn('Playback blocked:', e);
    });
    
    setIsPlayerVisible(true);
  }, [currentTrack, isPlaying]);

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // If no src, default to live
      if (!audioRef.current.src) {
        audioRef.current.src = LIVE_TRACK.audio_url;
        setCurrentTrack(LIVE_TRACK);
      }
      audioRef.current.play().catch(() => {});
      setIsPlayerVisible(true);
    }
  }, [isPlaying]);

  // Pause
  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // Play live stream
  const playLive = useCallback(() => {
    playTrack(LIVE_TRACK);
  }, [playTrack]);

  // Seek to position
  const seekTo = useCallback((time) => {
    if (audioRef.current && currentTrack?.type !== 'live') {
      audioRef.current.currentTime = time;
    }
  }, [currentTrack]);

  // Skip to next track
  const skipNext = useCallback(() => {
    if (queue.length > 0 && queueIndex < queue.length - 1) {
      playTrack(queue[queueIndex + 1]);
      setQueueIndex(prev => prev + 1);
    } else if (audioTracks.length > 0) {
      // Pick random track
      const randomTrack = audioTracks[Math.floor(Math.random() * audioTracks.length)];
      playTrack(randomTrack);
    }
  }, [queue, queueIndex, audioTracks, playTrack]);

  // Skip to previous track
  const skipPrev = useCallback(() => {
    if (currentTime > 3) {
      // Restart current track
      seekTo(0);
    } else if (queueIndex > 0) {
      playTrack(queue[queueIndex - 1]);
      setQueueIndex(prev => prev - 1);
    }
  }, [currentTime, queue, queueIndex, seekTo, playTrack]);

  // Add to queue
  const addToQueue = useCallback((track) => {
    setQueue(prev => [...prev, track]);
  }, []);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(0);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Show/hide mini player
  const showPlayer = useCallback(() => setIsPlayerVisible(true), []);
  const hidePlayer = useCallback(() => setIsPlayerVisible(false), []);
  const toggleExpanded = useCallback(() => setIsPlayerExpanded(prev => !prev), []);

  const value = {
    // State
    isPlaying,
    currentTrack,
    volume,
    isMuted,
    duration,
    currentTime,
    isLoading,
    isPlayerVisible,
    isPlayerExpanded,
    queue,
    queueIndex,
    audioTracks,
    isLive: currentTrack?.type === 'live',
    
    // Actions
    playTrack,
    playLive,
    togglePlayPause,
    pause,
    seekTo,
    skipNext,
    skipPrev,
    setVolume,
    toggleMute,
    addToQueue,
    clearQueue,
    showPlayer,
    hidePlayer,
    toggleExpanded,
    
    // Constants
    LIVE_TRACK,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}

export default AudioContext;
