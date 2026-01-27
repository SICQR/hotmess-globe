/**
 * Pending Sync Indicator
 * Shows when there are queued offline mutations waiting to sync
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Button } from './button';

/**
 * Compact indicator for navbar/header
 */
export function PendingSyncBadge() {
  const { pendingCount, isProcessing, isOnline, retryFailed, queue } = useOfflineQueue();
  
  const failedCount = queue.filter(m => m.status === 'failed').length;
  
  if (pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="relative"
      >
        <button
          onClick={failedCount > 0 ? retryFailed : undefined}
          className={`
            p-2 rounded-full transition-colors
            ${isProcessing ? 'bg-yellow-500/20' : 'bg-white/10'}
            ${failedCount > 0 ? 'bg-red-500/20 hover:bg-red-500/30' : ''}
          `}
          title={
            isProcessing
              ? 'Syncing...'
              : failedCount > 0
              ? 'Retry failed syncs'
              : `${pendingCount} pending changes`
          }
        >
          {isProcessing ? (
            <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
          ) : failedCount > 0 ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CloudOff className="w-4 h-4 text-white/60" />
          )}
        </button>
        
        {(pendingCount > 0 || failedCount > 0) && (
          <span className={`
            absolute -top-1 -right-1 text-[10px] font-bold
            min-w-[16px] h-4 rounded-full flex items-center justify-center
            ${failedCount > 0 ? 'bg-red-500' : 'bg-yellow-500'}
            text-black
          `}>
            {failedCount > 0 ? failedCount : pendingCount}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Full sync status panel (for settings or debug)
 */
export function SyncStatusPanel() {
  const { 
    queue, 
    pendingCount, 
    isProcessing, 
    isOnline, 
    clearQueue, 
    retryFailed 
  } = useOfflineQueue();

  const failedMutations = queue.filter(m => m.status === 'failed');
  const pendingMutations = queue.filter(m => m.status === 'pending');
  const processingMutations = queue.filter(m => m.status === 'processing');

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold uppercase tracking-wider text-sm">Sync Status</h3>
        <div className={`flex items-center gap-2 text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Check className="w-4 h-4 text-green-400" />
          All changes synced
        </div>
      ) : (
        <div className="space-y-3">
          {isProcessing && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Syncing {processingMutations.length} change(s)...
            </div>
          )}

          {pendingMutations.length > 0 && (
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <CloudOff className="w-4 h-4" />
              {pendingMutations.length} pending change(s)
            </div>
          )}

          {failedMutations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {failedMutations.length} failed change(s)
              </div>
              <Button 
                onClick={retryFailed}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Retry Failed
              </Button>
            </div>
          )}

          {queue.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={clearQueue}
                className="text-xs text-red-400 hover:text-red-300 underline"
              >
                Clear all pending changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Toast-style notification for sync events
 */
export function SyncToast({ type, count }) {
  const icons = {
    syncing: <RefreshCw className="w-4 h-4 animate-spin" />,
    success: <Check className="w-4 h-4" />,
    failed: <AlertCircle className="w-4 h-4" />,
    queued: <CloudOff className="w-4 h-4" />,
  };

  const colors = {
    syncing: 'bg-yellow-500 text-black',
    success: 'bg-green-500 text-black',
    failed: 'bg-red-500 text-white',
    queued: 'bg-blue-500 text-white',
  };

  const messages = {
    syncing: `Syncing ${count} change(s)...`,
    success: `${count} change(s) synced`,
    failed: `${count} change(s) failed to sync`,
    queued: `${count} change(s) saved for later`,
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-50
        px-4 py-2 rounded-lg shadow-lg
        flex items-center gap-2
        ${colors[type]}
      `}
    >
      {icons[type]}
      <span className="text-sm font-medium">{messages[type]}</span>
    </motion.div>
  );
}

export default PendingSyncIndicator;
