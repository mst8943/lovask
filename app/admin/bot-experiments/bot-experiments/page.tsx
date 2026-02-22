'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Spinner from '@/components/ui/Spinner'
type ExperimentRow = {
    id: string
    name: string
    status: string
    target_type: string
    target_id: string | null
    created_at: string
}
type VariantRow = {
    id: string
    experiment_id: string
    name: string
    prompt: string
    weight: number
}
export default function AdminBotExperimentsPage() {
    const supabase = useMemo(() => createClient(), [])
    const [experiments, setExperiments] = useState<ExperimentRow[]>([])
    const [variants, setVariants] = useState<VariantRow[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: '',
        status: 'active',
        targetType: 'bot',
        targetId: '',
    })
    const [variantForm, setVariantForm] = useState({
        experimentId: '',
        name: '',
        prompt: '',
        weight: 50,
    })
    const load = useCallback(async () => {
        setLoading(true)
        const [expRes, varRes] = await Promise.all([
            supabase.from('bot_experiments').select('*').order('created_at', { ascending: false }),
            supabase.from('bot_experiment_variants').select('*').order('name', { ascending: true }),
        ])
        setExperiments((expRes.data || []) as ExperimentRow[])
        setVariants((varRes.data || []) as VariantRow[])
        setLoading(false)
    }, [supabase])
    useEffect(() => {
        const id = setTimeout(() => {
            void load()
        }, 0)
        return () => clearTimeout(id)
    }, [load])
    const createExperiment = async () => {
        if (!form.name.trim()) return
        await supabase.from('bot_experiments').insert({
            name: form.name.trim(),
            status: form.status,
            target_type: form.targetType,
            target_id: form.targetId || null,
        })
        setForm({ name: '', status: 'active', targetType: 'bot', targetId: '' })
        await load()
    }
    const createVariant = async () => {
        if (!variantForm.experimentId || !variantForm.name.trim() || !variantForm.prompt.trim()) return
        await supabase.from('bot_experiment_variants').insert({
            experiment_id: variantForm.experimentId,
            name: variantForm.name.trim(),
            prompt: variantForm.prompt.trim(),
            weight: Number(variantForm.weight || 50),
        })
        setVariantForm({ experimentId: '', name: '', prompt: '', weight: 50 })
        await load()
    }
    const updateStatus = async (id: string, status: string) => {
        await supabase.from('bot_experiments').update({ status }).eq('id', id)
        await load()
    }
    const selectedVariants = selected
        ? variants.filter((v) => v.experiment_id === selected)
        : []
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bot A/B Deneyleri</h1>
                    <p className="text-sm text-slate-500">Prompt varyantları ve ağırlık dağılımları</p>
                </div>
                <div className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white">Ops</div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="text-sm font-semibold">Yeni Deney</div>
                    <input
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Deney adı"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <select
                            value={form.status}
                            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        >
                            <option value="active">active</option>
                            <option value="paused">paused</option>
                        </select>
                        <select
                            value={form.targetType}
                            onChange={(e) => setForm((prev) => ({ ...prev, targetType: e.target.value }))}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                        >
                            <option value="bot">bot</option>
                            <option value="group">group</option>
                            <option value="global">global</option>
                        </select>
                    </div>
                    <input
                        value={form.targetId}
                        onChange={(e) => setForm((prev) => ({ ...prev, targetId: e.target.value }))}
                        placeholder="Target ID (opsiyonel)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                    <button
                        onClick={createExperiment}
                        className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
                    >
                        Kaydet
                    </button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="text-sm font-semibold">Yeni Varyant</div>
                    <select
                        value={variantForm.experimentId}
                        onChange={(e) => setVariantForm((prev) => ({ ...prev, experimentId: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    >
                        <option value="">Deney seç</option>
                        {experiments.map((exp) => (
                            <option key={exp.id} value={exp.id}>{exp.name}</option>
                        ))}
                    </select>
                    <input
                        value={variantForm.name}
                        onChange={(e) => setVariantForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Varyant adı"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                    <textarea
                        value={variantForm.prompt}
                        onChange={(e) => setVariantForm((prev) => ({ ...prev, prompt: e.target.value }))}
                        placeholder="Prompt içeriği"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm min-h-[90px]"
                    />
                    <input
                        type="number"
                        value={variantForm.weight}
                        onChange={(e) => setVariantForm((prev) => ({ ...prev, weight: Number(e.target.value) }))}
                        placeholder="Ağırlık"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                    <button
                        onClick={createVariant}
                        className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
                    >
                        Varyant Ekle
                    </button>
                </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold mb-3">Deney Listesi</div>
                {loading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Spinner className="w-4 h-4 animate-spin" /> Yükleniyor...
                    </div>
                ) : experiments.length === 0 ? (
                    <div className="text-sm text-slate-500">Kayıt yok.</div>
                ) : (
                    <div className="space-y-3">
                        {experiments.map((exp) => (
                            <div key={exp.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <button
                                        onClick={() => setSelected(exp.id)}
                                        className="text-left font-semibold"
                                    >
                                        {exp.name}
                                    </button>
                                    <div className="text-xs text-slate-500">{exp.target_type} • {exp.status}</div>
                                </div>
                                <div className="text-xs text-slate-500">ID: {exp.id}</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => updateStatus(exp.id, 'active')}
                                        className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                    >
                                        Aktif
                                    </button>
                                    <button
                                        onClick={() => updateStatus(exp.id, 'paused')}
                                        className="px-3 py-1 rounded-full text-xs border border-slate-200"
                                    >
                                        Duraklat
                                    </button>
                                </div>
                                {selected === exp.id && (
                                    <div className="mt-2 space-y-2 text-xs text-slate-600">
                                        {selectedVariants.length === 0 ? (
                                            <div>Varyant yok.</div>
                                        ) : (
                                            selectedVariants.map((variant) => (
                                                <div key={variant.id} className="rounded-lg border border-slate-200 p-2">
                                                    <div className="font-semibold">{variant.name} • {variant.weight}%</div>
                                                    <div className="text-[11px] text-slate-500 line-clamp-2">{variant.prompt}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}