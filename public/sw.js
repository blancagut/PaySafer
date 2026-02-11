// PaySafe Push Notification Service Worker
// Handles background push events and notification clicks.

self.addEventListener('push', function(event) {
  if (!event.data) return

  try {
    const data = event.data.json()
    const title = data.title || 'PaySafe'
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
      },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      tag: 'paysafe-notification', // Group notifications
      renotify: true,
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
