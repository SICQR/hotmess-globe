import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CornerTear } from './SwipeHandler';

/**
 * LUX BRUTALIST Modal System
 * 
 * Features:
 * - Shutter/split entrance animations
 * - Corner tear to dismiss
 * - Full-bleed design with no rounded corners
 * - LED accent borders
 */

const TRANSITION_DURATION = 0.4;
const TRANSITION_EASE = [0.16, 1, 0.3, 1];

export function LuxModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'default', // 'default', 'full', 'sheet'
  showCornerTear = true,
  accentColor = '#FF1493',
}) {
  const modalRef = useRef(null);

  // Lock body scroll when modal is open
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

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const sizeClasses = {
    default: 'max-w-lg w-[95%] max-h-[85vh]',
    full: 'w-full h-full',
    sheet: 'w-full max-h-[90vh] rounded-none',
  };

  const getAnimation = () => {
    if (size === 'sheet') {
      return {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
      };
    }
    // Shutter effect for default/full
    return {
      initial: { clipPath: 'inset(50% 0 50% 0)' },
      animate: { clipPath: 'inset(0% 0 0% 0)' },
      exit: { clipPath: 'inset(50% 0 50% 0)' },
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            {...getAnimation()}
            transition={{ duration: TRANSITION_DURATION, ease: TRANSITION_EASE }}
            className={`
              relative bg-black border-2 overflow-hidden
              ${sizeClasses[size]}
              ${size === 'sheet' ? 'fixed bottom-0' : ''}
            `}
            style={{ borderColor: accentColor }}
          >
            {/* LED glow effect */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `inset 0 0 60px ${accentColor}20, 0 0 40px ${accentColor}40`,
              }}
            />

            {/* Header */}
            <div className="relative border-b-2 border-white/20 p-4 md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  {title && (
                    <h2 className="font-mono text-lg md:text-xl font-bold uppercase tracking-wider text-white">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="font-mono text-xs text-white/50 uppercase tracking-wider mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="p-2 border-2 border-white/20 hover:border-white hover:bg-white hover:text-black transition-all"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative overflow-y-auto p-4 md:p-6" style={{ maxHeight: 'calc(85vh - 100px)' }}>
              {children}
            </div>

            {/* Corner tear to dismiss */}
            {showCornerTear && (
              <CornerTear 
                position="bottom-right"
                onTear={onClose}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * LUX Confirmation Dialog
 * Simple yes/no dialog with brutal styling
 */
export function LuxConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'CONFIRM',
  cancelText = 'CANCEL',
  variant = 'default', // 'default', 'danger'
}) {
  const accentColor = variant === 'danger' ? '#FF3333' : '#FF1493';

  return (
    <LuxModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="default"
      showCornerTear={false}
      accentColor={accentColor}
    >
      <div className="space-y-6">
        <p className="font-mono text-sm text-white/80 uppercase tracking-wider leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 border-2 border-white/30 text-white font-mono text-sm uppercase tracking-wider hover:border-white hover:bg-white hover:text-black transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-4 border-2 text-white font-mono text-sm uppercase tracking-wider font-bold transition-all"
            style={{
              borderColor: accentColor,
              backgroundColor: `${accentColor}20`,
              boxShadow: `0 0 20px ${accentColor}40`,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </LuxModal>
  );
}

/**
 * LUX Action Sheet
 * Bottom sheet with action options
 */
export function LuxActionSheet({
  isOpen,
  onClose,
  title,
  actions = [],
}) {
  return (
    <LuxModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sheet"
      showCornerTear={true}
    >
      <div className="space-y-2 pb-4">
        {actions.map((action, index) => (
          <button
            key={action.id || index}
            onClick={() => {
              action.onClick?.();
              if (!action.keepOpen) onClose();
            }}
            disabled={action.disabled}
            className={`
              w-full py-4 px-4 text-left
              border-2 font-mono text-sm uppercase tracking-wider
              transition-all
              ${action.variant === 'danger' 
                ? 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500' 
                : action.variant === 'primary'
                  ? 'border-[#FF1493] text-white bg-[#FF1493]/10 hover:bg-[#FF1493]/20'
                  : 'border-white/20 text-white/80 hover:border-white/40 hover:bg-white/5'
              }
              ${action.disabled ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            <span className="flex items-center gap-3">
              {action.icon && <span className="text-base">{action.icon}</span>}
              <span>{action.label}</span>
            </span>
          </button>
        ))}
      </div>
    </LuxModal>
  );
}

/**
 * LUX Toast Notification
 * Brief feedback messages with brutal styling
 */
export function LuxToast({
  isVisible,
  message,
  type = 'default', // 'default', 'success', 'error'
  onDismiss,
  duration = 3000,
}) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onDismiss]);

  const typeStyles = {
    default: 'border-white/40',
    success: 'border-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.4)]',
    error: 'border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.4)]',
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`
            fixed bottom-24 left-1/2 -translate-x-1/2 z-[300]
            px-6 py-4 bg-black border-2
            font-mono text-sm uppercase tracking-wider text-white
            ${typeStyles[type]}
          `}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LuxModal;
