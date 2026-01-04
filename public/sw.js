self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Network-first passthrough; avoids dev console MIME errors when registered.
self.addEventListener('fetch', () => {
  // no-op
});
