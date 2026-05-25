/* eslint-disable no-restricted-globals */
// Service Worker for Push Notifications - Suraksha Setu

const CACHE_NAME = 'suraksha-setu-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/css/main.css',
  '/static/js/main.js',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Never cache or aggressively intercept API requests. Let the app handle those failures.
  if (requestUrl.pathname.startsWith('/api/') || requestUrl.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (requestUrl.pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ error: 'network_unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => caches.match('/index.html'));
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {
    title: '🔔 Suraksha Setu Alert',
    body: 'New disaster alert in your area',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    tag: 'suraksha-alert',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      data = {
        ...data,
        ...pushData,
        title: pushData.title || data.title,
        body: pushData.description || pushData.body || data.body,
        tag: pushData.id || pushData.tag || data.tag,
        data: pushData, // Store full data for click handling
      };

      // Add severity-based customization
      if (pushData.severity === 'critical') {
        data.requireInteraction = true;
        data.vibrate = [300, 100, 300, 100, 300];
        data.badge = '/alert-critical.png';
      } else if (pushData.severity === 'warning') {
        data.requireInteraction = true;
        data.vibrate = [200, 100, 200];
        data.badge = '/alert-warning.png';
      }
    } catch (error) {
      console.error('[Service Worker] Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: data.vibrate,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    data: data.data,
    actions: [
      { action: 'view', title: 'View Details', icon: '/view-icon.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/dismiss-icon.png' },
    ],
  });

  event.waitUntil(promiseChain);
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Determine URL to open
  let urlToOpen = '/alerts';
  
  if (event.notification.data) {
    const alertData = event.notification.data;
    if (alertData.url) {
      urlToOpen = alertData.url;
    } else if (alertData.type === 'community_post') {
      urlToOpen = '/app/community';
    } else if (alertData.id) {
      urlToOpen = `/alerts/${alertData.id}`;
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url.includes(self.registration.scope) && 'focus' in client) {
            return client.focus().then(() => {
              // Navigate to alert page
              if (client.navigate) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        // No window found, open new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (optional - for offline support)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-alerts') {
    event.waitUntil(
      // Fetch latest alerts when back online
      fetch('/api/alerts')
        .then(response => response.json())
        .then(data => {
          console.log('[Service Worker] Synced alerts:', data);
        })
        .catch(error => {
          console.error('[Service Worker] Sync failed:', error);
        })
    );
  }
});

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});

console.log('[Service Worker] Loaded successfully');
