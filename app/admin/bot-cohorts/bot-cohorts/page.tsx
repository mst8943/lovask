'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type CohortRow = {
    id: string
    cohort_key: string
    bot_id: string | null
    match_rate: number | null
    reply_rate: number | null
    report_rate: number | null
    day: string
}
export default function AdminBotCohortsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<CohortRow[]>([])
    const [loading, setLoading] = useState(true)
    const [cohortKey, setCohortKey] = useState('')
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('bot_cohort_metrics')
            .select('*')
            .order('day', { ascending: false })
            .limit(200)
        setRows((data || []) as CohortRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const filtered = rows.filter((row) => {
        if (!cohortKey.trim()) return true
        return row.cohort_key.toLowerCase().includes(cohortKey.trim().toLowerCase())
    })
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Cohorts</h1>
                    <p className="text-sm text-slate-500">Cohort bazlı performans metrikleri</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Metrics</div>
            </div>
            <input
                value={cohortKey}
                onChange={(e) => setCohortKey(e.target.value)}
                placeholder="Cohort key filtre"
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
                            <div key={row.id} className="rounded-xl border border-slate-200 p-3 grid grid-cols-1 md:grid-cols-5 gap-2">
                                <div>
                                    <div className="text-xs text-slate-400">Cohort</div>
                                    <div className="font-semibold">{row.cohort_key}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Bot</div>
                                    <div className="truncate">{row.bot_id || 'global'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Match</div>
                                    <div>{row.match_rate ?? 0}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Reply</div>
                                    <div>{row.reply_rate ?? 0}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Report</div>
                                    <div>{row.report_rate ?? 0}</div>
                                </div>
                                <div className="md:col-span-5 text-xs text-slate-500">Gün: {row.day}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}