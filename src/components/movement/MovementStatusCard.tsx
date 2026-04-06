/**
 * MovementStatusCard — Floating card when user is actively sharing movement
 *
 * ┌──────────────────────────────────────────┐
 * │  → On the way to Soho                   │
 * │  ETA 12 min · Sharing until arrival      │
 * │                          [Stop]          │
 * └──────────────────────────────────────────┘
 *
 * Position: fixed above nav (bottom: 91px), z-50
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useMovementSession } from '@/hooks/useMovementSession';

const AMBER = '#C8962C';

const SHARE_LABELS: Record<string, string> = {
  '15_min': '15 min',
  '30_min': '30 min',
  '60_min': '60 min',
  arrival: 'arrival',
};

export function MovementStatusCard() {
  const { session, isMoving, stopMovement, markArrived } = useMovementSession();

  const handleStop = useCallback(async () => {
    try {
      await stopMovement();
      toast('Movement sharing stopped');
    } catch {
      toast('Failed to stop');
    }
  }, [stopMovement]);

  const handleArrive = useCallback(async () => {
    try {
      await markArrived();
      toast('Marked as arrived');
    } catch {
      toast('Failed to mark arrived');
    }
  }, [markArrived]);

  return (
    <AnimatePresence>
      {isMoving && session && (
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-3 right-3 z-50"
          style={{ bottom: 'calc(91px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'rgba(200,150,44,0.12)',
              border: '1px solid rgba(200,150,44,0.25)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(200,150,44,0.2)' }}
            >
              <Navigation className="w-4 h-4" style={{ color: AMBER }} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                On the way
                {session.destination_label ? ` to ${session.destination_label}` : ''}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                {session.eta_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {session.eta_minutes} min
                  </span>
                )}
                <span>Sharing until {SHARE_LABELS[session.share_until] || 'arrival'}</span>
              </div>
            </div>

            {/* Arrive button */}
            {session.destination_label && (
              <motion.button
                onClick={handleArrive}
                whileTap={{ scale: 0.9 }}
                className="h-8 px-3 rounded-lg text-xs font-bold flex items-center justify-center"
                style={{ backgroundColor: AMBER, color: '#000' }}
                aria-label="Mark as arrived"
              >
                Arrived
              </motion.button>
            )}

            {/* Stop button */}
            <motion.button
              onClick={handleStop}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10"
              aria-label="Stop sharing"
            >
              <X className="w-4 h-4 text-white/60" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MovementStatusCard;
