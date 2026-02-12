import React from 'react';
import { Radio, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudio } from '@/contexts/AudioContext';

export default function RadioPlayer() {
  const { 
    isPlaying, 
    isLive, 
    volume, 
    isMuted, 
    playLive, 
    togglePlayPause, 
    setVolume, 
    toggleMute,
    showPlayer 
  } = useAudio();

  const handlePlayPause = () => {
    if (!isPlaying) {
      playLive();
      showPlayer();
    } else {
      togglePlayPause();
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-30 bg-black/95 backdrop-blur-xl border-2 border-[#FF1493] rounded-none p-4 w-[calc(100vw-2rem)] max-w-80">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#FF1493] to-[#B026FF] rounded-full flex items-center justify-center">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-white/40 uppercase tracking-wider font-mono">LIVE 24/7</div>
          <div className="text-sm font-black text-white">RAW CONVICT RECORDS</div>
        </div>
        {isPlaying && isLive && (
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-[#FF1493] rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 12}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-3">
        <Button
          onClick={handlePlayPause}
          size="icon"
          className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black rounded-full w-12 h-12"
        >
          {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <button onClick={toggleMute} className="text-white/60 hover:text-white">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Slider
            value={[volume * 100]}
            onValueChange={(val) => setVolume(val[0] / 100)}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>

      {/* XP Tracker */}
      {isPlaying && isLive && (
        <div className="bg-[#FFEB3B]/10 border border-[#FFEB3B]/40 rounded-lg p-2 text-center">
          <div className="text-xs text-[#FFEB3B] font-bold uppercase tracking-wider">
            EARNING XP...
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">10 XP every 5 minutes</div>
        </div>
      )}

      {/* SoundCloud Link */}
      <a
        href="https://soundcloud.com/rawconvictrecords"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-white/40 hover:text-[#FF1493] transition-colors mt-2"
      >
        MORE ON SOUNDCLOUD →
      </a>
    </div>
  );
}