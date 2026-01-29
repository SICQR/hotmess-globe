import React, { useRef, useState, useCallback } from 'react';

/**
 * HOTMESS Mobile Gesture System
 * 
 * Gestures supported:
 * - Swipe right to message (profiles)
 * - Swipe left to skip
 * - Pull to refresh (all feeds)
 * - Swipe up for details (cards)
 * - Corner tear to dismiss (modals)
 */

/**
 * useSwipeGestures - Hook for swipe gesture detection
 */
export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPullRefresh,
  threshold = 50,
  pullThreshold = 100,
} = {}) {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const [swipeProgress, setSwipeProgress] = useState({ x: 0, y: 0 });
  const [isPulling, setIsPulling] = useState(false);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setSwipeProgress({ x: 0, y: 0 });
  }, []);

  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    setSwipeProgress({ x: deltaX, y: deltaY });

    // Pull to refresh detection
    if (deltaY > pullThreshold && window.scrollY === 0) {
      setIsPulling(true);
    }
  }, [pullThreshold]);

  const handleTouchEnd = useCallback((e) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Pull to refresh
    if (isPulling && onPullRefresh) {
      onPullRefresh();
      setIsPulling(false);
      setSwipeProgress({ x: 0, y: 0 });
      return;
    }

    // Velocity-based swipe detection
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

    if (velocity < 0.1) {
      setSwipeProgress({ x: 0, y: 0 });
      return;
    }

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Horizontal swipe
    if (absX > absY && absX > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight({ velocity, distance: deltaX });
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft({ velocity, distance: deltaX });
      }
    }
    // Vertical swipe
    else if (absY > absX && absY > threshold) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown({ velocity, distance: deltaY });
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp({ velocity, distance: deltaY });
      }
    }

    setSwipeProgress({ x: 0, y: 0 });
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPullRefresh, isPulling]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeProgress,
    isPulling,
  };
}

/**
 * SwipeGesture - Component wrapper for swipe gestures
 */
export default function SwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPullRefresh,
  threshold = 50,
  className = '',
  showIndicator = false,
}) {
  const { handlers, swipeProgress, isPulling } = useSwipeGestures({
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPullRefresh,
    threshold,
  });

  return (
    <div className={`relative ${className}`} {...handlers}>
      {/* Swipe Indicator */}
      {showIndicator && (swipeProgress.x !== 0 || swipeProgress.y !== 0) && (
        <div
          className="absolute inset-0 pointer-events-none z-50"
          style={{
            background: swipeProgress.x > threshold
              ? 'linear-gradient(90deg, rgba(57,255,20,0.2) 0%, transparent 50%)'
              : swipeProgress.x < -threshold
                ? 'linear-gradient(-90deg, rgba(255,20,147,0.2) 0%, transparent 50%)'
                : 'transparent',
          }}
        >
          {swipeProgress.x > threshold && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#39FF14] text-black text-xs font-black uppercase rounded">
              MESSAGE
            </div>
          )}
          {swipeProgress.x < -threshold && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#FF1493] text-white text-xs font-black uppercase rounded">
              SKIP
            </div>
          )}
        </div>
      )}

      {/* Pull to Refresh Indicator */}
      {isPulling && (
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-center bg-gradient-to-b from-[#FF1493]/20 to-transparent z-50">
          <div className="w-6 h-6 border-2 border-[#FF1493] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {children}
    </div>
  );
}

/**
 * SwipeableCard - Card with built-in swipe actions
 */
export function SwipeableCard({
  children,
  onSwipeRight, // Message
  onSwipeLeft,  // Skip
  onSwipeUp,    // Details
  className = '',
}) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - touchStartRef.current.x;
    setOffset(deltaX);
  };

  const handleTouchEnd = () => {
    if (Math.abs(offset) > 100) {
      if (offset > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (offset < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    setOffset(0);
    setIsDragging(false);
  };

  const rotation = offset * 0.05;
  const opacity = 1 - Math.abs(offset) / 500;

  return (
    <div
      className={`relative transition-transform ${!isDragging ? 'duration-300' : ''} ${className}`}
      style={{
        transform: `translateX(${offset}px) rotate(${rotation}deg)`,
        opacity,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action indicators */}
      {offset > 50 && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#39FF14] text-black text-xs font-black uppercase rounded z-10">
          MESSAGE
        </div>
      )}
      {offset < -50 && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-[#FF1493] text-white text-xs font-black uppercase rounded z-10">
          SKIP
        </div>
      )}
      
      {children}
    </div>
  );
}

/**
 * CornerDismiss - Corner tear gesture to dismiss modals
 */
export function CornerDismiss({
  children,
  onDismiss,
  cornerSize = 60,
  className = '',
}) {
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const isInCorner = (x, y, rect) => {
    const topRight = x > rect.width - cornerSize && y < cornerSize;
    const topLeft = x < cornerSize && y < cornerSize;
    return topRight || topLeft;
  };

  const handleTouchStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    if (isInCorner(x, y, rect)) {
      touchStartRef.current = { x, y };
      setIsActive(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    
    const distance = Math.sqrt(
      Math.pow(x - touchStartRef.current.x, 2) +
      Math.pow(y - touchStartRef.current.y, 2)
    );
    
    setProgress(Math.min(distance / 100, 1));
  };

  const handleTouchEnd = () => {
    if (progress > 0.7 && onDismiss) {
      onDismiss();
    }
    setIsActive(false);
    setProgress(0);
  };

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Corner tear indicator */}
      {isActive && (
        <div
          className="absolute top-0 right-0 w-0 h-0 border-solid pointer-events-none z-50"
          style={{
            borderWidth: `${progress * 40}px`,
            borderColor: `transparent #FF1493 transparent transparent`,
            transform: 'rotate(0deg)',
          }}
        />
      )}
      
      {children}
    </div>
  );
}