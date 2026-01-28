import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LuxCarousel - Chrome Luxury Brutalist Carousel
 * 
 * Features:
 * - Full-width hero carousel with auto-play
 * - Swipeable on mobile
 * - LED pulse dot indicators
 * - Gradient fade edges
 * - Supports images, videos, and rich content cards
 */

export function LuxCarousel({
  children,
  autoPlay = true,
  autoPlayInterval = 5000,
  showDots = true,
  showArrows = true,
  showFadeEdges = false,
  loop = true,
  className,
  slideClassName,
  onSlideChange,
  ...props
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const intervalRef = useRef(null);
  
  const slides = React.Children.toArray(children);
  const slideCount = slides.length;

  // Auto-play logic
  useEffect(() => {
    if (autoPlay && !isHovered && slideCount > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slideCount);
      }, autoPlayInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoPlay, autoPlayInterval, isHovered, slideCount]);

  // Notify parent of slide changes
  useEffect(() => {
    onSlideChange?.(currentIndex);
  }, [currentIndex, onSlideChange]);

  const goToSlide = useCallback((index) => {
    if (loop) {
      setCurrentIndex((index + slideCount) % slideCount);
    } else {
      setCurrentIndex(Math.max(0, Math.min(index, slideCount - 1)));
    }
  }, [loop, slideCount]);

  const goToPrevious = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Touch handling for swipe
  const minSwipeDistance = 50;

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
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  };

  if (slideCount === 0) return null;

  return (
    <div
      className={cn('lux-carousel relative overflow-hidden', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Carousel"
      aria-roledescription="carousel"
      {...props}
    >
      {/* Slides container */}
      <div
        className="lux-carousel-track flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className={cn('lux-carousel-slide flex-shrink-0 w-full h-full', slideClassName)}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${slideCount}`}
            aria-hidden={index !== currentIndex}
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Gradient fade edges */}
      {showFadeEdges && slideCount > 1 && (
        <>
          <div className="lux-carousel-fade-left absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[#0D0D0D] to-transparent pointer-events-none z-5" />
          <div className="lux-carousel-fade-right absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-[#0D0D0D] to-transparent pointer-events-none z-5" />
        </>
      )}

      {/* Navigation arrows */}
      {showArrows && slideCount > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="lux-carousel-arrow prev absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-[#0D0D0D] border-2 border-white text-white hover:bg-[#FF1493] hover:border-[#FF1493] transition-all duration-150 z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="lux-carousel-arrow next absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-[#0D0D0D] border-2 border-white text-white hover:bg-[#FF1493] hover:border-[#FF1493] transition-all duration-150 z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {showDots && slideCount > 1 && (
        <div className="lux-carousel-dots flex justify-center gap-2 py-4" role="tablist">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'lux-carousel-dot w-3 h-3 border-0 cursor-pointer transition-all duration-150',
                index === currentIndex
                  ? 'bg-[#FF1493] shadow-[0_0_20px_rgba(255,20,147,0.6)] animate-[lux-pulse-glow_2s_ease-in-out_infinite]'
                  : 'bg-white/30 hover:bg-white/60'
              )}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * LuxCarouselSlide - Individual slide wrapper
 */
export function LuxCarouselSlide({
  children,
  backgroundImage,
  fallbackImage,
  backgroundVideo,
  overlay = true,
  className,
  ...props
}) {
  const [imgSrc, setImgSrc] = React.useState(backgroundImage);
  
  return (
    <div
      className={cn(
        'relative w-full h-full',
        className
      )}
      {...props}
    >
      {/* Background image */}
      {imgSrc && (
        <img
          src={imgSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => {
            if (fallbackImage && imgSrc !== fallbackImage) {
              setImgSrc(fallbackImage);
            }
          }}
        />
      )}

      {/* Background video */}
      {backgroundVideo && (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
        />
      )}

      {/* Gradient overlay */}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      )}

      {/* Content - renders children directly for full control */}
      {children}
    </div>
  );
}

/**
 * LuxHorizontalCarousel - Horizontal scroll carousel for cards
 */
export function LuxHorizontalCarousel({
  children,
  title,
  showViewAll = false,
  viewAllHref,
  onViewAll,
  className,
  cardClassName,
  gap = 16,
  ...props
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={cn('relative', className)} {...props}>
      {/* Header */}
      {(title || showViewAll) && (
        <div className="flex items-center justify-between mb-4 px-4 md:px-0">
          {title && (
            <h2 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight text-white">
              {title}
            </h2>
          )}
          {showViewAll && (
            <a
              href={viewAllHref}
              onClick={onViewAll}
              className="text-[#FF1493] text-sm font-semibold uppercase tracking-wider hover:underline"
            >
              View All
            </a>
          )}
        </div>
      )}

      {/* Scroll container */}
      <div className="relative group">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[#0D0D0D]/90 border-2 border-white text-white hover:bg-[#FF1493] hover:border-[#FF1493] transition-all z-10 opacity-0 group-hover:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Cards container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0"
          style={{ gap: `${gap}px` }}
        >
          {React.Children.map(children, (child, index) => (
            <div
              key={index}
              className={cn('flex-shrink-0 snap-start', cardClassName)}
            >
              {child}
            </div>
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-[#0D0D0D]/90 border-2 border-white text-white hover:bg-[#FF1493] hover:border-[#FF1493] transition-all z-10 opacity-0 group-hover:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default LuxCarousel;
