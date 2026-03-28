import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Play, Pause, Volume2, VolumeX } from 'lucide-react';

export default function RadioTerminal() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('https://listen.radioking.com/radio/736103/stream/802454');
    audioRef.current.volume = volume;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Playback failed:', error);
      }
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`fixed bottom-24 left-6 z-[80] transition-all duration-500 ${isExpanded ? 'w-[calc(100vw-3rem)] max-w-80' : 'w-12'}`}
    >
      <div className="bg-black border-2 border-white p-2 flex flex-col gap-4 overflow-hidden shadow-[0_0_30px_rgba(255,20,147,0.3)]">
        
        {/* MINI BAR / TOGGLE */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white font-black italic text-xl hover:text-[#C8962C] transition-colors"
          >
            {isExpanded ? 'CLOSE_' : <Radio className="w-6 h-6" />}
          </button>
          
          {isExpanded && (
            <div className="flex gap-2 items-center">
              <span className="animate-pulse text-[#C8962C] text-[10px] font-bold">● LIVE</span>
            </div>
          )}
        </div>

        {/* EXPANDED VIEW */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6"
            >
              {/* WAVEFORM VISUALIZER */}
              <div className="h-32 bg-zinc-900 border border-white/10 flex items-center justify-center relative overflow-hidden">
                <div className="flex gap-1 items-end h-12">
                  {[1,2,3,4,5,6,7,6,5,4,3,2,1].map((h, i) => (
                    <motion.div 
                      key={i} 
                      className="w-1 bg-[#C8962C]"
                      animate={{
                        height: isPlaying ? `${h * 8}px` : '2px',
                        opacity: isPlaying ? [0.5, 1, 0.5] : 0.3
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* NOW PLAYING */}
              <div className="text-center space-y-2">
                <p className="text-[10px] uppercase text-white/40 tracking-widest font-bold">Now Playing</p>
                <h3 className="text-xl font-black italic uppercase leading-none text-white">RAW CONVICT RADIO</h3>
                <p className="text-xs text-[#C8962C] font-bold">128 BPM • UNDERGROUND PULSE</p>
              </div>

              {/* VOLUME CONTROL */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-white/20 appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #C8962C 0%, #C8962C ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>

              {/* PLAYBACK BUTTON */}
              <button 
                onClick={togglePlayback}
                className="w-full py-4 bg-white text-black font-black uppercase italic hover:bg-[#C8962C] transition-all flex items-center justify-center gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    PAUSE_TERMINAL
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    ENGAGE_PULSE
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}