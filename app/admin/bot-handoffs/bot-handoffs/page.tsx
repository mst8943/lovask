'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type HandoffRow = {
    id: string
    match_id: string
    bot_id: string
    reason: string | null
    active: boolean
    created_at: string
}
export default function AdminBotHandoffsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<HandoffRow[]>([])
    const [loading, setLoading] = useState(true)
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_handoffs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
        setRows((data || []) as HandoffRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const resolve = async (id: string) => {
        await supabase.from('bot_handoffs').update({ active: false }).eq('id', id)
        await load()
    }
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Handoffs</h1>
                    <p className="text-sm text-slate-500">Bot’tan insan moderasyona devredilen vakalar</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Queue</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Spinner className="w-4 h-4 animate-spin" /> Yükleniyor...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-sm text-slate-500">Kayıt yok.</div>
                ) : (
                    <div className="space-y-3 text-sm">
                        {rows.map((row) => (
                            <div key={row.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold">{row.match_id}</div>
                                    <div className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-slate-500">Bot: {row.bot_id}</div>
                                {row.reason && <div className="text-xs text-slate-600">Sebep: {row.reason}</div>}
                                <div className="text-xs text-slate-500">Aktif: {row.active ? 'evet' : 'hayır'}</div>
                                {row.active && (
                                    <button
                                        onClick={() => resolve(row.id)}
                                        className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                    >
                                        Çözüldü
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}