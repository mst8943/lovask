'use client'

import { useAuthStore } from '@/store/useAuthStore'
import { useNotificationsUnread } from '@/hooks/useNotificationsUnread'

export default function NotificationsBadge() {
    const { user } = useAuthStore()
    const unread = useNotificationsUnread(user?.id)

    if (!user) return null

    return (
        <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
            <div>
                <div className="text-sm font-semibold">Bildirimler</div>
                <div className="text-xs text-gray-400">Okunmamış: {unread}</div>
            </div>
            <div className="text-xs text-gray-500">Bildirim kutunu kontrol et</div>
        </div>
    )
}
