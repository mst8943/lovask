'use client'
import { useCallback, useEffect, useState } from 'react'
import Spinner from '@/components/ui/Spinner'

type CoinPackage = {
    id?: string
    title?: string | null
    coins: number
    price: number
    currency?: string | null
    is_active: boolean
    sort_order: number
}

type PremiumPlan = {
    id?: string
    title?: string | null
    months: number
    price: number
    currency?: string | null
    is_active: boolean
    sort_order: number
}

export default function AdminPackagesPage() {
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([])
    const [premiumPlans, setPremiumPlans] = useState<PremiumPlan[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/packages/list', { method: 'POST' })
        if (res.ok) {
            const payload = await res.json()
            setCoinPackages(payload.coin_packages || [])
            setPremiumPlans(payload.premium_plans || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    const saveRow = async (kind: 'coins' | 'premium', row: CoinPackage | PremiumPlan) => {
        const key = row.id || `new-${Date.now()}`
        setSavingId(key)
        await fetch('/api/admin/packages/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, row }),
        })
        await load()
        setSavingId(null)
    }

    const deleteRow = async (kind: 'coins' | 'premium', id?: string) => {
        if (!id) return
        setSavingId(id)
        await fetch('/api/admin/packages/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind, id }),
        })
        await load()
        setSavingId(null)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Spinner className="animate-spin w-8 h-8 text-pink-500" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Paketler</h1>
                <p className="text-sm text-slate-600">Jeton paketleri ve premium planları buradan yönet.</p>
            </div>

            <section className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <div className="font-semibold">Jeton Paketleri</div>
                    <button
                        onClick={() => setCoinPackages((prev) => ([
                            ...prev,
                            { title: 'Yeni Paket', coins: 100, price: 49, currency: 'TRY', is_active: true, sort_order: prev.length },
                        ]))}
                        className="px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200"
                    >
                        Yeni Ekle
                    </button>
                </div>
                <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.6fr_0.7fr] gap-2 text-xs text-slate-500">
                    <div>Başlık</div>
                    <div>Jeton</div>
                    <div>Fiyat</div>
                    <div>Para</div>
                    <div>Sıra</div>
                    <div>Durum</div>
                </div>
                {coinPackages.map((row, idx) => (
                    <div key={row.id || `coin-${idx}`} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.6fr_0.7fr] gap-2 items-center text-sm">
                        <input
                            value={row.title || ''}
                            onChange={(e) => setCoinPackages((prev) => prev.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            type="number"
                            value={row.coins}
                            onChange={(e) => setCoinPackages((prev) => prev.map((r, i) => i === idx ? { ...r, coins: Number(e.target.value) } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            type="number"
                            value={row.price}
                            onChange={(e) => setCoinPackages((prev) => prev.map((r, i) => i === idx ? { ...r, price: Number(e.target.value) } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            value={row.currency || 'TRY'}
                            onChange={(e) => setCoinPackages((prev) => prev.map((r, i) => i === idx ? { ...r, currency: e.target.value } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            type="number"
                            value={row.sort_order}
                            onChange={(e) => setCoinPackages((prev) => prev.map((r, i) => i === idx ? { ...r, sort_order: Number(e.target.value) } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={row.is_active}
                                    onChange={(e) => setCoinPackages((prev) => prev.map((r, i) => i === idx ? { ...r, is_active: e.target.checked } : r))}
                                />
                                Aktif
                            </label>
                            <button
                                onClick={() => saveRow('coins', row)}
                                className="px-2 py-1 rounded-lg bg-white text-[11px] border border-slate-200"
                            >
                                {savingId === (row.id || `coin-${idx}`) ? '...' : 'Kaydet'}
                            </button>
                            {row.id && (
                                <button
                                    onClick={() => deleteRow('coins', row.id)}
                                    className="px-2 py-1 rounded-lg text-[11px] border border-red-200 text-red-600"
                                >
                                    Sil
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </section>

            <section className="glass-panel p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <div className="font-semibold">Premium Planlar</div>
                    <button
                        onClick={() => setPremiumPlans((prev) => ([
                            ...prev,
                            { title: 'Yeni Plan', months: 1, price: 199, currency: 'TRY', is_active: true, sort_order: prev.length },
                        ]))}
                        className="px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200"
                    >
                        Yeni Ekle
                    </button>
                </div>
                <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.6fr_0.7fr] gap-2 text-xs text-slate-500">
                    <div>Başlık</div>
                    <div>Ay</div>
                    <div>Fiyat</div>
                    <div>Para</div>
                    <div>Sıra</div>
                    <div>Durum</div>
                </div>
                {premiumPlans.map((row, idx) => (
                    <div key={row.id || `premium-${idx}`} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr_0.6fr_0.7fr] gap-2 items-center text-sm">
                        <input
                            value={row.title || ''}
                            onChange={(e) => setPremiumPlans((prev) => prev.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            type="number"
                            value={row.months}
                            onChange={(e) => setPremiumPlans((prev) => prev.map((r, i) => i === idx ? { ...r, months: Number(e.target.value) } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            type="number"
                            value={row.price}
                            onChange={(e) => setPremiumPlans((prev) => prev.map((r, i) => i === idx ? { ...r, price: Number(e.target.value) } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            value={row.currency || 'TRY'}
                            onChange={(e) => setPremiumPlans((prev) => prev.map((r, i) => i === idx ? { ...r, currency: e.target.value } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <input
                            type="number"
                            value={row.sort_order}
                            onChange={(e) => setPremiumPlans((prev) => prev.map((r, i) => i === idx ? { ...r, sort_order: Number(e.target.value) } : r))}
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white"
                        />
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={row.is_active}
                                    onChange={(e) => setPremiumPlans((prev) => prev.map((r, i) => i === idx ? { ...r, is_active: e.target.checked } : r))}
                                />
                                Aktif
                            </label>
                            <button
                                onClick={() => saveRow('premium', row)}
                                className="px-2 py-1 rounded-lg bg-white text-[11px] border border-slate-200"
                            >
                                {savingId === (row.id || `premium-${idx}`) ? '...' : 'Kaydet'}
                            </button>
                            {row.id && (
                                <button
                                    onClick={() => deleteRow('premium', row.id)}
                                    className="px-2 py-1 rounded-lg text-[11px] border border-red-200 text-red-600"
                                >
                                    Sil
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    )
}

