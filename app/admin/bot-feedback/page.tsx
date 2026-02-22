'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type FeedbackRow = {
    id: string
    bot_id: string
    match_id: string
    message_id: string | null
    rating: string
    notes: string | null
    created_at: string
}
export default function AdminBotFeedbackPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<FeedbackRow[]>([])
    const [loading, setLoading] = useState(true)
    const [ratingFilter, setRatingFilter] = useState('all')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_feedback')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
        setRows((data || []) as FeedbackRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const filtered = rows.filter((row) => ratingFilter === 'all' || row.rating === ratingFilter)
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Feedback</h1>
                    <p className="text-sm text-slate-500">Kullanıcı geri bildirimleri</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Ops</div>
            </div>
            <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
                <option value="all">Tümü</option>
                <option value="good">good</option>
                <option value="bad">bad</option>
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
                                    <div className="font-semibold">{row.rating}</div>
                                    <div className="text-xs text-slate-500">{new Date(row.created_at).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-slate-500">Bot: {row.bot_id}</div>
                                <div className="text-xs text-slate-500">Match: {row.match_id}</div>
                                {row.message_id && <div className="text-xs text-slate-500">Message: {row.message_id}</div>}
                                {row.notes && (
                                    <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-2">{row.notes}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}