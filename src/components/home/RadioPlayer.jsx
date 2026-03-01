import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export default function RadioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const audioRef = useRef(null);

  // RAW Convict Radio stream URL
  const STREAM_URL = 'https://listen.radioking.com/radio/736103/stream/802454';

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio();
    audioRef.current.volume = volume / 100;
    audioRef.current.preload = 'none';

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        audioRef.current.src = STREAM_URL;
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Failed to play stream:', error);
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-[80] bg-black/95 backdrop-blur-xl border-2 border-[#C8962C] rounded-none p-4 w-[calc(100vw-2rem)] max-w-80">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#C8962C] to-[#C8962C] rounded-full flex items-center justify-center">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-white/40 uppercase tracking-wider font-mono">LIVE 24/7</div>
          <div className="text-sm font-black text-white">RAW CONVICT RECORDS</div>
        </div>
        {isPlaying && (
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-[#C8962C] rounded-full animate-pulse"
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
          className="bg-[#C8962C] hover:bg-[#C8962C]/90 text-black rounded-full w-12 h-12"
        >
          {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <button onClick={() => setIsMuted(!isMuted)} className="text-white/60 hover:text-white">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Slider
            value={[volume]}
            onValueChange={(val) => setVolume(val[0])}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>

      {/* SoundCloud Link */}
      <a
        href="https://soundcloud.com/rawconvictrecords"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-white/40 hover:text-[#C8962C] transition-colors mt-2"
      >
        MORE ON SOUNDCLOUD →
      </a>
    </div>
  );
}
