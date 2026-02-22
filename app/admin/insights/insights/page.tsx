'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
type StatRow = { user_id: string; count: number }
type SpendRow = { user_id: string; amount: number }
type TrendBucket = { start: number; value: number }
export default function AdminInsightsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [timeframe, setTimeframe] = useState<'1h' | '6h' | '24h'>('1h')
    const [topLikes, setTopLikes] = useState<StatRow[]>([])
    const [topPasses, setTopPasses] = useState<StatRow[]>([])
    const [topSpends, setTopSpends] = useState<SpendRow[]>([])
    const [trendLikes, setTrendLikes] = useState<TrendBucket[]>([])
    const [trendPasses, setTrendPasses] = useState<TrendBucket[]>([])
    const [trendSpends, setTrendSpends] = useState<TrendBucket[]>([])
    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const hours = timeframe === '1h' ? 1 : timeframe === '6h' ? 6 : 24
            const { data } = await supabase.rpc('admin_insights_summary', { p_hours: hours, p_buckets: 12 })
            const row = Array.isArray(data) ? data[0] : data
            const parseTrend = (list: Array<{ start: string; value: number }>) =>
                (list || []).map((r) => ({ start: new Date(r.start).getTime(), value: Number(r.value || 0) }))
            setTopLikes((row?.top_likes || []) as StatRow[])
            setTopPasses((row?.top_passes || []) as StatRow[])
            setTopSpends((row?.top_spends || []) as SpendRow[])
            setTrendLikes(parseTrend((row?.trend_likes || []) as Array<{ start: string; value: number }>))
            setTrendPasses(parseTrend((row?.trend_passes || []) as Array<{ start: string; value: number }>))
            setTrendSpends(parseTrend((row?.trend_spends || []) as Array<{ start: string; value: number }>))
            setLoading(false)
        }
        load()
    }, [supabase, timeframe])
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
                    <h1 className="text-2xl font-bold">Anomali Paneli</h1>
                    <p className="text-sm text-slate-500">Aşırı aktivite / harcama görünümü</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center gap-2">
                    <Activity size={12} />
                    {timeframe === '1h' ? '1 saat' : timeframe === '6h' ? '6 saat' : '24 saat'}
                </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
                {(['1h', '6h', '24h'] as const).map((key) => (
                    <button
                        key={key}
                        onClick={() => setTimeframe(key)}
                        className={`px-3 py-1.5 rounded-full border ${timeframe === key ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {key === '1h' ? '1 saat' : key === '6h' ? '6 saat' : '24 saat'}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-sm font-semibold mb-2">En Çok Like</div>
                    <div className="mb-3 flex items-end gap-1 h-12">
                        {trendLikes.map((b, idx) => (
                            <div
                                key={`like-${b.start}-${idx}`}
                                className="flex-1 rounded-md bg-pink-500/30"
                                style={{ height: `${Math.max(4, Math.min(100, b.value * 6))}%` }}
                            />
                        ))}
                    </div>
                    {topLikes.length === 0 ? (
                        <div className="text-xs text-slate-500">Veri yok</div>
                    ) : (
                        <div className="space-y-2 text-xs">
                            {topLikes.map((r, idx) => (
                                <div key={r.user_id} className="flex items-center justify-between">
                                    <span className="text-slate-500">#{idx + 1}</span>
                                    <span className="truncate">{r.user_id}</span>
                                    <span className="text-pink-300">{r.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-sm font-semibold mb-2">En Çok Pass</div>
                    <div className="mb-3 flex items-end gap-1 h-12">
                        {trendPasses.map((b, idx) => (
                            <div
                                key={`pass-${b.start}-${idx}`}
                                className="flex-1 rounded-md bg-amber-500/30"
                                style={{ height: `${Math.max(4, Math.min(100, b.value * 6))}%` }}
                            />
                        ))}
                    </div>
                    {topPasses.length === 0 ? (
                        <div className="text-xs text-slate-500">Veri yok</div>
                    ) : (
                        <div className="space-y-2 text-xs">
                            {topPasses.map((r, idx) => (
                                <div key={r.user_id} className="flex items-center justify-between">
                                    <span className="text-slate-500">#{idx + 1}</span>
                                    <span className="truncate">{r.user_id}</span>
                                    <span className="text-amber-300">{r.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-sm font-semibold mb-2">En Çok Harcama</div>
                    <div className="mb-3 flex items-end gap-1 h-12">
                        {trendSpends.map((b, idx) => (
                            <div
                                key={`spend-${b.start}-${idx}`}
                                className="flex-1 rounded-md bg-emerald-500/30"
                                style={{ height: `${Math.max(4, Math.min(100, b.value / 10))}%` }}
                            />
                        ))}
                    </div>
                    {topSpends.length === 0 ? (
                        <div className="text-xs text-slate-500">Veri yok</div>
                    ) : (
                        <div className="space-y-2 text-xs">
                            {topSpends.map((r, idx) => (
                                <div key={r.user_id} className="flex items-center justify-between">
                                    <span className="text-slate-500">#{idx + 1}</span>
                                    <span className="truncate">{r.user_id}</span>
                                    <span className="text-emerald-700">{Math.round(r.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
