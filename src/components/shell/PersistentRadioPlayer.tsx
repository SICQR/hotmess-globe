import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Play, Pause, SkipForward, Volume2, VolumeX, Minimize2, Radio } from 'lucide-react';

export default function PersistentRadioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: audioBeacons = [] } = useQuery({
    queryKey: ['audio-drops'],
    queryFn: () => base44.entities.Beacon.filter({ mode: 'radio', active: true }),
    refetchInterval: 60000
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        // Browser blocked autoplay or other playback error
        console.error('Playback failed:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleNext = () => {
    if (audioBeacons.length === 0) return;
    const currentIndex = audioBeacons.findIndex(b => b.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % audioBeacons.length;
    setCurrentTrack(audioBeacons[nextIndex]);
  };

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.audio_url;
      if (isPlaying) {
        audioRef.current.play().catch((error) => {
          // Browser blocked autoplay
          console.error('Auto-play failed:', error);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack]);

  if (!isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-[100] bg-black/95 backdrop-blur-xl border-2 border-[#B026FF] rounded-xl p-6 w-80 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#B026FF]" />
            <h3 className="font-black uppercase text-sm">RAW CONVICT RADIO</h3>
          </div>
          <button onClick={() => setIsMinimized(true)} className="text-white/60 hover:text-white">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {currentTrack && (
          <div className="mb-4">
            <p className="font-bold text-sm truncate">{currentTrack.title}</p>
            <p className="text-xs text-white/60">{currentTrack.description}</p>
          </div>
        )}

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 bg-[#B026FF] rounded-full flex items-center justify-center hover:bg-[#B026FF]/80 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
          </button>
          <button
            onClick={handleNext}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors ml-auto"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full accent-[#B026FF]"
        />

        <audio ref={audioRef} />
      </motion.div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => setIsMinimized(false)}
      className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-[#B026FF] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
    >
      <Radio className="w-6 h-6 text-black" />
      {isPlaying && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 bg-[#B026FF] rounded-full opacity-50"
        />
      )}
    </motion.button>
  );
}