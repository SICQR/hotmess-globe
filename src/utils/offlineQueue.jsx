/**
 * Offline Queue Manager
 * 
 * Queues mutations when offline and syncs when back online.
 * Uses localStorage for persistence and Background Sync API when available.
 */

const QUEUE_KEY = 'hotmess_offline_queue';
const SYNC_TAG = 'hotmess-offline-sync';

/**
 * Queue item structure
 * @typedef {Object} QueueItem
 * @property {string} id - Unique identifier
 * @property {string} type - Action type (create, update, delete)
 * @property {string} entity - Entity type (beacon, message, etc.)
 * @property {Object} data - The data to be synced
 * @property {string} timestamp - When the action was queued
 * @property {number} retries - Number of retry attempts
 * @property {string} [error] - Last error message if any
 */

/**
 * Get the current offline queue
 * @returns {QueueItem[]}
 */
export function getQueue() {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

/**
 * Save the queue to storage
 * @param {QueueItem[]} queue
 */
function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[OfflineQueue] Failed to save queue:', error);
  }
}

/**
 * Generate a unique ID for queue items
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add an item to the offline queue
 * @param {Object} item - The item to queue
 * @param {string} item.type - Action type
 * @param {string} item.entity - Entity type
 * @param {Object} item.data - Data to sync
 * @returns {string} The queue item ID
 */
export function enqueue(item) {
  const queue = getQueue();
  
  const queueItem = {
    id: generateId(),
    type: item.type,
    entity: item.entity,
    data: item.data,
    timestamp: new Date().toISOString(),
    retries: 0,
    error: null,
  };
  
  queue.push(queueItem);
  saveQueue(queue);
  
  // Request background sync if available
  requestBackgroundSync();
  
  console.log('[OfflineQueue] Enqueued item:', queueItem.id);
  return queueItem.id;
}

/**
 * Remove an item from the queue
 * @param {string} id - The item ID to remove
 */
export function dequeue(id) {
  const queue = getQueue().filter(item => item.id !== id);
  saveQueue(queue);
  console.log('[OfflineQueue] Dequeued item:', id);
}

/**
 * Update a queue item
 * @param {string} id - The item ID
 * @param {Partial<QueueItem>} updates - Updates to apply
 */
export function updateQueueItem(id, updates) {
  const queue = getQueue().map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
  saveQueue(queue);
}

/**
 * Clear the entire queue
 */
export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
  console.log('[OfflineQueue] Queue cleared');
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const queue = getQueue();
  
  const byEntity = {};
  const byType = {};
  
  for (const item of queue) {
    byEntity[item.entity] = (byEntity[item.entity] || 0) + 1;
    byType[item.type] = (byType[item.type] || 0) + 1;
  }
  
  return {
    total: queue.length,
    byEntity,
    byType,
    oldestItem: queue[0]?.timestamp,
    failedItems: queue.filter(i => i.retries > 0).length,
  };
}

/**
 * Request background sync
 */
async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(SYNC_TAG);
      console.log('[OfflineQueue] Background sync registered');
    } catch (error) {
      console.log('[OfflineQueue] Background sync not available:', error);
    }
  }
}

/**
 * Process the queue
 * @param {Function} processor - Function to process each item
 * @returns {Promise<{success: number, failed: number, remaining: number}>}
 */
export async function processQueue(processor) {
  const queue = getQueue();
  
  if (queue.length === 0) {
    return { success: 0, failed: 0, remaining: 0 };
  }
  
  console.log(`[OfflineQueue] Processing ${queue.length} items...`);
  
  let success = 0;
  let failed = 0;
  
  for (const item of queue) {
    try {
      await processor(item);
      dequeue(item.id);
      success++;
      console.log(`[OfflineQueue] Successfully processed: ${item.id}`);
    } catch (error) {
      failed++;
      
      // Update retry count and error
      updateQueueItem(item.id, {
        retries: item.retries + 1,
        error: error.message,
      });
      
      // Remove if too many retries
      if (item.retries >= 5) {
        console.error(`[OfflineQueue] Max retries reached for: ${item.id}`);
        dequeue(item.id);
      }
    }
  }
  
  const remaining = getQueue().length;
  
  console.log(`[OfflineQueue] Processed: ${success} success, ${failed} failed, ${remaining} remaining`);
  
  return { success, failed, remaining };
}

/**
 * Hook into online event to process queue
 */
export function setupOfflineSync(processor) {
  // Process when coming back online
  window.addEventListener('online', async () => {
    console.log('[OfflineQueue] Online - processing queue...');
    await processQueue(processor);
  });
  
  // Process on load if online
  if (navigator.onLine) {
    processQueue(processor);
  }
}

/**
 * Wrapper for mutations that queues when offline
 * @param {Function} mutationFn - The mutation function to call
 * @param {Object} options - Options for offline handling
 */
export async function withOfflineSupport(mutationFn, options) {
  const { entity, type, data, onQueued } = options;
  
  // If online, execute directly
  if (navigator.onLine) {
    return mutationFn(data);
  }
  
  // If offline, queue the mutation
  const queueId = enqueue({ type, entity, data });
  
  if (onQueued) {
    onQueued(queueId);
  }
  
  // Return a promise that resolves with a pending status
  return {
    queued: true,
    queueId,
    message: 'Action queued for when you\'re back online',
  };
}

/**
 * Check if there are pending items
 */
export function hasPendingItems() {
  return getQueue().length > 0;
}

/**
 * Get pending items for a specific entity
 */
export function getPendingForEntity(entity) {
  return getQueue().filter(item => item.entity === entity);
}

export default {
  getQueue,
  enqueue,
  dequeue,
  updateQueueItem,
  clearQueue,
  getQueueStats,
  processQueue,
  setupOfflineSync,
  withOfflineSupport,
  hasPendingItems,
  getPendingForEntity,
};
