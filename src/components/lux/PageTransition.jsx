import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * PageTransition - Bold page transition animations for route changes
 * 
 * Transition Types:
 * - wipe: Wipes right for forward navigation (default)
 * - wipeLeft: Wipes left for back navigation
 * - shutter: Opens/closes like a shutter (modal-style pages)
 * - split: Splits from center (dramatic reveals)
 * - drop: Drops down from top (Globe/Pulse entry)
 * - fade: Simple fade transition
 */

const transitionVariants = {
  wipe: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] },
  },
  wipeLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] },
  },
  shutter: {
    initial: { scaleY: 0, transformOrigin: 'top' },
    animate: { scaleY: 1 },
    exit: { scaleY: 0, transformOrigin: 'bottom' },
    transition: { duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] },
  },
  split: {
    initial: { clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' },
    animate: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
    exit: { clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' },
    transition: { duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] },
  },
  drop: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
    transition: { duration: 0.5, ease: [0.43, 0.13, 0.23, 0.96] },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },
};

/**
 * Route-to-transition mapping
 * Maps route patterns to their preferred transition type
 */
const routeTransitionMap = {
  '/': 'wipe',
  '/pulse': 'drop',
  '/globe': 'drop',
  '/social': 'wipe',
  '/social/*': 'wipe',
  '/market': 'shutter',
  '/market/*': 'shutter',
  '/marketplace': 'shutter',
  '/marketplace/*': 'shutter',
  '/events': 'wipe',
  '/events/*': 'wipe',
  '/auth': 'split',
  '/login': 'split',
  '/age': 'split',
  '/profile': 'shutter',
  '/profile/*': 'shutter',
  '/p/*': 'shutter',
  '/product': 'shutter',
  '/product/*': 'shutter',
};

/**
 * Get transition type for a given route
 */
function getTransitionForRoute(pathname) {
  // Exact match
  if (routeTransitionMap[pathname]) {
    return routeTransitionMap[pathname];
  }

  // Pattern match (e.g., /market/*)
  for (const [pattern, transition] of Object.entries(routeTransitionMap)) {
    if (pattern.endsWith('/*')) {
      const basePattern = pattern.slice(0, -2);
      if (pathname.startsWith(basePattern)) {
        return transition;
      }
    }
  }

  // Default
  return 'wipe';
}

/**
 * PageTransition component
 * Wraps page content with animated transitions
 */
export function PageTransition({ children, className }) {
  const location = useLocation();
  const transitionType = getTransitionForRoute(location.pathname);
  const variant = transitionVariants[transitionType] || transitionVariants.wipe;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={variant.transition}
        className={cn('page-transition-wrapper', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * PageTransitionOverlay - Full-screen transition overlay
 * Used for more dramatic transitions
 */
export function PageTransitionOverlay({ isTransitioning, type = 'wipe' }) {
  if (!isTransitioning) return null;

  const overlayVariants = {
    wipe: {
      initial: { x: '-100%' },
      animate: { x: '100%' },
      transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] },
    },
    shutter: {
      initial: { scaleY: 0 },
      animate: { scaleY: 1 },
      transition: { duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] },
    },
    split: {
      initial: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
      animate: { clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' },
      transition: { duration: 0.6, ease: [0.43, 0.13, 0.23, 0.96] },
    },
  };

  const variant = overlayVariants[type] || overlayVariants.wipe;

  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      transition={variant.transition}
      className="fixed inset-0 z-[9999] bg-[#FF1493] pointer-events-none"
    />
  );
}

/**
 * Custom transition hook
 * Allows components to trigger custom page transitions
 */
export function usePageTransition() {
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  const startTransition = React.useCallback((duration = 800) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
    }, duration);
  }, []);

  return { isTransitioning, startTransition };
}

export default PageTransition;
