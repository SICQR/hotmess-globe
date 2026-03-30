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
  // Default — subtle slide-up fade (iOS native feel)
  slideUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -6 },
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  // Pulse/Globe entry — drop with fade
  drop: {
    initial: { opacity: 0, y: -16 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: 10 },
    transition: { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] },
  },
  // Sheets/modals — scale up from below
  reveal: {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit:    { opacity: 0, y: 10, scale: 0.99 },
    transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
  },
  // Simple fade (auth/legal)
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18 },
  },
};

/**
 * Route-to-transition mapping
 * Maps route patterns to their preferred transition type
 */
const routeTransitionMap = {
  '/': 'slideUp',
  '/pulse': 'drop',
  '/globe': 'drop',
  '/ghosted': 'slideUp',
  '/social': 'slideUp',
  '/social/*': 'slideUp',
  '/market': 'slideUp',
  '/market/*': 'reveal',
  '/marketplace': 'slideUp',
  '/marketplace/*': 'reveal',
  '/events': 'slideUp',
  '/events/*': 'slideUp',
  '/auth': 'fade',
  '/login': 'fade',
  '/age': 'fade',
  '/profile': 'reveal',
  '/profile/*': 'reveal',
  '/p/*': 'reveal',
  '/product': 'reveal',
  '/product/*': 'reveal',
  '/radio': 'drop',
  '/music': 'slideUp',
  '/more': 'slideUp',
  '/safety': 'slideUp',
  '/care': 'slideUp',
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
  return 'slideUp';
}

/**
 * PageTransition component
 * Wraps page content with animated transitions
 */
export function PageTransition({ children, className }) {
  const location = useLocation();
  const pathname = location?.pathname || '/';
  const transitionType = getTransitionForRoute(pathname);
  const variant = transitionVariants[transitionType] || transitionVariants.slideUp;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={variant.initial}
        animate={variant.animate}
        exit={variant.exit}
        transition={variant.transition}
        className={cn('page-transition-wrapper h-full w-full', className)}
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
      className="fixed inset-0 z-[120] bg-[#C8962C] pointer-events-none"
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
