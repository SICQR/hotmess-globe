import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LuxVideo - Brutalist video player with Chrome Red controls
 * Features:
 * - Autoplay with muted option
 * - Full-screen mode with page transition effect
 * - Support for music videos, promo clips
 * - Gradient overlay on poster image
 */

export function LuxVideo({
  src,
  poster,
  title,
  subtitle,
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  className,
  aspectRatio = '16:9', // '16:9' | '4:3' | '1:1' | 'full'
  gradientOverlay = true,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const controlsTimeoutRef = useRef(null);

  const aspectRatioClasses = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    '9:16': 'aspect-[9/16]',
    full: 'h-full w-full',
  };

  // Format time to MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onPause?.();
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      onPlay?.();
    }
  }, [isPlaying, onPlay, onPause]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => setIsLoading(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [onTimeUpdate, onEnded]);

  // Auto-hide controls
  useEffect(() => {
    if (!controls) return;

    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('touchstart', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('touchstart', handleMouseMove);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [controls, isPlaying]);

  // Seek to position
  const handleProgressClick = (e) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  // Skip forward/backward
  const skip = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'lux-video relative overflow-hidden bg-black group',
        aspectRatioClasses[aspectRatio],
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
      onClick={togglePlay}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient Overlay on Poster */}
      {gradientOverlay && !isPlaying && poster && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50 pointer-events-none" />
      )}

      {/* Loading Spinner */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 border-4 border-[#C8962C] border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title Overlay (when paused) */}
      <AnimatePresence>
        {!isPlaying && (title || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="text-center px-6">
              {subtitle && (
                <p className="text-xs uppercase tracking-[0.4em] text-white/70 mb-2">{subtitle}</p>
              )}
              {title && (
                <h3 className="text-3xl md:text-5xl font-black italic text-white drop-shadow-2xl">{title}</h3>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big Play Button (when paused) */}
      <AnimatePresence>
        {!isPlaying && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 bg-[#C8962C] flex items-center justify-center shadow-[0_0_30px_rgba(255,20,147,0.5)]">
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      {controls && (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar */}
              <div
                ref={progressRef}
                className="relative h-1 bg-white/20 cursor-pointer mb-4 group/progress"
                onClick={handleProgressClick}
              >
                {/* Buffer (placeholder) */}
                <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: '100%' }} />
                
                {/* Progress */}
                <div
                  className="absolute inset-y-0 left-0 bg-[#C8962C]"
                  style={{ width: `${progress}%` }}
                />
                
                {/* Scrubber */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-[#C8962C] opacity-0 group-hover/progress:opacity-100 transition-opacity"
                  style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 bg-[#C8962C] hover:bg-[#C8962C]/80 flex items-center justify-center transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>

                  {/* Skip Back */}
                  <button
                    onClick={() => skip(-10)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <SkipBack className="w-4 h-4 text-white" />
                  </button>

                  {/* Skip Forward */}
                  <button
                    onClick={() => skip(10)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    <SkipForward className="w-4 h-4 text-white" />
                  </button>

                  {/* Volume */}
                  <div
                    className="relative flex items-center"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button
                      onClick={toggleMute}
                      className="w-8 h-8 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {showVolumeSlider && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 80 }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden ml-2"
                        >
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-1 bg-white/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#C8962C] [&::-webkit-slider-thumb]:cursor-pointer"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Time */}
                  <div className="text-white text-xs font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4 text-white" />
                    ) : (
                      <Maximize className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Close button in fullscreen */}
      {isFullscreen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 hover:bg-black/70 border border-white/30 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}

/**
 * LuxVideoBackground - Muted autoplay background video
 */
export function LuxVideoBackground({
  src,
  poster,
  className,
  overlay,
  children,
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Default gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
      
      {/* Custom overlay */}
      {overlay && <div className={cn('absolute inset-0', overlay)} />}
      
      {/* Content */}
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * LuxStoryVideo - Vertical tap-to-advance video (Stories-style)
 */
export function LuxStoryVideo({
  videos = [],
  onComplete,
  className,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef(null);

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isRightSide = x > rect.width / 2;

    if (isRightSide) {
      // Next
      if (currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onComplete?.();
      }
    } else {
      // Previous
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const currentVideo = videos[currentIndex];

  return (
    <div
      className={cn('relative aspect-[9/16] bg-black cursor-pointer', className)}
      onClick={handleTap}
    >
      {/* Progress Bars */}
      <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
        {videos.map((_, index) => (
          <div
            key={index}
            className="h-0.5 flex-1 bg-white/30 overflow-hidden"
          >
            <div
              className={cn(
                'h-full bg-white transition-all duration-300',
                index < currentIndex ? 'w-full' : index === currentIndex ? 'w-full animate-progress' : 'w-0'
              )}
            />
          </div>
        ))}
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        key={currentIndex}
        src={currentVideo?.src}
        poster={currentVideo?.poster}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onEnded={() => {
          if (currentIndex < videos.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            onComplete?.();
          }
        }}
      />

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Content */}
      {currentVideo?.content && (
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          {currentVideo.content}
        </div>
      )}
    </div>
  );
}

export default LuxVideo;
