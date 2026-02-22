'use client'

import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { NOTIFICATIONS_UNREAD_EVENT } from '@/lib/notificationsSync'

type Listener = (count: number) => void

const supabase = createClient()
let currentUserId: string | null = null
let channel: RealtimeChannel | null = null
let unreadCount = 0
const listeners = new Set<Listener>()
let loadingPromise: Promise<void> | null = null

const notify = () => {
    for (const listener of listeners) {
        listener(unreadCount)
    }
}

const ensureChannel = (userId: string) => {
    if (currentUserId === userId && channel) return

    if (channel) {
        supabase.removeChannel(channel)
        channel = null
    }

    currentUserId = userId
    channel = supabase
        .channel(`unread-notifications:${userId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            (payload) => {
                const next = payload.new as { is_read?: boolean }
                if (!next?.is_read) {
                    unreadCount += 1
                    notify()
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            (payload) => {
                const next = payload.new as { is_read?: boolean }
                const prev = payload.old as { is_read?: boolean }
                if (prev?.is_read && !next?.is_read) {
                    unreadCount += 1
                    notify()
                } else if (!prev?.is_read && next?.is_read) {
                    unreadCount = Math.max(0, unreadCount - 1)
                    notify()
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
            (payload) => {
                const prev = payload.old as { is_read?: boolean }
                if (prev && !prev.is_read) {
                    unreadCount = Math.max(0, unreadCount - 1)
                    notify()
                }
            }
        )
        .subscribe()
}

const ensureLoaded = (userId: string) => {
    if (loadingPromise) return loadingPromise
    loadingPromise = (async () => {
        const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false)
        unreadCount = count || 0
        notify()
    })().finally(() => {
        loadingPromise = null
    })
    return loadingPromise
}

export const useNotificationsUnread = (userId?: string | null) => {
    const [count, setCount] = useState(() => unreadCount)

    useEffect(() => {
        if (!userId) return

        listeners.add(setCount)
        ensureChannel(userId)
        void ensureLoaded(userId)
        queueMicrotask(() => setCount(unreadCount))

        const onUnreadChanged = (event: Event) => {
            const custom = event as CustomEvent<{ userId: string; unread: number }>
            if (custom.detail?.userId !== userId) return
            unreadCount = custom.detail.unread || 0
            notify()
        }
        window.addEventListener(NOTIFICATIONS_UNREAD_EVENT, onUnreadChanged as EventListener)

        return () => {
            listeners.delete(setCount)
            window.removeEventListener(NOTIFICATIONS_UNREAD_EVENT, onUnreadChanged as EventListener)
            if (listeners.size === 0 && channel) {
                supabase.removeChannel(channel)
                channel = null
                currentUserId = null
            }
        }
    }, [userId])

    return userId ? count : 0
}
