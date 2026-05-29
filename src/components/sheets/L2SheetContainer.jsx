/**
 * L2SheetContainer — The slide-up sheet wrapper.
 *
 * Peek + expand contract (Phil locked 2026-05-29).
 *
 * Every L2 sheet opens at a half-screen PEEK by default. Users can drag the
 * sheet up to EXPAND to ~90dvh. Drag down past the peek floor dismisses.
 * Backdrop tap, Escape, and drag-down all dismiss. No X close button — drag
 * gestures are the reverse action (matches the app-wide audit #82, #88).
 *
 * Snap points:
 *   PEEK     — sheet shows the bottom 50dvh. The default open state.
 *   EXPANDED — sheet shows the bottom 90dvh. Drag up beyond ~peek/2 + velocity
 *              snaps here. Drag down (from expanded) collapses to peek.
 *   DISMISS  — sheet animates fully offscreen. Drag down past peek + threshold
 *              or velocity dismisses; backdrop tap, Escape, and the dismiss
 *              callbacks all reach the same end state.
 *
 * Implementation: the motion.div is always rendered at the EXPANDED height
 * (90dvh). Visual peek is a translateY offset of (EXPANDED - PEEK) dvh —
 * essentially we "slide the expanded sheet up" to reveal only the peek
 * portion. Dragging modifies translateY; on release we snap to the nearest
 * sensible target.
 *
 * Backward compat: the `height` prop still exists but is treated as the
 * EXPANDED max. `peekFraction` lets a sheet override the peek default.
 * `expandable={false}` collapses behaviour into a single fixed-peek sheet
 * (no drag-to-expand) for sheets that don't have additional content to show.
 */

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation, useDragControls } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';

import { cn } from '@/lib/utils';
import { hapticPattern, hapticSnap } from '@/lib/haptics';

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Snap geometry — fractions of the viewport.
const PEEK_FRAC = 0.50;       // sheet shows bottom 50dvh at peek (Phil 2026-05-29)
const EXPANDED_FRAC = 0.90;   // sheet shows bottom 90dvh when expanded

// Drag thresholds (pixels / px·s⁻¹).
const DISMISS_OFFSET = 120;   // drag-down from peek past this = dismiss
const EXPAND_OFFSET  = 80;    // drag-up from peek past this = expand
const VELOCITY_FLICK = 500;   // velocity at which a small offset still triggers a snap

export default function L2SheetContainer({
  children,
  title,
  subtitle,
  className,
  // Optional overrides — see contract comment at top of file.
  // `height` now means "expanded max height" (default 90dvh) — sheets that
  // pass a smaller value get a smaller expanded ceiling. Peek baseline is
  // controlled by `peekFraction` (default 50% of viewport).
  height = `${EXPANDED_FRAC * 100}dvh`,
  peekFraction = PEEK_FRAC,
  // Default: every sheet IS expandable. The drag-up gesture is always
  // available unless the host explicitly opts out (e.g. directions confirm
  // — single-purpose sheets where there's nothing more to reveal).
  expandable = true,
  showHandle = true,
  // showClose is retained for back-compat but the system no longer renders
  // an X close. Sheets that need a non-drag dismissal should call closeSheet
  // from their own content (back chevron etc).
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
  const dragControls = useDragControls();
  const sheetScrollRef = useRef(null);

  // Resting snap targets in pixels. Computed once per open from the live
  // viewport height; recomputed on resize to keep the geometry honest when
  // the address bar shrinks/grows on iOS.
  const [viewportH, setViewportH] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 0));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const peekOffset = useMemo(
    () => Math.max(0, viewportH * (EXPANDED_FRAC - peekFraction)),
    [viewportH, peekFraction]
  );

  // Snap state — 'peek' (default), 'expanded' (user dragged up).
  const [snap, setSnap] = useState('peek');

  // Fire entrance animation: slide in from offscreen to peek translateY.
  // Each time the sheet opens we reset to peek.
  useEffect(() => {
    if (!isOpen) return;
    setSnap('peek');
    controls.start({ y: peekOffset, transition: { type: 'spring', damping: 26, stiffness: 320, mass: 0.85 } });
  }, [isOpen, controls, peekOffset]);

  const handleClose = useCallback(() => {
    if (customOnClose) {
      customOnClose();
    } else {
      closeSheet();
    }
  }, [customOnClose, closeSheet]);

  // Keyboard: Escape to close (collapse-to-peek-then-close would feel laggy
  // for keyboard users; Escape is a single decisive dismiss).
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll when sheet is open + prevent overscroll bubbling to Safari
  // pull-to-refresh (#253 Phil 2026-05-28). html, body has
  // `overscroll-behavior-y: auto` set globally to enable PWA pull-to-refresh
  // on the main app, but this means sheet drag bleeds to the page when the
  // drag gesture isn't fully captured. Toggling overscroll-behavior-y to
  // 'contain' on body while a sheet is open kills the bleed without removing
  // the feature elsewhere.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehaviorY = 'contain';
      document.documentElement.style.overscrollBehaviorY = 'contain';
    } else {
      document.body.style.overflow = '';
      document.body.style.overscrollBehaviorY = '';
      document.documentElement.style.overscrollBehaviorY = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehaviorY = '';
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, [isOpen]);

  // Drag-end logic — interpret offset + velocity relative to current snap.
  //
  //   At PEEK (rest y = peekOffset)
  //     drag up   (offset.y < -EXPAND_OFFSET, or velocity.y < -VELOCITY_FLICK)  → expand
  //     drag down (offset.y >  DISMISS_OFFSET, or velocity.y >  VELOCITY_FLICK) → dismiss
  //     else                                                                    → snap back to peek
  //
  //   At EXPANDED (rest y = 0)
  //     drag down halfway (offset.y > peekOffset/2) → collapse to peek
  //     drag down past peek+DISMISS                  → dismiss
  //     drag up (no-op)                              → stay expanded
  //     else                                         → snap back to expanded
  const handleDragEnd = useCallback((_event, info) => {
    const { offset, velocity } = info;
    const dy = offset.y;
    const vy = velocity.y;

    if (snap === 'peek') {
      // Dismiss?
      if (dy > DISMISS_OFFSET || vy > VELOCITY_FLICK) {
        hapticPattern();
        handleClose();
        return;
      }
      // Expand?
      if (expandable && (dy < -EXPAND_OFFSET || vy < -VELOCITY_FLICK)) {
        setSnap('expanded');
        hapticSnap();
        controls.start({ y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } });
        return;
      }
      // Snap back to peek.
      controls.start({ y: peekOffset, transition: { type: 'spring', damping: 28, stiffness: 320 } });
    } else {
      // Currently expanded.
      // Past peek into dismiss territory?
      if (dy > peekOffset + DISMISS_OFFSET || vy > VELOCITY_FLICK * 1.5) {
        hapticPattern();
        handleClose();
        return;
      }
      // Collapsed past halfway?
      if (dy > peekOffset / 2 || vy > VELOCITY_FLICK) {
        setSnap('peek');
        hapticSnap();
        controls.start({ y: peekOffset, transition: { type: 'spring', damping: 28, stiffness: 320 } });
        return;
      }
      // Snap back to expanded.
      controls.start({ y: 0, transition: { type: 'spring', damping: 28, stiffness: 320 } });
    }
  }, [snap, peekOffset, expandable, controls, handleClose]);

  // Click backdrop to close — always dismisses, regardless of snap.
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

          {/* Sheet — static initial/animate/exit objects. We tried variants +
              animate="visible" (broken because drag="y" claims y-axis) and
              also variants + animate={controls} (broken because controls weren't
              firing reliably with AnimatePresence mode="wait"). Static object
              animate is the framer-motion pattern that actually works with drag
              enabled: the spring runs to the explicit target on mount, then drag
              handles take over during interaction, then dragConstraints + spring
              snap-back return to {y:0} on release. Phil 2026-05-27 — sheet has
              been stuck below the viewport for three iterations; this is the
              final shape. */}
          <motion.div
            ref={sheetRef}
            key={`sheet-${activeSheet}`}
            initial={{ y: '100%' }}
            animate={controls}
            exit={{ y: '100%', transition: { type: 'spring', damping: 26, stiffness: 320 } }}
            // Drag config — outer sheet is what slides, not the handle pip.
            // top: -peekOffset lets the user drag UP from peek to expanded (and
            //   no further — the expanded snap is the ceiling).
            // bottom: peekOffset + DISMISS_OFFSET gives a soft elastic floor
            //   before the dismiss handler picks up beyond it.
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: viewportH }}
            dragElastic={{ top: 0.04, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            style={{ height, overflowX: 'hidden', overscrollBehavior: 'contain', touchAction: 'pan-y' }}
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
              <div
                className="flex items-center justify-between px-4 pb-3 border-b border-white/10 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ touchAction: 'none' }}
              >
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




