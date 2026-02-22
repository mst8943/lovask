'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type RefundRow = {
    id: string
    transaction_id: string | null
    user_id: string | null
    amount: number | null
    reason: string | null
    status: string
    created_at: string
}

export default function AdminRefundsPage() {
    const supabase = createClient()
    const [rows, setRows] = useState<RefundRow[]>([])

    const load = useCallback(async () => {
        const { data } = await supabase.from('refunds').select('*').order('created_at', { ascending: false })
        setRows((data || []) as RefundRow[])
    }, [supabase])

    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('refunds').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
        await load()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Refunds</h1>
                    <p className="text-sm text-gray-400">Iade kayitlari</p>
                </div>
                <button onClick={() => void load()} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Yenile
                </button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                    <div className="px-4 py-3">Transaction</div>
                    <div className="px-4 py-3">User</div>
                    <div className="px-4 py-3">Amount</div>
                    <div className="px-4 py-3">Status</div>
                    <div className="px-4 py-3">Aksiyon</div>
                </div>
                <div className="divide-y divide-white/5">
                    {rows.map((r) => (
                        <div key={r.id} className="grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr_1fr] gap-0 text-sm">
                            <div className="px-4 py-3 text-xs text-gray-300">{r.transaction_id || '-'}</div>
                            <div className="px-4 py-3 text-xs text-gray-300">{r.user_id || '-'}</div>
                            <div className="px-4 py-3 text-xs text-gray-300">{r.amount ?? '-'}</div>
                            <div className="px-4 py-3 text-xs text-gray-300">{r.status}</div>
                            <div className="px-4 py-3 flex items-center gap-2 text-xs">
                                <button onClick={() => updateStatus(r.id, 'approved')} className="px-2 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">Onayla</button>
                                <button onClick={() => updateStatus(r.id, 'rejected')} className="px-2 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700">Reddet</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
