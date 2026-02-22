'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type MemoryRow = {
    id: string
    match_id: string
    bot_id: string
    memory_text: string | null
    last_user_message: string | null
    last_bot_reply: string | null
    updated_at: string
}
export default function AdminBotMemoriesPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<MemoryRow[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_memories')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(200)
        setRows((data || []) as MemoryRow[])
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
        if (!term) return rows
        return rows.filter((row) => {
            const haystack = `${row.match_id} ${row.bot_id} ${row.memory_text || ''} ${row.last_user_message || ''} ${row.last_bot_reply || ''}`.toLowerCase()
            return haystack.includes(term)
        })
    }, [rows, query])
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Memory</h1>
                    <p className="text-sm text-slate-500">Match bazlı kısa hafıza kayıtları</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Live</div>
            </div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Match ID, Bot ID veya içerik ara"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-full"
            />
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
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-semibold">Match: {row.match_id}</div>
                                    <div className="text-xs text-slate-500">{new Date(row.updated_at).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-slate-500">Bot: {row.bot_id}</div>
                                {row.memory_text && (
                                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2">
                                        Hafıza: {row.memory_text}
                                    </div>
                                )}
                                {row.last_user_message && (
                                    <div className="text-xs text-slate-600 bg-white rounded-lg border border-slate-200 p-2">
                                        Son kullanıcı: {row.last_user_message}
                                    </div>
                                )}
                                {row.last_bot_reply && (
                                    <div className="text-xs text-slate-600 bg-white rounded-lg border border-slate-200 p-2">
                                        Son bot: {row.last_bot_reply}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}