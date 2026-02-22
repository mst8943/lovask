'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Inbox } from 'lucide-react'
import Link from 'next/link'
import Spinner from '@/components/ui/Spinner'
import { usePresenceStore } from '@/store/usePresenceStore'
type InboxItem = {
    id: string
    type: 'support' | 'report' | 'verification' | 'notification'
    title: string
    status?: string | null
    userId?: string | null
    created_at: string
    targetUrl: string
    meta?: string | null
}
export default function AdminInboxPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<InboxItem[]>([])
    const [filter, setFilter] = useState<'all' | InboxItem['type']>('all')
    const [now, setNow] = useState(() => Date.now())
    const [lastActiveMap, setLastActiveMap] = useState<Record<string, string | null>>({})
    const onlineUsers = usePresenceStore((s) => s.onlineUsers)
    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const [supportRes, reportsRes, verRes, notifRes] = await Promise.all([
                supabase.from('support_tickets').select('id,user_id,subject,status,created_at').order('created_at', { ascending: false }).limit(50),
                supabase.from('reports').select('id,reported_id,reporter_id,reason,status,created_at').order('created_at', { ascending: false }).limit(50),
                supabase.from('user_verifications').select('id,user_id,type,status,created_at').order('created_at', { ascending: false }).limit(50),
                supabase.from('notifications').select('id,user_id,type,created_at').order('created_at', { ascending: false }).limit(50),
            ])
            const support = (supportRes.data || []).map((r: { id: string; user_id: string; subject: string; status: string; created_at: string }) => ({
                id: r.id,
                type: 'support' as const,
                title: r.subject,
                status: r.status,
                userId: r.user_id,
                created_at: r.created_at,
                targetUrl: '/admin/support',
            }))
            const reports = (reportsRes.data || []).map((r: { id: string; reported_id: string; reporter_id: string; reason: string | null; status: string; created_at: string }) => ({
                id: r.id,
                type: 'report' as const,
                title: r.reason || 'Rapor',
                status: r.status,
                userId: r.reported_id,
                created_at: r.created_at,
                targetUrl: '/admin/reports',
                meta: r.reporter_id,
            }))
            const verifications = (verRes.data || []).map((r: { id: string; user_id: string; type: string; status: string; created_at: string }) => ({
                id: r.id,
                type: 'verification' as const,
                title: `Doğrulama: ${r.type}`,
                status: r.status,
                userId: r.user_id,
                created_at: r.created_at,
                targetUrl: '/admin/verifications',
            }))
            const notifications = (notifRes.data || []).map((r: { id: string; user_id: string; type: string; created_at: string }) => ({
                id: r.id,
                type: 'notification' as const,
                title: `Bildirim: ${r.type}`,
                created_at: r.created_at,
                userId: r.user_id,
                targetUrl: '/admin/notifications',
            }))
            const merged = [...support, ...reports, ...verifications, ...notifications]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 150)
            setItems(merged)
            const ids = Array.from(new Set(merged.map((m) => m.userId).filter(Boolean))) as string[]
            if (ids.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id,last_active_at')
                    .in('id', ids)
                const next: Record<string, string | null> = {}
                for (const u of (users || []) as Array<{ id: string; last_active_at: string | null }>) {
                    next[u.id] = u.last_active_at
                }
                setLastActiveMap(next)
            } else {
                setLastActiveMap({})
            }
            setLoading(false)
        }
        load()
    }, [supabase])
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000)
        return () => clearInterval(id)
    }, [])
    const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter)
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Kuyruk</h1>
                    <p className="text-sm text-slate-400">Destek, rapor ve doğrulama takibi</p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-slate-600 flex items-center gap-2">
                    <Inbox size={12} />
                    Canlı özet
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Toplam</div>
                    <div className="text-2xl font-semibold text-slate-800 mt-2">{items.length}</div>
                    <div className="text-xs text-slate-400">Kayıt</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Bekleyen</div>
                    <div className="text-2xl font-semibold text-slate-800 mt-2">{items.filter((i) => (i.status || '').toLowerCase() === 'pending').length}</div>
                    <div className="text-xs text-slate-400">Kayıt</div>
                </div>
                <div className="glass-panel p-4 rounded-xl border border-white/10">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Son 24 Saat</div>
                    <div className="text-2xl font-semibold text-slate-800 mt-2">
                        {items.filter((i) => new Date(i.created_at).getTime() >= now - 24 * 60 * 60 * 1000).length}
                    </div>
                    <div className="text-xs text-slate-400">Kayıt</div>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {(['all', 'support', 'report', 'verification', 'notification'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1.5 rounded-full border ${filter === key ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-white/5 text-slate-600 border-white/10'}`}
                    >
                        {key === 'all' ? 'Tümü' : key}
                    </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                    <Link href="/admin/support" className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                        Destek
                    </Link>
                    <Link href="/admin/reports" className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                        Raporlar
                    </Link>
                    <Link href="/admin/verifications" className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
                        Doğrulama
                    </Link>
                </div>
            </div>
            {filtered.length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-slate-400">Kayıt yok.</div>
            ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr] gap-0 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10 bg-white/5">
                        <div className="px-4 py-3">Başlık</div>
                        <div className="px-4 py-3">Tip</div>
                        <div className="px-4 py-3">Durum</div>
                        <div className="px-4 py-3">Zaman</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {filtered.map((item) => (
                            <Link key={`${item.type}-${item.id}`} href={item.targetUrl} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr] gap-0 text-sm hover:bg-white/5">
                                <div className="px-4 py-3">
                                    <div className="font-semibold truncate">{item.title}</div>
                                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-2">
                                        <span className="truncate">{item.userId || item.meta || item.id}</span>
                                        {item.userId && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${onlineUsers.has(item.userId) || (lastActiveMap[item.userId] && now - new Date(lastActiveMap[item.userId] as string).getTime() < 10 * 60 * 1000) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(item.userId) || (lastActiveMap[item.userId] && now - new Date(lastActiveMap[item.userId] as string).getTime() < 10 * 60 * 1000) ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                {onlineUsers.has(item.userId) || (lastActiveMap[item.userId] && now - new Date(lastActiveMap[item.userId] as string).getTime() < 10 * 60 * 1000) ? 'Çevrim içi' : 'Çevrimdışı'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-600">{item.type}</div>
                                <div className="px-4 py-3 text-xs text-slate-600">{item.status || '—'}</div>
                                <div className="px-4 py-3 text-xs text-slate-600">{new Date(item.created_at).toLocaleString()}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
