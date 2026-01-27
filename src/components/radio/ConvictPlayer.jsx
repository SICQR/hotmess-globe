import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ConvictPlayer({ beacon, isOpen, onClose, currentUser }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasAwarded, setHasAwarded] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current || !beacon?.audio_url) return;

    const audio = audioRef.current;
    audio.src = beacon.audio_url;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Award 2x XP after listening for 30 seconds
      if (!hasAwarded && audio.currentTime >= 30 && currentUser) {
        awardXP();
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [beacon, hasAwarded, currentUser]);

  const awardXP = async () => {
    if (!currentUser) return;
    
    try {
      const xpEarned = beacon.xp_scan || 200; // 2x base XP
      const multiplier = currentUser.xp_multiplier || 1;
      const totalXP = xpEarned * multiplier;
      
      await base44.auth.updateMe({
        xp: (currentUser.xp || 0) + totalXP,
      });
      
      setHasAwarded(true);
      toast.success(`+${totalXP} XP for listening to RAW Convict track!`);
    } catch (error) {
      console.error('Failed to award XP:', error);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!beacon) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-2 border-[#E62020] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
            <Music className="w-6 h-6 text-[#E62020]" />
            RAW Convict Records
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Album Art */}
          <div className="w-full aspect-square bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center border-2 border-white">
            <Music className="w-24 h-24 text-white" />
          </div>

          {/* Track Info */}
          <div className="text-center">
            <h3 className="text-xl font-black uppercase mb-2">{beacon.title}</h3>
            {beacon.description && (
              <p className="text-sm text-white/60">{beacon.description}</p>
            )}
            <p className="text-xs text-[#FFEB3B] font-bold mt-2 uppercase">
              +{beacon.xp_scan || 200} XP • 2x Multiplier
            </p>
          </div>

          {/* Audio Element */}
          <audio ref={audioRef} />

          {/* Download (local file only) */}
          {typeof beacon?.audio_url === 'string' && beacon.audio_url.startsWith('http') && (
            <Button
              asChild
              variant="outline"
              className="w-full border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase"
            >
              <a href={beacon.audio_url} download={beacon?.title ? `${beacon.title}` : true}>
                <Download className="w-4 h-4" />
                Download
              </a>
            </Button>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-2 bg-white/10 overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-[#E62020]"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={togglePlay}
              className="bg-[#E62020] hover:bg-white text-black font-black w-16 h-16 rounded-full border-2 border-white"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-white/40 text-center">
            Listen for 30s to earn XP. Headless label, no algorithm.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}