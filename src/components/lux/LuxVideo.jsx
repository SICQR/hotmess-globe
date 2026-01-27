import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LuxVideo - Chrome Luxury Brutalist Video Player
 * 
 * Features:
 * - Brutalist controls with Chrome Red accents
 * - Autoplay with muted option
 * - Full-screen mode with page transition effect
 * - Gradient overlay on poster
 * - Support for music videos, promo clips
 */

export function LuxVideo({
  src,
  poster,
  title,
  artist,
  autoPlay = false,
  muted = true,
  loop = false,
  controls = true,
  showOverlay = true,
  aspectRatio = '16/9',
  className,
  onPlay,
  onPause,
  onEnded,
  ...props
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        onPause?.();
      } else {
        videoRef.current.play();
        onPlay?.();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = clickPosition * duration;
    }
  };

  // Update progress
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(currentProgress);
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && controls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, controls, showControls]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'lux-video-container relative bg-black overflow-hidden group',
        className
      )}
      style={{ aspectRatio }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      {...props}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        className="w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Gradient overlay on poster/paused */}
      {showOverlay && !isPlaying && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent opacity-80" />
      )}

      {/* Title overlay */}
      {(title || artist) && !isPlaying && (
        <div className="absolute bottom-16 left-4 right-4 z-10">
          {title && (
            <h3 className="font-display text-2xl md:text-3xl font-bold uppercase text-white">
              {title}
            </h3>
          )}
          {artist && (
            <p className="font-mono text-sm text-white/60 uppercase tracking-wider mt-1">
              {artist}
            </p>
          )}
        </div>
      )}

      {/* Play button overlay when paused */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
          aria-label="Play video"
        >
          <div className="w-20 h-20 flex items-center justify-center bg-[#FF1493] text-white transition-all duration-150 hover:scale-110 shadow-[0_0_30px_rgba(255,20,147,0.6)]">
            <Play className="w-10 h-10 ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* Controls bar */}
      {controls && (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="lux-video-controls absolute bottom-0 left-0 right-0 flex items-center gap-4 p-4 bg-gradient-to-t from-black/90 to-transparent z-20"
            >
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="lux-video-btn w-10 h-10 flex items-center justify-center bg-transparent border-2 border-[#FF1493] text-[#FF1493] hover:bg-[#FF1493] hover:text-white transition-all"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              {/* Progress bar */}
              <div
                className="lux-video-progress flex-1 h-1 bg-white/30 cursor-pointer group/progress"
                onClick={handleProgressClick}
              >
                <div
                  className="lux-video-progress-fill h-full bg-[#FF1493] relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#FF1493] opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Time display */}
              <span className="lux-video-time font-mono text-xs text-white whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="lux-video-btn w-10 h-10 flex items-center justify-center bg-transparent border-2 border-white/50 text-white/50 hover:border-white hover:text-white transition-all"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="lux-video-btn w-10 h-10 flex items-center justify-center bg-transparent border-2 border-white/50 text-white/50 hover:border-white hover:text-white transition-all"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
  overlay = true,
  overlayOpacity = 0.6,
  children,
  className,
  ...props
}) {
  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      {/* Video */}
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay */}
      {overlay && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/50 to-transparent"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default LuxVideo;
