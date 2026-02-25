/**
 * Radio Show Card Component
 * 
 * Enhanced radio show cards with:
 * - Hero images with gradient overlay
 * - Video preview on hover
 * - Audio stinger playback
 * - Schedule display
 */

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Volume2, 
  VolumeX,
  Clock,
  Calendar,
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function RadioShowCard({ 
  show, 
  variant = 'default',
  className = '' 
}) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stingerPlaying, setStingerPlaying] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Handle video hover
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (show.promoVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Play random stinger
  const playStinger = (e) => {
    e.stopPropagation();
    
    if (!show.stingerAudio?.length) return;
    
    if (stingerPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setStingerPlaying(false);
      return;
    }

    const randomStinger = show.stingerAudio[Math.floor(Math.random() * show.stingerAudio.length)];
    
    if (audioRef.current) {
      audioRef.current.src = randomStinger;
      audioRef.current.play().catch(() => {});
      setStingerPlaying(true);
      
      audioRef.current.onended = () => {
        setStingerPlaying(false);
      };
    }
  };

  // Get next show time
  const getNextShowTime = () => {
    if (!show.schedule?.length) return null;
    
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    
    // Find next occurrence
    const todayShow = show.schedule.find(s => s.day?.toLowerCase() === currentDay);
    if (todayShow) {
      const [hour, minute] = (todayShow.time || '00:00').split(':').map(Number);
      const showTime = new Date();
      showTime.setHours(hour, minute, 0);
      
      if (showTime > now) {
        return { day: 'Today', time: todayShow.time };
      }
    }
    
    // Find next day
    for (let i = 1; i <= 7; i++) {
      const checkDay = dayNames[(now.getDay() + i) % 7];
      const nextShow = show.schedule.find(s => s.day?.toLowerCase() === checkDay);
      if (nextShow) {
        return { 
          day: i === 1 ? 'Tomorrow' : nextShow.day,
          time: nextShow.time 
        };
      }
    }
    
    return null;
  };

  const nextShow = getNextShowTime();

  // Variant styles
  const variants = {
    default: 'h-64',
    compact: 'h-48',
    featured: 'h-80 md:h-96'
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden border-2 border-white/10 
        hover:border-[#C8962C] transition-colors cursor-pointer
        ${variants[variant]} ${className}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate(`/music/shows/${show.slug || show.id}`)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Background - Hero Image or Gradient */}
      <div className="absolute inset-0">
        {show.heroImage ? (
          <img 
            src={show.heroImage} 
            alt={show.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${show.color || 'from-[#C8962C] to-[#B026FF]'}`} />
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
      </div>

      {/* Video overlay on hover */}
      {show.promoVideo && (
        <video
          ref={videoRef}
          src={show.promoVideo}
          muted
          loop
          playsInline
          className={`
            absolute inset-0 w-full h-full object-cover
            transition-opacity duration-300
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        />
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="none" />

      {/* Content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        {/* Top row */}
        <div className="flex items-start justify-between">
          {/* Type badge */}
          <span className="px-2 py-1 bg-black/60 text-[10px] uppercase font-bold text-white/80 flex items-center gap-1">
            <Radio className="w-3 h-3" />
            Show
          </span>

          {/* Stinger button */}
          {show.stingerAudio?.length > 0 && (
            <button
              onClick={playStinger}
              className={`
                w-10 h-10 flex items-center justify-center
                border-2 transition-all
                ${stingerPlaying 
                  ? 'bg-[#C8962C] border-[#C8962C]' 
                  : 'bg-black/60 border-white/30 hover:border-[#C8962C]'
                }
              `}
            >
              {stingerPlaying ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          )}
        </div>

        {/* Bottom content */}
        <div>
          {/* Title & tagline */}
          <h3 className="text-2xl md:text-3xl font-black text-white uppercase mb-1 leading-tight">
            {show.title}
          </h3>
          {show.tagline && (
            <p className="text-sm text-white/70 mb-3 line-clamp-2">
              {show.tagline}
            </p>
          )}

          {/* Schedule info */}
          {nextShow && (
            <div className="flex items-center gap-4 text-xs text-white/60 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {nextShow.day}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {nextShow.time}
              </span>
            </div>
          )}

          {/* Stingers (text) */}
          {show.stingers?.length > 0 && variant !== 'compact' && (
            <div className="flex flex-wrap gap-2 mb-3">
              {show.stingers.slice(0, 2).map((stinger, i) => (
                <span 
                  key={i}
                  className="px-2 py-1 bg-white/10 text-[10px] text-white/80"
                >
                  "{stinger}"
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-[#C8962C] hover:bg-[#C8962C]/80 text-white font-bold"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to live stream with this show
                navigate('/music?play=true');
              }}
            >
              <Play className="w-4 h-4 mr-1" />
              Listen Live
            </Button>
            {variant === 'featured' && (
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/music/shows/${show.slug || show.id}`);
                }}
              >
                View Schedule
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Live indicator (if currently airing) */}
      {show.isLive && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-2 py-1">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold text-white uppercase">Live Now</span>
        </div>
      )}
    </motion.div>
  );
}
