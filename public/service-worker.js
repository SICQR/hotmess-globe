/**
 * HOTMESS Service Worker
 * Provides offline support, caching, and background sync
 */

const CACHE_VERSION = 2;
const CACHE_NAME = `hotmess-v${CACHE_VERSION}`;
const STATIC_CACHE = `hotmess-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hotmess-dynamic-v${CACHE_VERSION}`;
const API_CACHE = `hotmess-api-v${CACHE_VERSION}`;
const IMAGE_CACHE = `hotmess-images-v${CACHE_VERSION}`;
const FONT_CACHE = `hotmess-fonts-v${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
];

// API routes to cache for offline (network-first with fallback)
const CACHEABLE_API_ROUTES = [
  '/api/events',
  '/api/profiles',
  '/api/beacons',
  '/api/products',
  '/api/notifications',
];

// API routes to cache with stale-while-revalidate (user data)
const SWR_API_ROUTES = [
  '/api/recommendations',
  '/api/analytics',
];

// Max cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_IMAGE_CACHE_SIZE = 100;
const MAX_API_CACHE_SIZE = 30;

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  api: 5 * 60 * 1000,      // 5 minutes
  images: 7 * 24 * 60 * 60 * 1000,  // 7 days
  fonts: 30 * 24 * 60 * 60 * 1000,  // 30 days
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('hotmess-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE && 
                     name !== API_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, update in background
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (but queue mutations for offline sync)
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Supabase realtime requests
  if (url.hostname.includes('supabase')) {
    return;
  }

  // API requests with stale-while-revalidate
  if (SWR_API_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Images - Cache first with long expiration
  if (isImageAsset(url.pathname)) {
    event.respondWith(cacheFirstWithLimit(request, IMAGE_CACHE, MAX_IMAGE_CACHE_SIZE));
    return;
  }

  // Fonts - Cache first (they rarely change)
  if (isFontAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // Static assets - Cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages - Network first with offline fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // Other resources - Stale while revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

/**
 * Cache first strategy
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network first with cache fallback
 */
async function networkFirstWithCache(request, cacheName) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));

  try {
    const response = await fetch(request);
    
    if (response.ok && isCacheable) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline', cached: false }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Network first with offline HTML fallback
 */
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page
    const offlineHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - HOTMESS</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #000;
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
          }
          .container { max-width: 400px; }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
            opacity: 0.6;
          }
          h1 {
            font-size: 32px;
            font-weight: 900;
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          p {
            color: rgba(255,255,255,0.6);
            margin-bottom: 24px;
            line-height: 1.5;
          }
          button {
            background: #FF1493;
            color: #000;
            border: none;
            padding: 16px 32px;
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            cursor: pointer;
          }
          button:hover { background: #fff; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📡</div>
          <h1>You're Offline</h1>
          <p>Check your internet connection and try again. Some features may be limited while offline.</p>
          <button onclick="location.reload()">Retry</button>
        </div>
        <script>
          window.addEventListener('online', () => location.reload());
        </script>
      </body>
      </html>
    `;
    
    return new Response(offlineHtml, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Stale while revalidate strategy
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/**
 * Check if path is a static asset (JS, CSS)
 */
function isStaticAsset(pathname) {
  const extensions = ['.js', '.css', '.ico'];
  return extensions.some(ext => pathname.endsWith(ext));
}

/**
 * Check if path is an image asset
 */
function isImageAsset(pathname) {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif'];
  return extensions.some(ext => pathname.toLowerCase().endsWith(ext));
}

/**
 * Check if path is a font asset
 */
function isFontAsset(pathname) {
  const extensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
  return extensions.some(ext => pathname.toLowerCase().endsWith(ext));
}

/**
 * Cache first with size limit (for images)
 */
async function cacheFirstWithLimit(request, cacheName, maxSize) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      
      // Trim cache if too large
      trimCache(cacheName, maxSize);
    }
    return response;
  } catch (error) {
    return new Response('', { status: 503 });
  }
}

/**
 * Trim cache to specified max size
 */
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Delete oldest entries (first in cache)
    const toDelete = keys.slice(0, keys.length - maxSize);
    for (const key of toDelete) {
      await cache.delete(key);
    }
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(processOfflineQueue());
  }
});

/**
 * Process queued offline actions
 */
async function processOfflineQueue() {
  try {
    // Get offline queue from IndexedDB or localStorage
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_OFFLINE_QUEUE',
      });
    }
  } catch (error) {
    console.error('[SW] Failed to process offline queue:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'HOTMESS', body: 'New notification' };
  
  try {
    data = event.data.json();
  } catch {
    data.body = event.data?.text() || data.body;
  }

  const options = {
    body: data.body || data.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map(name => caches.delete(name)));
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
