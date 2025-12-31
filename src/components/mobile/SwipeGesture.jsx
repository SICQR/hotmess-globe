import React, { useRef, useState } from 'react';

/**
 * Swipe gesture handler for mobile interactions
 */
export default function SwipeGesture({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = '',
}) {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsSwiping(true);
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Velocity-based swipe detection
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

    if (velocity < 0.1) {
      setIsSwiping(false);
      return; // Too slow, not a swipe
    }

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Horizontal swipe
    if (absX > absY && absX > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    // Vertical swipe
    else if (absY > absX && absY > threshold) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    setIsSwiping(false);
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}