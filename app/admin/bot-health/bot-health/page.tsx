'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type HealthRow = {
    id: string
    bot_id: string
    day: string
    replies: number
    reply_latency_ms: number
    safety_flags: number
}
export default function AdminBotHealthPage() {
    const supabase = useMemo(() => createClient(), [])
    const [rows, setRows] = useState<HealthRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filterBot, setFilterBot] = useState('')
    const load = useCallback(async () => {
        setLoading(true)
        const query = supabase
            .from('bot_health_daily')
            .select('id,bot_id,day,replies,reply_latency_ms,safety_flags')
            .order('day', { ascending: false })
            .limit(200)
        const { data } = filterBot
            ? await query.eq('bot_id', filterBot.trim())
            : await query
        setRows((data || []) as HealthRow[])
        setLoading(false)
    }, [filterBot, supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const summary = rows.reduce(
        (acc, row) => {
            acc.replies += row.replies || 0
            acc.flags += row.safety_flags || 0
            acc.latencyTotal += row.reply_latency_ms || 0
            acc.count += 1
            return acc
        },
        { replies: 0, flags: 0, latencyTotal: 0, count: 0 }
    )
    const avgLatency = summary.count > 0 ? Math.round(summary.latencyTotal / summary.count) : 0
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot Sağlık</h1>
                    <p className="text-sm text-slate-500">Günlük yanıt, gecikme ve safety verileri</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Live</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <input
                    value={filterBot}
                    onChange={(e) => setFilterBot(e.target.value)}
                    placeholder="Bot ID filtresi"
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
                />
                <button
                    onClick={() => setFilterBot('')}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                    Temizle
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Toplam Yanıt</div>
                    <div className="text-2xl font-semibold">{summary.replies}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Safety Flag</div>
                    <div className="text-2xl font-semibold">{summary.flags}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Ort. Gecikme (ms)</div>
                    <div className="text-2xl font-semibold">{avgLatency}</div>
                </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold mb-3">Günlük Bot Sağlık</div>
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Spinner className="w-4 h-4 animate-spin" /> Yükleniyor...
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-sm text-slate-500">Kayıt yok.</div>
                ) : (
                    <div className="space-y-2 text-sm">
                        {rows.map((row) => (
                            <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 rounded-xl border border-slate-200 p-3">
                                <div>
                                    <div className="text-xs text-slate-400">Tarih</div>
                                    <div className="font-semibold">{row.day}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Bot</div>
                                    <div className="truncate">{row.bot_id}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Yanıt</div>
                                    <div className="font-semibold">{row.replies}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Gecikme (ms)</div>
                                    <div className="font-semibold">{row.reply_latency_ms}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Safety</div>
                                    <div className="font-semibold">{row.safety_flags}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}