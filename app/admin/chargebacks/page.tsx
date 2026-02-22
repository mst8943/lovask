'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ChargebackRow = {
    id: string
    transaction_id: string | null
    user_id: string | null
    amount: number | null
    reason: string | null
    status: string
    created_at: string
}

export default function AdminChargebacksPage() {
    const supabase = createClient()
    const [rows, setRows] = useState<ChargebackRow[]>([])

    const load = useCallback(async () => {
        const { data } = await supabase.from('chargebacks').select('*').order('created_at', { ascending: false })
        setRows((data || []) as ChargebackRow[])
    }, [supabase])

    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('chargebacks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
        await load()
    }

    return (
        <div className="admin-page space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Chargebacks</h1>
                    <p className="text-sm text-slate-700">Chargeback takip</p>
                </div>
                <button onClick={() => void load()} className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    Yenile
                </button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr] gap-0 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-white">
                    <div className="px-4 py-3">Transaction</div>
                    <div className="px-4 py-3">User</div>
                    <div className="px-4 py-3">Amount</div>
                    <div className="px-4 py-3">Status</div>
                    <div className="px-4 py-3">Aksiyon</div>
                </div>
                <div className="divide-y divide-white/5">
                    {rows.map((r) => (
                        <div key={r.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr] gap-0 text-sm">
                            <div className="px-4 py-3 text-xs text-slate-600">{r.transaction_id || '-'}</div>
                            <div className="px-4 py-3 text-xs text-slate-600">{r.user_id || '-'}</div>
                            <div className="px-4 py-3 text-xs text-slate-600">{r.amount ?? '-'}</div>
                            <div className="px-4 py-3 text-xs text-slate-600">{r.status}</div>
                            <div className="px-4 py-3 flex items-center gap-2 text-xs">
                                <button onClick={() => updateStatus(r.id, 'review')} className="px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">Review</button>
                                <button onClick={() => updateStatus(r.id, 'closed')} className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">Kapat</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
