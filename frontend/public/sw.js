/**
 * Service Worker - DIY Implementation
 * Progressive Web App with offline support
 * No dependencies, pure Web APIs
 */

// Cache versioning
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `cryptogift-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Critical resources to precache
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first, fallback to cache
  networkFirst: [
    '/api/',
    '/wallet/',
  ],
  // Cache first, update in background
  cacheFirst: [
    '/icons/',
    '/fonts/',
    '/_next/static/',
  ],
  // Stale while revalidate
  staleWhileRevalidate: [
    '/images/',
    '/.well-known/',
  ],
  // Network only (never cache)
  networkOnly: [
    '/api/auth/',
    '/api/mint',
    '/api/claim',
    '/api/upload',
  ],
};

// Install event - precache critical resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching critical resources');
        return cache.addAll(PRECACHE_URLS)
          .catch((error) => {
            console.error('[SW] Precache failed for some resources:', error);
            // Continue installation even if some resources fail
            return Promise.resolve();
          });
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old version caches
              return name.startsWith('cryptogift-') && name !== CACHE_NAME;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }
  
  // Determine cache strategy
  const strategy = getCacheStrategy(url.pathname);
  
  switch (strategy) {
    case 'networkOnly':
      event.respondWith(networkOnly(request));
      break;
    case 'networkFirst':
      event.respondWith(networkFirst(request));
      break;
    case 'cacheFirst':
      event.respondWith(cacheFirst(request));
      break;
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request));
      break;
    default:
      // Default to network first
      event.respondWith(networkFirst(request));
  }
});

// Get cache strategy for URL
function getCacheStrategy(pathname) {
  // Network only
  for (const pattern of CACHE_STRATEGIES.networkOnly) {
    if (pathname.startsWith(pattern)) {
      return 'networkOnly';
    }
  }
  
  // Network first
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pathname.startsWith(pattern)) {
      return 'networkFirst';
    }
  }
  
  // Cache first
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pathname.startsWith(pattern)) {
      return 'cacheFirst';
    }
  }
  
  // Stale while revalidate
  for (const pattern of CACHE_STRATEGIES.staleWhileRevalidate) {
    if (pathname.startsWith(pattern)) {
      return 'staleWhileRevalidate';
    }
  }
  
  return 'networkFirst';
}

// Network only strategy
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline') || createOfflineResponse();
    }
    throw error;
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline') || createOfflineResponse();
    }
    
    throw error;
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    throw error;
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background and update cache
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error('[SW] Background fetch failed:', error);
      return null;
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  // Fallback for navigation requests
  if (request.mode === 'navigate') {
    const offlineCache = await caches.open(CACHE_NAME);
    return offlineCache.match('/offline') || createOfflineResponse();
  }
  
  throw new Error('No response available');
}

// Create offline response
function createOfflineResponse() {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - CryptoGift Wallets</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          text-align: center;
          padding: 2rem;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 1rem;
        }
        p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin-bottom: 2rem;
        }
        .icon {
          width: 120px;
          height: 120px;
          margin: 0 auto 2rem;
          opacity: 0.8;
        }
        button {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover {
          transform: scale(1.05);
        }
        button:active {
          transform: scale(0.95);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
        </svg>
        <h1>You're Offline</h1>
        <p>Please check your internet connection and try again.</p>
        <button onclick="window.location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store',
    },
  });
}

// Message event - handle updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received skip waiting message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    console.log('[SW] Claiming clients');
    self.clients.claim();
  }
});

// Push event - handle web push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    console.warn('[SW] Push event with no data');
    return;
  }
  
  let notification;
  try {
    notification = event.data.json();
  } catch (error) {
    console.error('[SW] Failed to parse push data:', error);
    notification = {
      title: 'CryptoGift Wallets',
      body: event.data.text(),
    };
  }
  
  // Extract notification data
  const {
    title = 'CryptoGift Wallets',
    body = 'You have a new notification',
    icon = '/icons/icon-192x192.png',
    badge = '/icons/badge-72x72.png',
    tag,
    data = {},
    actions = [],
    requireInteraction = false,
    category = 'system',
  } = notification;
  
  // Build notification options
  const options = {
    body,
    icon,
    badge,
    tag: tag || `notification-${Date.now()}`,
    data: {
      ...data,
      category,
      timestamp: Date.now(),
      url: data.url || '/',
    },
    vibrate: category === 'security' ? [200, 100, 200] : [100, 50, 100],
    requireInteraction,
    actions: actions.slice(0, 2), // Max 2 actions on most platforms
    renotify: category === 'security',
    silent: false,
  };
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] Notification shown:', title);
        // Track notification shown
        trackPushEvent('notification_shown', { category });
      })
      .catch((error) => {
        console.error('[SW] Failed to show notification:', error);
      })
  );
});

// Notification click event - handle notification interactions
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action || 'main');
  
  const notification = event.notification;
  const data = notification.data || {};
  
  // Close the notification
  notification.close();
  
  // Track click event
  trackPushEvent('notification_clicked', {
    action: event.action || 'main',
    category: data.category,
  });
  
  // Handle different actions
  if (event.action === 'dismiss' || event.action === 'close') {
    return;
  }
  
  // Determine URL to open
  let urlToOpen = data.url || '/';
  
  // Handle specific actions
  if (event.action === 'view' && data.transactionHash) {
    urlToOpen = `/wallet/transaction/${data.transactionHash}`;
  } else if (event.action === 'claim' && data.tokenId) {
    urlToOpen = `/gift/claim/${data.tokenId}`;
  } else if (data.category === 'security') {
    urlToOpen = '/wallet/security';
  } else if (data.category === 'transaction') {
    urlToOpen = '/wallet/activity';
  }
  
  // Open or focus window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window if needed
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync event - for future offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Sync transactions (placeholder for future implementation)
async function syncTransactions() {
  console.log('[SW] Syncing offline transactions...');
  // Future: sync offline transactions when back online
}

// Track push events for telemetry
function trackPushEvent(event, data) {
  // Log in development
  console.log(`[SW Push Event] ${event}`, data);
  
  // Send to analytics endpoint (fire and forget)
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event,
      category: 'push',
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {
    // Ignore analytics errors
  });
}