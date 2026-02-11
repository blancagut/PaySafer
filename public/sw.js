// PaySafer Service Worker v2.0
// PWA: Push notifications + offline caching + background sync

const CACHE_VERSION = 'paysafer-v2'
const STATIC_CACHE = CACHE_VERSION + '-static'
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/dashboard',
  '/wallet',
  '/favicon.svg',
  '/manifest.json',
]

// ─── Install: Pre-cache static shell ───
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(PRECACHE_URLS)
    }).then(function() {
      return self.skipWaiting()
    })
  )
})

// ─── Activate: Clean old caches ───
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== STATIC_CACHE && key !== DYNAMIC_CACHE
        }).map(function(key) {
          return caches.delete(key)
        })
      )
    }).then(function() {
      return self.clients.claim()
    })
  )
})

// ─── Fetch: Network-first for API, cache-first for static ───
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip API and auth routes
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Static assets: cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2?|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone()
            caches.open(STATIC_CACHE).then(function(cache) {
              cache.put(event.request, clone)
            })
          }
          return response
        })
      })
    )
    return
  }

  // Pages: network-first, fallback to cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok) {
        var clone = response.clone()
        caches.open(DYNAMIC_CACHE).then(function(cache) {
          cache.put(event.request, clone)
        })
      }
      return response
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('/dashboard')
      })
    })
  )
})

// ─── Push Notifications ───
self.addEventListener('push', function(event) {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'PaySafer'
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
      },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      tag: data.tag || 'paysafe-notification',
      renotify: true,
      timestamp: Date.now(),
    }

    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  } catch (err) {
    console.error('[SW] Failed to show notification:', err)
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        // Open new tab
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
