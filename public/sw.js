// MoogShip Service Worker for Performance Optimization
// v4: Fixed user data caching - never cache user-scoped endpoints
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `moogship-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `moogship-dynamic-${CACHE_VERSION}`;
const API_CACHE = `moogship-api-${CACHE_VERSION}`;

// Static assets to cache on first visit (minimal set for initial install)
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('MoogShip SW: Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('MoogShip SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('MoogShip SW: Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Delete old version caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('moogship-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log('MoogShip SW: Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Clear user-scoped cached responses from current API cache
      caches.open(API_CACHE).then((cache) => {
        return cache.keys().then((requests) => {
          const userScopedEndpoints = [
            '/api/user',
            '/api/balance',
            '/api/shipments',
            '/api/transactions',
            '/api/notifications',
            '/api/billing-reminders'
          ];
          
          return Promise.all(
            requests
              .filter((request) => {
                const url = new URL(request.url);
                return userScopedEndpoints.some(endpoint => url.pathname.startsWith(endpoint));
              })
              .map((request) => {
                console.log('MoogShip SW: Clearing user-scoped cache:', request.url);
                return cache.delete(request);
              })
          );
        });
      })
    ]).then(() => {
      console.log('MoogShip SW: Activation complete, claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip invalid or malformed paths (Chrome edge case protection)
  if (!url.pathname || url.pathname.includes('^') || url.pathname.includes('*')) {
    console.log('MoogShip SW: Skipping invalid path:', url.pathname);
    return;
  }

  // API requests - Network first, cache fallback (with timeout)
  if (url.pathname.startsWith('/api/')) {
    // CRITICAL: Never cache user-scoped endpoints to prevent user data leakage
    const userScopedEndpoints = [
      '/api/user',
      '/api/balance',
      '/api/shipments',
      '/api/transactions',
      '/api/notifications',
      '/api/billing-reminders',
      '/api/login',
      '/api/logout',
      '/api/register'
    ];
    
    const isUserScoped = userScopedEndpoints.some(endpoint => url.pathname.startsWith(endpoint));
    
    if (isUserScoped) {
      // Never cache user-scoped data - always fetch fresh from network
      console.log('MoogShip SW: Bypassing cache for user-scoped endpoint:', url.pathname);
      event.respondWith(fetch(request));
      return;
    }
    
    event.respondWith(
      networkFirstWithTimeout(request, API_CACHE, 5000)
    );
    return;
  }

  // Static assets - Cache first, network fallback (handles both dev /src/ and production /assets/ paths)
  if (
    url.pathname.match(/\.(js|jsx|ts|tsx|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$/) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/@vite/')
  ) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE)
    );
    return;
  }

  // HTML pages - Network first, cache fallback
  if (
    request.headers.get('accept')?.includes('text/html') ||
    url.pathname === '/' ||
    (url.pathname.startsWith('/') && !url.pathname.includes('.'))
  ) {
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE)
    );
    return;
  }

  // Default - network only
  event.respondWith(fetch(request));
});

// Cache first strategy
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
    console.error('MoogShip SW: Fetch failed:', error);
    throw error;
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Network first with timeout
async function networkFirstWithTimeout(request, cacheName, timeout = 3000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok && !response.headers.get('cache-control')?.includes('no-store')) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // If network fails or times out, try cache
    const cached = await caches.match(request);
    if (cached) {
      console.log('MoogShip SW: Serving from cache (network failed):', request.url);
      return cached;
    }
    throw error;
  }
}

// Message handler for cache clearing
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    console.log('MoogShip SW: Clearing API cache on request');
    event.waitUntil(
      caches.delete(API_CACHE).then(() => {
        console.log('MoogShip SW: API cache cleared successfully');
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        console.error('MoogShip SW: Failed to clear API cache:', error);
        event.ports[0].postMessage({ success: false, error: error.message });
      })
    );
  }
});
