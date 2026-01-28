import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

/**
 * LUX BRUTALIST Swipe Handler
 * 
 * Enables gesture-based navigation:
 * - Swipe left/right to navigate between pages
 * - Swipe up to reveal actions
 * - Swipe down to dismiss/go back
 * - Corner drag to "tear" and dismiss
 */

const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

export function SwipeableView({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  enableCornerTear = true,
  className = '',
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const containerRef = useRef(null);

  // Visual transforms based on drag
  const rotateZ = useTransform(x, [-200, 0, 200], [-5, 0, 5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);
  const opacity = useTransform(x, [-300, 0, 300], [0.5, 1, 0.5]);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const { offset, velocity } = info;

    // Horizontal swipes
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > VELOCITY_THRESHOLD) {
      if (offset.x > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset.x < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    // Vertical swipes
    if (Math.abs(offset.y) > SWIPE_THRESHOLD || Math.abs(velocity.y) > VELOCITY_THRESHOLD) {
      if (offset.y > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (offset.y < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }
  };

  return (
    <motion.div
      ref={containerRef}
      style={{ x, y, rotateZ, scale, opacity }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className={`touch-pan-y ${className}`}
    >
      {children}
      
      {/* Corner tear indicator */}
      {enableCornerTear && (
        <CornerTear 
          progress={tearProgress} 
          onTear={onSwipeDown}
        />
      )}
    </motion.div>
  );
}

/**
 * Corner Tear Effect
 * Drag from corner to "peel" and dismiss
 */
export function CornerTear({ 
  progress = 0, 
  onTear,
  position = 'bottom-right' 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const dragRef = useRef(null);

  const handleDrag = (event, info) => {
    // Calculate tear progress based on drag distance
    const distance = Math.sqrt(
      Math.pow(info.offset.x, 2) + Math.pow(info.offset.y, 2)
    );
    const newProgress = Math.min(distance / 200, 1);
    setLocalProgress(newProgress);
  };

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    if (localProgress > 0.5 && onTear) {
      onTear();
    }
    setLocalProgress(0);
  };

  const cornerClasses = {
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
  };

  return (
    <motion.div
      ref={dragRef}
      drag
      dragConstraints={{ left: -100, right: 0, top: -100, bottom: 0 }}
      dragElastic={0.2}
      onDrag={handleDrag}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className={`absolute ${cornerClasses[position]} w-16 h-16 cursor-grab active:cursor-grabbing z-50`}
    >
      {/* Tear visual */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `polygon(100% 0%, 100% 100%, ${100 - localProgress * 100}% 100%)`,
        }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-tl from-white/20 to-transparent"
          style={{
            transform: `rotate(${localProgress * 45}deg)`,
            transformOrigin: 'bottom right',
          }}
        />
      </div>
      
      {/* Fold line */}
      <div 
        className="absolute bottom-0 right-0 w-12 h-12 border-t-2 border-l-2 border-white/30"
        style={{
          transform: `rotate(${-45 + localProgress * 20}deg) scale(${1 + localProgress * 0.5})`,
          transformOrigin: 'bottom right',
          opacity: 0.3 + localProgress * 0.7,
        }}
      />
      
      {/* Hint text */}
      {isDragging && localProgress > 0.2 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-8 -left-8 text-[10px] font-mono uppercase text-white/60 whitespace-nowrap"
        >
          {localProgress > 0.5 ? 'RELEASE TO CLOSE' : 'DRAG TO CLOSE'}
        </motion.span>
      )}
    </motion.div>
  );
}

/**
 * Swipeable Card Stack
 * For discovery/browse interfaces - swipe cards left/right
 */
export function SwipeableCardStack({
  items,
  renderCard,
  onSwipeLeft,
  onSwipeRight,
  onEmpty,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState(null);

  const handleSwipe = (direction) => {
    setExitDirection(direction);
    
    setTimeout(() => {
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft(items[currentIndex]);
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight(items[currentIndex]);
      }
      
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (onEmpty) {
        onEmpty();
      }
      
      setExitDirection(null);
    }, 200);
  };

  const visibleCards = items.slice(currentIndex, currentIndex + 3);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {visibleCards.map((item, index) => (
          <motion.div
            key={item.id || currentIndex + index}
            initial={{ scale: 1 - index * 0.05, y: index * 10 }}
            animate={{ 
              scale: 1 - index * 0.05, 
              y: index * 10,
              zIndex: visibleCards.length - index 
            }}
            exit={{
              x: exitDirection === 'left' ? -300 : 300,
              opacity: 0,
              rotate: exitDirection === 'left' ? -20 : 20,
            }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
            style={{ zIndex: visibleCards.length - index }}
          >
            {index === 0 ? (
              <SwipeableView
                onSwipeLeft={() => handleSwipe('left')}
                onSwipeRight={() => handleSwipe('right')}
                enableCornerTear={false}
              >
                {renderCard(item, index)}
              </SwipeableView>
            ) : (
              renderCard(item, index)
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Empty state */}
      {currentIndex >= items.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-mono text-sm text-white/40 uppercase tracking-wider">
            No more items
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal Page Swiper
 * Swipe between pages/sections horizontally
 */
export function HorizontalSwiper({
  pages,
  currentPage = 0,
  onPageChange,
  showIndicators = true,
}) {
  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(currentPage);

  const handleDragEnd = (event, info) => {
    const threshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset < -threshold || velocity < -500) {
      // Swipe left - next page
      if (activeIndex < pages.length - 1) {
        const newIndex = activeIndex + 1;
        setActiveIndex(newIndex);
        if (onPageChange) onPageChange(newIndex);
      }
    } else if (offset > threshold || velocity > 500) {
      // Swipe right - previous page
      if (activeIndex > 0) {
        const newIndex = activeIndex - 1;
        setActiveIndex(newIndex);
        if (onPageChange) onPageChange(newIndex);
      }
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <motion.div
        ref={containerRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{ x: -activeIndex * 100 + '%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex h-full"
        style={{ width: `${pages.length * 100}%` }}
      >
        {pages.map((page, index) => (
          <div 
            key={index} 
            className="flex-shrink-0 w-full h-full"
            style={{ width: `${100 / pages.length}%` }}
          >
            {page}
          </div>
        ))}
      </motion.div>

      {/* Page indicators */}
      {showIndicators && pages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveIndex(index);
                if (onPageChange) onPageChange(index);
              }}
              className={`w-2 h-2 transition-all duration-200 ${
                index === activeIndex 
                  ? 'bg-[#FF1493] shadow-[0_0_10px_#FF1493]' 
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SwipeableView;
