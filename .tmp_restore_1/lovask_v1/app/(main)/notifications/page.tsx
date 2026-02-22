'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, NotificationRow } from '@/services/notificationService'
import { createClient } from '@/lib/supabase/client'
import { Bell, MessageCircle, Heart, ShieldCheck, ShieldAlert, Ban, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { emitUnreadCount } from '@/lib/notificationsSync'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'
import Spinner from '@/components/ui/Spinner'
const typeLabels: Record<string, string> = {
    match: 'Eşleşme',
    message: 'Mesaj',
    like: 'Beğeni',
    support_ticket: 'Destek',
    report_resolved: 'Rapor',
    ban: 'Ban',
    verification: 'Doğrulama',
    support: 'Destek',
}
const typeTargets: Record<string, string> = {
    like: '/liked-you',
    match: '/matches',
    message: '/matches',
    support_ticket: '/support',
    support: '/support',
    report_resolved: '/profile',
    verification: '/settings/verification',
    ban: '/settings/account',
}
const typeMeta: Record<string, { icon: typeof Bell; tone: string; pill: string }> = {
    message: { icon: MessageCircle, tone: 'text-cyan-300', pill: 'bg-cyan-500/15 border-cyan-500/30' },
    like: { icon: Heart, tone: 'text-pink-300', pill: 'bg-pink-500/15 border-pink-500/30' },
    match: { icon: Sparkles, tone: 'text-amber-300', pill: 'bg-amber-500/15 border-amber-500/30' },
    verification: { icon: ShieldCheck, tone: 'text-emerald-300', pill: 'bg-emerald-500/15 border-emerald-500/30' },
    report_resolved: { icon: ShieldAlert, tone: 'text-yellow-300', pill: 'bg-yellow-500/15 border-yellow-500/30' },
    ban: { icon: Ban, tone: 'text-red-300', pill: 'bg-red-500/15 border-red-500/30' },
    support: { icon: MessageCircle, tone: 'text-violet-300', pill: 'bg-violet-500/15 border-violet-500/30' },
    support_ticket: { icon: MessageCircle, tone: 'text-violet-300', pill: 'bg-violet-500/15 border-violet-500/30' },
}
export default function NotificationsPage() {
    const { user } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<NotificationRow[]>([])
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const supabase = useMemo(() => createClient(), [])
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
            .channel(`notifications:${user.id}`)
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
    const visibleRows = rows.filter((n) => (filter === 'unread' ? !n.is_read : true))
    return (
        <div className="space-y-6 pb-8">
            <div className="glass-panel p-5 rounded-3xl border border-white/10">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="text-xs uppercase tracking-[0.32em] text-gray-400">Bildiriler</div>
                        <div className="text-xl font-semibold">Bildirim Merkezi</div>
                        <div className="text-xs text-gray-400">Premium deneyim için sade ve odakli akış.</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleReadAll} className="text-xs">
                        Tumunu okundu yap
                    </Button>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={filter === 'all' ? 'default' : 'secondary'}
                        onClick={() => setFilter('all')}
                        className="text-xs rounded-full"
                    >
                        Tumu
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={filter === 'unread' ? 'default' : 'secondary'}
                        onClick={() => setFilter('unread')}
                        className="text-xs rounded-full"
                    >
                        Okunmamis
                    </Button>
                    <span className="text-[10px] text-gray-400 ml-1">
                        {visibleRows.length} gosterim
                    </span>
                </div>
            </div>
            {visibleRows.length === 0 ? (
                <div className="glass-panel p-8 rounded-3xl text-sm text-gray-400 text-center space-y-3 border border-white/10">
                    <div className="text-sm font-semibold text-gray-200">Bildirim yok</div>
                    <div className="text-xs text-gray-500">Yeni hareketler burada gorunur.</div>
                    <Link href="/swipe" className="inline-flex px-4 py-2 rounded-full bg-pink-500 text-white text-xs">
                        Kesfete don
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {visibleRows.map((n) => {
                        const label = typeLabels[n.type] || 'Bildirim'
                        const payload = n.payload || {}
                        const title = payload.title || label
                        const body = payload.body || payload.subject || ''
                        const url = payload.url || typeTargets[n.type] || null
                        const meta = typeMeta[n.type] || { icon: Bell, tone: 'text-gray-300', pill: 'bg-white/10 border-white/10' }
                        const Icon = meta.icon
                        const content = (
                            <div className={clsx(
                                'glass-panel p-3 rounded-2xl border transition-colors',
                                n.is_read ? 'border-white/5 opacity-75' : 'border-pink-500/30'
                            )}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2.5">
                                        <span className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full border ${meta.pill}`}>
                                            <Icon size={13} className={meta.tone} />
                                        </span>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-sm">{title}</div>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-300">
                                                    {label}
                                                </span>
                                            </div>
                                            {body && <div className="text-[11px] text-gray-400 leading-snug">{body}</div>}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                        {new Date(n.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    {!n.is_read && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleRead(n.id)}
                                            className="text-[11px] h-7 px-2"
                                        >
                                            Okundu
                                        </Button>
                                    )}
                                    {url && (
                                        <span className="text-[11px] text-pink-300">Gor</span>
                                    )}
                                </div>
                            </div>
                        )
                        return url ? (
                            <Link key={n.id} href={url} onClick={() => handleRead(n.id)} className="block">
                                {content}
                            </Link>
                        ) : (
                            <div key={n.id} className="block">{content}</div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}