'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type ReviewRow = {
    id: string
    photo_id: string
    status: string
    notes: string | null
    updated_at: string
}
export default function AdminBotImageReviewsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<ReviewRow[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('pending')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_image_reviews')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(200)
        setRows((data || []) as ReviewRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const updateStatus = async (id: string, status: string) => {
        await supabase.from('bot_image_reviews').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
        await load()
    }
    const filtered = rows.filter((row) => statusFilter === 'all' || row.status === statusFilter)
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Image Review</h1>
                    <p className="text-sm text-slate-500">Foto onay kuyruğu</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Queue</div>
            </div>
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
                <option value="all">Tümü</option>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
            </select>
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
                                    <div className="font-semibold">{row.photo_id}</div>
                                    <div className="text-xs text-slate-500">{new Date(row.updated_at).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-slate-500">Status: {row.status}</div>
                                {row.notes && <div className="text-xs text-slate-600">Not: {row.notes}</div>}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => updateStatus(row.id, 'approved')}
                                        className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                    >
                                        Onayla
                                    </button>
                                    <button
                                        onClick={() => updateStatus(row.id, 'rejected')}
                                        className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                    >
                                        Reddet
                                    </button>
                                    <button
                                        onClick={() => updateStatus(row.id, 'pending')}
                                        className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                    >
                                        Beklemede
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