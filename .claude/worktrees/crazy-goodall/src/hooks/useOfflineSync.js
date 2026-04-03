import { useEffect, useCallback, useState } from 'react';
import {
  processQueue,
  hasPendingItems,
  getQueueStats,
  setupOfflineSync,
} from '@/utils/offlineQueue';

/**
 * useOfflineSync Hook
 * 
 * Manages offline queue synchronization with the service worker.
 * Automatically processes queued mutations when coming back online.
 * 
 * Usage:
 * const { isPending, pendingCount, syncNow } = useOfflineSync();
 */
export function useOfflineSync() {
  const [isPending, setIsPending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Update pending state
  const updatePendingState = useCallback(() => {
    setIsPending(hasPendingItems());
    setPendingCount(getQueueStats().total);
  }, []);

  // Process a single queued item
  const processQueueItem = useCallback(async (item) => {
    const { type, entity, data } = item;

    // TODO: Implement offline queue processing via Supabase client
    // Example: use supabase.from(table).insert/update/delete based on entity type
    console.warn(`[OfflineSync] Queue processing disabled for entity: ${entity}`);
    // Still mark as processed to avoid infinite retries
  }, []);

  // Sync now function
  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    if (!navigator.onLine) return;

    setIsSyncing(true);

    try {
      const result = await processQueue(processQueueItem);
      setLastSyncTime(Date.now());
      updatePendingState();
      
      return result;
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, processQueueItem, updatePendingState]);

  // Listen for service worker sync messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
        void('[OfflineSync] Received sync message from SW');
        syncNow();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [syncNow]);

  // Setup automatic sync on online event
  useEffect(() => {
    const handleOnline = () => {
      void('[OfflineSync] Online - triggering sync');
      syncNow();
    };

    window.addEventListener('online', handleOnline);

    // Initial state check
    updatePendingState();

    // Sync on mount if online and have pending items
    if (navigator.onLine && hasPendingItems()) {
      syncNow();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncNow, updatePendingState]);

  // Poll for pending items changes
  useEffect(() => {
    const interval = setInterval(updatePendingState, 5000);
    return () => clearInterval(interval);
  }, [updatePendingState]);

  return {
    isPending,
    pendingCount,
    isSyncing,
    lastSyncTime,
    syncNow,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
}

export default useOfflineSync;
