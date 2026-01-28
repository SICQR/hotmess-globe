import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LuxCarousel - Full-width hero carousel with auto-play
 * Features:
 * - Swipeable on mobile
 * - Gradient overlays on slides
 * - Navigation dots with LED pulse animation
 * - Supports: images, videos, and rich content cards
 */

const SWIPE_THRESHOLD = 50;
const AUTO_PLAY_INTERVAL = 5000;

export function LuxCarousel({
  slides = [],
  autoPlay = true,
  interval = AUTO_PLAY_INTERVAL,
  showArrows = true,
  showDots = true,
  showPlayPause = true,
  className,
  slideClassName,
  aspectRatio = 'hero', // 'hero' | '16:9' | '4:3' | '1:1' | 'full'
  gradientOverlay = true,
  onSlideChange,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [direction, setDirection] = useState(0);
  const intervalRef = useRef(null);

  const totalSlides = slides.length;

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying && totalSlides > 1) {
      intervalRef.current = setInterval(() => {
        setDirection(1);
        setCurrentIndex((prev) => (prev + 1) % totalSlides);
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, totalSlides, interval]);

  // Notify parent of slide changes
  useEffect(() => {
    onSlideChange?.(currentIndex);
  }, [currentIndex, onSlideChange]);

  const goToSlide = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    // Reset auto-play timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Mouse handlers for desktop drag
  const [mouseStart, setMouseStart] = useState(null);

  const onMouseDown = (e) => {
    setMouseStart(e.clientX);
  };

  const onMouseUp = (e) => {
    if (mouseStart === null) return;
    const distance = mouseStart - e.clientX;
    if (Math.abs(distance) > SWIPE_THRESHOLD) {
      if (distance > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
    setMouseStart(null);
  };

  const aspectRatioClasses = {
    hero: 'min-h-[100svh]',
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    '1:1': 'aspect-square',
    full: 'h-full',
  };

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  if (!slides.length) return null;

  return (
    <div
      className={cn(
        'lux-carousel relative overflow-hidden bg-black',
        aspectRatioClasses[aspectRatio],
        className
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={() => setMouseStart(null)}
    >
      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.3 },
          }}
          className={cn('absolute inset-0', slideClassName)}
        >
          <LuxSlide
            slide={slides[currentIndex]}
            gradientOverlay={gradientOverlay}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {showArrows && totalSlides > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/50 backdrop-blur-sm border-2 border-white/30 hover:border-white hover:bg-black/70 flex items-center justify-center transition-all group"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/50 backdrop-blur-sm border-2 border-white/30 hover:border-white hover:bg-black/70 flex items-center justify-center transition-all group"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
          </button>
        </>
      )}

      {/* LED Dot Navigation */}
      {showDots && totalSlides > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className="group p-1"
              aria-label={`Go to slide ${index + 1}`}
            >
              <div
                className={cn(
                  'lux-led-dot w-3 h-3 rounded-full transition-all duration-300',
                  index === currentIndex
                    ? 'bg-[#FF1493] shadow-[0_0_10px_#FF1493,0_0_20px_#FF1493] scale-125'
                    : 'bg-white/40 hover:bg-white/60 group-hover:scale-110'
                )}
              >
                {index === currentIndex && (
                  <div className="absolute inset-0 rounded-full bg-[#FF1493] animate-ping opacity-75" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Play/Pause Control */}
      {showPlayPause && totalSlides > 1 && (
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute bottom-6 right-6 z-20 w-10 h-10 bg-black/50 backdrop-blur-sm border border-white/30 hover:border-white flex items-center justify-center transition-all"
          aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white" />
          )}
        </button>
      )}

      {/* Slide Counter */}
      <div className="absolute top-6 right-6 z-20 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-white/20 text-white text-xs font-mono uppercase tracking-wider">
        {String(currentIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
      </div>
    </div>
  );
}

/**
 * LuxSlide - Individual slide renderer
 */
function LuxSlide({ slide, gradientOverlay }) {
  if (!slide) return null;

  const {
    type = 'image', // 'image' | 'video' | 'content'
    src,
    alt,
    poster,
    title,
    subtitle,
    description,
    cta,
    ctaHref,
    ctaVariant = 'primary',
    overlay,
    children,
  } = slide;

  return (
    <div className="relative w-full h-full">
      {/* Background Media */}
      {type === 'image' && src && (
        <img
          src={src}
          alt={alt || title || ''}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {type === 'video' && src && (
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient Overlay */}
      {gradientOverlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
      )}

      {/* Custom Overlay */}
      {overlay && (
        <div className={cn('absolute inset-0', overlay)} />
      )}

      {/* Content */}
      {(title || subtitle || description || cta || children) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-6 max-w-5xl">
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xs uppercase tracking-[0.4em] text-white/70 mb-4"
              >
                {subtitle}
              </motion.p>
            )}

            {title && (
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[15vw] md:text-[10vw] font-black italic leading-[0.85] tracking-tighter text-white drop-shadow-2xl mb-6"
              >
                {title}
              </motion.h2>
            )}

            {description && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg md:text-xl text-white/90 uppercase tracking-wider mb-8 max-w-2xl mx-auto"
              >
                {description}
              </motion.p>
            )}

            {cta && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <LuxCarouselCTA
                  label={cta}
                  href={ctaHref}
                  variant={ctaVariant}
                />
              </motion.div>
            )}

            {children && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {children}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * LuxCarouselCTA - Styled CTA button for carousel slides
 */
function LuxCarouselCTA({ label, href, variant = 'primary', onClick }) {
  const baseClasses = 'inline-flex items-center gap-2 px-8 py-4 font-black uppercase tracking-wider text-lg transition-all duration-300 shadow-2xl';
  
  const variants = {
    primary: 'bg-[#FF1493] text-white hover:bg-white hover:text-black border-2 border-[#FF1493] hover:border-white',
    secondary: 'bg-transparent text-white border-2 border-white hover:bg-white hover:text-black',
    outline: 'bg-black/30 backdrop-blur-sm text-white border-2 border-white/50 hover:border-white hover:bg-white/10',
    ghost: 'bg-transparent text-white hover:bg-white/10 border-2 border-transparent hover:border-white/30',
  };

  const Component = href ? 'a' : 'button';
  const props = href ? { href } : { onClick };

  return (
    <Component
      {...props}
      className={cn(baseClasses, variants[variant])}
    >
      {label}
    </Component>
  );
}

/**
 * LuxProfileCarousel - Horizontal scroll carousel for profile cards
 */
export function LuxProfileCarousel({
  profiles = [],
  title,
  subtitle,
  className,
  onProfileClick,
}) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('lux-profile-carousel relative', className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6 px-6">
          {subtitle && (
            <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">{subtitle}</p>
          )}
          {title && (
            <h3 className="text-3xl font-black italic text-white">{title}</h3>
          )}
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative group">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 backdrop-blur-sm border border-white/30 hover:border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 backdrop-blur-sm border border-white/30 hover:border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Gradient Fade Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-[5] pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-[5] pointer-events-none" />

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 py-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {profiles.map((profile, index) => (
            <div
              key={profile.id || index}
              onClick={() => onProfileClick?.(profile)}
              className="flex-shrink-0 w-[280px] snap-start cursor-pointer group/card"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-white/5 border-2 border-white/10 hover:border-[#FF1493] transition-all duration-300">
                {profile.image && (
                  <img
                    src={profile.image}
                    alt={profile.name || ''}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Profile Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {profile.name && (
                    <h4 className="text-xl font-black text-white mb-1">{profile.name}</h4>
                  )}
                  {profile.subtitle && (
                    <p className="text-sm text-white/70 uppercase tracking-wider">{profile.subtitle}</p>
                  )}
                  {profile.badge && (
                    <div className="mt-2 inline-block px-2 py-1 bg-[#FF1493]/20 border border-[#FF1493]/50 text-[#FF1493] text-xs font-bold uppercase">
                      {profile.badge}
                    </div>
                  )}
                </div>

                {/* Online Indicator */}
                {profile.isOnline && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-[#39FF14] rounded-full shadow-[0_0_8px_#39FF14] animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * LuxEventCarousel - Horizontal carousel for event cards
 */
export function LuxEventCarousel({
  events = [],
  title,
  subtitle,
  className,
  onEventClick,
}) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('lux-event-carousel relative', className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6 px-6">
          {subtitle && (
            <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">{subtitle}</p>
          )}
          {title && (
            <h3 className="text-3xl font-black italic text-white">{title}</h3>
          )}
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative group">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 backdrop-blur-sm border border-white/30 hover:border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 backdrop-blur-sm border border-white/30 hover:border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Gradient Fade Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-[5] pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-[5] pointer-events-none" />

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 py-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {events.map((event, index) => (
            <div
              key={event.id || index}
              onClick={() => onEventClick?.(event)}
              className="flex-shrink-0 w-[360px] snap-start cursor-pointer group/card"
            >
              <div className="relative aspect-video overflow-hidden bg-white/5 border-2 border-white/10 hover:border-[#00D9FF] transition-all duration-300">
                {event.image && (
                  <img
                    src={event.image}
                    alt={event.title || ''}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Event Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {event.date && (
                    <p className="text-xs text-[#00D9FF] font-bold uppercase tracking-wider mb-1">{event.date}</p>
                  )}
                  {event.title && (
                    <h4 className="text-xl font-black text-white mb-1 line-clamp-1">{event.title}</h4>
                  )}
                  {event.venue && (
                    <p className="text-sm text-white/70 uppercase tracking-wider">{event.venue}</p>
                  )}
                </div>

                {/* Live Badge */}
                {event.isLive && (
                  <div className="absolute top-3 left-3 px-2 py-1 bg-[#FF1493] text-white text-xs font-black uppercase flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * LuxProductCarousel - Grid scroll carousel for products
 */
export function LuxProductCarousel({
  products = [],
  title,
  subtitle,
  className,
  onProductClick,
}) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className={cn('lux-product-carousel relative', className)}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-6 px-6">
          {subtitle && (
            <p className="text-xs uppercase tracking-[0.4em] text-white/50 mb-2">{subtitle}</p>
          )}
          {title && (
            <h3 className="text-3xl font-black italic text-white">{title}</h3>
          )}
        </div>
      )}

      {/* Carousel Container */}
      <div className="relative group">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 backdrop-blur-sm border border-white/30 hover:border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/70 backdrop-blur-sm border border-white/30 hover:border-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Gradient Fade Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-[5] pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-[5] pointer-events-none" />

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 py-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product, index) => (
            <div
              key={product.id || index}
              onClick={() => onProductClick?.(product)}
              className="flex-shrink-0 w-[240px] snap-start cursor-pointer group/card"
            >
              <div className="relative aspect-square overflow-hidden bg-white/5 border-2 border-white/10 hover:border-[#B026FF] transition-all duration-300">
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name || ''}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                
                {/* Product Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  {product.name && (
                    <h4 className="text-sm font-black text-white mb-1 line-clamp-1">{product.name}</h4>
                  )}
                  {product.price && (
                    <p className="text-lg font-black text-[#B026FF]">{product.price}</p>
                  )}
                </div>

                {/* Sale Badge */}
                {product.onSale && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-[#FF1493] text-white text-xs font-black uppercase">
                    SALE
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LuxCarousel;
