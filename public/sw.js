const CACHE_NAME = 'sostenibilidad-v2';
const API_CACHE = 'sostenibilidad-api-v2';
const OFFLINE_PAGE = '/offline';

const ASSETS_TO_CACHE = [
  '/',
  '/dashboard/sostenibilidad',
  '/offline',
  '/manifest.json',
];

const API_ROUTES_TO_CACHE = [
  '/api/sostenibilidad/dashboard/overview',
  '/api/sostenibilidad/compliance/calculate-score',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(ASSETS_TO_CACHE);
      self.skipWaiting();
    })()
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== API_CACHE) {
            return caches.delete(name);
          }
        })
      );
      self.clients.claim();
    })()
  );
});

// Fetch event - Network first for API, Cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Next.js build assets and hashed chunks - ALWAYS network first.
  // These are content-hashed and must never be served stale, otherwise
  // deployments never reach the user until they clear their cache.
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/sw.js') ||
    /\.(js|css|map)$/.test(url.pathname)
  ) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const cache = caches.open(API_CACHE);
          cache.then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Page navigations (HTML documents) - Network first so users always get
  // the latest markup; fall back to the offline page when disconnected.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // Other static assets (images, fonts, manifest) - Cache first, network fallback
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
          return response;
        })
        .catch(() => {
          return caches.match(OFFLINE_PAGE);
        });
    })
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    const db = await openIndexedDB();
    const pendingRequests = await getPendingRequests(db);
    
    for (const req of pendingRequests) {
      try {
        await fetch(req.url, {
          method: req.method,
          headers: req.headers,
          body: req.body,
        });
        await removePendingRequest(db, req.id);
      } catch (error) {
        console.error('[sw] Sync error:', error);
      }
    }
  } catch (error) {
    console.error('[sw] Background sync error:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sostenibilidad-db', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-requests')) {
        db.createObjectStore('pending-requests', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readonly');
    const store = transaction.objectStore('pending-requests');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function removePendingRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-requests'], 'readwrite');
    const store = transaction.objectStore('pending-requests');
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
