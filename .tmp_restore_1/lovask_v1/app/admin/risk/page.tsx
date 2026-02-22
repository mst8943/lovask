'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type RiskRow = {
    user_id: string
    score: number
    reason: Record<string, unknown> | null
    updated_at: string
}

export default function AdminRiskPage() {
    const supabase = createClient()
    const [rows, setRows] = useState<RiskRow[]>([])
    const [loading, setLoading] = useState(false)

    const load = useCallback(async () => {
        const { data } = await supabase.from('admin_risk_scores').select('*').order('score', { ascending: false }).limit(200)
        setRows((data || []) as RiskRow[])
    }, [supabase])

    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])

    const recompute = async () => {
        setLoading(true)
        const { data: reports } = await supabase
            .from('reports')
            .select('reported_id')
        const { data: bans } = await supabase
            .from('users')
            .select('id,is_banned')
        const reportCounts = new Map<string, number>()
        for (const r of (reports || []) as Array<{ reported_id: string }>) {
            reportCounts.set(r.reported_id, (reportCounts.get(r.reported_id) || 0) + 1)
        }
        const scores: RiskRow[] = []
        for (const u of (bans || []) as Array<{ id: string; is_banned: boolean }>) {
            const reportsCount = reportCounts.get(u.id) || 0
            const score = reportsCount * 10 + (u.is_banned ? 30 : 0)
            if (score <= 0) continue
            scores.push({
                user_id: u.id,
                score,
                reason: { reports: reportsCount, banned: u.is_banned },
                updated_at: new Date().toISOString(),
            })
        }
        for (const s of scores) {
            await supabase.from('admin_risk_scores').upsert(s, { onConflict: 'user_id' })
        }
        await load()
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Risk Skoru</h1>
                    <p className="text-sm text-gray-400">Basit risk skorlamasi</p>
                </div>
                <button onClick={recompute} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    {loading ? 'Hesaplaniyor...' : 'Skoru yenile'}
                </button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.4fr_0.6fr_1fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                    <div className="px-4 py-3">User</div>
                    <div className="px-4 py-3">Skor</div>
                    <div className="px-4 py-3">Neden</div>
                </div>
                <div className="divide-y divide-white/5">
                    {rows.map((r) => (
                        <div key={r.user_id} className="grid grid-cols-[1.4fr_0.6fr_1fr] gap-0 text-sm">
                            <div className="px-4 py-3 text-xs text-gray-300">{r.user_id}</div>
                            <div className="px-4 py-3 text-xs text-gray-300">{r.score}</div>
                            <div className="px-4 py-3 text-[10px] text-gray-400">{JSON.stringify(r.reason)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
