/**
 * IndexedDB Offline Cache
 * 
 * Provides persistent caching for offline-first functionality.
 * Caches user data, messages, events, and other entities for offline viewing.
 */

const DB_NAME = 'hotmess_offline_cache';
const DB_VERSION = 1;

// Store names
const STORES = {
  PROFILE: 'profile',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  EVENTS: 'events',
  PRODUCTS: 'products',
  METADATA: 'metadata',
};

let db = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineCache] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[OfflineCache] Database initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create object stores
      if (!database.objectStoreNames.contains(STORES.PROFILE)) {
        database.createObjectStore(STORES.PROFILE, { keyPath: 'email' });
      }

      if (!database.objectStoreNames.contains(STORES.MESSAGES)) {
        const messageStore = database.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
        messageStore.createIndex('conversation_id', 'conversation_id', { unique: false });
        messageStore.createIndex('created_at', 'created_at', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.CONVERSATIONS)) {
        const convStore = database.createObjectStore(STORES.CONVERSATIONS, { keyPath: 'id' });
        convStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.EVENTS)) {
        const eventStore = database.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventStore.createIndex('start_date', 'start_date', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
        database.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.METADATA)) {
        database.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }

      console.log('[OfflineCache] Database schema created');
    };
  });
}

/**
 * Get a store for a transaction
 * @param {string} storeName - Store name
 * @param {string} mode - 'readonly' or 'readwrite'
 * @returns {Promise<IDBObjectStore>}
 */
async function getStore(storeName, mode = 'readonly') {
  const database = await initDB();
  const transaction = database.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

/**
 * Generic put operation
 * @param {string} storeName - Store name
 * @param {Object} data - Data to store
 * @returns {Promise<void>}
 */
async function put(storeName, data) {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readwrite');
      const request = store.put({
        ...data,
        _cachedAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generic get operation
 * @param {string} storeName - Store name
 * @param {string} key - Key to retrieve
 * @returns {Promise<Object|null>}
 */
async function get(storeName, key) {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readonly');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generic get all operation
 * @param {string} storeName - Store name
 * @param {number} limit - Maximum items to retrieve
 * @returns {Promise<Array>}
 */
async function getAll(storeName, limit = 100) {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readonly');
      const request = store.getAll(null, limit);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generic delete operation
 * @param {string} storeName - Store name
 * @param {string} key - Key to delete
 * @returns {Promise<void>}
 */
export async function remove(storeName, key) {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readwrite');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Remove a cached message
 * @param {string} messageId - Message ID
 */
export async function removeCachedMessage(messageId) {
  try {
    await remove(STORES.MESSAGES, messageId);
  } catch (error) {
    console.error('[OfflineCache] Failed to remove message:', error);
  }
}

/**
 * Remove a cached event
 * @param {string} eventId - Event ID
 */
export async function removeCachedEvent(eventId) {
  try {
    await remove(STORES.EVENTS, eventId);
  } catch (error) {
    console.error('[OfflineCache] Failed to remove event:', error);
  }
}

/**
 * Remove a cached product
 * @param {string} productId - Product ID
 */
export async function removeCachedProduct(productId) {
  try {
    await remove(STORES.PRODUCTS, productId);
  } catch (error) {
    console.error('[OfflineCache] Failed to remove product:', error);
  }
}

/**
 * Clear a store
 * @param {string} storeName - Store name
 * @returns {Promise<void>}
 */
async function clear(storeName) {
  return new Promise(async (resolve, reject) => {
    try {
      const store = await getStore(storeName, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// Profile Cache
// ============================================================================

/**
 * Cache user profile
 * @param {Object} profile - User profile data
 */
export async function cacheProfile(profile) {
  if (!profile?.email) return;

  try {
    await put(STORES.PROFILE, profile);
    console.log('[OfflineCache] Profile cached:', profile.email);
  } catch (error) {
    console.error('[OfflineCache] Failed to cache profile:', error);
  }
}

/**
 * Get cached profile
 * @param {string} email - User email
 * @returns {Promise<Object|null>}
 */
export async function getCachedProfile(email) {
  try {
    return await get(STORES.PROFILE, email);
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached profile:', error);
    return null;
  }
}

/**
 * Clear profile cache
 */
export async function clearProfileCache() {
  try {
    await clear(STORES.PROFILE);
    console.log('[OfflineCache] Profile cache cleared');
  } catch (error) {
    console.error('[OfflineCache] Failed to clear profile cache:', error);
  }
}

// ============================================================================
// Messages Cache
// ============================================================================

/**
 * Cache messages
 * @param {Array} messages - Array of messages
 */
export async function cacheMessages(messages) {
  if (!Array.isArray(messages)) return;

  try {
    for (const message of messages) {
      if (message?.id) {
        await put(STORES.MESSAGES, message);
      }
    }
    console.log(`[OfflineCache] ${messages.length} messages cached`);
  } catch (error) {
    console.error('[OfflineCache] Failed to cache messages:', error);
  }
}

/**
 * Get cached messages for a conversation
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Maximum messages
 * @returns {Promise<Array>}
 */
export async function getCachedMessages(conversationId, limit = 50) {
  try {
    const store = await getStore(STORES.MESSAGES, 'readonly');
    const index = store.index('conversation_id');

    return new Promise((resolve, reject) => {
      const messages = [];
      const request = index.openCursor(IDBKeyRange.only(conversationId), 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && messages.length < limit) {
          messages.push(cursor.value);
          cursor.continue();
        } else {
          resolve(messages);
        }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached messages:', error);
    return [];
  }
}

/**
 * Clear message cache
 */
export async function clearMessageCache() {
  try {
    await clear(STORES.MESSAGES);
    console.log('[OfflineCache] Message cache cleared');
  } catch (error) {
    console.error('[OfflineCache] Failed to clear message cache:', error);
  }
}

// ============================================================================
// Conversations Cache
// ============================================================================

/**
 * Cache conversations
 * @param {Array} conversations - Array of conversations
 */
export async function cacheConversations(conversations) {
  if (!Array.isArray(conversations)) return;

  try {
    for (const conversation of conversations) {
      if (conversation?.id) {
        await put(STORES.CONVERSATIONS, conversation);
      }
    }
    console.log(`[OfflineCache] ${conversations.length} conversations cached`);
  } catch (error) {
    console.error('[OfflineCache] Failed to cache conversations:', error);
  }
}

/**
 * Get cached conversations
 * @param {number} limit - Maximum conversations
 * @returns {Promise<Array>}
 */
export async function getCachedConversations(limit = 20) {
  try {
    return await getAll(STORES.CONVERSATIONS, limit);
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached conversations:', error);
    return [];
  }
}

// ============================================================================
// Events Cache
// ============================================================================

/**
 * Cache events
 * @param {Array} events - Array of events
 */
export async function cacheEvents(events) {
  if (!Array.isArray(events)) return;

  try {
    for (const event of events) {
      if (event?.id) {
        await put(STORES.EVENTS, event);
      }
    }
    console.log(`[OfflineCache] ${events.length} events cached`);
  } catch (error) {
    console.error('[OfflineCache] Failed to cache events:', error);
  }
}

/**
 * Get cached event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>}
 */
export async function getCachedEvent(eventId) {
  try {
    return await get(STORES.EVENTS, eventId);
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached event:', error);
    return null;
  }
}

/**
 * Get cached events
 * @param {number} limit - Maximum events
 * @returns {Promise<Array>}
 */
export async function getCachedEvents(limit = 50) {
  try {
    return await getAll(STORES.EVENTS, limit);
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached events:', error);
    return [];
  }
}

/**
 * Clear event cache
 */
export async function clearEventCache() {
  try {
    await clear(STORES.EVENTS);
    console.log('[OfflineCache] Event cache cleared');
  } catch (error) {
    console.error('[OfflineCache] Failed to clear event cache:', error);
  }
}

// ============================================================================
// Products Cache
// ============================================================================

/**
 * Cache products
 * @param {Array} products - Array of products
 */
export async function cacheProducts(products) {
  if (!Array.isArray(products)) return;

  try {
    for (const product of products) {
      if (product?.id) {
        await put(STORES.PRODUCTS, product);
      }
    }
    console.log(`[OfflineCache] ${products.length} products cached`);
  } catch (error) {
    console.error('[OfflineCache] Failed to cache products:', error);
  }
}

/**
 * Get cached product by ID
 * @param {string} productId - Product ID
 * @returns {Promise<Object|null>}
 */
export async function getCachedProduct(productId) {
  try {
    return await get(STORES.PRODUCTS, productId);
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached product:', error);
    return null;
  }
}

/**
 * Get cached products
 * @param {number} limit - Maximum products
 * @returns {Promise<Array>}
 */
export async function getCachedProducts(limit = 50) {
  try {
    return await getAll(STORES.PRODUCTS, limit);
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached products:', error);
    return [];
  }
}

// ============================================================================
// Metadata Cache (for cache timestamps, etc.)
// ============================================================================

/**
 * Set cache metadata
 * @param {string} key - Metadata key
 * @param {any} value - Metadata value
 */
export async function setMetadata(key, value) {
  try {
    await put(STORES.METADATA, { key, value });
  } catch (error) {
    console.error('[OfflineCache] Failed to set metadata:', error);
  }
}

/**
 * Get cache metadata
 * @param {string} key - Metadata key
 * @returns {Promise<any>}
 */
export async function getMetadata(key) {
  try {
    const result = await get(STORES.METADATA, key);
    return result?.value;
  } catch (error) {
    console.error('[OfflineCache] Failed to get metadata:', error);
    return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if data is stale (older than maxAge)
 * @param {Object} data - Cached data with _cachedAt timestamp
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {boolean}
 */
export function isStale(data, maxAgeMs = 5 * 60 * 1000) {
  if (!data?._cachedAt) return true;
  return Date.now() - data._cachedAt > maxAgeMs;
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  try {
    await Promise.all([
      clear(STORES.PROFILE),
      clear(STORES.MESSAGES),
      clear(STORES.CONVERSATIONS),
      clear(STORES.EVENTS),
      clear(STORES.PRODUCTS),
      clear(STORES.METADATA),
    ]);
    console.log('[OfflineCache] All caches cleared');
  } catch (error) {
    console.error('[OfflineCache] Failed to clear all caches:', error);
  }
}

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
export async function getCacheStats() {
  try {
    const [profiles, messages, conversations, events, products] = await Promise.all([
      getAll(STORES.PROFILE, 1000),
      getAll(STORES.MESSAGES, 1000),
      getAll(STORES.CONVERSATIONS, 1000),
      getAll(STORES.EVENTS, 1000),
      getAll(STORES.PRODUCTS, 1000),
    ]);

    return {
      profiles: profiles.length,
      messages: messages.length,
      conversations: conversations.length,
      events: events.length,
      products: products.length,
      total: profiles.length + messages.length + conversations.length + events.length + products.length,
    };
  } catch (error) {
    console.error('[OfflineCache] Failed to get cache stats:', error);
    return {
      profiles: 0,
      messages: 0,
      conversations: 0,
      events: 0,
      products: 0,
      total: 0,
    };
  }
}

export default {
  initDB,
  remove,
  // Profile
  cacheProfile,
  getCachedProfile,
  clearProfileCache,
  // Messages
  cacheMessages,
  getCachedMessages,
  clearMessageCache,
  removeCachedMessage,
  // Conversations
  cacheConversations,
  getCachedConversations,
  // Events
  cacheEvents,
  getCachedEvent,
  getCachedEvents,
  clearEventCache,
  removeCachedEvent,
  // Products
  cacheProducts,
  getCachedProduct,
  getCachedProducts,
  removeCachedProduct,
  // Metadata
  setMetadata,
  getMetadata,
  // Utilities
  isStale,
  clearAllCaches,
  getCacheStats,
};
