// Custom worker imported by next-pwa service worker.
// Handles push notifications and click behavior.

self.addEventListener('push', (event: PushEvent) => {
    const data = event.data?.json() || {}
    const title = data.title || 'Lovask'
    const options: NotificationOptions = {
        body: data.body || 'You have a new notification.',
        data: { url: data.url || '/' },
        icon: '/icon-512x512.png',
        badge: '/icon-512x512.png',
    }
    event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close()
    const data = event.notification?.data
    const url = typeof data === 'object' && data && 'url' in data
        ? String((data as { url?: string | null }).url || '/')
        : '/'
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.navigate(url)
                    return client.focus()
                }
            }
            return self.clients.openWindow(url)
        })
    )
})
