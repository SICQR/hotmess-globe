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
import { motion, AnimatePresence, useAnimation, useDragControls } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useSheet } from '@/contexts/SheetContext';
import { useLocalPullToRefresh } from '@/hooks/useLocalPullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';

import { cn } from '@/lib/utils';
import { hapticPattern, hapticSnap } from '@/lib/haptics';

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
      damping: 22,
      stiffness: 400,
      mass: 0.8,
    },
  },
  exit: {
    y: '100%',
    opacity: 0.8,
    transition: {
      type: 'spring',
      damping: 22,
      stiffness: 400,
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
  height = '78vh',
  showHandle = true,
  showClose = true,
  onClose: customOnClose,
  // Phil exec direction 2026-05-13: profile (and other photo-led) sheets
  // had ~92px of dead chrome at the top before the photo started (48px
  // drag-handle bar + 44px PROFILE title row). `bareTop` collapses that
  // into a 14px slim drag pip — no title row, no close-button row, no
  // border — so the photo region lives right under the safe-area inset.
  // The sheet itself supplies its own back-button + more-menu overlays.
  bareTop = false,
}) {
  const { isOpen, closeSheet, onAnimationComplete, activeSheet } = useSheet();
  const sheetRef = useRef(null);
  const controls = useAnimation();

  // Fire the entrance animation when the sheet opens. `drag="y"` on the
  // motion.div takes over y-axis transforms, so the static
  // `animate="visible"` variant prop is silently ignored and the sheet
  // stays at initial=hidden (translateY 100% / opacity 0.8). Driving
  // animation through the controller is the framer-motion supported
  // pattern when drag is enabled. Phil 2026-05-27: sheets stuck below
  // viewport after PR #504 — this restores the controller binding.
  useEffect(() => {
    if (!isOpen) return;
    controls.start('visible');
  }, [isOpen, controls]);
  const dragControls = useDragControls();
  const queryClient = useQueryClient();
  const sheetScrollRef = useRef(null);
  const handleSheetRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  
  const { pullDistance, isRefreshing } = useLocalPullToRefresh({
    onRefresh: handleSheetRefresh,
    scrollRef: sheetScrollRef,
  });


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

  // Swipe to dismiss handler — velocity-weighted scoring
  const handleDragEnd = useCallback((event, info) => {
    const { offset, velocity } = info;

    // Velocity-weighted dismiss score
    const dismissScore = offset.y + (velocity.y * 0.05);

    if (dismissScore > SWIPE_THRESHOLD || velocity.y > VELOCITY_THRESHOLD) {
      hapticPattern();
      handleClose();
    } else {
      // Snap back — framer's dragConstraints (top:0, bottom:0) + dragElastic
      // already spring the sheet back to y:0 on release. The haptic still fires.
      hapticSnap();
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
            // animate is driven by `controls` below (drag-y conflicts with
            // static variant-driven animate). The isOpen useEffect kicks
            // `controls.start('visible')` on open and 'exit' on close.
            exit="exit"
            // Drag config — outer sheet is what slides, not the handle pip.
            // dragControls.start(e) is called from the handle's onPointerDown
            // so the handle is the ONLY initiation surface; body content still
            // scrolls normally. dragListener=false prevents body taps from
            // starting a drag. dragElastic top=0 so users can't pull UP.
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            // `drag="y"` claims the y-axis transform, so the variant-driven
            // `animate="visible"` (which sets y:0) is silently ignored — the
            // sheet would sit at initial=hidden (translateY 100%) forever.
            // Fix: bind a useAnimation controller and call `controls.start('visible')`
            // in the isOpen effect below. The controller owns y; the drag layer
            // takes over during interaction; snap-back returns to controller's
            // last value. PR #504 removed this binding to fix the duplicate-animate
            // bug — but the right fix is to keep the controller and remove the
            // variant `animate=`. Phil 2026-05-27: sheets reopened broken after #504.
            animate={controls}
            style={{ height, overflowX: 'hidden' }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[80]',
              'bg-black border-t-2 border-x-2 border-[#C8962C]',
              'rounded-none overflow-hidden',
              'flex flex-col',
              // Scanner corner effect - brutalist 0px radius
              'before:absolute before:top-0 before:left-0 before:w-8 before:h-8',
              'before:border-t-2 before:border-l-2 before:border-[#C8962C]/60',
              'after:absolute after:top-0 after:right-0 after:w-8 after:h-8',
              'after:border-t-2 after:border-r-2 after:border-[#C8962C]/60',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
          >
            {/* Drag handle — slim 14px pip when bareTop, otherwise the full
                48px tap zone with title row underneath. */}
            {showHandle && (
              <motion.div
                className={cn(
                  'flex justify-center cursor-grab active:cursor-grabbing touch-none',
                  bareTop ? 'py-3' : 'py-3'
                )}
                aria-hidden="true"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ minHeight: bareTop ? 36 : 48, touchAction: 'none' }}
              >
                <div className={cn(
                  'rounded-full',
                  bareTop ? 'w-10 h-[3px] bg-white/22' : 'w-16 h-1.5 bg-white/30'
                )} />
              </motion.div>
            )}

            {/* Header — collapsed in bareTop mode. The host sheet supplies
                its own header chrome (back button, more menu, close). */}
            {!bareTop && (
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

                {/* Close X removed — pull-down handle + swipe-to-dismiss + backdrop tap
                    + Escape are the dismissal pattern (no redundant X). */}
              </div>
            )}

            {/* Content */}
            <div
              ref={sheetScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden scroll-momentum touch-pan-y"
            >
              <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

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

