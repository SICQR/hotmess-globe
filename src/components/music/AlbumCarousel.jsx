import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * AlbumCarousel - Vinyl-style carousel for album artwork
 * Shows all RAW CONVICT RECORDS releases
 */

// All releases from RAW CONVICT RECORDS
const RELEASES = [
  {
    id: 'hotmess-pink',
    src: '/images/Hotmess Pink.JPEG',
    color: '#FF1493',
    title: 'HOTMESS',
    artist: 'Paul King ft Stewart Who',
    label: 'PINK EDITION',
    catalog: 'RCR001',
  },
  {
    id: 'hotmess-green', 
    src: '/images/Hotmess Green.JPEG',
    color: '#39FF14',
    title: 'HOTMESS',
    artist: 'Paul King ft Stewart Who',
    label: 'GREEN EDITION',
    catalog: 'RCR001',
  },
  {
    id: 'hotmess-red',
    src: '/images/Hotmess Red.JPEG', 
    color: '#FF0000',
    title: 'HOTMESS',
    artist: 'Paul King ft Stewart Who',
    label: 'RED EDITION',
    catalog: 'RCR001',
  },
  {
    id: 'hotmess-original',
    src: '/images/RCR001 Paul King ft Stewart Who - Hotmess.JPEG',
    color: '#B026FF',
    title: 'HOTMESS',
    artist: 'Paul King ft Stewart Who',
    label: 'ORIGINAL',
    catalog: 'RCR001',
  },
  {
    id: 'ghosted',
    src: '/images/ghosted-cover.jpg',
    color: '#00D9FF',
    title: 'GHOSTED',
    artist: 'RAW CONVICT',
    label: 'SINGLE',
    catalog: 'RCR002',
  },
  {
    id: 'walking-red-flag',
    src: '/images/walking-red-flag-cover.jpg',
    color: '#FF0000',
    title: 'WALKING RED FLAG',
    artist: 'RAW CONVICT',
    label: 'SINGLE',
    catalog: 'RCR003',
  },
];

export default function AlbumCarousel({ 
  className,
  showCTA = true,
  autoPlay = true,
  interval = 4000,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [direction, setDirection] = useState(0);
  const intervalRef = useRef(null);

  // Auto-play
  React.useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % RELEASES.length);
      }, interval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, interval]);

  const goToPrevious = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + RELEASES.length) % RELEASES.length);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const goToNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % RELEASES.length);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const currentRelease = RELEASES[currentIndex];

  const slideVariants = {
    enter: (dir) => ({
      rotateY: dir > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir) => ({
      rotateY: dir > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.8,
    }),
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header - Dynamic based on current release */}
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">RAW CONVICT RECORDS</p>
        <h2 
          className="text-4xl md:text-6xl font-black italic mb-2 transition-colors duration-500"
          style={{ color: currentRelease.color }}
        >
          {currentRelease.title}
        </h2>
        <p className="text-lg uppercase tracking-wider text-white/70">
          {currentRelease.artist}
        </p>
        <p className="text-sm text-white/50 mt-1">{currentRelease.catalog} • {currentRelease.label}</p>
      </div>

      {/* Album Carousel */}
      <div className="relative max-w-md mx-auto" style={{ perspective: '1000px' }}>
        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/50 backdrop-blur-sm border-2 border-white/30 hover:border-white hover:bg-black/70 flex items-center justify-center transition-all group"
          aria-label="Previous variant"
        >
          <ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/50 backdrop-blur-sm border-2 border-white/30 hover:border-white hover:bg-black/70 flex items-center justify-center transition-all group"
          aria-label="Next variant"
        >
          <ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>

        {/* Album Art Container */}
        <div className="relative aspect-square mx-12 md:mx-0">
          {/* Glow Effect */}
          <div 
            className="absolute inset-0 blur-3xl opacity-30 transition-colors duration-500"
            style={{ backgroundColor: currentRelease.color }}
          />

          {/* Vinyl Disc Background */}
          <motion.div
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 rounded-full bg-black border-4 border-white/10 z-0"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-transparent" />
            <div className="absolute inset-[30%] rounded-full bg-black border border-white/20" />
            <div className="absolute inset-[45%] rounded-full" style={{ backgroundColor: currentRelease.color }} />
          </motion.div>

          {/* Album Cover */}
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                rotateY: { type: 'spring', stiffness: 200, damping: 25 },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
              }}
              className="relative z-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div 
                className="relative aspect-square border-4 shadow-2xl overflow-hidden"
                style={{ borderColor: currentRelease.color }}
              >
                <img
                  src={currentRelease.src}
                  alt={`${currentRelease.title} - ${currentRelease.label}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80';
                  }}
                />
                
                {/* Edition/Track Label */}
                <div 
                  className="absolute bottom-0 left-0 right-0 py-3 px-4 text-center font-black uppercase tracking-wider text-sm text-white"
                  style={{ backgroundColor: `${currentRelease.color}CC` }}
                >
                  {currentRelease.label}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Release Dots */}
        <div className="flex items-center justify-center gap-2 mt-8 flex-wrap max-w-sm mx-auto">
          {RELEASES.map((release, index) => (
            <button
              key={release.id}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
                if (intervalRef.current) clearInterval(intervalRef.current);
              }}
              className="group p-1"
              aria-label={`View ${release.title} - ${release.label}`}
            >
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'scale-150 shadow-lg'
                    : 'opacity-40 hover:opacity-75 group-hover:scale-125'
                }`}
                style={{ 
                  backgroundColor: release.color,
                  boxShadow: index === currentIndex ? `0 0 12px ${release.color}` : 'none'
                }}
              />
            </button>
          ))}
        </div>

        {/* Track Counter */}
        <div className="text-center mt-4">
          <span className="text-xs text-white/50 uppercase tracking-widest">
            {currentIndex + 1} / {RELEASES.length} releases
          </span>
        </div>

        {/* Play/Pause */}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 hover:bg-white/10 transition-all text-xs uppercase tracking-wider"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3" /> Auto-rotate
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Paused
              </>
            )}
          </button>
        </div>
      </div>

      {/* CTA Section */}
      {showCTA && (
        <div className="mt-10 text-center">
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/music/releases/hotmess">
              <Button className="bg-[#B026FF] hover:bg-white text-white hover:text-black font-black uppercase px-8 py-4">
                <Play className="w-5 h-5 mr-2" />
                LISTEN NOW
              </Button>
            </Link>
            <a 
              href="https://soundcloud.com/rawconvictrecords" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                variant="outline" 
                className="border-2 border-white text-white hover:bg-white hover:text-black font-black uppercase px-8 py-4"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                SOUNDCLOUD
              </Button>
            </a>
          </div>
          <p className="text-xs text-white/40 mt-6 uppercase tracking-widest">
            Available on all platforms
          </p>
        </div>
      )}
    </div>
  );
}
