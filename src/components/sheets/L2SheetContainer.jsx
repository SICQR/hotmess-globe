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

  // Desktop: render L2 sheets as centred modals instead of mobile bottom-sheets
  // (which floated as a phone-width strip in black on wide screens). Mobile keeps
  // the exact bottom-sheet drag behaviour.
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const sheetScrollRef = useRef(null);
  // Phil 2026-06-02 #556 — handoff context for nested-scrollable → sheet-drag.
  // When the inner content has its own overflow-y scroll (chat messages list,
  // inbox cells, etc.), browser claims the touch for vertical pan and the
  // framer-motion drag never fires from inside that scrollable. This ref
  // records the touch origin + the discovered scrollable so the onTouchMove
  // handler below can hand off to dragControls.start once the scrollable is
  // at scrollTop=0 and the user keeps pulling down.
  const scrollHandoffRef = useRef(null);

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
      //
      // Phil 2026-06-02 #367 fix — previous logic required dy > peekOffset + 120
      // OR vy > 750 to dismiss from expanded. For sheets where peek and
      // expanded are nearly identical (chat peekFraction: 0.92, peekOffset ~40),
      // dismiss needed 160px of drag while collapse-to-peek triggered at 20px.
      // Every user dismiss attempt got intercepted as collapse-to-peek and the
      // sheet "slid back up". Now dismiss uses the same threshold as from peek:
      // DISMISS_OFFSET (120) OR VELOCITY_FLICK (500). Predictable, one rule.
      if (dy > DISMISS_OFFSET || vy > VELOCITY_FLICK) {
        hapticPattern();
        handleClose();
        return;
      }
      // Collapse to peek only if there's a meaningful peek state to collapse
      // INTO. If peekOffset is smaller than EXPAND_OFFSET, peek and expanded
      // are visually indistinct — collapsing would feel like nothing happened.
      // Skip this branch and snap back to expanded instead.
      if (peekOffset >= EXPAND_OFFSET && (dy > peekOffset / 2 || vy > VELOCITY_FLICK / 2)) {
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
              animate="visible" (broken because drag={isDesktop ? false : 'y'} claims y-axis) and
              also variants + animate={isDesktop ? { opacity: 1, scale: 1 } : controls} (broken because controls weren't
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
            initial={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : controls}
            exit={isDesktop ? { opacity: 0, scale: 0.96 } : { y: '100%', transition: { type: 'spring', damping: 26, stiffness: 320 } }}
            // Drag config — outer sheet is what slides, not the handle pip.
            // top: -peekOffset lets the user drag UP from peek to expanded (and
            //   no further — the expanded snap is the ceiling).
            // bottom: peekOffset + DISMISS_OFFSET gives a soft elastic floor
            //   before the dismiss handler picks up beyond it.
            drag={isDesktop ? false : 'y'}
            dragControls={dragControls}
            // Phil 2026-06-02 #555 — was false (drag only via pip pointerDown).
            // Chat sheet's internal header is below the pip; users dragging
            // there got no response. true → drag fires from anywhere; inner
            // scroll's touch-pan-y arbitrates (scroll at non-top, drag at top).
            dragListener={true}
            dragConstraints={{ top: 0, bottom: viewportH }}
            dragElastic={{ top: 0.04, bottom: 0.35 }}
            onDragEnd={handleDragEnd}
            style={isDesktop ? { overflowX: 'hidden' } : { height, overflowX: 'hidden', overscrollBehavior: 'contain', touchAction: 'pan-y' }}
            className={cn(
              // 2026-05-30 — desktop max-width cap. L2 sheets are mobile UX.
              // On wide viewports they were rendering full-width which made
              // photo carousels and content cards stretch grotesquely. Cap
              // at 430px (slightly above iPhone Pro Max 428px) and center.
              isDesktop
                ? 'fixed inset-0 m-auto h-fit max-h-[85vh] w-[calc(100%-3rem)] max-w-[480px] z-[80] bg-black border border-[#C8962C]/40 rounded-3xl'
                : 'fixed bottom-0 left-0 right-0 z-[80] mx-auto sm:max-w-[460px] bg-black border-t border-[#C8962C]/40 rounded-t-3xl',
              // Phil 2026-05-29 — unified rounded-top across all L2 sheets.
              // The previous `rounded-none` + brutalist scanner-corner pseudo
              // elements made the sheet feel like a kiosk, not a peek card.
              // Doctrine 13 (Spatial Continuity): the sheet is a continuation
              // of the city, not a hardware terminal — softer top corners
              // read more atmospheric and match the rest of the app.
              'overflow-hidden',
              'flex flex-col',
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
                style={{ minHeight: bareTop ? 36 : 72, touchAction: 'none' }}
              >
                <div className={cn(
                  'rounded-full',
                  // Phil 2026-06-02 #555 — bumped non-bareTop pip from w-16 h-1.5
                  // to w-20 h-2 so the drag affordance is unambiguous.
                  bareTop ? 'w-10 h-[3px] bg-white/22' : 'w-20 h-2 bg-white/40'
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

            {/* Content
                Phil 2026-06-02 #556 — touch handoff. The chat sheet (and any
                sheet with an internal overflow-y-auto scrollable) nests scroll
                inside this wrapper. With touchAction:'pan-y' on the motion.div
                the browser claims vertical pan for the nested scroll and the
                framer-motion drag never fires. The onTouch* handlers below
                walk up from the touch target to find the nearest scrollable
                ancestor (within this wrapper), record its scrollTop at touch
                start, and when the gesture is "pull-down while at scrollTop=0"
                they explicitly hand off to dragControls.start so the sheet's
                normal drag-to-dismiss/snap machinery takes over the rest of
                the gesture. Threshold of 10px tolerates jitter without
                stealing legitimate scroll attempts. */}
            <div
              ref={sheetScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden scroll-momentum touch-pan-y"
              onTouchStart={(e) => {
                let el = e.target;
                const root = sheetScrollRef.current?.parentElement || null;
                let scrollable = null;
                while (el && el !== root) {
                  if (el instanceof HTMLElement) {
                    const style = window.getComputedStyle(el);
                    const oy = style.overflowY;
                    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
                      scrollable = el;
                      break;
                    }
                  }
                  el = el.parentElement;
                }
                scrollHandoffRef.current = {
                  y: e.touches[0].clientY,
                  x: e.touches[0].clientX,
                  scrollable,
                  scrollTop: scrollable?.scrollTop ?? 0,
                  handed: false,
                };
              }}
              onTouchMove={(e) => {
                const ctx = scrollHandoffRef.current;
                if (!ctx || ctx.handed) return;
                const dy = e.touches[0].clientY - ctx.y;
                const dx = Math.abs(e.touches[0].clientX - ctx.x);
                // Ignore primarily-horizontal gestures (carousels, etc.)
                if (dx > Math.abs(dy)) return;
                const currentTop = ctx.scrollable?.scrollTop ?? 0;
                const atTop = !ctx.scrollable || (ctx.scrollTop <= 0 && currentTop <= 0);
                if (atTop && dy > 10) {
                  ctx.handed = true;
                  try { dragControls.start(e.nativeEvent); } catch (_) {}
                }
              }}
              onTouchEnd={() => { scrollHandoffRef.current = null; }}
              onTouchCancel={() => { scrollHandoffRef.current = null; }}
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





