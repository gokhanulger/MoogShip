// MoogShip Service Worker - Optimized for Performance
const CACHE_NAME = 'moogship-v1.3';
const STATIC_CACHE = 'moogship-static-v1.3';
const API_CACHE = 'moogship-api-v1.3';

// Resources to cache immediately on install
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/moogship-logo-video.mp4',
  '/manifest.json'
];

// API endpoints with different caching strategies
const CACHE_STRATEGIES = {
  // Long cache for static/semi-static data
  longCache: [
    '/api/marketing-banners',
    '/api/products',
    '/api/package-templates'
  ],
  // Medium cache for user-specific but relatively stable data
  mediumCache: [
    '/api/user',
    '/api/balance'
  ],
  // Short cache for dynamic data
  shortCache: [
    '/api/shipments',
    '/api/notifications'
  ],
  // No cache for real-time data
  noCache: [
    '/api/auth',
    '/api/login',
    '/api/logout',
    '/api/admin/fast-tracking-notifications'
  ]
};

// Cache durations in milliseconds
const CACHE_DURATIONS = {
  longCache: 30 * 60 * 1000,    // 30 minutes
  mediumCache: 5 * 60 * 1000,   // 5 minutes
  shortCache: 2 * 60 * 1000,    // 2 minutes
  static: 24 * 60 * 60 * 1000   // 24 hours for static resources
};

// Install event - cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_RESOURCES)),
      caches.open(API_CACHE).then(() => console.log('API cache initialized'))
    ]).then(() => {
      console.log('MoogShip SW: Static resources cached');
      self.skipWaiting();
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => !cacheName.includes('v1.3'))
          .map(cacheName => {
            console.log('MoogShip SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('MoogShip SW: Activated and old caches cleaned');
      self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only handle HTTP/HTTPS requests
  if (!url.protocol.startsWith('http')) return;
  
  // Handle API requests with different strategies
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
  }
  // Handle static resources
  else {
    event.respondWith(handleStaticRequest(event.request));
  }
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Determine cache strategy
  let strategy = 'noCache';
  let duration = 0;
  
  for (const [strategyName, patterns] of Object.entries(CACHE_STRATEGIES)) {
    if (patterns.some(pattern => pathname.startsWith(pattern))) {
      strategy = strategyName;
      duration = CACHE_DURATIONS[strategy] || 0;
      break;
    }
  }
  
  // No cache strategy - always fetch from network
  if (strategy === 'noCache') {
    return fetch(request);
  }
  
  const cache = await caches.open(API_CACHE);
  const cacheKey = `${request.url}-${Date.now()}`;
  
  try {
    // Try cache first for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
        const isExpired = Date.now() - cachedDate.getTime() > duration;
        
        if (!isExpired) {
          console.log(`MoogShip SW: Cache hit for ${pathname}`);
          return cachedResponse;
        } else {
          // Cache expired, delete it
          await cache.delete(request);
        }
      }
    }
    
    // Fetch from network
    const response = await fetch(request);
    
    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const responseToCache = response.clone();
      
      // Add custom header with cache date
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, cachedResponse);
      console.log(`MoogShip SW: Cached ${pathname} with ${strategy} strategy`);
    }
    
    return response;
  } catch (error) {
    console.error('MoogShip SW: Network request failed:', error);
    
    // Try to return cached version as fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log(`MoogShip SW: Returning stale cache for ${pathname}`);
      return cachedResponse;
    }
    
    throw error;
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Check if it's not too old (24 hours for static resources)
      const cachedDate = new Date(cachedResponse.headers.get('sw-cached-date') || 0);
      const isExpired = Date.now() - cachedDate.getTime() > CACHE_DURATIONS.static;
      
      if (!isExpired) {
        console.log(`MoogShip SW: Static cache hit for ${request.url}`);
        return cachedResponse;
      }
    }
    
    // Fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache the response
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const cachedResponse = new Response(await responseToCache.blob(), {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, cachedResponse);
      console.log(`MoogShip SW: Cached static resource ${request.url}`);
    }
    
    return response;
  } catch (error) {
    console.error('MoogShip SW: Static request failed:', error);
    
    // Return cached version as fallback
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log(`MoogShip SW: Returning cached static resource for ${request.url}`);
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for when connectivity is restored
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('MoogShip SW: Background sync triggered');
    // Implement background sync logic if needed
  }
});

// Push notifications handler
self.addEventListener('push', event => {
  console.log('MoogShip SW: Push notification received');
  // Implement push notification logic if needed
});