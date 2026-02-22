'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, NotificationRow } from '@/services/notificationService'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import { emitUnreadCount } from '@/lib/notificationsSync'
import Spinner from '@/components/ui/Spinner'
export default function AdminNotificationsPage() {
    const { user } = useAuthStore()
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<NotificationRow[]>([])
    const load = useCallback(async (userId: string) => {
        setLoading(true)
        const data = await fetchNotifications(userId)
        setRows(data)
        emitUnreadCount(userId, data.filter((n) => !n.is_read).length)
        setLoading(false)
    }, [])
    useEffect(() => {
        if (!user) return
        const id = setTimeout(() => {
            void load(user.id)
        }, 0)
        return () => clearTimeout(id)
    }, [load, user])
    useEffect(() => {
        if (!user) return
        const channel = supabase
            .channel(`admin-notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newRow = payload.new as NotificationRow
                    setRows((prev) => {
                        const next = [newRow, ...prev]
                        emitUnreadCount(user.id, next.filter((n) => !n.is_read).length)
                        return next
                    })
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const updated = payload.new as NotificationRow
                    setRows((prev) => {
                        const next = prev.map((n) => (n.id === updated.id ? updated : n))
                        emitUnreadCount(user.id, next.filter((n) => !n.is_read).length)
                        return next
                    })
                }
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, supabase])
    const handleRead = async (id: string) => {
        if (!user) return
        setRows((prev) => {
            const next = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            emitUnreadCount(user.id, next.filter((n) => !n.is_read).length)
            return next
        })
        await markNotificationRead(id)
    }
    const handleReadAll = async () => {
        if (!user) return
        setRows((prev) => {
            const next = prev.map((n) => ({ ...n, is_read: true }))
            emitUnreadCount(user.id, 0)
            return next
        })
        await markAllNotificationsRead(user.id)
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Bildirim Kutusu</h1>
                <button onClick={handleReadAll} className="px-3 py-2 rounded-lg bg-white/10 text-xs">
                    Tümünü okundu yap
                </button>
            </div>
            {rows.length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-gray-400">Bildirim yok.</div>
            ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1.2fr_2fr_1fr_0.8fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                        <div className="px-4 py-3">Baslik</div>
                        <div className="px-4 py-3">Mesaj</div>
                        <div className="px-4 py-3">Tarih</div>
                        <div className="px-4 py-3">Islem</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {rows.map((n) => {
                            const payload = n.payload || {}
                            const title = payload.title || n.type
                            const body = payload.body || payload.subject || ''
                            return (
                                <div key={n.id} className="grid grid-cols-[1.2fr_2fr_1fr_0.8fr] gap-0 text-sm">
                                    <div className="px-4 py-3 flex items-center gap-2">
                                        <Bell size={14} className={n.is_read ? 'text-gray-400' : 'text-pink-400'} />
                                        <div className="font-semibold text-sm">{title}</div>
                                    </div>
                                    <div className="px-4 py-3 text-xs text-gray-300">
                                        {body || ''}
                                    </div>
                                    <div className="px-4 py-3 text-xs text-gray-400">
                                        {new Date(n.created_at).toLocaleString()}
                                    </div>
                                    <div className="px-4 py-3 text-xs">
                                        {n.is_read ? (
                                            <span className="text-gray-500">Okundu</span>
                                        ) : (
                                            <button
                                                onClick={() => handleRead(n.id)}
                                                className="px-3 py-2 rounded-lg bg-white/10 text-xs"
                                            >
                                                Okundu
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}