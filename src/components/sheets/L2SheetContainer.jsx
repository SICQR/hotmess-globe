/**
 * L2SheetContainer — The slide-up sheet wrapper
 * 
 * Features:
 * - 85% viewport height
 * - Backdrop blur over Globe
 * - Swipe-to-dismiss
 * - Keyboard accessible (Escape to close)
 * - Framer Motion animations
 * - Scanner-style border (London OS aesthetic)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X } from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const sheetVariants = {
  hidden: { 
    y: '100%',
    opacity: 0.8,
  },
  visible: { 
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: { 
    y: '100%',
    opacity: 0.8,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
    },
  },
};

// Swipe threshold to close (pixels)
const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 500;

export default function L2SheetContainer({ 
  children, 
  title,
  subtitle,
  className,
  // Optional overrides
  height = '85vh',
  showHandle = true,
  showClose = true,
  onClose: customOnClose,
}) {
  const { isOpen, closeSheet, onAnimationComplete, activeSheet } = useSheet();
  const sheetRef = useRef(null);
  const controls = useAnimation();

  const handleClose = useCallback(() => {
    if (customOnClose) {
      customOnClose();
    } else {
      closeSheet();
    }
  }, [customOnClose, closeSheet]);

  // Keyboard: Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Swipe to dismiss handler
  const handleDragEnd = useCallback((event, info) => {
    const { offset, velocity } = info;
    
    // Close if dragged down past threshold OR with high velocity
    if (offset.y > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
      handleClose();
    } else {
      // Snap back
      controls.start({ y: 0 });
    }
  }, [handleClose, controls]);

  // Click backdrop to close
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[79] bg-black/60 backdrop-blur-[20px]"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            key={`sheet-${activeSheet}`}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            style={{ height }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[80]',
              'bg-black border-t-2 border-x-2 border-[#FF1493]',
              'rounded-none overflow-hidden',
              'flex flex-col',
              // Scanner corner effect - brutalist 0px radius
              'before:absolute before:top-0 before:left-0 before:w-8 before:h-8',
              'before:border-t-2 before:border-l-2 before:border-[#00D9FF]',
              'after:absolute after:top-0 after:right-0 after:w-8 after:h-8',
              'after:border-t-2 after:border-r-2 after:border-[#00D9FF]',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
          >
            {/* Drag handle */}
            {showHandle && (
              <div 
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
                aria-hidden="true"
              >
                <div className="w-12 h-1.5 bg-white/30 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-white/10">
              <div className="flex-1 min-w-0">
                {title && (
                  <h2 
                    id="sheet-title" 
                    className="text-lg font-black uppercase tracking-wider text-white truncate"
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-xs text-white/60 truncate">{subtitle}</p>
                )}
              </div>
              
              {showClose && (
                <button
                  onClick={handleClose}
                  className={cn(
                    'p-2 -mr-2 rounded-lg transition-colors',
                    'text-white/60 hover:text-white hover:bg-white/10',
                    'focus:outline-none focus:ring-2 focus:ring-[#FF1493]'
                  )}
                  aria-label="Close sheet"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              {children}
            </div>

            {/* Safe area padding for iOS */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Sheet Section — for organizing content within sheets
 */
export function SheetSection({ title, children, className }) {
  return (
    <div className={cn('px-4 py-4', className)}>
      {title && (
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

/**
 * Sheet Actions — sticky bottom action bar
 */
export function SheetActions({ children, className }) {
  return (
    <div 
      className={cn(
        'sticky bottom-0 px-4 py-4',
        'bg-black/95 backdrop-blur-lg',
        'border-t border-white/10',
        'flex gap-3',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Sheet Divider
 */
export function SheetDivider() {
  return <div className="h-px bg-white/10 mx-4" />;
}
