import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

/**
 * Pull-to-refresh for mobile
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef(0);
  const scrollTopRef = useRef(0);

  const PULL_THRESHOLD = 80;

  const handleTouchStart = (e) => {
    scrollTopRef.current = window.scrollY || document.documentElement.scrollTop;
    if (scrollTopRef.current === 0) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (isRefreshing || scrollTopRef.current > 0) return;

    const touchY = e.touches[0].clientY;
    const distance = Math.max(0, touchY - touchStartRef.current);

    if (distance > 0) {
      // Dampen pull distance for better feel
      const dampenedDistance = Math.min(distance * 0.5, PULL_THRESHOLD * 1.5);
      setPullDistance(dampenedDistance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  const rotation = pullDistance / PULL_THRESHOLD * 360;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden"
        style={{
          height: pullDistance,
          opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
        }}
      >
        <motion.div
          style={{ rotate: rotation }}
          className={`${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-6 h-6 text-[#C8962C]" />
        </motion.div>
      </motion.div>

      <div style={{ transform: `translateY(${pullDistance}px)` }}>
        {children}
      </div>
    </div>
  );
}