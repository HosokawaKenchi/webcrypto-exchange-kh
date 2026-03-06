// service-worker.js
// Service Worker for WebCrypto Exchange PWA
// Enables offline functionality and caching

const CACHE_NAME = 'webcrypto-exchange-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/i18n.js',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  // Internationalization files (JSON)
  '/internationalization/de.json',
  '/internationalization/en.json',
  '/internationalization/es.json',
  '/internationalization/fr.json',
  '/internationalization/ja.json',
  '/internationalization/ko.json',
  '/internationalization/zh.json',
  // Internationalization description HTML (optional, used by description panel)
  '/internationalization/description.de.html',
  '/internationalization/description.en.html',
  '/internationalization/description.es.html',
  '/internationalization/description.fr.html',
  '/internationalization/description.ja.html',
  '/internationalization/description.ko.html',
  '/internationalization/description.zh.html'
];

const API_CACHE_NAME = 'webcrypto-exchange-api-v1';

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] Installed successfully');
        self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const { request } = event;
  const url = new URL(request.url);

  // For internationalization and API calls, use network-first strategy
  if (url.pathname.startsWith('/internationalization/') || url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const cache_store = url.pathname.includes('/api/') ? API_CACHE_NAME : CACHE_NAME;
            const responseClone = response.clone();
            caches.open(cache_store).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // For app shell resources, use cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(request)
          .then(response => {
            // Cache successful responses for future offline use
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
      .catch(() => {
        // Return a custom offline page if available
        // For now, we'll let the browser handle it
        console.warn('[Service Worker] Fetch failed for:', request.url);
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Background sync (if needed in the future)
// self.addEventListener('sync', event => {
//   if (event.tag === 'sync-data') {
//     event.waitUntil(syncData());
//   }
// });

console.log('[Service Worker] Service Worker script loaded');
