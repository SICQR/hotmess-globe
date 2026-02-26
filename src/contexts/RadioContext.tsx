/**
 * RadioContext — Persistent radio player state
 *
 * Lifted to app-level so the mini player bar can show across all routes
 * even when RadioMode is not mounted. Audio element lives here so playback
 * never stops during route transitions.
 * 
 * Integrates sound consent for browser autoplay policy compliance.
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { SoundConsentModal, useSoundConsent } from '@/components/radio/SoundConsentModal';

const STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454';

export interface RadioContextValue {
  isPlaying: boolean;
  currentShowName: string;
  togglePlay: () => void;
  setCurrentShowName: (name: string) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentShowName, setCurrentShowName] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingPlayRef = useRef(false);
  
  const { hasConsent, showModal, requestConsent, grantConsent, declineConsent } = useSoundConsent();

  // Create audio element once on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('playing', () => setIsPlaying(true));
    audio.addEventListener('error', () => setIsPlaying(false));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);
  
  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    try {
      audio.src = STREAM_URL;
      audio.load();
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('[radio] play failed:', err);
      setIsPlaying(false);
    }
  }, []);
  
  // After consent granted, start playback if pending
  useEffect(() => {
    if (hasConsent && pendingPlayRef.current) {
      pendingPlayRef.current = false;
      startPlayback();
    }
  }, [hasConsent, startPlayback]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Check sound consent first
      if (!hasConsent) {
        pendingPlayRef.current = true;
        requestConsent();
        return;
      }
      await startPlayback();
    }
  }, [isPlaying, hasConsent, requestConsent, startPlayback]);
  
  const handleConsent = useCallback(() => {
    grantConsent();
  }, [grantConsent]);

  return (
    <RadioContext.Provider
      value={{ isPlaying, currentShowName, togglePlay, setCurrentShowName, audioRef }}
    >
      {children}
      <SoundConsentModal 
        isOpen={showModal} 
        onConsent={handleConsent} 
        onDecline={declineConsent} 
      />
    </RadioContext.Provider>
  );
}

export function useRadio(): RadioContextValue {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('useRadio must be used within RadioProvider');
  return ctx;
}
