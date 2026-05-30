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
import { supabase } from '@/components/utils/supabaseClient';
import { radioIntensityFromDensity } from '@/lib/soundOfNight';

const STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454';
// Write a radio_signal to DB at most once per 5 minutes per listen session
const SIGNAL_THROTTLE_MS = 5 * 60 * 1000;
// Listener tracking heartbeat interval
const LISTENER_HEARTBEAT_MS = 60 * 1000;

export interface RadioContextValue {
  isPlaying: boolean;
  currentShowName: string;
  togglePlay: () => void;
  setCurrentShowName: (name: string) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  pauseForSheet: () => void;
  resumeFromSheet: () => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentShowName, setCurrentShowName] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingPlayRef = useRef(false);
  const lastSignalWriteRef = useRef<number>(0);
  const wasPlayingBeforeSheetRef = useRef(false);
  const listenerHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { hasConsent, showModal, requestConsent, grantConsent, declineConsent } = useSoundConsent();

  /** Write a radio_signal row so the globe heat loop can aggregate it */
  const emitRadioSignal = useCallback(async () => {
    const now = Date.now();
    if (now - lastSignalWriteRef.current < SIGNAL_THROTTLE_MS) return;
    lastSignalWriteRef.current = now;

    try {
      // Best-effort — no auth required (anon signal for aggregate heat)
      const userCity = 'london'; // default; will be personalised once we have user city
      const expiresAt = new Date(now + 30 * 60 * 1000).toISOString(); // 30 min window

      // Density → radio amplification (spec §5): higher live count = stronger WAVE
      let intensity = 1;
      try {
        const { count } = await supabase
          .from('right_now_posts')
          .select('*', { count: 'exact', head: true })
          .eq('city', userCity)
          .gt('expires_at', new Date(now).toISOString());
        intensity = radioIntensityFromDensity(count ?? 0);
      } catch { /* best-effort — fall back to intensity 1 */ }

      await supabase.from('radio_signals').insert({
        signal_type: 'listener_active',
        city: userCity,
        intensity,
        listener_count_bucket: '1-10',
        starts_at: new Date(now).toISOString(),
        expires_at: expiresAt,
      });

      // Trigger the aggregation RPC so globe_heat_tiles stays fresh
      await supabase.rpc('aggregate_radio_city_minute');
    } catch {
      // Best-effort — never block playback
    }
  }, []);

  /** Upsert radio_listeners row for LIVE MODE tracking */
  const upsertRadioListener = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const showId = currentShowName || 'live-stream';
      await supabase.from('radio_listeners').upsert({
        user_id: session.user.id,
        show_id: showId,
        updated_at: new Date().toISOString(),
        expires_at: null, // active listener
      }, { onConflict: 'user_id,show_id' });
    } catch { /* best-effort — never block playback */ }
  }, [currentShowName]);

  /** Mark listener as expired (stopped listening) */
  const expireRadioListener = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      await supabase.from('radio_listeners')
        .update({ expires_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id);
    } catch { /* best-effort */ }
  }, []);

  // Radio listener tracking: upsert when playing, expire when stopped, heartbeat every 60s
  useEffect(() => {
    if (isPlaying) {
      upsertRadioListener();
      listenerHeartbeatRef.current = setInterval(upsertRadioListener, LISTENER_HEARTBEAT_MS);
    } else {
      if (listenerHeartbeatRef.current) {
        clearInterval(listenerHeartbeatRef.current);
        listenerHeartbeatRef.current = null;
      }
      expireRadioListener();
    }
    return () => {
      if (listenerHeartbeatRef.current) {
        clearInterval(listenerHeartbeatRef.current);
        listenerHeartbeatRef.current = null;
      }
    };
  }, [isPlaying, upsertRadioListener, expireRadioListener]);

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
      emitRadioSignal();
    } catch (err: any) {
      if (err?.name === 'AbortError') return; // Browser interrupted play for new source — ignore
      console.warn('[radio] play failed:', err);
      setIsPlaying(false);
    }
  }, [emitRadioSignal]);
  
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

  /** Pause radio when a video/audio sheet opens */
  const pauseForSheet = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    wasPlayingBeforeSheetRef.current = isPlaying;
    if (isPlaying) {
      audio.pause();
    }
  }, [isPlaying]);

  /** Resume radio when the sheet that triggered the pause closes */
  const resumeFromSheet = useCallback(() => {
    if (!wasPlayingBeforeSheetRef.current) return;
    wasPlayingBeforeSheetRef.current = false;
    startPlayback();
  }, [startPlayback]);

  return (
    <RadioContext.Provider
      value={{ isPlaying, currentShowName, togglePlay, setCurrentShowName, audioRef, pauseForSheet, resumeFromSheet }}
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

const NOOP_RADIO: RadioContextValue = {
  isPlaying: false,
  currentShowName: '',
  togglePlay: () => {},
  setCurrentShowName: () => {},
  audioRef: { current: null },
  pauseForSheet: () => {},
  resumeFromSheet: () => {},
};

export function useRadio(): RadioContextValue {
  const ctx = useContext(RadioContext);
  // Return no-op if called outside RadioProvider (e.g. SheetRouter)
  if (!ctx) return NOOP_RADIO;
  return ctx;
}
