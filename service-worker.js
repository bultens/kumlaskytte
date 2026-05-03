const CACHE_NAME = 'skytteportalen-v1';

// När appen installeras
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installerad');
    self.skipWaiting();
});

// När appen aktiveras
self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Aktiverad');
    return self.clients.claim();
});

// Snäll nätverkshanterare: Låt allt gå via nätverket först (viktigt för Firebase!)
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});