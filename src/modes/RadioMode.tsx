/**
 * RadioMode - Cultural Anchor
 * 
 * Persistent mini-player across app.
 * Expandable immersive player.
 * Supabase-backed show + live state.
 * No stacked radio page dashboard.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, Volume2, VolumeX, Clock, Users, Radio } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { getRadioState, getTodaySchedule, subscribeToRadioState, joinAsListener, leaveAsListener, type RadioState, type RadioShow } from '@/lib/data';

interface RadioModeProps {
  className?: string;
}

export function RadioMode({ className = '' }: RadioModeProps) {
  const [radioState, setRadioState] = useState<RadioState | null>(null);
  const [schedule, setSchedule] = useState<RadioShow[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { openSheet } = useSheet();

  // Load radio data
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadData = async () => {
      setIsLoading(true);
      const [state, scheduleData] = await Promise.all([
        getRadioState(),
        getTodaySchedule(),
      ]);
      
      setRadioState(state);
      setSchedule(scheduleData);
      setIsLoading(false);

      // Subscribe to state changes
      unsubscribe = subscribeToRadioState((updated) => {
        setRadioState(updated);
      });
    };

    loadData();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Handle play/pause
  const togglePlay = async () => {
    if (!audioRef.current || !radioState) return;

    if (isPlaying) {
      audioRef.current.pause();
      await leaveAsListener();
      setIsPlaying(false);
    } else {
      try {
        audioRef.current.src = radioState.streamUrl;
        await audioRef.current.play();
        await joinAsListener();
        setIsPlaying(true);
      } catch (error) {
        console.error('[radio] Play failed:', error);
      }
    }
  };

  // Handle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const currentShow = radioState?.currentShow;
  const nextShow = radioState?.nextShow;

  return (
    <div className={`h-full w-full bg-black ${className}`}>
      {/* Audio element (hidden) */}
      <audio ref={audioRef} preload="none" />

      {/* Hero player */}
      <div className="relative h-[50vh] flex flex-col items-center justify-center bg-gradient-to-b from-[#FF1493]/20 to-black">
        {/* Background visualization */}
        <div className="absolute inset-0 overflow-hidden">
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-64 h-64 rounded-full border border-[#FF1493]/30"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.4,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Now Playing */}
        <div className="relative z-10 text-center px-6">
          {radioState?.isLive ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 text-sm font-medium">LIVE</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {currentShow?.title || 'HOTMESS Radio'}
              </h1>
              <p className="text-white/60">
                {currentShow?.hostName || 'Live from London'}
              </p>
            </>
          ) : (
            <>
              <Radio className="w-12 h-12 text-white/40 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">HOTMESS Radio</h1>
              <p className="text-white/60">Off Air</p>
            </>
          )}
        </div>

        {/* Play controls */}
        <div className="relative z-10 flex items-center gap-6 mt-8">
          <button
            onClick={toggleMute}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white/60" />
            ) : (
              <Volume2 className="w-5 h-5 text-white/60" />
            )}
          </button>

          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-[#FF1493] flex items-center justify-center shadow-lg shadow-[#FF1493]/30"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </button>

          <button
            onClick={() => openSheet('ScheduleSheet', {})}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Clock className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Listener count */}
        {radioState?.listenerCount && radioState.listenerCount > 0 && (
          <div className="relative z-10 flex items-center gap-2 mt-6 text-white/50 text-sm">
            <Users className="w-4 h-4" />
            <span>{radioState.listenerCount} listening</span>
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="px-4 py-6">
        <h2 className="text-lg font-bold text-white mb-4">Today's Schedule</h2>
        
        {schedule.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p>No shows scheduled today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.map((show) => (
              <motion.button
                key={show.id}
                onClick={() => openSheet('ShowSheet', { showId: show.id })}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  show.isLive 
                    ? 'bg-[#FF1493]/20 border border-[#FF1493]/30' 
                    : 'bg-white/5 border border-white/10'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white/50 text-sm">
                        {formatTime(show.startTime)} - {formatTime(show.endTime)}
                      </span>
                      {show.isLive && (
                        <span className="px-2 py-0.5 bg-red-500 rounded-full text-[10px] text-white font-bold">
                          LIVE
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-medium">{show.title}</h3>
                    <p className="text-white/50 text-sm">{show.hostName}</p>
                  </div>
                  {show.imageUrl && (
                    <img
                      src={show.imageUrl}
                      alt={show.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Next up */}
      {nextShow && !radioState?.isLive && (
        <div className="fixed bottom-24 left-4 right-4 z-30">
          <button
            onClick={() => openSheet('ShowSheet', { showId: nextShow.id })}
            className="w-full p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white/50 text-xs">NEXT UP</span>
                <h3 className="text-white font-medium">{nextShow.title}</h3>
                <p className="text-white/50 text-sm">{formatTime(nextShow.startTime)}</p>
              </div>
              <SkipForward className="w-6 h-6 text-white/40" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default RadioMode;
