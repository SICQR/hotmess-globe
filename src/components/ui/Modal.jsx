import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Unified Modal Component
 * 
 * Standardized modal with consistent styling, animations, and accessibility.
 * Use this for all center modals, dialogs, and confirmations.
 * 
 * @example
 * <Modal open={isOpen} onClose={() => setIsOpen(false)} title="My Modal">
 *   <p>Modal content here</p>
 * </Modal>
 */

// Standard z-index values for modal system
export const MODAL_Z_INDEX = {
  backdrop: 'z-[100]',
  content: 'z-[101]',
  nested: 'z-[110]',
  critical: 'z-[999]', // Age gate, panic button
};

// Standard backdrop styles
const BACKDROP_STYLES = {
  default: 'bg-black/80 backdrop-blur-sm',
  dark: 'bg-black/90 backdrop-blur-md',
  light: 'bg-black/60 backdrop-blur-sm',
};

// Size presets
const SIZE_STYLES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  backdrop = 'default',
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  contentClassName,
  // For nested modals or critical ones
  zIndex = 'default',
}) {
  // Handle escape key
  const handleEscape = useCallback((e) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose?.();
    }
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  const zIndexClass = zIndex === 'critical' ? MODAL_Z_INDEX.critical : 
                      zIndex === 'nested' ? MODAL_Z_INDEX.nested : 
                      MODAL_Z_INDEX.backdrop;

  return (
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0', zIndexClass, className)}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'absolute inset-0',
              BACKDROP_STYLES[backdrop]
            )}
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />

          {/* Content */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'relative w-full bg-black border border-white/10 rounded-xl shadow-2xl pointer-events-auto',
                SIZE_STYLES[size],
                contentClassName
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              aria-describedby={description ? 'modal-description' : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || showClose) && (
                <div className="flex items-start justify-between p-4 pb-0">
                  {title && (
                    <div className="flex-1 pr-4">
                      <h2 
                        id="modal-title" 
                        className="text-xl font-black uppercase tracking-tight"
                      >
                        {title}
                      </h2>
                      {description && (
                        <p 
                          id="modal-description" 
                          className="text-sm text-white/60 mt-1"
                        >
                          {description}
                        </p>
                      )}
                    </div>
                  )}
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-4">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Modal Footer - for action buttons
 */
export function ModalFooter({ children, className }) {
  return (
    <div className={cn(
      'flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-4 -mx-4 px-4',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Confirm Modal - pre-styled for confirmations
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // danger | warning | info | hot
  isLoading = false,
}) {
  const variants = {
    danger: {
      icon: '⚠️',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      borderClass: 'border-red-600/50',
    },
    warning: {
      icon: '⚠️',
      confirmClass: 'bg-yellow-500 hover:bg-yellow-600 text-black',
      borderClass: 'border-yellow-500/50',
    },
    info: {
      icon: 'ℹ️',
      confirmClass: 'bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black',
      borderClass: 'border-[#00D9FF]/50',
    },
    hot: {
      icon: '🔥',
      confirmClass: 'bg-[#FF1493] hover:bg-[#FF1493]/90 text-black',
      borderClass: 'border-[#FF1493]/50',
    },
  };

  const v = variants[variant] || variants.danger;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      showClose={false}
      contentClassName={cn('border-2', v.borderClass)}
    >
      <div className="text-center">
        <div className="text-4xl mb-4">{v.icon}</div>
        <h3 className="text-xl font-black uppercase mb-2">{title}</h3>
        {message && <p className="text-white/70 mb-6">{message}</p>}
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-lg border border-white/20 font-bold uppercase text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'flex-1 py-3 px-4 rounded-lg font-bold uppercase text-sm transition-colors disabled:opacity-50',
              v.confirmClass
            )}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default Modal;
