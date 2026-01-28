import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Slide variants for more dynamic transitions
const slideVariants = {
  initial: (direction) => ({
    opacity: 0,
    x: direction > 0 ? 100 : -100,
  }),
  enter: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction > 0 ? -100 : 100,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

// Fade scale variants
const fadeScaleVariants = {
  initial: {
    opacity: 0,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

// Get navigation direction based on route depth
function getNavigationDirection(prevPath, currentPath) {
  const prevDepth = (prevPath || '/').split('/').filter(Boolean).length;
  const currentDepth = (currentPath || '/').split('/').filter(Boolean).length;
  return currentDepth > prevDepth ? 1 : -1;
}

// Page transition wrapper
export function PageTransition({ 
  children, 
  variant = 'fade', // 'fade', 'slide', 'fadeScale'
  className = '',
}) {
  const location = useLocation();

  const variants = {
    fade: pageVariants,
    slide: slideVariants,
    fadeScale: fadeScaleVariants,
  };

  const selectedVariants = variants[variant] || pageVariants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={selectedVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Animated route wrapper for individual routes
export function AnimatedRoute({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Section transition for animating sections within a page
export function SectionTransition({ 
  children, 
  delay = 0, 
  className = '',
  direction = 'up', // 'up', 'down', 'left', 'right', 'scale'
}) {
  const directions = {
    up: { initial: { y: 30 }, animate: { y: 0 } },
    down: { initial: { y: -30 }, animate: { y: 0 } },
    left: { initial: { x: 30 }, animate: { x: 0 } },
    right: { initial: { x: -30 }, animate: { x: 0 } },
    scale: { initial: { scale: 0.95 }, animate: { scale: 1 } },
  };

  const { initial, animate } = directions[direction] || directions.up;

  return (
    <motion.div
      initial={{ opacity: 0, ...initial }}
      animate={{ opacity: 1, ...animate }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger children animation
export function StaggerContainer({ 
  children, 
  staggerDelay = 0.05, 
  className = '' 
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger child item
export function StaggerItem({ 
  children, 
  className = '',
  direction = 'up',
}) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
    scale: { scale: 0.9 },
  };

  const initialProps = directions[direction] || directions.up;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, ...initialProps },
        visible: { 
          opacity: 1, 
          y: 0, 
          x: 0, 
          scale: 1,
          transition: { 
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Presence animation for conditional rendering
export function PresenceAnimation({ 
  isVisible, 
  children, 
  className = '',
  animation = 'fade', // 'fade', 'slideUp', 'slideDown', 'scale'
}) {
  const animations = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },
    slideDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },
  };

  const animationProps = animations[animation] || animations.fade;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          {...animationProps}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PageTransition;
