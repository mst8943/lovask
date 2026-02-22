'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type Transfer = {
    id: string
    user_id: string
    kind: 'coins' | 'premium'
    amount: number
    coins_amount: number | null
    premium_months: number | null
    status: 'pending' | 'verified' | 'rejected'
    reference: string | null
    receipt_url: string | null
    created_at: string
    users?: { email: string } | null
}
export default function BankTransfersPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [actionId, setActionId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const supabase = useMemo(() => createClient(), [])
    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
            .from('bank_transfers')
            .select('*, users:users!bank_transfers_user_id_fkey(email)')
            .order('created_at', { ascending: false })
        if (error) {
            setError(error.message)
        } else if (data) {
            setTransfers(data as Transfer[])
        }
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const statusLabel = (status: Transfer['status']) => {
        if (status === 'verified') return 'Onaylandı'
        if (status === 'rejected') return 'Reddedildi'
        return 'Beklemede'
    }
    const statusClass = (status: Transfer['status']) => {
        if (status === 'verified') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
        if (status === 'rejected') return 'bg-red-50 text-red-700 border-red-200'
        return 'bg-amber-50 text-amber-700 border-amber-200'
    }
    const verify = async (transferId: string, approve: boolean) => {
        setActionId(transferId)
        const { error } = await supabase.rpc('verify_bank_transfer', {
            p_transfer_id: transferId,
            p_approve: approve,
        })
        if (!error) await load()
        setActionId(null)
    }
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
                    <h1 className="text-2xl font-bold">Havale Bildirimleri</h1>
                    <p className="text-sm text-gray-400">Bekleyen havale taleplerini yönet</p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Ödeme
                </div>
            </div>
            <div className="space-y-3">
                {error && (
                    <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                        {error}
                    </div>
                )}
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_1.4fr_1.2fr_1fr_1fr_1.3fr] gap-0 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 bg-slate-50">
                        <div className="px-4 py-3">Tür</div>
                        <div className="px-4 py-3">Kullanıcı</div>
                        <div className="px-4 py-3">Tutar</div>
                        <div className="px-4 py-3">Durum</div>
                        <div className="px-4 py-3">Tarih</div>
                        <div className="px-4 py-3">İşlem</div>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {transfers.map((t) => (
                            <div key={t.id} className="grid grid-cols-[1fr_1.4fr_1.2fr_1fr_1fr_1.3fr] gap-0 text-sm">
                                <div className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 border border-slate-200 text-slate-700">
                                        {t.kind === 'coins' ? 'Jeton' : 'Premium'}
                                    </span>
                                    {t.reference && (
                                        <div className="text-[10px] text-slate-500 mt-2">Ref: {t.reference}</div>
                                    )}
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-600 break-words">
                                    {t.users?.email || t.user_id}
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-600">
                                    {t.amount} TRY
                                    {t.kind === 'coins' && t.coins_amount ? ` · Jeton: ${t.coins_amount}` : ''}
                                    {t.kind === 'premium' && t.premium_months ? ` · Ay: ${t.premium_months}` : ''}
                                    {t.receipt_url && (
                                        <div className="mt-1">
                                            <a
                                                className="text-[10px] text-pink-600 underline"
                                                href={t.receipt_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Makbuz
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div className="px-4 py-3 text-xs">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusClass(t.status)}`}>
                                        {statusLabel(t.status)}
                                    </span>
                                </div>
                                <div className="px-4 py-3 text-xs text-slate-500">
                                    {new Date(t.created_at).toLocaleString()}
                                </div>
                                <div className="px-4 py-3 text-xs flex items-center gap-2">
                                    {t.status === 'pending' ? (
                                        <>
                                            <button
                                                onClick={() => verify(t.id, true)}
                                                disabled={actionId === t.id}
                                                className="px-3 py-2 rounded-lg admin-primary-btn text-xs"
                                            >
                                                Onayla
                                            </button>
                                            <button
                                                onClick={() => verify(t.id, false)}
                                                disabled={actionId === t.id}
                                                className="px-3 py-2 rounded-lg admin-danger-btn text-xs"
                                            >
                                                Reddet
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
