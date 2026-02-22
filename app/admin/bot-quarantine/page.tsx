'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type QuarantineRow = {
    id: string
    user_id: string
    reason: string | null
    active: boolean
    created_at: string
}
export default function AdminBotQuarantinePage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<QuarantineRow[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState('')
    const [reason, setReason] = useState('')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_quarantine')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
        setRows((data || []) as QuarantineRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const addQuarantine = async () => {
        if (!userId.trim()) return
        await supabase.from('bot_quarantine').upsert({
            user_id: userId.trim(),
            reason: reason.trim() || null,
            active: true,
        })
        setUserId('')
        setReason('')
        await load()
    }
    const release = async (id: string) => {
        await supabase.from('bot_quarantine').update({ active: false }).eq('id', id)
        await load()
    }
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Quarantine</h1>
                    <p className="text-sm text-slate-500">Riskli kullanıcıları botlardan izole et</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Control</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-sm font-semibold">Yeni Quarantine</div>
                <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="User ID"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Sebep"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <button
                    onClick={addQuarantine}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
                >
                    Ekle
                </button>
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
                                    <div className="font-semibold">{row.user_id}</div>
                                    <div className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-slate-500">Aktif: {row.active ? 'evet' : 'hayır'}</div>
                                {row.reason && <div className="text-xs text-slate-600">Sebep: {row.reason}</div>}
                                {row.active && (
                                    <button
                                        onClick={() => release(row.id)}
                                        className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                    >
                                        Kaldır
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