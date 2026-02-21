import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Play, Pause, SkipForward, Volume2, VolumeX, X, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRadio } from './RadioContext';

export default function PersistentRadioPlayer() {
  const { isRadioOpen, shouldAutoPlay, closeRadio } = useRadio();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const audioRef = useRef(null);

  const LIVE_STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454';
  const liveTrack = {
    id: '__live__',
    title: 'HOTMESS RADIO (LIVE)',
    description: 'Live stream',
    audio_url: LIVE_STREAM_URL,
  };

  const { data: audioBeacons = [] } = useQuery({
    queryKey: ['audio-drops'],
    queryFn: async () => {
      try {
        const beacons = await base44.entities.Beacon.filter({ mode: 'radio', active: true });
        return beacons.filter(b => b.audio_url);
      } catch (error) {
        console.warn('Failed to fetch audio beacons:', error);
        return [];
      }
    },
    refetchInterval: 60000
  });

  useEffect(() => {
    // Default to live stream (live is king). If the user explicitly picked a track,
    // keep their selection.
    if (!currentTrack) {
      setCurrentTrack(liveTrack);
      return;
    }

    // If the current track is not live and it no longer exists, fall back.
    const currentId = String(currentTrack?.id || '');
    if (currentId && currentId !== String(liveTrack.id)) {
      const stillExists = audioBeacons.some((b) => String(b?.id) === currentId);
      if (!stillExists) setCurrentTrack(liveTrack);
    }
  }, [audioBeacons, currentTrack]);

  useEffect(() => {
    if (shouldAutoPlay && audioRef.current && currentTrack) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Autoplay can be blocked; keep UI in a paused state.
        setIsPlaying(false);
      });
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
      audioRef.current.play().catch(() => {
        // Ignore; browser may block play without a user gesture.
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    const playlist = [liveTrack, ...audioBeacons];
    if (playlist.length === 0) return;
    const currentIndex = playlist.findIndex((b) => String(b?.id) === String(currentTrack?.id));
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentTrack(playlist[nextIndex]);
  };

  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.audio_url;
      if (isPlaying) {
        audioRef.current.play().catch(() => {
          // If stream can't play (CORS/codec), keep UI from thrashing.
          setIsPlaying(false);
        });
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-screen sm:w-96 bg-black/95 backdrop-blur-xl border-l-2 border-[#B026FF] z-[80] shadow-2xl"
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

                {/* Quick Links */}
                <div className="mb-6">
                  <p className="text-xs text-white/40 uppercase mb-3">Quick Links</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/social/inbox" onClick={closeRadio} className="block">
                      <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-black uppercase text-white">
                        Inbox
                      </div>
                    </Link>
                    <Link to="/events" onClick={closeRadio} className="block">
                      <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-black uppercase text-white">
                        Events
                      </div>
                    </Link>
                    <Link to="/music/schedule" onClick={closeRadio} className="block">
                      <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-black uppercase text-white">
                        Schedule
                      </div>
                    </Link>
                    <Link to="/music/shows" onClick={closeRadio} className="block">
                      <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-black uppercase text-white">
                        Shows
                      </div>
                    </Link>
                    <Link to="/pulse" onClick={closeRadio} className="block">
                      <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-black uppercase text-white">
                        Pulse
                      </div>
                    </Link>
                    <Link to="/safety" onClick={closeRadio} className="block">
                      <div className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-black uppercase text-white">
                        Safety
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Queue or Playlist could go here */}
                <div className="flex-1 overflow-y-auto">
                  <p className="text-xs text-white/40 uppercase mb-3">Available Tracks</p>
                  <div className="space-y-2">
                    {[liveTrack, ...audioBeacons].map((beacon) => (
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

              <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}