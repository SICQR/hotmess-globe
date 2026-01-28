import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CloudOff } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

/**
 * PendingSyncBadge - Shows a badge when there are pending offline operations
 * 
 * Displays a small indicator that pulses when there are queued mutations
 * waiting to sync to the server.
 */
export function PendingSyncBadge() {
  const { isPending, pendingCount, isSyncing } = useOfflineSync();

  return (
    <AnimatePresence>
      {isPending && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="relative"
          title={`${pendingCount} pending ${pendingCount === 1 ? 'change' : 'changes'}`}
        >
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500 rounded-full">
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 text-yellow-500 animate-spin" />
            ) : (
              <CloudOff className="w-3 h-3 text-yellow-500" />
            )}
            <span className="text-[10px] font-bold text-yellow-500">{pendingCount}</span>
          </div>
          
          {/* Pulse animation when not syncing */}
          {!isSyncing && (
            <motion.div
              className="absolute inset-0 bg-yellow-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * PendingSyncIndicator - Full offline sync status indicator
 * 
 * Shows a more detailed view of offline sync status, typically used
 * in headers or status bars.
 */
export default function PendingSyncIndicator() {
  const { isPending, pendingCount, isSyncing, isOnline } = useOfflineSync();

  return (
    <AnimatePresence>
      {(isPending || !isOnline) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/30"
        >
          <div className="flex items-center justify-center gap-2 text-yellow-500">
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-xs font-bold uppercase">Syncing {pendingCount} {pendingCount === 1 ? 'change' : 'changes'}...</span>
              </>
            ) : (
              <>
                <CloudOff className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">
                  {isOnline 
                    ? `${pendingCount} ${pendingCount === 1 ? 'change' : 'changes'} pending`
                    : 'Offline - changes will sync later'
                  }
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
