'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type CooldownRow = {
    id: string
    bot_id: string
    user_id: string
    last_sent_at: string
}
export default function AdminBotCooldownsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<CooldownRow[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_cooldowns')
            .select('*')
            .order('last_sent_at', { ascending: false })
            .limit(200)
        setRows((data || []) as CooldownRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const clearCooldown = async (id: string) => {
        await supabase.from('bot_cooldowns').delete().eq('id', id)
        await load()
    }
    const filtered = rows.filter((row) => {
        const term = query.trim().toLowerCase()
        if (!term) return true
        return `${row.bot_id} ${row.user_id}`.toLowerCase().includes(term)
    })
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Cooldowns</h1>
                    <p className="text-sm text-slate-500">Bot ve kullanıcı bazlı bekleme süreleri</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Ops</div>
            </div>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Bot ID veya User ID filtre"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
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
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold">{row.bot_id}</div>
                                    <div className="text-xs text-slate-500">{new Date(row.last_sent_at).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-slate-500">User: {row.user_id}</div>
                                <button
                                    onClick={() => clearCooldown(row.id)}
                                    className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                >
                                    Temizle
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}