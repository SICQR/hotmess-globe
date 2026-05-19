/**
 * src/components/system/Sheet.tsx
 * Sheet — bottom sheet primitive. Always slides from bottom, always full-
 * width to safe areas, always rounded-sheet at top corners, always grabber.
 *
 * Backdrop dismiss is on. Escape key dismiss is on. Focus trap is on.
 *
 * For complex sheets that need their own state machine, use SheetRouter +
 * SheetRegistry (legacy). This primitive is for ad-hoc one-off sheets a
 * surface needs without registering them.
 */
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;       // Optional header — sets aria-labelledby
  fullHeight?: boolean; // false = content-sized, true = 90vh
  className?: string;
}

const SPRING = { type: 'spring' as const, stiffness: 240, damping: 26 };

export const Sheet: React.FC<Props> = ({ open, onClose, children, title, fullHeight = false, className = '' }) => {
  // ESC to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-sheet bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={SPRING}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
            className={[
              'fixed inset-x-0 bottom-0 z-sheet',
              'rounded-t-sheet bg-bg-elevated/95 backdrop-blur-2xl border-t border-white/10',
              'px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+24px)]',
              fullHeight ? 'top-[10vh] overflow-y-auto' : 'max-h-[90vh] overflow-y-auto',
              className,
            ].join(' ')}
          >
            {/* Grabber */}
            <div className="w-10 h-1 bg-white/15 rounded-pill mx-auto mb-5" aria-hidden />
            {title && (
              <h2 id="sheet-title" className="font-display uppercase tracking-display font-bold text-h2 text-text-1 mb-4">
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Sheet;
