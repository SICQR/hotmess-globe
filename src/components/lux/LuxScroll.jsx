import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';

/**
 * LUX BRUTALIST Scroll Interactions
 * 
 * Features:
 * - Parallax scrolling
 * - Scroll-triggered reveals
 * - Progress indicators
 * - Sticky sections
 * - Pull-to-refresh
 */

/**
 * Scroll Progress Bar
 * Shows progress through page content
 */
export function ScrollProgress({ color = '#FF1493' }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[100] origin-left"
      style={{
        scaleX,
        backgroundColor: color,
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}50`,
      }}
    />
  );
}

/**
 * Reveal on Scroll
 * Content that animates in when scrolled into view
 */
export function ScrollReveal({
  children,
  direction = 'up', // 'up', 'down', 'left', 'right', 'fade'
  delay = 0,
  duration = 0.5,
  threshold = 0.2,
  once = true,
  className = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { 
    once, 
    amount: threshold 
  });

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: 60, opacity: 0 };
      case 'down': return { y: -60, opacity: 0 };
      case 'left': return { x: 60, opacity: 0 };
      case 'right': return { x: -60, opacity: 0 };
      case 'fade': return { opacity: 0 };
      default: return { y: 60, opacity: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={getInitialPosition()}
      animate={isInView ? { x: 0, y: 0, opacity: 1 } : getInitialPosition()}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger Children on Scroll
 * Reveals children one by one with stagger effect
 */
export function ScrollStagger({
  children,
  staggerDelay = 0.1,
  threshold = 0.1,
  className = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: threshold });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }
            },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Parallax Container
 * Content that moves at different speeds on scroll
 */
export function Parallax({
  children,
  speed = 0.5, // 0 = fixed, 1 = normal scroll, <1 = slower, >1 = faster
  className = '',
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [100 * speed, -100 * speed]
  );

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Sticky Section
 * Section that sticks while scrolling through content
 */
export function StickySection({
  children,
  stickyContent,
  height = '200vh',
  className = '',
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  return (
    <div ref={ref} className={`relative ${className}`} style={{ height }}>
      {/* Sticky panel */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {typeof stickyContent === 'function' 
          ? stickyContent(scrollYProgress) 
          : stickyContent
        }
      </div>

      {/* Scrolling content */}
      <div className="absolute inset-0 pointer-events-none">
        {children}
      </div>
    </div>
  );
}

/**
 * Pull to Refresh
 * Pull down gesture to trigger refresh
 */
export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  className = '',
}) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance
      const resistance = 0.4;
      setPullDistance(diff * resistance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    
    setIsPulling(false);
    setPullDistance(0);
  };

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative overflow-auto ${className}`}
    >
      {/* Pull indicator */}
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: pullDistance }}
        className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden bg-black border-b-2 border-white/20"
      >
        <div className="text-center py-4">
          {isRefreshing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-white/30 border-t-[#FF1493] mx-auto"
            />
          ) : (
            <>
              <motion.div
                animate={{ rotate: progress * 180 }}
                className="text-lg text-white/60 mb-1"
              >
                ↓
              </motion.div>
              <span className="font-mono text-[10px] uppercase text-white/40">
                {progress >= 1 ? 'RELEASE TO REFRESH' : 'PULL TO REFRESH'}
              </span>
            </>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={{ y: pullDistance }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Scroll Snap Container
 * Container with CSS scroll-snap for section-by-section scrolling
 */
export function ScrollSnapContainer({
  children,
  direction = 'vertical', // 'vertical', 'horizontal'
  className = '',
}) {
  return (
    <div
      className={`
        ${direction === 'vertical' 
          ? 'snap-y snap-mandatory overflow-y-auto h-screen' 
          : 'snap-x snap-mandatory overflow-x-auto w-screen flex'
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Scroll Snap Section
 * Individual section within a scroll snap container
 */
export function ScrollSnapSection({
  children,
  align = 'start', // 'start', 'center', 'end'
  className = '',
}) {
  return (
    <div
      className={`
        snap-${align} flex-shrink-0
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * Infinite Scroll Trigger
 * Triggers callback when scrolled to bottom
 */
export function InfiniteScrollTrigger({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 200,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading && hasMore) {
          onLoadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, isLoading, hasMore, threshold]);

  return (
    <div ref={ref} className="w-full py-8 flex items-center justify-center">
      {isLoading && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-white/30 border-t-[#FF1493]"
        />
      )}
      {!hasMore && !isLoading && (
        <span className="font-mono text-xs text-white/30 uppercase tracking-wider">
          END OF FEED
        </span>
      )}
    </div>
  );
}

export default ScrollReveal;
