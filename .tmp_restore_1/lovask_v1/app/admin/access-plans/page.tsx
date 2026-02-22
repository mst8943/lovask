'use client'
import { useEffect, useState } from 'react'
import { fetchAccessPlans, saveAccessPlan, AccessPlan } from '@/services/accessPlanService'
import { Save } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
const DEFAULTS: AccessPlan[] = [
    { feature: 'liked_you', hours: 24, cost: 20, is_active: true },
    { feature: 'profile_viewers', hours: 24, cost: 15, is_active: true },
]
export default function AdminAccessPlansPage() {
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<AccessPlan[]>(DEFAULTS)
    const [saving, setSaving] = useState(false)
    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const data = await fetchAccessPlans()
            const map = new Map(data.map((d) => [d.feature, d]))
            setRows(DEFAULTS.map((d) => ({ ...d, ...(map.get(d.feature) || {}) })))
            setLoading(false)
        }
        load()
    }, [])
    const handleSave = async () => {
        setSaving(true)
        try {
            for (const row of rows) {
                await saveAccessPlan(row)
            }
        } finally {
            setSaving(false)
        }
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
                    <h1 className="text-2xl font-bold">Jetonla Açma Planları</h1>
                    <p className="text-sm text-gray-400">Beğenenler ve ziyaretçiler için süreli erişim</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-white/10 text-sm flex items-center gap-2"
                >
                    <Save size={14} />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
            <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-0 text-xs uppercase tracking-wider text-gray-400 border-b border-white/10 bg-white/5">
                    <div className="px-4 py-3">Ozellik</div>
                    <div className="px-4 py-3">Sure (saat)</div>
                    <div className="px-4 py-3">Fiyat (jeton)</div>
                    <div className="px-4 py-3">Durum</div>
                </div>
                <div className="divide-y divide-white/5">
                    {rows.map((row, idx) => (
                        <div key={row.feature} className="grid grid-cols-[1.4fr_1fr_1fr_0.8fr] gap-0 text-sm">
                            <div className="px-4 py-3 font-semibold capitalize">{row.feature.replace('_', ' ')}</div>
                            <div className="px-4 py-3">
                                <input
                                    type="number"
                                    value={row.hours}
                                    onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, hours: Number(e.target.value) } : r))}
                                    className="glass-input w-full px-3 py-2 rounded-xl border border-white/10"
                                    placeholder="Saat"
                                />
                            </div>
                            <div className="px-4 py-3">
                                <input
                                    type="number"
                                    value={row.cost}
                                    onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, cost: Number(e.target.value) } : r))}
                                    className="glass-input w-full px-3 py-2 rounded-xl border border-white/10"
                                    placeholder="Jeton"
                                />
                            </div>
                            <div className="px-4 py-3">
                                <label className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={row.is_active}
                                        onChange={(e) => setRows((prev) => prev.map((r, i) => i === idx ? { ...r, is_active: e.target.checked } : r))}
                                    />
                                    {row.is_active ? 'Acik' : 'Kapali'}
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}