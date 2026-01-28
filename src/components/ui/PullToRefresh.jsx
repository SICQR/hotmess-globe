import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Try to trigger haptic feedback if supported
 */
function triggerHaptic(type = 'light') {
  try {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 20],
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  } catch {
    // Ignore - haptic feedback is optional
  }
}

/**
 * Enhanced Pull-to-refresh for mobile with better animations
 */
export default function PullToRefresh({ 
  onRefresh, 
  children,
  threshold = 80,
  maxPull = 120,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  successText = 'Updated!',
  showText = true,
  variant = 'default', // 'default', 'minimal', 'branded'
  className,
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshState, setRefreshState] = useState('idle'); // 'idle', 'pulling', 'ready', 'refreshing', 'success'
  const touchStartRef = useRef(0);
  const scrollTopRef = useRef(0);
  const hasTriggeredHaptic = useRef(false);

  const PULL_THRESHOLD = threshold;
  const MAX_PULL = maxPull;

  // Reset haptic trigger when refresh state changes
  useEffect(() => {
    if (refreshState === 'idle') {
      hasTriggeredHaptic.current = false;
    }
  }, [refreshState]);

  const handleTouchStart = useCallback((e) => {
    scrollTopRef.current = window.scrollY || document.documentElement.scrollTop;
    if (scrollTopRef.current === 0) {
      touchStartRef.current = e.touches[0].clientY;
      setRefreshState('pulling');
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isRefreshing || scrollTopRef.current > 0) return;

    const touchY = e.touches[0].clientY;
    const distance = Math.max(0, touchY - touchStartRef.current);

    if (distance > 0) {
      // Dampen pull distance for rubber-band effect
      const dampenedDistance = Math.min(
        distance * (1 - distance / (distance + 300)), 
        MAX_PULL
      );
      setPullDistance(dampenedDistance);

      // Update state and trigger haptic when crossing threshold
      if (dampenedDistance >= PULL_THRESHOLD) {
        setRefreshState('ready');
        if (!hasTriggeredHaptic.current) {
          triggerHaptic('medium');
          hasTriggeredHaptic.current = true;
        }
      } else {
        setRefreshState('pulling');
      }
    }
  }, [isRefreshing, PULL_THRESHOLD, MAX_PULL]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setRefreshState('refreshing');
      triggerHaptic('light');
      
      try {
        await onRefresh?.();
        setRefreshState('success');
        triggerHaptic('success');
        
        // Show success state briefly
        await new Promise(resolve => setTimeout(resolve, 500));
      } finally {
        setIsRefreshing(false);
        setRefreshState('idle');
      }
    } else {
      setRefreshState('idle');
    }
    setPullDistance(0);
  }, [pullDistance, PULL_THRESHOLD, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = progress * 360;

  // State-based text
  const statusText = {
    idle: pullText,
    pulling: pullText,
    ready: releaseText,
    refreshing: refreshingText,
    success: successText,
  }[refreshState];

  // State-based icon
  const StatusIcon = {
    idle: ArrowDown,
    pulling: ArrowDown,
    ready: RefreshCw,
    refreshing: RefreshCw,
    success: Check,
  }[refreshState];

  // Variant-specific styles
  const variantStyles = {
    default: {
      indicator: 'bg-black/80 backdrop-blur-xl border-2 border-white/20',
      icon: 'text-[#FF1493]',
      text: 'text-white/60',
    },
    minimal: {
      indicator: 'bg-transparent',
      icon: 'text-white/40',
      text: 'text-transparent',
    },
    branded: {
      indicator: 'bg-gradient-to-r from-[#FF1493]/80 to-[#B026FF]/80 backdrop-blur-xl border-2 border-white/20',
      icon: 'text-white',
      text: 'text-white/80',
    },
  };

  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn("relative touch-pan-y", className)}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center overflow-hidden z-10"
        style={{
          height: Math.max(pullDistance, isRefreshing ? 60 : 0),
        }}
        animate={{
          opacity: progress > 0 || isRefreshing ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            styles.indicator
          )}
          initial={{ scale: 0.8 }}
          animate={{ 
            scale: refreshState === 'ready' ? 1.05 : 1,
            y: isRefreshing ? 0 : Math.min(pullDistance * 0.5, 30),
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <motion.div
            animate={{ 
              rotate: refreshState === 'refreshing' ? 360 : rotation,
            }}
            transition={
              refreshState === 'refreshing'
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { duration: 0 }
            }
          >
            <StatusIcon className={cn("w-5 h-5", styles.icon)} />
          </motion.div>
          
          {showText && (
            <AnimatePresence mode="wait">
              <motion.span
                key={refreshState}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={cn("text-xs font-bold uppercase tracking-wider", styles.text)}
              >
                {statusText}
              </motion.span>
            </AnimatePresence>
          )}
        </motion.div>
      </motion.div>

      {/* Progress arc (for branded variant) */}
      {variant === 'branded' && progress > 0 && !isRefreshing && (
        <motion.div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <svg width="40" height="40" className="-rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3"
            />
            <motion.circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="#FF1493"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={100}
              strokeDashoffset={100 - (progress * 100)}
            />
          </svg>
        </motion.div>
      )}

      {/* Content with transform */}
      <motion.div 
        animate={{ 
          y: pullDistance || (isRefreshing ? 60 : 0),
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// Export hook for external control
export function usePullToRefresh(onRefresh) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  return { isRefreshing, refresh };
}