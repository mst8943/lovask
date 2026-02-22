'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, ShieldAlert, Star, Timer } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
type BotRow = { id: string; display_name: string | null }
type HealthRow = { bot_id: string; day: string; replies: number; reply_latency_ms: number; safety_flags: number }
type FeedbackRow = { bot_id: string; rating: string }
type SafetyRow = { bot_id: string; category: string; created_at: string }
export default function AdminBotAnalyticsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [bots, setBots] = useState<BotRow[]>([])
    const [healthRows, setHealthRows] = useState<HealthRow[]>([])
    const [feedbackRows, setFeedbackRows] = useState<FeedbackRow[]>([])
    const [safetyRows, setSafetyRows] = useState<SafetyRow[]>([])
    const load = useCallback(async () => {
        setLoading(true)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const [botsRes, healthRes, feedbackRes, safetyRes] = await Promise.all([
            supabase.from('profiles').select('id,display_name').eq('is_bot', true).limit(500),
            supabase.from('bot_health_daily').select('bot_id,day,replies,reply_latency_ms,safety_flags').gte('day', weekAgo).limit(1000),
            supabase.from('bot_feedback').select('bot_id,rating').gte('created_at', weekAgo).limit(1000),
            supabase.from('bot_safety_events').select('bot_id,category,created_at').gte('created_at', weekAgo).limit(1000),
        ])
        setBots((botsRes.data || []) as BotRow[])
        setHealthRows((healthRes.data || []) as HealthRow[])
        setFeedbackRows((feedbackRes.data || []) as FeedbackRow[])
        setSafetyRows((safetyRes.data || []) as SafetyRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const totals = healthRows.reduce(
        (acc, row) => {
            acc.replies += row.replies || 0
            acc.flags += row.safety_flags || 0
            acc.latencyTotal += row.reply_latency_ms || 0
            acc.count += 1
            return acc
        },
        { replies: 0, flags: 0, latencyTotal: 0, count: 0 }
    )
    const avgLatency = totals.count > 0 ? Math.round(totals.latencyTotal / totals.count) : 0
    const feedbackGood = feedbackRows.filter((r) => r.rating === 'good').length
    const feedbackBad = feedbackRows.filter((r) => r.rating === 'bad').length
    const feedbackScore = feedbackGood + feedbackBad > 0 ? Math.round((feedbackGood / (feedbackGood + feedbackBad)) * 100) : 0
    const safetyByCategory = safetyRows.reduce((acc: Record<string, number>, row) => {
        acc[row.category] = (acc[row.category] || 0) + 1
        return acc
    }, {})
    const repliesByBot = healthRows.reduce((acc: Record<string, number>, row) => {
        acc[row.bot_id] = (acc[row.bot_id] || 0) + (row.replies || 0)
        return acc
    }, {})
    const topBots = Object.entries(repliesByBot)
        .map(([bot_id, replies]) => ({ bot_id, replies }))
        .sort((a, b) => b.replies - a.replies)
        .slice(0, 10)
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
                    <h1 className="text-2xl font-bold">Bot Analitik</h1>
                    <p className="text-sm text-gray-400">Son 7 gunluk ozet</p>
                </div>
                <button onClick={() => void load()} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Yenile
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Activity size={12} /> Toplam Yanit
                    </div>
                    <div className="text-2xl font-semibold mt-2">{totals.replies}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Timer size={12} /> Ortalama Gecikme
                    </div>
                    <div className="text-2xl font-semibold mt-2">{avgLatency} ms</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <ShieldAlert size={12} /> Safety Flag
                    </div>
                    <div className="text-2xl font-semibold mt-2">{totals.flags}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Star size={12} /> Feedback Skoru
                    </div>
                    <div className="text-2xl font-semibold mt-2">%{feedbackScore}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1.4fr_0.6fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                        <div className="px-4 py-3">Top Botlar</div>
                        <div className="px-4 py-3">Yanit</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {topBots.map((row) => {
                            const bot = bots.find((b) => b.id === row.bot_id)
                            return (
                                <div key={row.bot_id} className="grid grid-cols-[1.4fr_0.6fr] gap-0 text-sm">
                                    <div className="px-4 py-3 text-xs text-gray-300">{bot?.display_name || row.bot_id}</div>
                                    <div className="px-4 py-3 text-xs text-gray-300">{row.replies}</div>
                                </div>
                            )
                        })}
                        {topBots.length === 0 && (
                            <div className="px-4 py-6 text-xs text-gray-500">Veri yok</div>
                        )}
                    </div>
                </div>
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-[1.4fr_0.6fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                        <div className="px-4 py-3">Safety Kategori</div>
                        <div className="px-4 py-3">Adet</div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {Object.entries(safetyByCategory).map(([key, value]) => (
                            <div key={key} className="grid grid-cols-[1.4fr_0.6fr] gap-0 text-sm">
                                <div className="px-4 py-3 text-xs text-gray-300">{key}</div>
                                <div className="px-4 py-3 text-xs text-gray-300">{value}</div>
                            </div>
                        ))}
                        {Object.keys(safetyByCategory).length === 0 && (
                            <div className="px-4 py-6 text-xs text-gray-500">Veri yok</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}