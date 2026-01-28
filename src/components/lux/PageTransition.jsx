import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * LUX BRUTALIST Page Transition System
 * 
 * Transition Types:
 * - WIPE: Horizontal wipe (default for forward navigation)
 * - SHUTTER: Vertical shutter open/close (for modals/overlays)
 * - SPLIT: Split screen reveal (for major sections)
 * - DROP: Drop down reveal (for menus)
 * - TEAR: Corner tear/peel effect (for dismissal)
 */

const TRANSITION_DURATION = 0.4;
const TRANSITION_EASE = [0.16, 1, 0.3, 1]; // Smooth brutalist easing

// Wipe transition - horizontal slide
const wipeVariants = {
  initial: { 
    x: '100%',
    opacity: 1 
  },
  animate: { 
    x: 0,
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION, 
      ease: TRANSITION_EASE 
    }
  },
  exit: { 
    x: '-100%',
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION, 
      ease: TRANSITION_EASE 
    }
  }
};

// Shutter transition - vertical reveal
const shutterVariants = {
  initial: { 
    clipPath: 'inset(50% 0 50% 0)',
    opacity: 1 
  },
  animate: { 
    clipPath: 'inset(0% 0 0% 0)',
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION * 1.2, 
      ease: TRANSITION_EASE 
    }
  },
  exit: { 
    clipPath: 'inset(50% 0 50% 0)',
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION, 
      ease: TRANSITION_EASE 
    }
  }
};

// Split transition - horizontal split
const splitVariants = {
  initial: { 
    clipPath: 'inset(0 50% 0 50%)',
    opacity: 1 
  },
  animate: { 
    clipPath: 'inset(0 0% 0 0%)',
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION * 1.2, 
      ease: TRANSITION_EASE 
    }
  },
  exit: { 
    clipPath: 'inset(0 50% 0 50%)',
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION, 
      ease: TRANSITION_EASE 
    }
  }
};

// Drop transition - top down
const dropVariants = {
  initial: { 
    y: '-100%',
    opacity: 1 
  },
  animate: { 
    y: 0,
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION, 
      ease: TRANSITION_EASE 
    }
  },
  exit: { 
    y: '100%',
    opacity: 1,
    transition: { 
      duration: TRANSITION_DURATION, 
      ease: TRANSITION_EASE 
    }
  }
};

// Fade transition - simple opacity
const fadeVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const transitionMap = {
  wipe: wipeVariants,
  shutter: shutterVariants,
  split: splitVariants,
  drop: dropVariants,
  fade: fadeVariants,
};

/**
 * PageTransition wrapper - wraps page content with animated transitions
 */
export function PageTransition({ 
  children, 
  type = 'wipe',
  className = '' 
}) {
  const location = useLocation();
  const variants = transitionMap[type] || wipeVariants;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        className={`min-h-screen bg-black ${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * LED Overlay transition - for modals, sheets, panels
 */
export function LEDOverlay({
  isOpen,
  onClose,
  children,
  position = 'right', // right, left, bottom, top, center
  className = ''
}) {
  const getVariants = () => {
    switch (position) {
      case 'right':
        return {
          initial: { x: '100%' },
          animate: { x: 0 },
          exit: { x: '100%' }
        };
      case 'left':
        return {
          initial: { x: '-100%' },
          animate: { x: 0 },
          exit: { x: '-100%' }
        };
      case 'bottom':
        return {
          initial: { y: '100%' },
          animate: { y: 0 },
          exit: { y: '100%' }
        };
      case 'top':
        return {
          initial: { y: '-100%' },
          animate: { y: 0 },
          exit: { y: '-100%' }
        };
      case 'center':
      default:
        return shutterVariants;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-[100]"
          />
          
          {/* Panel */}
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={getVariants()}
            transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
            className={`fixed z-[101] bg-black border-2 border-white ${className} ${
              position === 'right' ? 'right-0 top-0 bottom-0 w-full max-w-md' :
              position === 'left' ? 'left-0 top-0 bottom-0 w-full max-w-md' :
              position === 'bottom' ? 'bottom-0 left-0 right-0 max-h-[90vh]' :
              position === 'top' ? 'top-0 left-0 right-0 max-h-[90vh]' :
              'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg w-[90%]'
            }`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Screen transition overlay - full screen transition effect
 */
export function TransitionOverlay({ 
  isActive, 
  color = '#FF1493',
  direction = 'right' 
}) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ 
            x: direction === 'right' ? '-100%' : '100%' 
          }}
          animate={{ x: 0 }}
          exit={{ 
            x: direction === 'right' ? '100%' : '-100%' 
          }}
          transition={{ 
            duration: TRANSITION_DURATION, 
            ease: TRANSITION_EASE 
          }}
          className="fixed inset-0 z-[200] pointer-events-none"
          style={{ backgroundColor: color }}
        />
      )}
    </AnimatePresence>
  );
}

export default PageTransition;
