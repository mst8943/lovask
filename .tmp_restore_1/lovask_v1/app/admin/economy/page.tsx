'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
export default function AdminEconomyPage() {
    const supabase = useMemo(() => createClient(), [])
    const [loading, setLoading] = useState(true)
    const [coinsTotal, setCoinsTotal] = useState(0)
    const [premiumCount, setPremiumCount] = useState(0)
    const [pendingTransfers, setPendingTransfers] = useState(0)
    const [dailySpend, setDailySpend] = useState(0)
    const [dailyEarn, setDailyEarn] = useState(0)
    const [weeklySpend, setWeeklySpend] = useState(0)
    const [topSpenders, setTopSpenders] = useState<Array<{ user_id: string; amount: number }>>([])
    const load = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase.rpc('admin_economy_summary')
        const row = Array.isArray(data) ? data[0] : data
        setCoinsTotal(Number(row?.coins_total || 0))
        setPremiumCount(Number(row?.premium_count || 0))
        setPendingTransfers(Number(row?.pending_transfers || 0))
        setDailySpend(Number(row?.daily_spend || 0))
        setDailyEarn(Number(row?.daily_earn || 0))
        setWeeklySpend(Number(row?.weekly_spend || 0))
        setTopSpenders((row?.top_spenders || []) as Array<{ user_id: string; amount: number }>)
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
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Ekonomi</h1>
                    <p className="text-sm text-gray-400">Kısa özet ve trendler</p>
                </div>
                <button onClick={() => void load()} className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gray-300">
                    Yenile
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Wallet size={12} /> Toplam Jeton
                    </div>
                    <div className="text-2xl font-semibold mt-2">{coinsTotal}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <CreditCard size={12} /> Premium Üye
                    </div>
                    <div className="text-2xl font-semibold mt-2">{premiumCount}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <TrendingDown size={12} /> Günlük Harcama
                    </div>
                    <div className="text-2xl font-semibold mt-2">{Math.round(dailySpend)}</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <TrendingUp size={12} /> Günlük Kazanım
                    </div>
                    <div className="text-2xl font-semibold mt-2">{Math.round(dailyEarn)}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-sm font-semibold mb-2">Haftalık Harcama</div>
                    <div className="text-2xl font-semibold">{Math.round(weeklySpend)}</div>
                    <div className="text-xs text-gray-400 mt-1">Son 7 gün</div>
                </div>
                <div className="glass-panel p-4 rounded-2xl">
                    <div className="text-sm font-semibold mb-2">Bekleyen Transfer</div>
                    <div className="text-2xl font-semibold">{pendingTransfers}</div>
                    <div className="text-xs text-gray-400 mt-1">Banka transferi</div>
                </div>
            </div>
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.4fr_0.6fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                    <div className="px-4 py-3">Top Harcayan</div>
                    <div className="px-4 py-3">Jeton</div>
                </div>
                <div className="divide-y divide-white/5">
                    {topSpenders.map((r) => (
                        <div key={r.user_id} className="grid grid-cols-[1.4fr_0.6fr] gap-0 text-sm">
                            <div className="px-4 py-3 text-xs text-gray-300">{r.user_id}</div>
                            <div className="px-4 py-3 text-xs text-gray-300">{Math.round(r.amount)}</div>
                        </div>
                    ))}
                    {topSpenders.length === 0 && (
                        <div className="px-4 py-6 text-xs text-gray-500">Veri yok</div>
                    )}
                </div>
            </div>
        </div>
    )
}
