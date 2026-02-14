/**
 * HOTMESS Service Worker
 * Handles: Push notifications, caching, offline support, background sync
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `hotmess-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hotmess-dynamic-${CACHE_VERSION}`;
const API_CACHE = `hotmess-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `hotmess-images-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// API endpoints to cache
const CACHEABLE_API_PATTERNS = [
  '/api/events',
  '/api/beacons',
  '/api/products',
  '/api/user/profile',
];

// Cache size limits
const MAX_DYNAMIC_CACHE_ITEMS = 50;
const MAX_API_CACHE_ITEMS = 100;
const MAX_IMAGE_CACHE_ITEMS = 200;
const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Cache install failed:', error);
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('hotmess-') && !currentCaches.includes(name))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control immediately - must be called after activation is complete
        console.log('[SW] Claiming clients...');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activation error:', error);
      })
  );
});

// Determine caching strategy based on request
function getCachingStrategy(request) {
  const url = new URL(request.url);
  
  // Images - cache first, network fallback
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)
  ) {
    return { strategy: 'cache-first', cacheName: IMAGE_CACHE, maxItems: MAX_IMAGE_CACHE_ITEMS };
  }
  
  // API requests - network first, cache fallback with stale-while-revalidate
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => 
      url.pathname.includes(pattern)
    );
    
    if (isCacheable && request.method === 'GET') {
      return { strategy: 'stale-while-revalidate', cacheName: API_CACHE, maxItems: MAX_API_CACHE_ITEMS };
    }
    
    return { strategy: 'network-only' };
  }
  
  // Static assets - cache first
  if (STATIC_ASSETS.includes(url.pathname)) {
    return { strategy: 'cache-first', cacheName: STATIC_CACHE };
  }
  
  // Everything else - network first, cache fallback
  return { strategy: 'network-first', cacheName: DYNAMIC_CACHE, maxItems: MAX_DYNAMIC_CACHE_ITEMS };
}

// Trim cache to max items (debounced to avoid excessive trimming)
const trimPending = new Set();
async function trimCache(cacheName, maxItems) {
  // Skip if already pending trim for this cache
  if (trimPending.has(cacheName)) return;
  trimPending.add(cacheName);
  
  // Debounce - wait 5 seconds before actually trimming
  setTimeout(async () => {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      if (keys.length > maxItems) {
        const deleteCount = keys.length - maxItems;
        const keysToDelete = keys.slice(0, deleteCount);
        
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
        // Only log significant trims (10+ items)
        if (deleteCount >= 10) {
          console.log(`[SW] Trimmed ${deleteCount} items from ${cacheName}`);
        }
      }
    } finally {
      trimPending.delete(cacheName);
    }
  }, 5000);
}

// Cache-first strategy
async function cacheFirst(request, cacheName, maxItems) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      
      if (maxItems) {
        trimCache(cacheName, maxItems);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first network error:', error);
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request, cacheName, maxItems) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      
      if (maxItems) {
        trimCache(cacheName, maxItems);
      }
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache (offline):', request.url);
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName, maxItems) {
  const cachedResponse = await caches.match(request);
  
  // Start network request in background
  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
        
        if (maxItems) {
          trimCache(cacheName, maxItems);
        }
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('[SW] Background revalidation failed:', error);
      return null;
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  throw new Error('No cached response and network unavailable');
}

// Fetch event handler
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests (they can't be cached)
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http requests
  if (!event.request.url.startsWith('http')) return;
  
  // Skip cross-origin requests that we don't want to cache
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes('supabase') &&
    !url.hostname.includes('cloudinary') &&
    !url.hostname.includes('googleapis')
  ) {
    return;
  }
  
  const { strategy, cacheName, maxItems } = getCachingStrategy(event.request);
  
  switch (strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request, cacheName, maxItems));
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request, cacheName, maxItems));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request, cacheName, maxItems));
      break;
    case 'network-only':
    default:
      // Let the browser handle it normally
      break;
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'HOTMESS',
    body: 'You have a new notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'default',
    data: {}
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
        data: payload.data || payload
      };
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'hotmess-notification',
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    data: data.data,
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
});

// Message handler for push subscription management
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data?.type);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline actions (when supported)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Sync any queued notifications when back online
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    // Implementation for syncing queued actions
    console.log('[SW] Notifications synced');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}
