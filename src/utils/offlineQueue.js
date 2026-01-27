/**
 * Offline Mutation Queue
 * Queues mutations when offline and syncs when connection is restored
 */

const STORAGE_KEY = 'hm_offline_queue';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Queue state
let queue = [];
let isProcessing = false;
let listeners = new Set();

/**
 * Initialize the offline queue from localStorage
 */
export function initOfflineQueue() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      queue = JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[OfflineQueue] Failed to load queue from storage:', e);
    queue = [];
  }

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Listen for service worker sync messages
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
        processQueue();
      }
    });
  }

  // Process queue if we're online and have items
  if (navigator.onLine && queue.length > 0) {
    processQueue();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Handle coming online
 */
function handleOnline() {
  console.log('[OfflineQueue] Back online, processing queue...');
  processQueue();
}

/**
 * Handle going offline
 */
function handleOffline() {
  console.log('[OfflineQueue] Went offline');
  notifyListeners();
}

/**
 * Add a mutation to the queue
 * @param {Object} mutation - The mutation to queue
 * @param {string} mutation.type - Type of mutation (like, message, rsvp, etc)
 * @param {string} mutation.endpoint - API endpoint
 * @param {string} mutation.method - HTTP method
 * @param {Object} mutation.data - Request body
 * @param {Object} [mutation.optimistic] - Optimistic update callback name
 * @returns {string} - Mutation ID
 */
export function queueMutation(mutation) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  
  const queuedMutation = {
    id,
    ...mutation,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  };

  queue.push(queuedMutation);
  saveQueue();
  notifyListeners();

  // Try to process immediately if online
  if (navigator.onLine && !isProcessing) {
    processQueue();
  }

  return id;
}

/**
 * Remove a mutation from the queue
 * @param {string} id - Mutation ID
 */
export function removeMutation(id) {
  queue = queue.filter(m => m.id !== id);
  saveQueue();
  notifyListeners();
}

/**
 * Get the current queue
 * @returns {Array} - Current queue
 */
export function getQueue() {
  return [...queue];
}

/**
 * Get pending mutations count
 * @returns {number}
 */
export function getPendingCount() {
  return queue.filter(m => m.status === 'pending').length;
}

/**
 * Check if there are pending mutations
 * @returns {boolean}
 */
export function hasPendingMutations() {
  return queue.length > 0;
}

/**
 * Subscribe to queue changes
 * @param {Function} callback - Called when queue changes
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToQueue(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Process the queue
 */
async function processQueue() {
  if (isProcessing || !navigator.onLine || queue.length === 0) {
    return;
  }

  isProcessing = true;
  notifyListeners();

  const toProcess = queue.filter(m => m.status === 'pending');

  for (const mutation of toProcess) {
    try {
      mutation.status = 'processing';
      notifyListeners();

      const response = await executeMutation(mutation);
      
      if (response.ok) {
        // Success - remove from queue
        queue = queue.filter(m => m.id !== mutation.id);
        console.log(`[OfflineQueue] Processed mutation ${mutation.id}`);
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry, mark as failed
        mutation.status = 'failed';
        mutation.error = `HTTP ${response.status}`;
        console.warn(`[OfflineQueue] Mutation ${mutation.id} failed:`, mutation.error);
      } else {
        // Server error - retry
        mutation.retries++;
        if (mutation.retries >= MAX_RETRIES) {
          mutation.status = 'failed';
          mutation.error = 'Max retries exceeded';
        } else {
          mutation.status = 'pending';
          await delay(RETRY_DELAY * mutation.retries);
        }
      }
    } catch (error) {
      console.error(`[OfflineQueue] Error processing mutation ${mutation.id}:`, error);
      mutation.retries++;
      if (mutation.retries >= MAX_RETRIES) {
        mutation.status = 'failed';
        mutation.error = error.message;
      } else {
        mutation.status = 'pending';
      }
    }
  }

  isProcessing = false;
  saveQueue();
  notifyListeners();

  // Clean up old failed mutations (older than 24 hours)
  cleanupOldMutations();
}

/**
 * Execute a single mutation
 * @param {Object} mutation
 * @returns {Response}
 */
async function executeMutation(mutation) {
  const { endpoint, method, data, headers = {} } = mutation;

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include',
  });

  return response;
}

/**
 * Save queue to localStorage
 */
function saveQueue() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[OfflineQueue] Failed to save queue:', e);
  }
}

/**
 * Notify all listeners of queue change
 */
function notifyListeners() {
  const state = {
    queue: [...queue],
    isProcessing,
    pendingCount: getPendingCount(),
    isOnline: navigator.onLine,
  };

  listeners.forEach(callback => {
    try {
      callback(state);
    } catch (e) {
      console.warn('[OfflineQueue] Listener error:', e);
    }
  });
}

/**
 * Clean up old failed mutations
 */
function cleanupOldMutations() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
  
  queue = queue.filter(m => {
    if (m.status === 'failed') {
      const createdAt = new Date(m.createdAt).getTime();
      return createdAt > cutoff;
    }
    return true;
  });
  
  saveQueue();
}

/**
 * Utility delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clear the entire queue (for debugging/testing)
 */
export function clearQueue() {
  queue = [];
  saveQueue();
  notifyListeners();
}

/**
 * Retry all failed mutations
 */
export function retryFailed() {
  queue.forEach(m => {
    if (m.status === 'failed') {
      m.status = 'pending';
      m.retries = 0;
      delete m.error;
    }
  });
  saveQueue();
  processQueue();
}

// Export processing state for UI
export function isQueueProcessing() {
  return isProcessing;
}

export function isOnline() {
  return navigator.onLine;
}
