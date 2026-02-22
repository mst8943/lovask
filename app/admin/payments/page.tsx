'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
export default function AdminPaymentsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<Array<{
        id: string
        kind: string
        provider: string | null
        amount: number
        currency: string
        status: 'pending' | 'paid' | 'failed' | 'canceled' | string
        created_at: string
        updated_at?: string | null
    }>>([])
    const [savingId, setSavingId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed' | 'canceled' | 'review'>('all')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })
        setRows(data || [])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }
    return (
        <div className="admin-page space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Kart Ödemeleri</h1>
                <p className="text-sm text-slate-700">Kart ödeme talepleri</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Durum</span>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1"
                >
                    <option value="all">Tümü</option>
                    <option value="pending">Pending</option>
                    <option value="review">Review</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="canceled">Canceled</option>
                </select>
            </div>
            {rows.filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter)).length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl text-sm text-slate-500">Kayıt yok.</div>
            ) : (
                <div className="space-y-3">
                    {rows
                        .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
                        .map((r) => (
                        <div key={r.id} className="glass-panel p-4 rounded-2xl">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold">{r.kind}</div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{r.provider}</div>
                            </div>
                            <div className="text-sm text-slate-600">{r.amount} {r.currency}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span>Durum:</span>
                                <select
                                    value={r.status}
                                    onChange={(e) => setRows((prev) => prev.map((row) => row.id === r.id ? { ...row, status: e.target.value } : row))}
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1"
                                >
                                    <option value="pending">pending</option>
                                    <option value="review">review</option>
                                    <option value="paid">paid</option>
                                    <option value="failed">failed</option>
                                    <option value="canceled">canceled</option>
                                </select>
                                <button
                                    onClick={async () => {
                                        setSavingId(r.id)
                                        await supabase.from('payments').update({ status: r.status, updated_at: new Date().toISOString() }).eq('id', r.id)
                                        await supabase.from('admin_audit_logs').insert({
                                            action: 'payment_status_update',
                                            target_table: 'payments',
                                            target_id: r.id,
                                            metadata: { status: r.status },
                                        })
                                        setSavingId(null)
                                    }}
                                    className="px-2 py-1 rounded-lg bg-white text-[10px]"
                                >
                                    {savingId === r.id ? '...' : 'Kaydet'}
                                </button>
                            </div>
                            <div className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}