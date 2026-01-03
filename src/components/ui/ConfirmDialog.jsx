import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FocusTrap from '../accessibility/FocusTrap';

/**
 * Confirmation dialog for destructive actions
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // danger | warning | info
  isLoading = false,
}) {
  const colors = {
    danger: { bg: 'bg-red-600', border: 'border-red-600', text: 'text-red-400' },
    warning: { bg: 'bg-[#FFEB3B]', border: 'border-[#FFEB3B]', text: 'text-[#FFEB3B]' },
    info: { bg: 'bg-[#00D9FF]', border: 'border-[#00D9FF]', text: 'text-[#00D9FF]' },
  }[variant];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Dialog */}
        <FocusTrap active={isOpen}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative bg-black border-2 ${colors.border} max-w-md w-full p-6`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-description"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
              <h2 id="dialog-title" className="text-xl font-black uppercase">
                {title}
              </h2>
            </div>

            {message && (
              <p id="dialog-description" className="text-white/80 mb-6">
                {message}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                onClick={onClose}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                onClick={onConfirm}
                className={`${colors.bg} text-black hover:opacity-90 font-black`}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : confirmText}
              </Button>
            </div>
          </motion.div>
        </FocusTrap>
      </div>
    </AnimatePresence>
  );
}