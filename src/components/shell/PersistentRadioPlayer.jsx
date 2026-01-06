import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Play, Pause, SkipForward, Volume2, VolumeX, X, Radio } from 'lucide-react';
import { useRadio } from './RadioContext';

export default function PersistentRadioPlayer() {
  const { isRadioOpen, shouldAutoPlay, closeRadio } = useRadio();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const audioRef = useRef(null);

  const { data: audioBeacons = [] } = useQuery({
    queryKey: ['audio-drops'],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter({ mode: 'radio', active: true });
      return beacons.filter(b => b.audio_url);
    },
    refetchInterval: 60000
  });

  useEffect(() => {
    if (audioBeacons.length > 0 && !currentTrack) {
      setCurrentTrack(audioBeacons[0]);
    }
  }, [audioBeacons, currentTrack]);

  useEffect(() => {
    if (shouldAutoPlay && audioRef.current && currentTrack) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [shouldAutoPlay, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
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
        audioRef.current.play();
      }
    }
  }, [currentTrack, isPlaying]);

  return (
    <>
      <AnimatePresence>
        {isRadioOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeRadio}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-screen sm:w-80 bg-black/95 backdrop-blur-xl border-l-2 border-[#B026FF] z-[100] shadow-2xl"
            >
              <div className="flex flex-col h-full p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Radio className="w-5 h-5 text-[#B026FF]" />
                    <h3 className="font-black uppercase text-sm">RAW CONVICT RADIO</h3>
                  </div>
                  <button 
                    onClick={closeRadio} 
                    className="text-white/60 hover:text-white transition-colors"
                    aria-label="Close radio"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Now Playing */}
                {currentTrack && (
                  <div className="mb-6">
                    <p className="text-xs text-white/40 uppercase mb-2">Now Playing</p>
                    <p className="font-bold text-lg truncate">{currentTrack.title}</p>
                    <p className="text-sm text-white/60 line-clamp-2">{currentTrack.description}</p>
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={handlePlayPause}
                    className="w-14 h-14 bg-[#B026FF] rounded-full flex items-center justify-center hover:bg-[#B026FF]/80 transition-colors shadow-lg"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
                  </button>
                  <button
                    onClick={handleNext}
                    className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors ml-auto"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="mb-6">
                  <p className="text-xs text-white/40 uppercase mb-2">Volume</p>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-[#B026FF]"
                  />
                </div>

                {/* Queue or Playlist could go here */}
                <div className="flex-1 overflow-y-auto">
                  <p className="text-xs text-white/40 uppercase mb-3">Available Tracks</p>
                  <div className="space-y-2">
                    {audioBeacons.map((beacon) => (
                      <button
                        key={beacon.id}
                        onClick={() => setCurrentTrack(beacon)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          currentTrack?.id === beacon.id
                            ? 'bg-[#B026FF]/20 border border-[#B026FF]'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <p className="font-bold text-sm truncate">{beacon.title}</p>
                        <p className="text-xs text-white/60 truncate">{beacon.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <audio ref={audioRef} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}