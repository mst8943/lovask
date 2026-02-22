'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type SafetyRow = {
    id: string
    bot_id: string
    match_id: string
    user_id: string
    category: string
    content: string | null
    created_at: string
    status?: 'open' | 'resolved' | 'dismissed' | null
}
export default function AdminBotSafetyPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<SafetyRow[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState('all')
    const [status, setStatus] = useState<'all' | 'open' | 'resolved' | 'dismissed'>('open')
    const [actionId, setActionId] = useState<string | null>(null)
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_safety_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
        setRows((data || []) as SafetyRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase()
        return rows.filter((row) => {
            if (category !== 'all' && row.category !== category) return false
            if (status !== 'all' && (row.status || 'open') !== status) return false
            if (!term) return true
            const haystack = `${row.bot_id} ${row.match_id} ${row.user_id} ${row.content || ''}`.toLowerCase()
            return haystack.includes(term)
        })
    }, [rows, query, category, status])
    const updateStatus = useCallback(async (id: string, nextStatus: 'resolved' | 'dismissed') => {
        setActionId(id)
        try {
            const { data, error } = await supabase
                .from('bot_safety_events')
                .update({ status: nextStatus })
                .eq('id', id)
                .select('id,status')
                .maybeSingle()
            if (error) throw error
            setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: data?.status || nextStatus } : row)))
        } catch {
            // ignore
        } finally {
            setActionId(null)
        }
    }, [supabase])
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Safety</h1>
                    <p className="text-sm text-slate-500">Riskli içerikler ve flag kayıtları</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Kritik</div>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Bot ID / Match ID / içerik"
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                    <option value="all">Tümü</option>
                    <option value="contact">contact</option>
                    <option value="payment">payment</option>
                    <option value="unsafe">unsafe</option>
                    <option value="other">other</option>
                </select>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as typeof status)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                    <option value="open">Acik</option>
                    <option value="resolved">Cozuldu</option>
                    <option value="dismissed">Yok sayildi</option>
                    <option value="all">Tumu</option>
                </select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Spinner className="w-4 h-4 animate-spin" /> Yükleniyor...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-sm text-slate-500">Kayıt yok.</div>
                ) : (
                    <div className="space-y-3 text-sm">
                        {filtered.map((row) => (
                            <div key={row.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold">{row.category}</div>
                                    <div className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                                </div>
                                <div className="text-[11px] text-slate-500">Durum: {row.status || 'open'}</div>
                                <div className="text-xs text-slate-500">Bot: {row.bot_id}</div>
                                <div className="text-xs text-slate-500">Match: {row.match_id}</div>
                                <div className="text-xs text-slate-500">User: {row.user_id}</div>
                                {row.content && (
                                    <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2">{row.content}</div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700"
                                        onClick={() => updateStatus(row.id, 'resolved')}
                                        disabled={actionId === row.id}
                                    >
                                        Cozuldu
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-700"
                                        onClick={() => updateStatus(row.id, 'dismissed')}
                                        disabled={actionId === row.id}
                                    >
                                        Yok say
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
