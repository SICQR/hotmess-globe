/**
 * React Hook for Offline Queue
 * Provides easy access to offline queue functionality in components
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initOfflineQueue,
  queueMutation,
  removeMutation,
  getQueue,
  getPendingCount,
  hasPendingMutations,
  subscribeToQueue,
  clearQueue,
  retryFailed,
  isQueueProcessing,
  isOnline as getIsOnline,
} from '@/utils/offlineQueue';

let initialized = false;

/**
 * Hook to access offline queue state and methods
 */
export function useOfflineQueue() {
  const [state, setState] = useState({
    queue: [],
    isProcessing: false,
    pendingCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  useEffect(() => {
    // Initialize queue once
    if (!initialized) {
      initOfflineQueue();
      initialized = true;
    }

    // Update initial state
    setState({
      queue: getQueue(),
      isProcessing: isQueueProcessing(),
      pendingCount: getPendingCount(),
      isOnline: getIsOnline(),
    });

    // Subscribe to changes
    const unsubscribe = subscribeToQueue((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return {
    ...state,
    queueMutation,
    removeMutation,
    clearQueue,
    retryFailed,
    hasPendingMutations: state.queue.length > 0,
  };
}

/**
 * Hook for offline-aware mutations
 * Automatically queues mutations when offline
 */
export function useOfflineMutation(options = {}) {
  const { queue, isOnline, queueMutation: addToQueue } = useOfflineQueue();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (mutationConfig) => {
    const { 
      endpoint, 
      method = 'POST', 
      data, 
      headers,
      optimisticUpdate,
      onSuccess,
      onError,
    } = mutationConfig;

    setIsPending(true);
    setError(null);

    // Apply optimistic update immediately
    if (optimisticUpdate) {
      optimisticUpdate();
    }

    if (!isOnline) {
      // Queue for later
      const id = addToQueue({
        type: options.type || 'mutation',
        endpoint,
        method,
        data,
        headers,
      });

      setIsPending(false);
      return { queued: true, id };
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json().catch(() => ({}));
      
      if (onSuccess) {
        onSuccess(result);
      }

      setIsPending(false);
      return { success: true, data: result };
    } catch (err) {
      setError(err);
      setIsPending(false);

      // If offline or network error, queue for retry
      if (!navigator.onLine || err.name === 'TypeError') {
        const id = addToQueue({
          type: options.type || 'mutation',
          endpoint,
          method,
          data,
          headers,
        });
        return { queued: true, id };
      }

      if (onError) {
        onError(err);
      }

      return { error: err };
    }
  }, [isOnline, addToQueue, options.type]);

  return { mutate, isPending, error };
}

/**
 * Hook to check online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useOfflineQueue;
