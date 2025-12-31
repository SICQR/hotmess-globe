import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Enhanced toast notifications with better UX
 */
const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const COLORS = {
  success: { bg: 'bg-[#39FF14]/20', border: 'border-[#39FF14]', text: 'text-[#39FF14]' },
  error: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400' },
  warning: { bg: 'bg-[#FFEB3B]/20', border: 'border-[#FFEB3B]', text: 'text-[#FFEB3B]' },
  info: { bg: 'bg-[#00D9FF]/20', border: 'border-[#00D9FF]', text: 'text-[#00D9FF]' },
};

export default function Toast({ type = 'info', title, message, onClose, duration = 5000 }) {
  const Icon = ICONS[type];
  const colors = COLORS[type];

  React.useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`${colors.bg} ${colors.border} border-2 backdrop-blur-xl p-4 rounded-none shadow-lg max-w-md`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && <div className={`font-bold text-sm uppercase tracking-wide ${colors.text} mb-1`}>{title}</div>}
          {message && <div className="text-white/80 text-sm">{message}</div>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              {...toast}
              onClose={() => onDismiss(toast.id)}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}