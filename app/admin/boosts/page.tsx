'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
type BoostRow = {
    id: string
    user_id: string
    starts_at: string
    ends_at: string
    source: string
    created_at: string
}
export default function AdminBoostsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<BoostRow[]>([])
    const [names, setNames] = useState<Record<string, string>>({})
    const [now, setNow] = useState(() => Date.now())
    const loadNames = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return
        const missing = ids.filter((id) => !names[id])
        if (missing.length === 0) return
        const { data } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', missing)
        if (data) {
            const map = new Map(Object.entries(names))
            for (const row of data as Array<{ id: string; display_name: string | null }>) {
                map.set(row.id, row.display_name || row.id.slice(0, 6))
            }
            setNames(Object.fromEntries(map.entries()))
        }
    }, [names, supabase])
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('boosts')
            .select('id,user_id,starts_at,ends_at,source,created_at')
            .order('created_at', { ascending: false })
            .limit(200)
        const next = (data || []) as BoostRow[]
        setRows(next)
        await loadNames(next.map((r) => r.user_id))
        setLoading(false)
    }, [loadNames, supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    useEffect(() => {
        const channel = supabase
            .channel('admin-boosts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'boosts' },
                (payload) => {
                    const next = payload.new as BoostRow
                    const prev = payload.old as BoostRow
                    if (payload.eventType === 'INSERT' && next) {
                        setRows((rows) => [next, ...rows])
                        void loadNames([next.user_id])
                    } else if (payload.eventType === 'UPDATE' && next) {
                        setRows((rows) => rows.map((r) => (r.id === next.id ? next : r)))
                    } else if (payload.eventType === 'DELETE' && prev) {
                        setRows((rows) => rows.filter((r) => r.id !== prev.id))
                    }
                }
            )
            .subscribe()
        return () => {
            supabase.removeChannel(channel)
        }
    }, [loadNames, supabase])
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now())
        }, 30000)
        return () => clearInterval(timer)
    }, [])
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
                    <h1 className="text-2xl font-bold">Boostlar</h1>
                    <p className="text-sm text-gray-400">Gercek zamanli boost kullanimi</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300 flex items-center gap-2">
                    <Zap size={12} />
                    Canli
                </div>
            </div>
            {rows.length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-gray-400">Boost kaydi yok.</div>
            ) : (
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                        <div className="px-4 py-3">Kullanici</div>
                        <div className="px-4 py-3">Kaynak</div>
                        <div className="px-4 py-3">Baslangic</div>
                        <div className="px-4 py-3">Bitis</div>
                        <div className="px-4 py-3">Durum</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {rows.map((r) => {
                            const active = new Date(r.ends_at).getTime() > now
                            return (
                                <div key={r.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr] gap-0 text-sm">
                                    <div className="px-4 py-3">
                                        <div className="font-semibold">{names[r.user_id] || r.user_id.slice(0, 6)}</div>
                                        <div className="text-[10px] text-gray-500">{r.user_id}</div>
                                    </div>
                                    <div className="px-4 py-3 text-xs text-gray-300">{r.source}</div>
                                    <div className="px-4 py-3 text-xs text-gray-300">{new Date(r.starts_at).toLocaleString()}</div>
                                    <div className="px-4 py-3 text-xs text-gray-300">{new Date(r.ends_at).toLocaleString()}</div>
                                    <div className="px-4 py-3 text-xs">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white/10 text-gray-300 border-white/10'}`}>
                                            {active ? 'Aktif' : 'Bitti'}
                                        </span>
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
