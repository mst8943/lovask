// Custom worker imported by next-pwa service worker.
/// <reference lib="webworker" />
// Handles push notifications and click behavior.

const sw = self as unknown as ServiceWorkerGlobalScope

sw.addEventListener('push', (event) => {
    const pushEvent = event as PushEvent
    const data = pushEvent.data?.json() || {}
    const title = data.title || 'Lovask'
    const options: NotificationOptions = {
        body: data.body || 'You have a new notification.',
        data: { url: data.url || '/' },
        icon: '/icon-512x512.png',
        badge: '/icon-512x512.png',
    }
    pushEvent.waitUntil(sw.registration.showNotification(title, options))
})

sw.addEventListener('notificationclick', (event) => {
    const clickEvent = event as NotificationEvent
    clickEvent.notification.close()
    const data = clickEvent.notification?.data
    const url = typeof data === 'object' && data && 'url' in data
        ? String((data as { url?: string | null }).url || '/')
        : '/'
    clickEvent.waitUntil(
        sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.navigate(url)
                    return client.focus()
                }
            }
            return sw.clients.openWindow(url)
        })
    )
})
